mod commands;
mod models;

// On macOS, pressing Escape while the window is in native fullscreen sends
// `cancelOperation:` up the responder chain, which AppKit handles by exiting
// fullscreen — before the keystroke ever reaches the webview, so JS can't stop
// it. Override `cancelOperation:` on the window's class with a no-op to swallow
// the Escape and keep the app fullscreen.
#[cfg(target_os = "macos")]
fn keep_fullscreen_on_escape(window: &tauri::WebviewWindow) {
    use objc2::ffi::{class_addMethod, object_getClass};
    use objc2::runtime::{AnyObject, Sel};
    use objc2::sel;

    extern "C-unwind" fn cancel_operation(
        _this: *mut AnyObject,
        _cmd: Sel,
        _sender: *mut AnyObject,
    ) {
    }

    let Ok(ns_window) = window.ns_window() else {
        return;
    };
    #[allow(deprecated)]
    unsafe {
        let class = object_getClass(ns_window as *const AnyObject);
        if class.is_null() {
            return;
        }
        let imp: unsafe extern "C-unwind" fn() = std::mem::transmute(
            cancel_operation as extern "C-unwind" fn(*mut AnyObject, Sel, *mut AnyObject),
        );
        class_addMethod(
            class as *mut _,
            sel!(cancelOperation:),
            imp,
            c"v@:@".as_ptr(),
        );
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|_app| {
            #[cfg(target_os = "macos")]
            {
                use tauri::Manager;
                if let Some(window) = _app.get_webview_window("main") {
                    keep_fullscreen_on_escape(&window);
                }
            }
            Ok(())
        })
        .manage(commands::git::WatchState::default())
        .invoke_handler(tauri::generate_handler![
            commands::ssh::generate_ssh_key,
            commands::ssh::list_ssh_keys,
            commands::profiles::get_profiles,
            commands::profiles::add_profile,
            commands::profiles::update_profile,
            commands::profiles::remove_profile,
            commands::profiles::set_active_profile,
            commands::repos::validate_repo,
            commands::repos::get_repos,
            commands::repos::add_repo,
            commands::repos::update_repo,
            commands::repos::remove_repo,
            commands::repos::set_active_repo,
            commands::git::git_status,
            commands::git::git_log,
            commands::git::git_branches,
            commands::git::git_diff,
            commands::git::git_commit_changes,
            commands::git::git_commit_diff,
            commands::git::git_stage,
            commands::git::git_unstage,
            commands::git::git_stage_all,
            commands::git::git_unstage_all,
            commands::git::git_commit,
            commands::git::git_checkout,
            commands::git::git_default_branch,
            commands::git::git_fetch,
            commands::git::git_push,
            commands::git::git_pull,
            commands::git::watch_repo,
            commands::git::unwatch_repo,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
