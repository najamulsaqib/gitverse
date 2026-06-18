use std::collections::HashMap;
use std::io::Read;
use std::path::Path;
use std::process::{Command, Stdio};
use std::sync::Mutex;

use notify::{RecommendedWatcher, RecursiveMode, Watcher};
use tauri::{AppHandle, Emitter, State};

use crate::models::{
    Branch, Commit, CommitFileChange, CommitRef, DiffLine, FileChange, GitProgress, RepoStatus,
};

/// Run a git subcommand in `dir`, returning trimmed stdout. Non-zero exit is an error.
fn git(dir: &str, args: &[&str]) -> Result<String, String> {
    let output = Command::new("git")
        .arg("-C")
        .arg(dir)
        .args(args)
        .output()
        .map_err(|e| e.to_string())?;

    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).trim().to_string());
    }

    Ok(String::from_utf8_lossy(&output.stdout)
        .trim_end()
        .to_string())
}

/// Like `git`, but returns stdout regardless of exit code (for `diff --no-index`, etc.).
fn git_lenient(dir: &str, args: &[&str]) -> String {
    Command::new("git")
        .arg("-C")
        .arg(dir)
        .args(args)
        .output()
        .map(|o| String::from_utf8_lossy(&o.stdout).trim_end().to_string())
        .unwrap_or_default()
}

fn numstat(dir: &str, cached: bool) -> HashMap<String, (u32, u32)> {
    let mut args = vec!["diff", "--numstat"];
    if cached {
        args.push("--cached");
    }
    let mut map = HashMap::new();
    for line in git(dir, &args).unwrap_or_default().lines() {
        let parts: Vec<&str> = line.split('\t').collect();
        if parts.len() >= 3 {
            let add = parts[0].parse().unwrap_or(0);
            let del = parts[1].parse().unwrap_or(0);
            map.insert(parts[2].to_string(), (add, del));
        }
    }
    map
}

fn map_status(code: char) -> String {
    match code {
        'A' | '?' => "A",
        'D' => "D",
        _ => "M",
    }
    .to_string()
}

fn count_lines(dir: &str, rel: &str) -> u32 {
    std::fs::read_to_string(std::path::Path::new(dir).join(rel))
        .map(|s| s.lines().count() as u32)
        .unwrap_or(0)
}

#[tauri::command]
pub fn git_status(path: String) -> Result<RepoStatus, String> {
    let branch = match git(&path, &["rev-parse", "--abbrev-ref", "HEAD"]) {
        Ok(b) if b != "HEAD" => b,
        _ => "detached".to_string(),
    };

    let (ahead, behind, upstream) = match git(
        &path,
        &["rev-list", "--left-right", "--count", "@{u}...HEAD"],
    ) {
        Ok(s) => {
            let mut it = s.split_whitespace();
            let behind = it.next().and_then(|x| x.parse().ok()).unwrap_or(0);
            let ahead = it.next().and_then(|x| x.parse().ok()).unwrap_or(0);
            (ahead, behind, true)
        }
        Err(_) => (0, 0, false),
    };

    let staged_stats = numstat(&path, true);
    let unstaged_stats = numstat(&path, false);

    let porcelain = git(&path, &["status", "--porcelain=v1", "-uall"])?;
    let mut files = Vec::new();
    for line in porcelain.lines() {
        if line.len() < 3 {
            continue;
        }
        let x = line.as_bytes()[0] as char;
        let y = line.as_bytes()[1] as char;
        let rest = &line[3..];
        let rel = match rest.find(" -> ") {
            Some(i) => rest[i + 4..].to_string(),
            None => rest.to_string(),
        };

        let staged = x != ' ' && x != '?';
        let code = if staged { x } else { y };
        let untracked = x == '?' || y == '?';

        let (add, del) = if untracked {
            (count_lines(&path, &rel), 0)
        } else {
            let s = staged_stats.get(&rel).copied().unwrap_or((0, 0));
            let u = unstaged_stats.get(&rel).copied().unwrap_or((0, 0));
            (s.0 + u.0, s.1 + u.1)
        };

        files.push(FileChange {
            path: rel,
            status: map_status(code),
            staged,
            add,
            del,
        });
    }

    Ok(RepoStatus {
        branch,
        ahead,
        behind,
        upstream,
        files,
    })
}

fn parse_refs(decorate: &str) -> Vec<CommitRef> {
    let mut refs = Vec::new();
    for tok in decorate.split(", ") {
        let tok = tok.trim();
        if tok.is_empty() {
            continue;
        }
        if let Some(name) = tok.strip_prefix("HEAD -> ") {
            refs.push(CommitRef {
                name: name.to_string(),
                head: true,
            });
        } else if tok == "HEAD" {
            refs.push(CommitRef {
                name: "HEAD".to_string(),
                head: true,
            });
        } else {
            let name = tok.strip_prefix("tag: ").unwrap_or(tok);
            refs.push(CommitRef {
                name: name.to_string(),
                head: false,
            });
        }
    }
    refs
}

/// Pack commits into graph lanes based on parent relationships.
fn assign_lanes(commits: &mut [Commit]) {
    let mut lanes: Vec<Option<String>> = Vec::new();
    let free = |lanes: &mut Vec<Option<String>>| -> usize {
        match lanes.iter().position(|l| l.is_none()) {
            Some(i) => i,
            None => {
                lanes.push(None);
                lanes.len() - 1
            }
        }
    };

    for c in commits.iter_mut() {
        let lane = match lanes
            .iter()
            .position(|l| l.as_deref() == Some(c.hash.as_str()))
        {
            Some(i) => i,
            None => free(&mut lanes),
        };
        c.lane = lane as u32;

        // Converge any other lanes that were waiting on this commit.
        for l in lanes.iter_mut() {
            if l.as_deref() == Some(c.hash.as_str()) {
                *l = None;
            }
        }

        // This lane now continues to the first parent.
        lanes[lane] = c.parents.first().cloned();

        // Extra parents (merges) open new lanes if not already tracked.
        for p in c.parents.iter().skip(1) {
            if !lanes.iter().any(|l| l.as_deref() == Some(p.as_str())) {
                let idx = free(&mut lanes);
                lanes[idx] = Some(p.clone());
            }
        }
    }
}

#[tauri::command]
pub fn git_log(path: String, limit: u32) -> Result<Vec<Commit>, String> {
    let fmt = "%H%x1f%P%x1f%ae%x1f%ar%x1f%D%x1f%s%x1e";
    let out = git(
        &path,
        &[
            "log",
            &format!("--max-count={limit}"),
            &format!("--pretty=format:{fmt}"),
        ],
    )?;

    let mut commits = Vec::new();
    for rec in out.split('\u{1e}') {
        let rec = rec.trim_matches(|c| c == '\n' || c == '\r');
        if rec.is_empty() {
            continue;
        }
        let f: Vec<&str> = rec.split('\u{1f}').collect();
        if f.len() < 6 {
            continue;
        }
        commits.push(Commit {
            hash: f[0].to_string(),
            parents: f[1].split_whitespace().map(String::from).collect(),
            by: f[2].to_string(),
            when: f[3].to_string(),
            refs: parse_refs(f[4]),
            subject: f[5].to_string(),
            add: 0,
            del: 0,
            files: 0,
            lane: 0,
            flag: false,
        });
    }

    assign_lanes(&mut commits);
    Ok(commits)
}

#[tauri::command]
pub fn git_branches(path: String) -> Result<Vec<Branch>, String> {
    let out = git(&path, &["branch", "--format=%(HEAD)%00%(refname:short)"])?;
    let mut branches = Vec::new();
    for line in out.lines() {
        let (head, name) = line.split_once('\u{0}').unwrap_or(("", line));
        if name.is_empty() {
            continue;
        }
        branches.push(Branch {
            name: name.to_string(),
            current: head.trim() == "*",
        });
    }
    Ok(branches)
}

fn parse_diff(out: &str) -> Vec<DiffLine> {
    let skip = [
        "diff ",
        "index ",
        "--- ",
        "+++ ",
        "new file",
        "deleted file",
        "old mode",
        "new mode",
        "similarity",
        "rename ",
        "copy ",
        "\\ No newline",
        "Binary files",
    ];
    let mut lines = Vec::new();
    for l in out.lines() {
        if skip.iter().any(|p| l.starts_with(p)) {
            continue;
        }
        if l.starts_with("@@") {
            lines.push(DiffLine {
                t: "hunk".into(),
                n: None,
                a: Some(l.to_string()),
            });
        } else if let Some(rest) = l.strip_prefix('+') {
            lines.push(DiffLine {
                t: "add".into(),
                n: Some(rest.to_string()),
                a: None,
            });
        } else if let Some(rest) = l.strip_prefix('-') {
            lines.push(DiffLine {
                t: "del".into(),
                n: Some(rest.to_string()),
                a: None,
            });
        } else {
            lines.push(DiffLine {
                t: "ctx".into(),
                n: Some(l.strip_prefix(' ').unwrap_or(l).to_string()),
                a: None,
            });
        }
    }
    lines
}

#[tauri::command]
pub fn git_diff(path: String, file: String, staged: bool) -> Result<Vec<DiffLine>, String> {
    let out = if staged {
        git(&path, &["diff", "--cached", "--", &file])?
    } else {
        let unstaged = git(&path, &["diff", "--", &file])?;
        if unstaged.trim().is_empty() {
            // Likely an untracked file — diff it against an empty tree.
            git_lenient(&path, &["diff", "--no-index", "--", "/dev/null", &file])
        } else {
            unstaged
        }
    };
    Ok(parse_diff(&out))
}

#[tauri::command]
pub fn git_commit_changes(path: String, hash: String) -> Result<Vec<CommitFileChange>, String> {
    let names = git(&path, &["show", "--name-status", "--format=", &hash])?;
    let nums = git(&path, &["show", "--numstat", "--format=", &hash])?;

    let mut changes = Vec::new();
    for (ns, st) in nums.lines().zip(names.lines()) {
        let np: Vec<&str> = ns.split('\t').collect();
        let sp: Vec<&str> = st.split('\t').collect();
        if np.len() < 3 || sp.len() < 2 {
            continue;
        }
        changes.push(CommitFileChange {
            path: sp.last().unwrap().to_string(),
            status: map_status(sp[0].chars().next().unwrap_or('M')),
            add: np[0].parse().unwrap_or(0),
            del: np[1].parse().unwrap_or(0),
        });
    }
    Ok(changes)
}

#[tauri::command]
pub fn git_commit_diff(path: String, hash: String, file: String) -> Result<Vec<DiffLine>, String> {
    let out = git(&path, &["show", "--format=", &hash, "--", &file])?;
    Ok(parse_diff(&out))
}

// ---- write actions ----

#[tauri::command]
pub fn git_stage(path: String, file: String) -> Result<(), String> {
    git(&path, &["add", "--", &file]).map(|_| ())
}

#[tauri::command]
pub fn git_unstage(path: String, file: String) -> Result<(), String> {
    git(&path, &["restore", "--staged", "--", &file]).map(|_| ())
}

#[tauri::command]
pub fn git_stage_all(path: String) -> Result<(), String> {
    git(&path, &["add", "-A"]).map(|_| ())
}

#[tauri::command]
pub fn git_unstage_all(path: String) -> Result<(), String> {
    git(&path, &["reset", "--quiet", "HEAD", "--"]).map(|_| ())
}

#[tauri::command]
pub fn git_commit(
    path: String,
    summary: String,
    description: String,
    co_authors: Vec<String>,
) -> Result<(), String> {
    let mut msg = summary;
    if !description.trim().is_empty() {
        msg.push_str("\n\n");
        msg.push_str(description.trim());
    }
    if !co_authors.is_empty() {
        msg.push_str("\n\n");
        for email in co_authors {
            msg.push_str(&format!("Co-authored-by: {email} <{email}>\n"));
        }
    }
    git(&path, &["commit", "-m", &msg]).map(|_| ())
}

#[tauri::command]
pub fn git_checkout(
    path: String,
    branch: String,
    create: bool,
    from: Option<String>,
) -> Result<(), String> {
    let base = from.unwrap_or_default();
    let args: Vec<&str> = if create {
        let mut a = vec!["checkout", "-b", branch.as_str()];
        if !base.is_empty() {
            a.push(base.as_str());
        }
        a
    } else {
        vec!["checkout", branch.as_str()]
    };
    git(&path, &args).map(|_| ())
}

/// Best-effort name of the repo's default branch: the remote's `origin/HEAD`,
/// else a local `main`/`master`, else whatever HEAD points at.
#[tauri::command]
pub fn git_default_branch(path: String) -> Result<String, String> {
    if let Ok(head) = git(
        &path,
        &["symbolic-ref", "--short", "refs/remotes/origin/HEAD"],
    ) {
        if let Some(name) = head.rsplit('/').next() {
            if !name.is_empty() {
                return Ok(name.to_string());
            }
        }
    }
    for cand in ["main", "master"] {
        if git(
            &path,
            &[
                "rev-parse",
                "--verify",
                "--quiet",
                &format!("refs/heads/{cand}"),
            ],
        )
        .is_ok()
        {
            return Ok(cand.to_string());
        }
    }
    git(&path, &["rev-parse", "--abbrev-ref", "HEAD"])
}

/// Pull the percent + label out of a git progress line such as
/// `Receiving objects:  67% (4/6)` → `(67, "Receiving objects")`.
fn parse_progress(line: &str) -> Option<(u8, String)> {
    let pct_pos = line.find('%')?;
    let digits: String = line[..pct_pos]
        .chars()
        .rev()
        .take_while(|c| c.is_ascii_digit())
        .collect::<String>()
        .chars()
        .rev()
        .collect();
    if digits.is_empty() {
        return None;
    }
    let pct = digits.parse::<u8>().ok()?.min(100);
    let text = line.split(':').next().unwrap_or("").trim().to_string();
    Some((pct, text))
}

/// Run a network git op with `--progress`, emitting `git-progress` events as
/// git reports progress on stderr (`\r`-delimited lines). Returns the captured
/// stderr on non-zero exit so callers can detect access failures.
fn git_progress(app: &AppHandle, dir: &str, args: &[&str]) -> Result<(), String> {
    let mut child = Command::new("git")
        .arg("-C")
        .arg(dir)
        .args(args)
        .stdout(Stdio::null())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| e.to_string())?;

    let mut stderr = child.stderr.take().ok_or("failed to capture git output")?;
    let mut chunk = [0u8; 4096];
    let mut line: Vec<u8> = Vec::new();
    let mut full: Vec<u8> = Vec::new();

    loop {
        let n = stderr.read(&mut chunk).map_err(|e| e.to_string())?;
        if n == 0 {
            break;
        }
        for &b in &chunk[..n] {
            if b == b'\r' || b == b'\n' {
                if !line.is_empty() {
                    full.extend_from_slice(&line);
                    full.push(b'\n');
                    let text = String::from_utf8_lossy(&line);
                    if let Some((pct, label)) = parse_progress(&text) {
                        let _ = app.emit("git-progress", GitProgress { pct, text: label });
                    }
                    line.clear();
                }
            } else {
                line.push(b);
            }
        }
    }
    if !line.is_empty() {
        full.extend_from_slice(&line);
    }

    let status = child.wait().map_err(|e| e.to_string())?;
    if status.success() {
        Ok(())
    } else {
        Err(String::from_utf8_lossy(&full).trim().to_string())
    }
}

/// Run a network op on a blocking thread so it never stalls the main command
/// thread — otherwise the webview can't repaint the busy state or process the
/// `git-progress` events until the whole op finishes.
async fn git_network(app: AppHandle, args: Vec<String>) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        let refs: Vec<&str> = args.iter().map(String::as_str).collect();
        let (dir, rest) = refs.split_first().expect("dir + args");
        git_progress(&app, dir, rest)
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn git_fetch(app: AppHandle, path: String) -> Result<(), String> {
    git_network(
        app,
        vec![path, "fetch".into(), "--prune".into(), "--progress".into()],
    )
    .await
}

#[tauri::command]
pub async fn git_push(app: AppHandle, path: String) -> Result<(), String> {
    git_network(app, vec![path, "push".into(), "--progress".into()]).await
}

#[tauri::command]
pub async fn git_pull(app: AppHandle, path: String) -> Result<(), String> {
    git_network(
        app,
        vec![path, "pull".into(), "--ff-only".into(), "--progress".into()],
    )
    .await
}

/// Probe whether the active identity can reach the repo's `origin` remote.
/// Runs `ls-remote` with prompts disabled so it never hangs on a passphrase or
/// host-verification question — a permission failure returns its stderr.
#[tauri::command]
pub async fn git_check_access(path: String) -> Result<(), String> {
    // The network round-trip can take seconds; run it on a blocking thread so it
    // never stalls the main command thread (and with it, identity switching).
    tauri::async_runtime::spawn_blocking(move || {
        let output = Command::new("git")
            .arg("-C")
            .arg(&path)
            .args(["ls-remote", "origin", "HEAD"])
            .env("GIT_TERMINAL_PROMPT", "0")
            .env(
                "GIT_SSH_COMMAND",
                "ssh -o BatchMode=yes -o ConnectTimeout=8",
            )
            .output()
            .map_err(|e| e.to_string())?;

        if output.status.success() {
            Ok(())
        } else {
            Err(String::from_utf8_lossy(&output.stderr).trim().to_string())
        }
    })
    .await
    .map_err(|e| e.to_string())?
}

// ---- live file watching ----

/// Holds the active watcher (one repo at a time — the selected repo).
#[derive(Default)]
pub struct WatchState(pub Mutex<Option<RecommendedWatcher>>);

/// Watch a repo's working tree + `.git` and emit `repo-changed` on any change.
/// Replaces any previously active watcher.
#[tauri::command]
pub fn watch_repo(app: AppHandle, state: State<WatchState>, path: String) -> Result<(), String> {
    let handle = app.clone();
    let mut watcher = notify::recommended_watcher(move |res: notify::Result<notify::Event>| {
        if res.is_ok() {
            let _ = handle.emit("repo-changed", ());
        }
    })
    .map_err(|e| e.to_string())?;

    watcher
        .watch(Path::new(&path), RecursiveMode::Recursive)
        .map_err(|e| e.to_string())?;

    *state.0.lock().map_err(|e| e.to_string())? = Some(watcher);
    Ok(())
}

#[tauri::command]
pub fn unwatch_repo(state: State<WatchState>) -> Result<(), String> {
    *state.0.lock().map_err(|e| e.to_string())? = None;
    Ok(())
}
