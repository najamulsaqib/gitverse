# GitVerse

Local-only, open-source desktop app for managing multiple git identities (SSH
keypairs) and everyday git workflows. No cloud, no login, no telemetry, no AI
features. Full scope, phases, and roadmap: [BRIEF.md](./BRIEF.md).

## Stack

- **Tauri v2** (Rust backend) + **React 19 + TypeScript** (Vite 7 frontend)
- **Zustand** for frontend state
- **Tailwind CSS v4** via `@tailwindcss/vite` — dark mode only

## Non-negotiable principles

- **Local only.** All persisted data lives in `~/.gitverse/profiles.json` and
  `~/.gitverse/repos.json` — plain JSON, no database, nothing leaves the device.
- **Wrap, don't reimplement.** Every git/SSH operation shells out to the
  system's `git` and `ssh-keygen` binaries via `std::process::Command`. Never
  reimplement git internals or bundle a git library.
- **No cloud sync, AI, telemetry, login, or notifications.** Ever. If a task
  seems to need one of these, stop and flag it instead of adding it.
- **Dark mode only.** `color-scheme: dark` is set globally in `src/App.css`.
  Don't add Tailwind `dark:` variants or any light-theme styles — use the
  palette defined via `@theme` in `src/App.css` (sampled from
  `public/icon.svg`): `bg` (#0f0e1a), `surface`, `border`, `indigo` /
  `indigo-light`, and `teal` / `teal-light` as accents, e.g. `bg-bg`,
  `text-teal`.
- **Use the `@/` import alias for everything under `src/`** (e.g.
  `import { useProfile } from "@/hooks/useProfile"`), never relative `./` or
  `../` paths. Configured in `tsconfig.json` (`paths`) and `vite.config.ts`
  (`resolve.alias`).

## Layout

Target structure per [BRIEF.md](./BRIEF.md) (most of this doesn't exist yet —
build it incrementally, one command/component at a time):

- `src-tauri/src/`
  - `main.rs` — entry point, registers commands
  - `models.rs` — shared structs (Profile, Repo, Stash) — keep field names in
    sync with `src/types/index.ts` (use `#[serde(rename_all = "camelCase")]`)
  - `commands/` — one module per domain: `setup`, `profiles`, `repos`, `ssh`,
    `git`, `config`
- `src/`
  - `components/` — one folder per feature (Sidebar, RepoView, ProfileSetup,
    StashPanel, LogGraph, SetupGate, shared/)
  - `store/` — Zustand slices (`profiles.ts`, `repos.ts`, `ui.ts`)
  - `hooks/` — typed wrappers around `invoke()` (`useProfile.ts`, `useRepo.ts`)
  - `types/` — shared TS types mirroring the Rust models

## Dev commands

```bash
npm run tauri dev              # run the app (Rust + frontend, hot reload)
npm run build                  # tsc + vite build (frontend only)
cd src-tauri && cargo check    # type-check the Rust backend
```

## Known pins

- `time` is pinned to `0.3.47` in `src-tauri/Cargo.lock`. `0.3.48` fails to
  compile under rustc 1.95.0 (E0119 coherence conflict via `cookie`/
  `tauri-utils`). Don't let `cargo update` drift this without re-checking
  `cargo check` first.
