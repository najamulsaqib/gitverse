mod commands;
mod models;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            commands::ssh::generate_ssh_key,
            commands::ssh::list_ssh_keys,
            commands::profiles::get_profiles,
            commands::profiles::add_profile,
            commands::profiles::update_profile,
            commands::profiles::remove_profile,
            commands::profiles::set_active_profile,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
