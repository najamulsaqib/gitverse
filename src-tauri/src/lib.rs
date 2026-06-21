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

/// Build GitVerse's native application menu. Item ids on the custom entries are
/// emitted to the frontend as `menu-action` events; the predefined items
/// (clipboard, window controls) are handled natively by the OS.
fn build_menu(app: &tauri::AppHandle) -> tauri::Result<tauri::menu::Menu<tauri::Wry>> {
    use tauri::menu::{AboutMetadata, Menu, MenuItem, PredefinedMenuItem, Submenu};

    let about = AboutMetadata {
        name: Some("GitVerse".into()),
        version: Some(env!("CARGO_PKG_VERSION").into()),
        comments: Some(
            "Manage multiple git identities (SSH keypairs) and everyday git \
             workflows — branches, commits, diffs, stashes, and history. \
             Local-only: no cloud, no login, no telemetry, no AI."
                .into(),
        ),
        authors: Some(vec!["GitVerse contributors".into()]),
        copyright: Some(format!(
            "Copyright © {} GitVerse contributors",
            time::OffsetDateTime::now_utc().year()
        )),
        license: Some("MIT".into()),
        ..Default::default()
    };

    let app_menu = Submenu::with_items(
        app,
        "GitVerse",
        true,
        &[
            &PredefinedMenuItem::about(app, Some("About GitVerse"), Some(about))?,
            &PredefinedMenuItem::separator(app)?,
            &PredefinedMenuItem::hide(app, Some("Hide GitVerse"))?,
            &PredefinedMenuItem::hide_others(app, None)?,
            &PredefinedMenuItem::show_all(app, None)?,
            &PredefinedMenuItem::separator(app)?,
            &PredefinedMenuItem::quit(app, Some("Quit GitVerse"))?,
        ],
    )?;

    let file_menu = Submenu::with_items(
        app,
        "File",
        true,
        &[
            &MenuItem::with_id(
                app,
                "add-repo",
                "Add Repository…",
                true,
                Some("CmdOrCtrl+O"),
            )?,
            &MenuItem::with_id(
                app,
                "clone-repo",
                "Clone Repository…",
                true,
                Some("CmdOrCtrl+Shift+O"),
            )?,
            &PredefinedMenuItem::separator(app)?,
            &MenuItem::with_id(
                app,
                "add-identity",
                "Add Identity…",
                true,
                Some("CmdOrCtrl+Shift+I"),
            )?,
            &PredefinedMenuItem::separator(app)?,
            &PredefinedMenuItem::close_window(app, None)?,
        ],
    )?;

    let edit_menu = Submenu::with_items(
        app,
        "Edit",
        true,
        &[
            &PredefinedMenuItem::undo(app, None)?,
            &PredefinedMenuItem::redo(app, None)?,
            &PredefinedMenuItem::separator(app)?,
            &PredefinedMenuItem::cut(app, None)?,
            &PredefinedMenuItem::copy(app, None)?,
            &PredefinedMenuItem::paste(app, None)?,
            &PredefinedMenuItem::select_all(app, None)?,
            &PredefinedMenuItem::separator(app)?,
            &MenuItem::with_id(
                app,
                "stage-all",
                "Stage All Changes",
                true,
                Some("CmdOrCtrl+Shift+A"),
            )?,
            &MenuItem::with_id(
                app,
                "unstage-all",
                "Unstage All Changes",
                true,
                None::<&str>,
            )?,
            &PredefinedMenuItem::separator(app)?,
            &MenuItem::with_id(
                app,
                "stash-changes",
                "Stash Changes…",
                true,
                Some("CmdOrCtrl+Shift+S"),
            )?,
        ],
    )?;

    let repo_menu = Submenu::with_items(
        app,
        "Repository",
        true,
        &[
            &MenuItem::with_id(app, "new-branch", "New Branch…", true, Some("CmdOrCtrl+B"))?,
            &PredefinedMenuItem::separator(app)?,
            &MenuItem::with_id(
                app,
                "sync",
                "Sync (Fetch · Push · Pull)",
                true,
                Some("CmdOrCtrl+S"),
            )?,
            &MenuItem::with_id(app, "refresh", "Refresh", true, Some("CmdOrCtrl+R"))?,
        ],
    )?;

    let view_menu = Submenu::with_items(
        app,
        "View",
        true,
        &[&PredefinedMenuItem::fullscreen(app, None)?],
    )?;

    let window_menu = Submenu::with_items(
        app,
        "Window",
        true,
        &[
            &PredefinedMenuItem::minimize(app, None)?,
            &PredefinedMenuItem::maximize(app, None)?,
            &PredefinedMenuItem::separator(app)?,
            &PredefinedMenuItem::close_window(app, None)?,
        ],
    )?;

    Menu::with_items(
        app,
        &[
            &app_menu,
            &file_menu,
            &edit_menu,
            &repo_menu,
            &view_menu,
            &window_menu,
        ],
    )
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .menu(build_menu)
        .on_menu_event(|app, event| {
            use tauri::Emitter;
            // Forward the clicked item's id to the frontend, which maps it to the
            // matching store action (open a modal, sync, refresh, …).
            let _ = app.emit("menu-action", event.id().0.as_str());
        })
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
            commands::repos::clone_repo,
            commands::repos::get_repos,
            commands::repos::repo_view,
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
            commands::git::git_discard_file,
            commands::git::git_stash_list,
            commands::git::git_stash_save,
            commands::git::git_stash_apply,
            commands::git::git_stash_pop,
            commands::git::git_stash_drop,
            commands::git::git_stash_changes,
            commands::git::git_stash_diff,
            commands::git::git_commit,
            commands::git::git_checkout,
            commands::git::git_cherry_pick,
            commands::git::git_revert,
            commands::git::git_reset,
            commands::git::git_default_branch,
            commands::git::git_fetch,
            commands::git::git_push,
            commands::git::git_pull,
            commands::git::git_fetch_silent,
            commands::git::git_check_access,
            commands::git::watch_repo,
            commands::git::unwatch_repo,
            commands::system::open_repo_in_editor,
            commands::system::open_file_in_editor,
            commands::system::open_file_with_default,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
