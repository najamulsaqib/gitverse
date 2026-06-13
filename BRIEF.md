# GitVerse — Project Brief

> A local-only, open-source desktop app for managing multiple git identities and day-to-day git workflows.
> No cloud. No login. No telemetry. Fully in the developer's control.

---

## The Problem

Developers working across multiple accounts (personal, work, freelance) constantly fight with:

- Wrong SSH key active → authentication failures
- Wrong `user.name` / `user.email` → commits under the wrong identity
- `~/.ssh/config` becoming unmanageable over time
- Switching between accounts is manual, error-prone, and tedious

Existing tools (GitKraken, Fork, Tower) are either paid, cloud-dependent, or don't solve the identity-switching problem cleanly. GitVerse solves exactly this — and nothing else that doesn't need solving.

---

## What GitVerse Is

A cross-platform desktop app (Windows / macOS / Linux) that:

- Manages multiple git identities locally via SSH keypairs
- Switches the active identity with a single click (updates `~/.gitconfig` and `~/.ssh/config`)
- Provides a clean UI for everyday git operations: branches, commits, diffs, stashes, and history
- Opens repos in any editor the developer already uses
- Stores everything in plain JSON files on the local machine — nothing leaves the device

---

## What GitVerse Is Not

- Not a cloud tool
- Not a PR management tool
- Not an AI-powered tool
- Not a collaboration platform
- No login, no account, no telemetry, no notifications
- Not competing with VS Code, Cursor, or any editor — it complements them

---

## Tech Stack

| Layer         | Choice                 | Reason                                                       |
| ------------- | ---------------------- | ------------------------------------------------------------ |
| Desktop shell | **Tauri v2**           | Small binary (~10MB), native, truly cross-platform           |
| Backend       | **Rust**               | Tauri's native language; handles shell commands, file writes |
| Frontend      | **React + TypeScript** | Familiar, fast to build UI with                              |
| State         | **Zustand**            | Lightweight, no boilerplate                                  |
| Styling       | **Tailwind CSS**       | Consistent, fast to iterate                                  |
| Distribution  | **GitHub Releases**    | Binary per platform (`.exe`, `.dmg`, `.AppImage`)            |

All git operations run by shelling out to the system's `git` binary and `ssh-keygen` — no reimplementation, no custom git library.

---

## Local Data Files

```
~/.gitverse/
  profiles.json    ← all saved identities (name, email, SSH key path, platform, colour)
  repos.json       ← pinned repo list (path, label, last opened)
```

Both files are plain human-readable JSON. Developers own them completely — back them up, version-control them, or delete them at will.

---

## How Identity Switching Works

When the active profile is toggled, the app performs three writes:

1. Updates `~/.ssh/config` → points `IdentityFile` to the selected profile's SSH key
2. Updates `~/.gitconfig` → sets `[user] name` and `[user] email`
3. Refreshes the SSH agent → `ssh-add -D && ssh-add <key_path>`

That's it. Instant, deterministic, no side effects.

---

## Phase 1 — MVP Scope

Everything in Phase 1 must ship before Phase 2 is touched.

### Identity Management

- Generate SSH keypair via `ssh-keygen` (the app runs the command, doesn't reimplement it)
- Display the generated public key with one-click copy
- Show a direct link to the SSH settings page for the chosen platform (GitHub / GitLab / Bitbucket)
- Save profile to `~/.gitverse/profiles.json`
- Toggle active profile → rewrites `~/.gitconfig` and `~/.ssh/config`
- Sidebar showing all profiles, colour-coded, with clear active state indicator

### Repo Management

- Add an existing local repo via folder picker
- Clone a remote repo using the active identity's SSH key
- Pinned repos list (not per-account — repos are global, identity is separate)
- Open any repo in a configurable editor (`code .`, `cursor .`, or user-defined command)

### Branch Viewer

- List all local and remote branches
- Switch branch
- Create branch from current HEAD
- Delete branch (with confirmation guard)

### Commit & Diff

- Staged / unstaged file list
- Inline or side-by-side diff view per file
- Stage, unstage individual files or all
- Commit with message input
- Push / pull using the active profile's SSH key

### Stash Management

- List all stashes with message and date
- Create a named stash
- Apply, pop, or drop a stash

### Log / History Graph

- Commit graph showing branch topology
- Per-commit: author, message, date, changed files
- Click a commit to inspect its diff

---

## Phase 2 — Worktree Management

Git worktrees allow multiple branches to be checked out simultaneously in separate folders. Almost no free GUI tool handles this well. Phase 2 makes worktrees a first-class feature:

- List all active worktrees for a repo
- Create a new worktree from an existing or new branch
- Open each worktree independently in the configured editor
- Delete a worktree cleanly (with guard)
- Visual map of which branches are checked out where

---

## Phase 3 — Expanded Git Operations

Scope is deliberately loose here — to be decided once Phase 2 is complete. Candidates:

- Tag management (create, delete, push tags)
- Merge / rebase surfacing (list conflicts, not resolve them)
- Submodule awareness
- Interactive rebase (squash, reorder commits)
- Commit history search / filter

Hard limits that apply to every phase, permanently:

- No cloud sync
- No AI features
- No PR / issue management
- No login or OAuth
- No telemetry or analytics
- No notifications or webhooks

---

## Repository Structure

```
gitverse/
├── src-tauri/                          # Rust / Tauri backend
│   ├── src/
│   │   ├── main.rs                     # App entry point, registers all commands
│   │   ├── models.rs                   # Profile, Repo, Stash structs
│   │   └── commands/
│   │       ├── setup.rs                # Checks git + ssh-keygen, triggers install if missing
│   │       ├── profiles.rs             # Read/write ~/.gitverse/profiles.json
│   │       ├── repos.rs                # Read/write ~/.gitverse/repos.json
│   │       ├── ssh.rs                  # ssh-keygen, ssh-add, key management
│   │       ├── git.rs                  # Branch, commit, push, pull, stash, log
│   │       └── config.rs               # Write ~/.gitconfig and ~/.ssh/config
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   └── icons/
│
├── src/                                # React frontend
│   ├── components/
│   │   ├── SetupGate/                  # First-launch screen if git/ssh not found
│   │   ├── Sidebar/                    # Profile switcher, active indicator
│   │   ├── RepoView/                   # Branches, commit list, diff panel
│   │   ├── StashPanel/                 # List, create, apply, drop
│   │   ├── LogGraph/                   # History, branch topology
│   │   ├── ProfileSetup/               # SSH keygen wizard, copy key, platform link
│   │   └── shared/                     # Button, Modal, Badge, etc.
│   ├── hooks/
│   │   ├── useTauri.ts                 # Typed wrappers around invoke()
│   │   ├── useProfile.ts
│   │   └── useRepo.ts
│   ├── store/
│   │   ├── profiles.ts                 # Zustand slice
│   │   ├── repos.ts                    # Zustand slice
│   │   └── ui.ts                       # Active view, selected branch, etc.
│   ├── types/
│   │   └── index.ts                    # Shared TS types matching Rust models
│   ├── App.tsx
│   └── main.tsx
│
├── .github/
│   ├── workflows/
│   │   ├── release.yml                 # Builds Mac + Windows + Linux on tag push
│   │   └── ci.yml                      # Lint + build check on every PR
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug_report.md
│   │   └── feature_request.md
│   └── PULL_REQUEST_TEMPLATE.md
│
├── docs/
│   ├── getting-started.md              # Install, first profile setup
│   ├── profiles.md                     # How identity switching works
│   ├── ssh-keys.md                     # Keygen walkthrough per platform
│   ├── repos.md                        # Adding repos, cloning, editor config
│   ├── branches.md
│   ├── stash.md
│   ├── log.md
│   ├── contributing.md                 # How to contribute, local dev setup
│   ├── architecture.md                 # How the Tauri command layer works
│   └── roadmap.md                      # P1 / P2 / P3 public roadmap
│
├── README.md                           # Hero, install, quickstart, platform notes
├── BRIEF.md                            # Project brief and scope
├── CHANGELOG.md
├── LICENSE                             # MIT
├── .gitignore
├── .gitverse-schema.json               # Documents the local config file format
├── package.json
├── vite.config.ts
├── tailwind.config.ts
└── tsconfig.json
```

---

## Prerequisites to Set Up Locally

```bash
# Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Node 18+
node --version

# Tauri CLI
cargo install tauri-cli

# Linux only — native deps
sudo apt install libwebkit2gtk-4.1-dev libssl-dev \
  libayatana-appindicator3-dev librsvg2-dev
```

---

## Distribution

Initial release via **GitHub Releases** with pre-built binaries:

- `.exe` — Windows
- `.dmg` — macOS
- `.AppImage` — Linux

Homebrew tap, winget, and AUR packages are future scope, not initial.

---

## Principles

- **Local only.** Every byte lives on the developer's machine.
- **Transparent.** The config files are plain JSON anyone can read and edit.
- **Composable.** The app doesn't replace `git` — it wraps it. Everything it does can be done manually in a terminal.
- **Focused.** Features are added only if they directly solve a real pain point for multi-account git users. Nothing else.
- **Open source.** MIT licensed. No paid tier, no upsell, no premium features.
