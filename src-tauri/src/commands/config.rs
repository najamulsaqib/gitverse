use std::process::Command;

use crate::commands::ssh::home_dir;
use crate::models::Profile;

const MANAGED_START: &str = "# >>> GitVerse managed identity — do not edit between these lines >>>";
const MANAGED_END: &str = "# <<< GitVerse managed identity <<<";

/// Apply a profile as the active git/ssh identity:
/// 1. `git config --global user.name/user.email`
/// 2. Rewrite the GitVerse-managed block in `~/.ssh/config`
/// 3. Best-effort refresh of the ssh-agent
pub fn apply_identity(app: &tauri::AppHandle, profile: &Profile) -> Result<(), String> {
    set_git_config("user.name", &profile.name)?;
    set_git_config("user.email", &profile.email)?;

    update_ssh_config(app, profile)?;

    refresh_ssh_agent(app, profile);

    Ok(())
}

fn set_git_config(key: &str, value: &str) -> Result<(), String> {
    let output = Command::new("git")
        .args(["config", "--global", key, value])
        .output()
        .map_err(|e| e.to_string())?;

    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).trim().to_string());
    }

    Ok(())
}

fn update_ssh_config(app: &tauri::AppHandle, profile: &Profile) -> Result<(), String> {
    let dir = home_dir(app)?.join(".ssh");

    if !dir.exists() {
        std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;

        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            let perms = std::fs::Permissions::from_mode(0o700);
            std::fs::set_permissions(&dir, perms).map_err(|e| e.to_string())?;
        }
    }

    let config_path = dir.join("config");

    let existing = if config_path.exists() {
        std::fs::read_to_string(&config_path).map_err(|e| e.to_string())?
    } else {
        String::new()
    };

    let managed_block = format!(
        "{MANAGED_START}\nHost *\n    IdentityFile ~/.ssh/{}\n    IdentitiesOnly yes\n{MANAGED_END}",
        profile.key
    );

    let new_contents = match (existing.find(MANAGED_START), existing.find(MANAGED_END)) {
        (Some(start), Some(end)) if end >= start => {
            let end_of_marker = end + MANAGED_END.len();
            let before = &existing[..start];
            let after = &existing[end_of_marker..];
            format!("{before}{managed_block}{after}")
        }
        _ => {
            if existing.trim().is_empty() {
                managed_block
            } else {
                format!("{managed_block}\n\n{existing}")
            }
        }
    };

    std::fs::write(&config_path, new_contents).map_err(|e| e.to_string())?;

    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let perms = std::fs::Permissions::from_mode(0o600);
        std::fs::set_permissions(&config_path, perms).map_err(|e| e.to_string())?;
    }

    Ok(())
}

fn refresh_ssh_agent(app: &tauri::AppHandle, profile: &Profile) {
    if let Err(e) = Command::new("ssh-add").arg("-D").output() {
        eprintln!("ssh-add -D failed: {e}");
    }

    let home = match home_dir(app) {
        Ok(home) => home,
        Err(e) => {
            eprintln!("could not resolve home directory for ssh-add: {e}");
            return;
        }
    };

    let key_path = home.join(".ssh").join(&profile.key);

    #[cfg(target_os = "macos")]
    let result = Command::new("ssh-add")
        .arg("--apple-use-keychain")
        .arg(&key_path)
        .output();

    #[cfg(not(target_os = "macos"))]
    let result = Command::new("ssh-add").arg(&key_path).output();

    match result {
        Ok(output) if !output.status.success() => {
            eprintln!(
                "ssh-add failed: {}",
                String::from_utf8_lossy(&output.stderr).trim()
            );
        }
        Err(e) => eprintln!("ssh-add failed: {e}"),
        _ => {}
    }
}
