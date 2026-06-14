use std::path::PathBuf;

use crate::commands::config::apply_identity;
use crate::commands::ssh::home_dir;
use crate::models::{Profile, ProfilesData};

fn profiles_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let dir = home_dir(app)?.join(".gitverse");

    if !dir.exists() {
        std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    }

    Ok(dir.join("profiles.json"))
}

fn read_profiles(app: &tauri::AppHandle) -> Result<ProfilesData, String> {
    let path = profiles_path(app)?;

    if !path.exists() {
        return Ok(ProfilesData::default());
    }

    let contents = std::fs::read_to_string(&path).map_err(|e| e.to_string())?;
    serde_json::from_str(&contents).map_err(|e| e.to_string())
}

fn write_profiles(app: &tauri::AppHandle, data: &ProfilesData) -> Result<(), String> {
    let path = profiles_path(app)?;
    let contents = serde_json::to_string_pretty(data).map_err(|e| e.to_string())?;
    std::fs::write(&path, contents).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_profiles(app: tauri::AppHandle) -> Result<ProfilesData, String> {
    read_profiles(&app)
}

#[tauri::command]
pub fn add_profile(app: tauri::AppHandle, profile: Profile) -> Result<ProfilesData, String> {
    let mut data = read_profiles(&app)?;

    if data.profiles.iter().any(|p| p.id == profile.id) {
        return Err(format!(
            "a profile with id \"{}\" already exists",
            profile.id
        ));
    }

    let is_first = data.profiles.is_empty();
    data.profiles.push(profile.clone());

    if is_first {
        data.active_id = Some(profile.id.clone());
        apply_identity(&app, &profile)?;
    }

    write_profiles(&app, &data)?;

    Ok(data)
}

#[tauri::command]
pub fn update_profile(app: tauri::AppHandle, profile: Profile) -> Result<ProfilesData, String> {
    let mut data = read_profiles(&app)?;

    let index = data
        .profiles
        .iter()
        .position(|p| p.id == profile.id)
        .ok_or_else(|| format!("no profile with id \"{}\"", profile.id))?;

    data.profiles[index] = profile.clone();

    if data.active_id.as_deref() == Some(profile.id.as_str()) {
        apply_identity(&app, &profile)?;
    }

    write_profiles(&app, &data)?;

    Ok(data)
}

#[tauri::command]
pub fn remove_profile(app: tauri::AppHandle, id: String) -> Result<ProfilesData, String> {
    let mut data = read_profiles(&app)?;

    let index = data
        .profiles
        .iter()
        .position(|p| p.id == id)
        .ok_or_else(|| format!("no profile with id \"{id}\""))?;

    data.profiles.remove(index);

    if data.active_id.as_deref() == Some(id.as_str()) {
        data.active_id = None;
    }

    write_profiles(&app, &data)?;

    Ok(data)
}

#[tauri::command]
pub fn set_active_profile(app: tauri::AppHandle, id: String) -> Result<ProfilesData, String> {
    let mut data = read_profiles(&app)?;

    let profile = data
        .profiles
        .iter()
        .find(|p| p.id == id)
        .ok_or_else(|| format!("no profile with id \"{id}\""))?
        .clone();

    data.active_id = Some(id);

    apply_identity(&app, &profile)?;

    write_profiles(&app, &data)?;

    Ok(data)
}
