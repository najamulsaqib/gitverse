use std::path::PathBuf;
use std::process::Command;

use tauri::Manager;

use crate::models::SshKeyInfo;

/// Resolve the user's home directory, preferring Tauri's path resolver and
/// falling back to the platform's home env var.
pub fn home_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    if let Ok(path) = app.path().home_dir() {
        return Ok(path);
    }

    #[cfg(windows)]
    let var = "USERPROFILE";
    #[cfg(not(windows))]
    let var = "HOME";

    std::env::var(var)
        .map(PathBuf::from)
        .map_err(|_| "could not resolve home directory".to_string())
}

/// Resolve `~/.ssh`.
fn ssh_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    Ok(home_dir(app)?.join(".ssh"))
}

/// Ensure `~/.ssh` exists, creating it with mode 0700 on unix.
fn ensure_ssh_dir(dir: &PathBuf) -> Result<(), String> {
    if !dir.exists() {
        std::fs::create_dir_all(dir).map_err(|e| e.to_string())?;

        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            let perms = std::fs::Permissions::from_mode(0o700);
            std::fs::set_permissions(dir, perms).map_err(|e| e.to_string())?;
        }
    }

    Ok(())
}

/// Parse a `.pub` file's contents into (key_type, comment).
/// The full trimmed line is the `public_key`; this extracts the first
/// whitespace-delimited token as `key_type` and everything after the
/// second token (the base64 data) as `comment`.
fn parse_public_key(public_key: &str) -> (String, String) {
    let mut parts = public_key.splitn(3, char::is_whitespace);
    let key_type = parts.next().unwrap_or("").to_string();
    let _base64 = parts.next();
    let comment = parts.next().unwrap_or("").trim().to_string();

    (key_type, comment)
}

/// Run `ssh-keygen -lf <pub_path>` and extract the `SHA256:...` fingerprint.
fn fingerprint_for(pub_path: &PathBuf) -> Result<String, String> {
    let output = Command::new("ssh-keygen")
        .arg("-lf")
        .arg(pub_path)
        .output()
        .map_err(|e| e.to_string())?;

    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).trim().to_string());
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let fingerprint = stdout
        .split_whitespace()
        .nth(1)
        .ok_or_else(|| "could not parse ssh-keygen output".to_string())?
        .to_string();

    Ok(fingerprint)
}

#[tauri::command]
pub fn generate_ssh_key(
    app: tauri::AppHandle,
    name: String,
    email: String,
) -> Result<SshKeyInfo, String> {
    if name.is_empty() || name.contains('/') || name.contains('\\') || name.contains("..") {
        return Err("invalid key name".to_string());
    }

    let dir = ssh_dir(&app)?;
    ensure_ssh_dir(&dir)?;

    let key_path = dir.join(&name);
    let pub_path = dir.join(format!("{name}.pub"));

    if key_path.exists() || pub_path.exists() {
        return Err(format!("a key named \"{name}\" already exists in ~/.ssh"));
    }

    let output = Command::new("ssh-keygen")
        .arg("-t")
        .arg("ed25519")
        .arg("-f")
        .arg(&key_path)
        .arg("-C")
        .arg(&email)
        .arg("-N")
        .arg("")
        .output()
        .map_err(|e| e.to_string())?;

    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).trim().to_string());
    }

    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let perms = std::fs::Permissions::from_mode(0o600);
        std::fs::set_permissions(&key_path, perms).map_err(|e| e.to_string())?;
    }

    let public_key = std::fs::read_to_string(&pub_path)
        .map_err(|e| e.to_string())?
        .trim()
        .to_string();

    let (key_type, comment) = parse_public_key(&public_key);
    let fingerprint = fingerprint_for(&pub_path)?;

    Ok(SshKeyInfo {
        name,
        key_type,
        public_key,
        comment,
        fingerprint,
    })
}

#[tauri::command]
pub fn list_ssh_keys(app: tauri::AppHandle) -> Result<Vec<SshKeyInfo>, String> {
    let dir = ssh_dir(&app)?;

    if !dir.exists() {
        return Ok(vec![]);
    }

    const SKIP_NAMES: &[&str] = &[
        "known_hosts",
        "known_hosts.old",
        "authorized_keys",
        "config",
        "environment",
    ];

    let entries = std::fs::read_dir(&dir).map_err(|e| e.to_string())?;

    let mut keys = Vec::new();

    for entry in entries.flatten() {
        let path = entry.path();

        if path.extension().and_then(|e| e.to_str()) != Some("pub") {
            continue;
        }

        let name = match path.file_stem().and_then(|s| s.to_str()) {
            Some(name) => name.to_string(),
            None => continue,
        };

        if SKIP_NAMES.contains(&name.as_str()) {
            continue;
        }

        let private_path = dir.join(&name);
        if !private_path.exists() {
            continue;
        }

        let public_key = match std::fs::read_to_string(&path) {
            Ok(contents) => contents.trim().to_string(),
            Err(_) => continue,
        };

        let (key_type, comment) = parse_public_key(&public_key);

        let fingerprint = match fingerprint_for(&path) {
            Ok(fp) => fp,
            Err(_) => continue,
        };

        keys.push(SshKeyInfo {
            name,
            key_type,
            public_key,
            comment,
            fingerprint,
        });
    }

    keys.sort_by(|a, b| a.name.cmp(&b.name));

    Ok(keys)
}
