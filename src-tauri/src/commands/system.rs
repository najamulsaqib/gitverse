use std::path::Path;
use std::process::Command;

/// Open a repository folder in the user's editor (Cursor, VS Code, etc.).
#[tauri::command]
pub fn open_repo_in_editor(path: String) -> Result<(), String> {
    let path = Path::new(&path);
    if !path.is_dir() {
        return Err("Repository folder not found".into());
    }

    open_in_editor(path, ".")
}

/// Open a single file in the user's editor, falling back across the same list of
/// editors as `open_repo_in_editor`.
#[tauri::command]
pub fn open_file_in_editor(repo_path: String, file: String) -> Result<(), String> {
    let full = resolve_file(&repo_path, &file)?;
    let dir = full.parent().unwrap_or_else(|| Path::new(&repo_path));
    let target = full.to_str().ok_or("Invalid file path")?;
    open_in_editor(dir, target)
}

/// Open a single file with the OS default program for its type.
#[tauri::command]
pub fn open_file_with_default(repo_path: String, file: String) -> Result<(), String> {
    let full = resolve_file(&repo_path, &file)?;
    let target = full.to_str().ok_or("Invalid file path")?;

    #[cfg(target_os = "macos")]
    let result = Command::new("open").arg(target).status();
    #[cfg(target_os = "windows")]
    let result = Command::new("cmd")
        .args(["/C", "start", "", target])
        .status();
    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    let result = Command::new("xdg-open").arg(target).status();

    match result {
        Ok(status) if status.success() => Ok(()),
        Ok(_) => Err("Could not open the file".into()),
        Err(e) => Err(e.to_string()),
    }
}

/// Resolve a repo-relative file to an existing absolute path.
fn resolve_file(repo_path: &str, file: &str) -> Result<std::path::PathBuf, String> {
    let full = Path::new(repo_path).join(file);
    if !full.exists() {
        return Err("File not found".into());
    }
    Ok(full)
}

/// Try each known editor in turn, opening `arg` (a folder ".", or a file path)
/// with `dir` as the working directory. Errors only if none is installed.
fn open_in_editor(dir: &Path, arg: &str) -> Result<(), String> {
    for bin in ["cursor", "code", "codium", "windsurf"] {
        if spawn_in_dir(bin, dir, arg)? {
            return Ok(());
        }
    }

    #[cfg(target_os = "macos")]
    for app in [
        "Cursor",
        "Visual Studio Code",
        "Windsurf",
        "Zed",
        "Nova",
        "Xcode",
    ] {
        if open_mac_app(app, dir, arg)? {
            return Ok(());
        }
    }

    #[cfg(target_os = "windows")]
    for bin in ["cursor.cmd", "code.cmd"] {
        if spawn_in_dir(bin, dir, arg)? {
            return Ok(());
        }
    }

    Err("No supported editor found. Install Cursor, VS Code, or another supported editor.".into())
}

fn spawn_in_dir(bin: &str, dir: &Path, arg: &str) -> Result<bool, String> {
    match Command::new(bin).arg(arg).current_dir(dir).spawn() {
        Ok(_) => Ok(true),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(false),
        Err(e) => Err(e.to_string()),
    }
}

#[cfg(target_os = "macos")]
fn open_mac_app(app: &str, dir: &Path, arg: &str) -> Result<bool, String> {
    // `arg` is "." for a repo (open the working dir) or an absolute file path.
    let target = if arg == "." {
        dir.to_str().ok_or("Invalid path")?.to_string()
    } else {
        arg.to_string()
    };
    match Command::new("open").args(["-a", app, &target]).status() {
        Ok(status) if status.success() => Ok(true),
        Ok(_) => Ok(false),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(false),
        Err(e) => Err(e.to_string()),
    }
}
