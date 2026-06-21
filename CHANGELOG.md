# Changelog

All notable changes to GitVerse are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.0.1] - 2026-06-21 (pre-release)

First public pre-release of GitVerse — a local-only, open-source desktop app
for managing multiple git identities (SSH keypairs) and everyday git workflows.
No cloud, no login, no telemetry, no AI.

### Added

#### Identity & SSH management
- Manage multiple git identities (profiles) backed by SSH keypairs, persisted
  locally to `~/.gitverse/profiles.json`.
- Generate SSH keypairs via the system `ssh-keygen` and switch the active
  identity with one click — updates `~/.gitconfig` and `~/.ssh/config`.
- First-run setup gate that walks new users through creating their first
  profile.

#### Repository management
- Add existing local repositories and clone remote repositories over SSH.
- Persist the repository list locally to `~/.gitverse/repos.json`.
- Open any repository in your existing editor of choice.

#### Everyday git workflows
- Working-tree status view with staging and committing.
- Branch listing, switching, and management.
- Commit history with a visual commit graph.
- Diff viewing for changes.
- Stash management — create, list, apply, and drop stashes.

#### Application shell
- Native application menu integration.
- Dark-mode-only UI built with Tailwind CSS v4, themed from the app icon.
- Built on Tauri v2 (Rust) with a React 19 + TypeScript (Vite) frontend and
  Zustand state management.
- MIT licensed.

### Changed
- Improved status and log performance for large repositories.
- Various UI refinements across setup, sidebar, and repository views.

### Fixed
- Removed unused imports and addressed GitHub Actions formatting checks.

[0.0.1]: https://github.com/najamulsaqib/gitverse/releases/tag/v0.0.1-beta.1
