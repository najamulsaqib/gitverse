---
name: backend
description: Work on GitVerse's Rust/Tauri backend (src-tauri/) - Tauri commands, profile/repo config I/O, SSH and git shell-outs. Use when implementing or modifying anything under src-tauri/.
---

# GitVerse Backend (Rust / Tauri)

Minimal-change rules from the global skill still apply: touch only what the
task needs, match existing style, no opportunistic refactors. This skill adds
the project-specific conventions for `src-tauri/`.

## Architecture

- `src-tauri/src/main.rs` — entry point, calls `gitverse_lib::run()`
- `src-tauri/src/lib.rs` — builds the Tauri app, registers commands via
  `.invoke_handler(tauri::generate_handler![...])`
- `src-tauri/src/models.rs` — shared structs (Profile, Repo, Stash, ...)
- `src-tauri/src/commands/<domain>.rs` — one module per domain: `setup`,
  `profiles`, `repos`, `ssh`, `git`, `config`

When adding a new command: write the function in the right domain module,
`#[tauri::command]` it, add it to `generate_handler![...]` in `lib.rs`, and
add a matching typed wrapper in `src/hooks/`. That's the whole loop — don't
restructure other commands while you're in there.

## Conventions

- **Command signature:** `pub fn name(...) -> Result<T, String>`. Convert
  errors with `.map_err(|e| e.to_string())` so they surface in the frontend.
- **Shell out, never reimplement.** Git and SSH operations run the system
  `git` / `ssh-keygen` / `ssh-add` via `std::process::Command`. Check exit
  status and stderr; don't parse output more than the feature needs.
- **Serde models match TS types.** Every struct in `models.rs` needs
  `#[derive(Serialize, Deserialize)]` and `#[serde(rename_all = "camelCase")]`
  so field names match `src/types/index.ts` without manual renaming on either
  side. If you add/change a field here, update the TS type in the same change.
- **Config files.** `~/.gitverse/profiles.json` and `~/.gitverse/repos.json`
  are plain JSON read/written via `serde_json`. Create `~/.gitverse/` if
  missing; don't add a database, migrations, or a config format.
- **No new dependencies** unless the task genuinely requires one — this app's
  selling point is a small binary. Prefer `std` + the system binaries.

## Verify

```bash
cd src-tauri && cargo check
```

Run this after every change. If `cargo check` is clean, run `npm run tauri dev`
to confirm the command works end-to-end from the UI when the change is
user-facing.

## Known pin

`time` is pinned to `0.3.47` in `Cargo.lock` (0.3.48 breaks under rustc
1.95.0 with an E0119 coherence error via `cookie`/`tauri-utils`). If
`cargo update` upgrades it, run `cargo check` — if it fails with E0119 on
`HourBase`, re-pin with `cargo update -p time --precise 0.3.47`.
