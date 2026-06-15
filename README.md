<p align="center">
  <img src="public/icon.png" alt="GitVerse icon" width="120" />
</p>

<h1 align="center">GitVerse</h1>

<p align="center">
  A local-only, open-source desktop app for managing multiple git identities<br/>
  and everyday git workflows. No cloud. No login. No telemetry.
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

## Tech stack

- **Tauri v2** (Rust backend)
- **React + TypeScript** (Vite)
- **Zustand** for state
- **Tailwind CSS** (dark mode only)

All git and SSH operations shell out to the system `git` and `ssh-keygen` —
no reimplementation.

## Development

```bash
npm install
npm run start
```

## Status

Early scaffold: Tauri + React + Tailwind shell with a placeholder screen.
Phase 1 (identity management, repo management, branches, commits/diffs,
stash, history) is in progress — see [BRIEF.md](./BRIEF.md) for details.
