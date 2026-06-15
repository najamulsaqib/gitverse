---
name: release
description: Cut a GitVerse release. Bumps the version, updates CHANGELOG.md and README.md, then creates and pushes the git tag that triggers the GitHub Actions release build. Use when the user wants to release, ship a version, or cut a tag.
---

# GitVerse Release

Minimal-change rules from the global skill still apply: touch only what the
release needs, match existing style, no opportunistic edits.

## What this automates

The release build itself is fully automated by
[release.yml](../../../.github/workflows/release.yml): pushing a tag that
matches `v*` builds installers for macOS (Intel + Apple Silicon), Linux, and
Windows, then creates a **draft pre-release** on GitHub with the assets
attached. This skill prepares everything locally and pushes that tag.

The human merges all PRs first. This skill does the rest.

## Preconditions — check before doing anything

1. On `main` and the working tree is clean:
   `git status --porcelain` is empty and `git branch --show-current` is `main`.
2. Local `main` is up to date with origin: `git pull --ff-only`.
3. Find the last release to scope the changelog:
   `git describe --tags --abbrev=0` (no tags yet on the first release — that's
   fine).
4. List what's being released so the user can write notes:
   `git log <last-tag>..HEAD --oneline --merges` for merged PRs, and
   `git log <last-tag>..HEAD --oneline` for all commits. On the first release,
   drop the `<last-tag>..` range.

If a precondition fails, stop and report it. Do not release from a dirty tree
or a stale branch.

## Step 1 — Ask the user

Use AskUserQuestion to collect:

- **Version** — the new semver (e.g. `0.2.0`). Show the current version from
  [package.json](../../../package.json) and the commit list from the
  preconditions so they can pick the right bump.
- **Release type** — `pre-release` or `stable (main)`. The tag name controls
  how the workflow marks the GitHub release:
  - pre-release → tag `v<version>-beta.N` (or `-rc.N`). Any tag with a `-`
    suffix is flagged as a pre-release on GitHub.
  - stable → tag `v<version>` (no suffix) → published as a normal release.
  - The CHANGELOG heading is marked `(pre-release)` for pre-release tags.
- **Release notes** — confirm the human-written summary of PR changes to put in
  the changelog. Offer a draft built from the merged-PR log, but let them edit.

## Step 2 — Bump the version

Set the version to the chosen value (without the `v` prefix) in all three
manifests so the built binaries report the right version:

- [package.json](../../../package.json) — `"version"`
- [src-tauri/tauri.conf.json](../../../src-tauri/tauri.conf.json) — `"version"`
- [src-tauri/Cargo.toml](../../../src-tauri/Cargo.toml) — `version`

Then refresh the lockfile so CI's `cargo check --locked` passes:
`cd src-tauri && cargo check`.

For pre-release tags, keep the manifest version as the plain semver
(`0.2.0`), not the `-beta.N` suffix — Cargo/Tauri want clean semver.

## Step 3 — Update CHANGELOG.md

Follow [Keep a Changelog](https://keepachangelog.com) style. Create the file if
it does not exist with a standard header. Prepend a new section above older
entries:

```markdown
## [<version>] - <YYYY-MM-DD>   <!-- add " (pre-release)" for pre-releases -->

### Added / Changed / Fixed
- <release notes from Step 1, grouped>
```

Use today's date. Group the notes under the relevant `Added` / `Changed` /
`Fixed` / `Removed` subheadings; drop empty groups.

## Step 4 — Update README.md

Update [README.md](../../../README.md) so the download/install section points at
the new version. If there is no install section yet, add one near the top-level
usage area that links to the latest release and includes the macOS unsigned-app
note:

````markdown
### Install (macOS)

Builds are currently unsigned. After installing, clear the Gatekeeper
quarantine flag:

```bash
xattr -dr com.apple.quarantine /Applications/GitVerse.app
```
````

Keep it minimal — only touch the version/release references, not unrelated
prose.

## Step 5 — Commit, tag, push

1. Commit the version bump + changelog + readme together:
   `git add -A && git commit -m "chore: release v<version>"`
   End the commit message with the required co-author trailer.
2. Push the branch: `git push origin main`.
3. Create the tag (use the type-specific name from Step 1):
   `git tag v<version>` (or `v<version>-beta.N`).
4. Push the tag — **this is what triggers the build**:
   `git push origin <tag>`.

## Step 6 — Follow the build

- Watch it: `gh run watch` (or `gh run list --workflow=release.yml`).
- When green, the release exists as a **draft pre-release** on GitHub with the
  installers attached.
- Tell the user to review the draft, confirm the notes, and click **Publish**.
  This skill does not publish — that stays a human decision.

## Safety

- Never force-push tags or delete published releases without explicit
  confirmation.
- If the tag already exists, stop and ask — do not overwrite.
- Pushing the tag is the only outward-facing, hard-to-undo step. Confirm the
  version and tag name with the user before `git push origin <tag>`.
