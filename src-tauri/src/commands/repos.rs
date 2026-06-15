use std::path::{Path, PathBuf};
use std::process::Command;

use crate::commands::ssh::home_dir;
use crate::models::{Repo, RepoCandidate, ReposData};

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
    serde_json::from_str(&contents).map_err(|e| e.to_string())
}

fn write_repos(app: &tauri::AppHandle, data: &ReposData) -> Result<(), String> {
    let path = repos_path(app)?;
    let contents = serde_json::to_string_pretty(data).map_err(|e| e.to_string())?;
    std::fs::write(&path, contents).map_err(|e| e.to_string())
}

/// Resolve a folder to its canonical, absolute path string for stable comparison.
fn canonical(path: &str) -> Result<String, String> {
    let canonical = Path::new(path)
        .canonicalize()
        .map_err(|_| "That folder could not be found.".to_string())?;
    Ok(canonical.to_string_lossy().to_string())
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

#[tauri::command]
pub fn get_repos(app: tauri::AppHandle) -> Result<ReposData, String> {
    read_repos(&app)
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
