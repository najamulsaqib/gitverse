use std::path::{Path, PathBuf};
use std::process::Command;

use crate::commands::profiles::read_profiles;
use crate::commands::ssh::home_dir;
use crate::models::{Repo, RepoCandidate, RepoOwnerView, ReposData};

fn repos_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let dir = home_dir(app)?.join(".gitverse");

    if !dir.exists() {
        std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    }

    Ok(dir.join("repos.json"))
}

fn read_repos(app: &tauri::AppHandle) -> Result<ReposData, String> {
    let path = repos_path(app)?;

    if !path.exists() {
        return Ok(ReposData::default());
    }

    let contents = std::fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let mut data: ReposData = serde_json::from_str(&contents).map_err(|e| e.to_string())?;

    // Repos pinned before the verbatim-prefix fix were stored with the `\\?\`
    // prefix; clean them on read so display and git operations get a normal path.
    for repo in &mut data.repos {
        repo.path = strip_verbatim_prefix(&repo.path);
    }

    Ok(data)
}

fn write_repos(app: &tauri::AppHandle, data: &ReposData) -> Result<(), String> {
    let path = repos_path(app)?;
    let contents = serde_json::to_string_pretty(data).map_err(|e| e.to_string())?;
    std::fs::write(&path, contents).map_err(|e| e.to_string())
}

/// Strip Windows' extended-length "verbatim" path prefix. `canonicalize()` on
/// Windows returns paths like `\\?\D:\projects\gitverse`, which surfaces in the
/// UI as an invalid-looking path and confuses some external tools. Verbatim UNC
/// paths (`\\?\UNC\server\share`) collapse back to `\\server\share`. No-op on
/// other platforms and on paths that lack the prefix.
fn strip_verbatim_prefix(path: &str) -> String {
    if let Some(rest) = path.strip_prefix(r"\\?\UNC\") {
        format!(r"\\{rest}")
    } else if let Some(rest) = path.strip_prefix(r"\\?\") {
        rest.to_string()
    } else {
        path.to_string()
    }
}

/// Resolve a folder to its canonical, absolute path string for stable comparison.
fn canonical(path: &str) -> Result<String, String> {
    let canonical = Path::new(path)
        .canonicalize()
        .map_err(|_| "That folder could not be found.".to_string())?;
    Ok(strip_verbatim_prefix(&canonical.to_string_lossy()))
}

/// Run a git command in `dir` and return trimmed stdout, or `None` on failure.
fn git_in(dir: &str, args: &[&str]) -> Option<String> {
    let output = Command::new("git")
        .arg("-C")
        .arg(dir)
        .args(args)
        .output()
        .ok()?;
    if !output.status.success() {
        return None;
    }
    Some(String::from_utf8_lossy(&output.stdout).trim().to_string())
}

/// Validate that `path` is a real git repository and report its details for the
/// confirmation step. Returns a user-friendly error otherwise.
#[tauri::command]
pub fn validate_repo(path: String) -> Result<RepoCandidate, String> {
    let dir = canonical(&path)?;
    let dir_path = Path::new(&dir);

    if !dir_path.is_dir() {
        return Err("Please choose a folder, not a file.".to_string());
    }

    // A `.git` entry (directory for normal repos, file for worktrees/submodules)
    // is the cheap check; confirm with git so we reject `.git`-less folders.
    if !dir_path.join(".git").exists()
        || git_in(&dir, &["rev-parse", "--is-inside-work-tree"]).as_deref() != Some("true")
    {
        return Err("This folder isn't a Git repository (no .git directory found).".to_string());
    }

    let name = dir_path
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| "repository".to_string());

    let branch = git_in(&dir, &["rev-parse", "--abbrev-ref", "HEAD"])
        .filter(|b| b != "HEAD")
        .unwrap_or_else(|| "detached".to_string());

    let remote = git_in(&dir, &["remote", "get-url", "origin"]).unwrap_or_default();

    Ok(RepoCandidate {
        name,
        path: dir,
        branch,
        remote,
    })
}

/// True for SSH-style git remotes: `ssh://git@host/…` or the scp-like
/// `git@host:owner/repo.git`. HTTPS and other schemes are intentionally excluded.
fn is_ssh_url(url: &str) -> bool {
    url.starts_with("ssh://") || (url.contains('@') && url.contains(':') && !url.contains("://"))
}

/// Derive the folder name git would create for a remote URL: the last path
/// segment with any trailing `.git` stripped.
fn repo_name_from_url(url: &str) -> String {
    let last = url
        .trim_end_matches('/')
        .rsplit(|c| c == '/' || c == ':')
        .next()
        .unwrap_or("repo");
    last.strip_suffix(".git").unwrap_or(last).to_string()
}

/// Clone a remote repository over SSH into `dest_dir`, then validate the result
/// for the confirmation step. HTTPS URLs are rejected on purpose — GitVerse
/// authenticates with per-identity SSH keys (`~/.ssh/config` Host blocks), so
/// only `git@host:owner/repo.git` / `ssh://…` remotes work.
#[tauri::command]
pub fn clone_repo(url: String, dest_dir: String) -> Result<RepoCandidate, String> {
    let url = url.trim();
    if url.is_empty() {
        return Err("Enter a repository URL.".to_string());
    }
    if url.starts_with("http://") || url.starts_with("https://") {
        return Err(
            "HTTPS URLs aren't supported — use the SSH URL (git@host:owner/repo.git). \
             GitVerse authenticates with your per-identity SSH key."
                .to_string(),
        );
    }
    if !is_ssh_url(url) {
        return Err(
            "That doesn't look like an SSH Git URL. Expected git@host:owner/repo.git.".to_string(),
        );
    }

    let parent = canonical(&dest_dir)?;
    if !Path::new(&parent).is_dir() {
        return Err("Please choose a folder to clone into.".to_string());
    }

    let name = repo_name_from_url(url);
    let target = Path::new(&parent).join(&name);
    if target.exists() {
        return Err(format!("A folder named \"{name}\" already exists here."));
    }

    let output = Command::new("git")
        .arg("clone")
        .arg(url)
        .arg(&target)
        .output()
        .map_err(|e| format!("Failed to run git: {e}"))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("git clone failed:\n{}", stderr.trim()));
    }

    validate_repo(target.to_string_lossy().to_string())
}

#[tauri::command]
pub fn get_repos(app: tauri::AppHandle) -> Result<ReposData, String> {
    read_repos(&app)
}

/// Resolve a repo together with its owning profile into a ready-to-render view
/// model, so the frontend doesn't join repos to profiles by id itself. Falls
/// back to the first profile (matching the old UI default), and returns `None`
/// when no repo has that id.
#[tauri::command]
pub fn repo_view(app: tauri::AppHandle, id: String) -> Result<Option<RepoOwnerView>, String> {
    let repos = read_repos(&app)?;
    let Some(repo) = repos.repos.iter().find(|r| r.id == id) else {
        return Ok(None);
    };

    let profiles = read_profiles(&app)?;
    let owner = profiles
        .profiles
        .iter()
        .find(|p| p.id == repo.owner)
        .or_else(|| profiles.profiles.first());

    Ok(Some(RepoOwnerView {
        id: repo.id.clone(),
        name: repo.name.clone(),
        remote: !repo.remote.is_empty(),
        owner_color: owner.map(|o| o.color.clone()).unwrap_or_default(),
        owner_label: owner.map(|o| o.label.clone()).unwrap_or_default(),
    }))
}

/// Persist a repo to the pinned list, rejecting duplicates by canonical path.
#[tauri::command]
pub fn add_repo(app: tauri::AppHandle, repo: Repo) -> Result<ReposData, String> {
    let mut data = read_repos(&app)?;

    let path = canonical(&repo.path)?;

    if data
        .repos
        .iter()
        .any(|r| canonical(&r.path).map(|p| p == path).unwrap_or(false))
    {
        return Err("That repository is already in your list.".to_string());
    }

    let repo = Repo { path, ..repo };
    if data.active_id.is_none() {
        data.active_id = Some(repo.id.clone());
    }
    data.repos.push(repo);

    write_repos(&app, &data)?;

    Ok(data)
}

/// Update an existing pinned repo in place (e.g. re-assign its linked identity).
#[tauri::command]
pub fn update_repo(app: tauri::AppHandle, repo: Repo) -> Result<ReposData, String> {
    let mut data = read_repos(&app)?;

    let index = data
        .repos
        .iter()
        .position(|r| r.id == repo.id)
        .ok_or_else(|| format!("no repo with id \"{}\"", repo.id))?;

    data.repos[index] = repo;

    write_repos(&app, &data)?;

    Ok(data)
}

/// Remove a repo from the pinned list. The repository on disk is left untouched.
#[tauri::command]
pub fn remove_repo(app: tauri::AppHandle, id: String) -> Result<ReposData, String> {
    let mut data = read_repos(&app)?;

    let index = data
        .repos
        .iter()
        .position(|r| r.id == id)
        .ok_or_else(|| format!("no repo with id \"{id}\""))?;

    data.repos.remove(index);

    if data.active_id.as_deref() == Some(id.as_str()) {
        data.active_id = data.repos.first().map(|r| r.id.clone());
    }

    write_repos(&app, &data)?;

    Ok(data)
}

/// Remember which repo the user currently has open, so it reopens on next launch.
#[tauri::command]
pub fn set_active_repo(app: tauri::AppHandle, id: String) -> Result<ReposData, String> {
    let mut data = read_repos(&app)?;

    if !data.repos.iter().any(|r| r.id == id) {
        return Err(format!("no repo with id \"{id}\""));
    }

    data.active_id = Some(id);

    write_repos(&app, &data)?;

    Ok(data)
}
