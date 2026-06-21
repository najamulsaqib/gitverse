<p align="center">
  <img src="public/icon.png" alt="GitVerse icon" width="120" />
</p>

<h1 align="center">GitVerse</h1>

<p align="center">
  A local-only, open-source desktop app for managing multiple git identities<br/>
  and everyday git workflows. No cloud. No login. No telemetry. No AI.
</p>

---

## The problem

Developers working across multiple accounts (personal, work, freelance)
constantly fight with:

- Wrong SSH key active → authentication failures
- Wrong `user.name` / `user.email` → commits under the wrong identity
- An unmanageable `~/.ssh/config`
- Manual, error-prone switching between accounts

## What GitVerse does

- Manages multiple git identities locally via SSH keypairs
- Switches the active identity with one click — updates `~/.gitconfig` and
  `~/.ssh/config`
- Provides a clean UI for everyday git work: branches, commits, diffs,
  stashes, and history
- Opens repos in whatever editor you already use
- Stores everything in plain JSON on your machine — nothing leaves the device

It does **not** do cloud sync, PR management, AI features, logins, or
telemetry — and never will. See [BRIEF.md](./BRIEF.md) for the full scope,
phases, and roadmap.

## Features

- **Identity management** — create and store multiple profiles backed by SSH
  keypairs, generated via the system `ssh-keygen`.
- **One-click switching** — activate a profile to update `~/.gitconfig` and
  `~/.ssh/config` instantly.
- **Repository management** — add existing local repos or clone over SSH.
- **Everyday git** — staging, committing, branches, diffs, and history.
- **Commit graph** — visual log of your branch history.
- **Stash management** — create, apply, and drop stashes.
- **Editor integration** — open any repo in your editor of choice.
- **Native menu** and a focused, dark-only interface.

## Tech stack

- **Tauri v2** — Rust backend, native desktop shell
- **React 19 + TypeScript** — frontend, built with **Vite 7**
- **Zustand** — frontend state management
- **Tailwind CSS v4** — styling, dark mode only

All git and SSH operations shell out to the system `git` and `ssh-keygen` —
GitVerse never reimplements git internals or bundles a git library.

## Download

Grab the latest build from the
[releases page](https://github.com/najamulsaqib/gitverse/releases).
Installers are available for macOS (Intel + Apple Silicon), Linux, and Windows.

## Development

```bash
npm install
npm run start
```

Other useful commands:

```bash
npm run build               # tsc + vite build (frontend only)
cd src-tauri && cargo check # type-check the Rust backend
```

## Status

`v0.0.1` — first public pre-release. Phase 1 (identity management, repo
management, branches, commits/diffs, stash, history) is in place. See
[CHANGELOG.md](./CHANGELOG.md) for what shipped and [BRIEF.md](./BRIEF.md) for
the roadmap.

## License

[MIT](./LICENSE)

## Installing on macOS

GitVerse is currently unsigned (no Apple Developer certificate). macOS will block it on first launch.

**Fix it with one command:**

```bash
xattr -cr /Applications/GitVerse.app
```

Then open it normally.

**Or via System Settings:**
Right-click the app → Open → click **Open Anyway** when prompted.

This is a one-time step. The app runs normally after that.
