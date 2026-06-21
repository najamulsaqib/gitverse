use std::collections::HashMap;
use std::io::Read;
use std::path::Path;
use std::process::{Command, Stdio};
use std::sync::Mutex;

use std::time::Duration;

use notify::{RecommendedWatcher, RecursiveMode, Watcher};
use notify_debouncer_full::{new_debouncer, DebounceEventResult, Debouncer, FileIdMap};
use tauri::{AppHandle, Emitter, Manager, State};

use crate::models::{
    Branch, Commit, CommitFileChange, CommitRef, DiffLine, FileChange, GitProgress, RepoStatus,
    StashEntry,
};

/// Run a git subcommand in `dir`, returning trimmed stdout. Non-zero exit is an error.
///
/// `core.quotePath=false` forces git to emit paths as raw UTF-8 instead of
/// double-quoting + octal-escaping any non-ASCII bytes (the default). Without it,
/// a file with a unicode name — e.g. a macOS screenshot, whose name contains a
/// narrow no-break space (U+202F) — comes back from `status`/`diff` as a quoted,
/// escaped string. That string is then reused verbatim to stage/stash/diff the
/// file and never matches it on disk, so the file can't be acted on at all.
fn git(dir: &str, args: &[&str]) -> Result<String, String> {
    let output = Command::new("git")
        .arg("-C")
        .arg(dir)
        .args(["-c", "core.quotePath=false"])
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

/// Line-count many (untracked) files in parallel. These are one disk read each,
/// so on a repo with lots of untracked files counting them serially dominates
/// `git_status`. Fan out across a bounded pool keyed by available cores.
fn count_lines_many(dir: &str, rels: &[String]) -> HashMap<String, u32> {
    if rels.is_empty() {
        return HashMap::new();
    }
    let workers = std::thread::available_parallelism()
        .map(|n| n.get())
        .unwrap_or(4)
        .clamp(1, 8)
        .min(rels.len());
    let chunk = rels.len().div_ceil(workers);
    std::thread::scope(|s| {
        let handles: Vec<_> = rels
            .chunks(chunk)
            .map(|c| {
                s.spawn(move || {
                    c.iter()
                        .map(|r| (r.clone(), count_lines(dir, r)))
                        .collect::<Vec<_>>()
                })
            })
            .collect();
        handles
            .into_iter()
            .flat_map(|h| h.join().unwrap_or_default())
            .collect()
    })
}

#[tauri::command]
pub async fn git_status(path: String) -> Result<RepoStatus, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let p = path.as_str();

        // These five queries are independent and each spawns a git process that walks
        // the working tree, so running them serially made wall time the *sum* of all
        // five — the main cost on a large/dirty repo. Run them concurrently instead;
        // wall time is now the slowest single call.
        let (branch, ab, staged_stats, unstaged_stats, porcelain) = std::thread::scope(|s| {
            let branch = s.spawn(|| match git(p, &["rev-parse", "--abbrev-ref", "HEAD"]) {
                Ok(b) if b != "HEAD" => b,
                _ => "detached".to_string(),
            });
            let ab = s.spawn(|| git(p, &["rev-list", "--left-right", "--count", "@{u}...HEAD"]));
            let staged = s.spawn(|| numstat(p, true));
            let unstaged = s.spawn(|| numstat(p, false));
            let porcelain = s.spawn(|| git(p, &["status", "--porcelain=v1", "-z", "-uall"]));
            (
                branch.join().unwrap_or_else(|_| "detached".to_string()),
                ab.join()
                    .unwrap_or_else(|_| Err("rev-list thread panicked".into())),
                staged.join().unwrap_or_default(),
                unstaged.join().unwrap_or_default(),
                porcelain
                    .join()
                    .unwrap_or_else(|_| Err("status thread panicked".into())),
            )
        });

        let (ahead, behind, upstream) = match ab {
            Ok(s) => {
                let mut it = s.split_whitespace();
                let behind = it.next().and_then(|x| x.parse().ok()).unwrap_or(0);
                let ahead = it.next().and_then(|x| x.parse().ok()).unwrap_or(0);
                (ahead, behind, true)
            }
            Err(_) => (0, 0, false),
        };

        let porcelain = porcelain?;

        // First pass: parse entries, deferring untracked line-counts so they can be
        // computed in one parallel batch rather than one blocking disk read per file.
        struct Entry {
            rel: String,
            code: char,
            staged: bool,
            untracked: bool,
        }
        let mut entries = Vec::new();
        let mut untracked_rels = Vec::new();
        // `-z` makes each record NUL-terminated and the path fully literal (no
        // quoting/escaping, ever — including spaces, quotes, and unicode). Record
        // form is `XY <path>`; a rename/copy emits the original path as the *next*
        // NUL field, which we consume so it isn't parsed as its own entry.
        let mut fields = porcelain.split('\0');
        while let Some(rec) = fields.next() {
            if rec.len() < 4 {
                continue; // trailing empty field, or too short to hold "XY <path>"
            }
            let x = rec.as_bytes()[0] as char;
            let y = rec.as_bytes()[1] as char;
            let rel = rec[3..].to_string();
            if x == 'R' || y == 'R' || x == 'C' || y == 'C' {
                fields.next(); // discard the rename/copy source path
            }

            let staged = x != ' ' && x != '?';
            let code = if staged { x } else { y };
            let untracked = x == '?' || y == '?';
            if untracked {
                untracked_rels.push(rel.clone());
            }
            entries.push(Entry {
                rel,
                code,
                staged,
                untracked,
            });
        }

        let counts = count_lines_many(p, &untracked_rels);

        let files = entries
            .into_iter()
            .map(|e| {
                let (add, del) = if e.untracked {
                    (counts.get(&e.rel).copied().unwrap_or(0), 0)
                } else {
                    let s = staged_stats.get(&e.rel).copied().unwrap_or((0, 0));
                    let u = unstaged_stats.get(&e.rel).copied().unwrap_or((0, 0));
                    (s.0 + u.0, s.1 + u.1)
                };
                FileChange {
                    path: e.rel,
                    status: map_status(e.code),
                    staged: e.staged,
                    add,
                    del,
                }
            })
            .collect();

        Ok(RepoStatus {
            branch,
            ahead,
            behind,
            upstream,
            files,
        })
    })
    .await
    .map_err(|e| e.to_string())?
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
    // Collapse a remote-tracking ref (e.g. `origin/main`) when a local branch of
    // the same basename rides the same commit — show the single branch, not both.
    let locals: std::collections::HashSet<String> = refs
        .iter()
        .filter(|r| !r.name.contains('/'))
        .map(|r| r.name.clone())
        .collect();
    refs.retain(|r| match r.name.rsplit_once('/') {
        Some((_, base)) => !locals.contains(base),
        None => true,
    });
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
pub async fn git_log(path: String, limit: u32) -> Result<Vec<Commit>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let fmt = "%H%x1f%P%x1f%ae%x1f%ar%x1f%D%x1f%s%x1e";
        let out = git(
            &path,
            &[
                "log",
                // Topological order guarantees a commit is listed before its
                // parents, which the graph layout relies on to assign lanes.
                "--topo-order",
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
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn git_branches(path: String) -> Result<Vec<Branch>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let out = git(
            &path,
            &[
                "branch",
                "-a",
                "--format=%(HEAD)%00%(refname)%00%(refname:short)",
            ],
        )?;

        let mut locals = std::collections::HashSet::new();
        let mut branches = Vec::new();
        let mut remotes: Vec<String> = Vec::new();
        for line in out.lines() {
            let f: Vec<&str> = line.splitn(3, '\u{0}').collect();
            if f.len() < 3 || f[2].is_empty() {
                continue;
            }
            let (head, full, short) = (f[0], f[1], f[2]);
            if full.starts_with("refs/heads/") {
                locals.insert(short.to_string());
                branches.push(Branch {
                    name: short.to_string(),
                    current: head.trim() == "*",
                    remote: false,
                });
            } else if full.starts_with("refs/remotes/") && !full.ends_with("/HEAD") {
                // e.g. "origin/feature" — defer until locals are known so we can
                // hide remotes that already have a local counterpart.
                remotes.push(short.to_string());
            }
        }
        // Surface only remote branches with no local checkout yet (newly pushed by
        // teammates), so they're discoverable in the menu without duplicating ours.
        for r in remotes {
            let bare = r.split_once('/').map(|(_, b)| b).unwrap_or(&r);
            if !locals.contains(bare) {
                branches.push(Branch {
                    name: r,
                    current: false,
                    remote: true,
                });
            }
        }
        Ok(branches)
    })
    .await
    .map_err(|e| e.to_string())?
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
    // `-m --first-parent` makes merge commits report their diff against the
    // first parent. Without it git defaults to a combined (`--cc`) diff, which
    // for a clean merge lists nothing in --name-status (while --numstat still
    // emits rows) — the two outputs then misalign and no changes show.
    let names = git(
        &path,
        &[
            "show",
            "-m",
            "--first-parent",
            "--name-status",
            "--format=",
            &hash,
        ],
    )?;
    let nums = git(
        &path,
        &[
            "show",
            "-m",
            "--first-parent",
            "--numstat",
            "--format=",
            &hash,
        ],
    )?;

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
    // See git_commit_changes: `-m --first-parent` so merge commits diff against
    // their first parent instead of an empty combined diff.
    let out = git(
        &path,
        &[
            "show",
            "-m",
            "--first-parent",
            "--format=",
            &hash,
            "--",
            &file,
        ],
    )?;
    Ok(parse_diff(&out))
}

// ---- stash ----

/// Reflog selector `stash@{N}` for the given index, the canonical way to address
/// a stash entry in every `git stash` subcommand.
fn stash_ref(index: u32) -> String {
    format!("stash@{{{index}}}")
}

/// Split a stash reflog subject into (branch, message). git writes either
/// `WIP on <branch>: <sha> <subject>` (auto) or `On <branch>: <message>`
/// (custom `-m`). Anything unrecognised is returned whole as the message.
fn parse_stash_subject(subject: &str) -> (String, String) {
    let rest = subject
        .strip_prefix("WIP on ")
        .or_else(|| subject.strip_prefix("On "));
    match rest.and_then(|r| r.split_once(": ")) {
        Some((branch, message)) => (branch.to_string(), message.to_string()),
        None => (String::new(), subject.to_string()),
    }
}

#[tauri::command]
pub fn git_stash_list(path: String) -> Result<Vec<StashEntry>, String> {
    let out = git(&path, &["stash", "list", "--format=%gd%x1f%gs%x1f%cr"])?;
    let mut entries = Vec::new();
    for line in out.lines() {
        let f: Vec<&str> = line.split('\u{1f}').collect();
        if f.len() < 3 {
            continue;
        }
        // %gd is e.g. "stash@{2}" — pull the integer out of the braces.
        let index = f[0]
            .split_once('{')
            .and_then(|(_, r)| r.strip_suffix('}'))
            .and_then(|n| n.parse().ok())
            .unwrap_or(0);
        let (branch, message) = parse_stash_subject(f[1]);
        entries.push(StashEntry {
            index,
            message,
            branch,
            when: f[2].to_string(),
        });
    }
    Ok(entries)
}

#[tauri::command]
pub fn git_stash_save(
    path: String,
    message: String,
    include_untracked: bool,
    files: Vec<String>,
) -> Result<(), String> {
    let msg = message.trim().to_string();
    let mut args: Vec<&str> = vec!["stash", "push"];
    if include_untracked {
        args.push("--include-untracked");
    }
    if !msg.is_empty() {
        args.push("-m");
        args.push(&msg);
    }
    // A non-empty pathspec limits the stash to those files; empty stashes the
    // whole working tree.
    if !files.is_empty() {
        args.push("--");
        args.extend(files.iter().map(String::as_str));
    }
    let out = git(&path, &args)?;
    // `git stash push` exits 0 with this message when there's nothing to stash —
    // surface it as an error so the UI can tell the user instead of silently no-op.
    if out.contains("No local changes to save") {
        return Err("No local changes to stash.".into());
    }
    Ok(())
}

#[tauri::command]
pub fn git_stash_apply(path: String, index: u32) -> Result<(), String> {
    git(&path, &["stash", "apply", &stash_ref(index)]).map(|_| ())
}

#[tauri::command]
pub fn git_stash_pop(path: String, index: u32) -> Result<(), String> {
    git(&path, &["stash", "pop", &stash_ref(index)]).map(|_| ())
}

#[tauri::command]
pub fn git_stash_drop(path: String, index: u32) -> Result<(), String> {
    git(&path, &["stash", "drop", &stash_ref(index)]).map(|_| ())
}

#[tauri::command]
pub fn git_stash_changes(path: String, index: u32) -> Result<Vec<CommitFileChange>, String> {
    let r = stash_ref(index);
    // `-u` so files stashed while untracked (e.g. via the "include untracked"
    // option) are listed too, not just tracked changes.
    let names = git(&path, &["stash", "show", "-u", "--name-status", &r])?;
    let nums = git(&path, &["stash", "show", "-u", "--numstat", &r])?;

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

/// git's well-known empty tree object — diffing against it renders a file as
/// all-additions, which is how an untracked file in a stash should appear.
const EMPTY_TREE: &str = "4b825dc642cb6eb9a060e54bf8d69288fbee4904";

#[tauri::command]
pub fn git_stash_diff(path: String, index: u32, file: String) -> Result<Vec<DiffLine>, String> {
    // `git stash show -p -- <file>` doesn't work — stash show treats the pathspec
    // as a second revision ("Too many revisions specified"). Diff the stash commit
    // against its base parent instead, which honours a pathspec normally.
    let r = stash_ref(index);
    let base = format!("{r}^1");
    let out = git(&path, &["diff", &base, &r, "--", &file])?;
    if !out.trim().is_empty() {
        return Ok(parse_diff(&out));
    }

    // Empty tracked diff: the file may have been untracked when stashed, in which
    // case it lives in the stash's third parent (`stash@{N}^3`, created by `-u`).
    // Diff that tree against the empty tree so the new file shows as additions.
    let untracked = format!("{r}^3");
    if git(&path, &["rev-parse", "--verify", "--quiet", &untracked]).is_ok() {
        let out = git(&path, &["diff", EMPTY_TREE, &untracked, "--", &file])?;
        return Ok(parse_diff(&out));
    }

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

/// Discard all uncommitted changes to a single file, reverting it to HEAD.
/// Handles every state: unstages first, then restores tracked files from HEAD
/// (covering modified/deleted/staged), or removes the file if it's untracked
/// or a brand-new add. This permanently drops the file's working changes.
#[tauri::command]
pub fn git_discard_file(path: String, file: String) -> Result<(), String> {
    // Unstage anything first so the "tracked?" check reflects HEAD, not the index.
    let _ = git(&path, &["reset", "-q", "HEAD", "--", &file]);

    if git(&path, &["ls-files", "--error-unmatch", "--", &file]).is_ok() {
        git(&path, &["checkout", "HEAD", "--", &file]).map(|_| ())
    } else {
        git(&path, &["clean", "-fd", "--", &file]).map(|_| ())
    }
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

// ---- commit actions (from the history graph) ----

/// Apply the changes introduced by `hash` as a new commit on the current branch.
/// A conflict leaves the cherry-pick in progress and returns git's message.
#[tauri::command]
pub fn git_cherry_pick(path: String, hash: String) -> Result<(), String> {
    git(&path, &["cherry-pick", &hash]).map(|_| ())
}

/// Create a new commit that undoes the changes in `hash` (non-interactive).
/// A conflict leaves the revert in progress and returns git's message.
#[tauri::command]
pub fn git_revert(path: String, hash: String) -> Result<(), String> {
    git(&path, &["revert", "--no-edit", &hash]).map(|_| ())
}

/// Move the current branch to `hash`. `mode` is `soft` (keep changes staged),
/// `mixed` (keep changes unstaged, the default), or `hard` (discard all changes).
#[tauri::command]
pub fn git_reset(path: String, hash: String, mode: String) -> Result<(), String> {
    let flag = match mode.as_str() {
        "soft" => "--soft",
        "hard" => "--hard",
        _ => "--mixed",
    };
    git(&path, &["reset", flag, &hash]).map(|_| ())
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

/// Background fetch used by the periodic auto-fetch: updates remote-tracking
/// refs and prunes deleted ones so the UI can surface "behind" counts and newly
/// pushed remote branches. Runs on a blocking thread with prompts disabled so it
/// never hangs on a passphrase or host-verification question — failures (e.g. no
/// access, offline) are returned for the caller to swallow silently.
#[tauri::command]
pub async fn git_fetch_silent(path: String) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        let output = Command::new("git")
            .arg("-C")
            .arg(&path)
            .args(["fetch", "--prune"])
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

/// Holds the active watcher (one repo at a time — the selected repo). The
/// debouncer coalesces filesystem-event storms (gc, fetch, a build writing into
/// the tree) into one batched callback before anything crosses the IPC boundary,
/// so load on the frontend stays flat regardless of event volume.
#[derive(Default)]
pub struct WatchState(pub Mutex<Option<Debouncer<RecommendedWatcher, FileIdMap>>>);

/// What kind of change a path represents, which decides how the frontend
/// refreshes. Working-tree edits only need `git status`; ref changes additionally
/// need the (expensive) `git log` + `git branch`. Noise is dropped entirely.
enum PathKind {
    /// Transient `.git` churn that must never trigger a refresh — most importantly
    /// `.git/index`, which `git status` itself rewrites (stat-cache refresh).
    /// Without this, every refresh's `git status` would re-fire the watcher in an
    /// endless loop. Also `*.lock`, `objects/**` (gc/fetch), `logs/**` (reflog).
    Noise,
    /// `.git` metadata that moves refs: `HEAD` (checkout), `refs/**` and
    /// `packed-refs` (commit/branch), `FETCH_HEAD`/`ORIG_HEAD` (fetch/merge).
    GitMeta,
    /// A working-tree file edit.
    Worktree,
}

fn classify(p: &Path) -> PathKind {
    let mut in_git = false;
    let mut tail: Vec<&std::ffi::OsStr> = Vec::new();
    for comp in p.components() {
        let c = comp.as_os_str();
        if in_git {
            tail.push(c);
        } else if c == ".git" {
            in_git = true;
        }
    }
    if !in_git {
        return PathKind::Worktree;
    }
    if p.extension().map(|e| e == "lock").unwrap_or(false) {
        return PathKind::Noise; // *.lock (index.lock, ref locks, …)
    }
    match tail.first().and_then(|s| s.to_str()) {
        Some("index" | "objects" | "logs") => PathKind::Noise,
        _ => PathKind::GitMeta,
    }
}

/// Typed payload telling the frontend *what* changed, so a plain file save only
/// re-runs `git status` instead of also re-querying the log and branch list.
#[derive(Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct RepoChange {
    worktree: bool,
    refs: bool,
}

/// Watch a repo's working tree + `.git` and emit a typed `repo-changed` event on
/// any meaningful change. Events are debounced and classified server-side.
/// Replaces any previously active watcher.
#[tauri::command]
pub async fn watch_repo(app: AppHandle, path: String) -> Result<(), String> {
    // Building the watcher scans the working tree (notify's recursive watch plus
    // the debouncer's file-id cache seeding) — seconds on a large repo. Do it on
    // a blocking thread so switching repos never freezes the UI; the watcher just
    // comes online a moment after the switch instead of blocking it.
    let handle = app.clone();
    let debouncer = tauri::async_runtime::spawn_blocking(
        move || -> Result<Debouncer<RecommendedWatcher, FileIdMap>, String> {
            // 120ms: long enough to fully coalesce an event storm (gc, checkout, a
            // build writing files all fire within a few ms and keep resetting the
            // timer), short enough that a single save feels instant. The frontend
            // doesn't debounce on top of this — the store coalesces refreshes itself.
            let mut debouncer = new_debouncer(
                Duration::from_millis(120),
                None,
                move |res: DebounceEventResult| {
                    let Ok(events) = res else { return };
                    let mut change = RepoChange {
                        worktree: false,
                        refs: false,
                    };
                    for ev in &events {
                        for p in &ev.paths {
                            match classify(p) {
                                PathKind::Noise => {}
                                PathKind::GitMeta => change.refs = true,
                                PathKind::Worktree => change.worktree = true,
                            }
                        }
                    }
                    // Drop batches that were entirely noise (e.g. our index rewrite).
                    if change.worktree || change.refs {
                        let _ = handle.emit("repo-changed", change);
                    }
                },
            )
            .map_err(|e| e.to_string())?;

            debouncer
                .watcher()
                .watch(Path::new(&path), RecursiveMode::Recursive)
                .map_err(|e| e.to_string())?;
            // The cache tracks file ids so renames are reported correctly across the
            // debounce window; it must be seeded with the same root we watch.
            debouncer
                .cache()
                .add_root(Path::new(&path), RecursiveMode::Recursive);
            Ok(debouncer)
        },
    )
    .await
    .map_err(|e| e.to_string())??;

    *app.state::<WatchState>()
        .0
        .lock()
        .map_err(|e| e.to_string())? = Some(debouncer);
    Ok(())
}

#[tauri::command]
pub fn unwatch_repo(state: State<WatchState>) -> Result<(), String> {
    *state.0.lock().map_err(|e| e.to_string())? = None;
    Ok(())
}
