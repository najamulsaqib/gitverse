---
name: git
description: Reference for every git operation in GitVerse - how to wrap git via shell-out, the exact porcelain invocations to use, and the full Rust-command-to-React-hook wiring loop. Use when adding, modifying, or debugging any git feature (status, diff, branches, commits, stash, log, worktrees, tags, remotes).
---

# GitVerse Git Layer

GitVerse never reimplements git. Every operation shells out to the system `git`
binary via `std::process::Command` and parses its output. This skill is the
single source of truth for **how git is wrapped here** and **which git command
to reach for** when building a feature.

Minimal-change rules still apply: touch only what the task needs, match existing
style, no opportunistic refactors. The [backend](../backend/SKILL.md) and
[frontend](../frontend/SKILL.md) skills cover the surrounding conventions.

## The shell-out pattern

All git lives in [git.rs](../../src-tauri/src/commands/git.rs). Two helpers are
the only way to invoke git — reuse them, don't spawn `Command::new("git")`
inline:

```rust
// Strict: trimmed stdout on success, stderr string on non-zero exit.
fn git(dir: &str, args: &[&str]) -> Result<String, String>

// Lenient: stdout regardless of exit code (for `diff --no-index` etc. that
// "fail" by design). Returns "" on spawn error.
fn git_lenient(dir: &str, args: &[&str]) -> String
```

Both use `git -C <dir> <args...>` — always pass the repo path as `dir`, never
`cd`. Rules:

- **Read commands** return parsed structs (`Result<T, String>`).
- **Write commands** return `Result<(), String>` via `.map(|_| ())`.
- Pass user-supplied paths/refs after `--` so they can't be read as flags
  (`["add", "--", &file]`, `["diff", "--", &file]`).
- Use machine-readable output, never the human format: `--porcelain=v1`,
  `--format=`/`--pretty=format:`, `--numstat`, `--name-status`. Split on `\0`
  (`%x00`), `\x1f` (`%x1f`, field sep), `\x1e` (`%x1e`, record sep) — never on
  spaces or newlines that can appear in messages/paths.

## The full wiring loop

Adding one git command touches four files, in this order:

1. **`src-tauri/src/commands/git.rs`** — write `#[tauri::command] pub fn
   git_xxx(path: String, ...) -> Result<T, String>` using the `git()` helper.
2. **`src-tauri/src/models.rs`** — if it returns new shapes, add structs with
   `#[derive(Debug, Clone, Serialize, Deserialize)]` +
   `#[serde(rename_all = "camelCase")]`.
3. **`src-tauri/src/lib.rs`** — add `commands::git::git_xxx,` to
   `tauri::generate_handler![...]`.
4. **`src/hooks/useGit.ts`** + **`src/types/index.ts`** — add the typed
   `invoke<T>("git_xxx", { path, ... })` wrapper and mirror the structs as TS
   types. **Arg keys are camelCase** and must match the Rust param names after
   serde renaming (e.g. Rust `co_authors` ⇄ JS `coAuthors`).

Then `cd src-tauri && cargo check`. See backend skill for the verify loop.

## Already implemented (Phase 1)

Don't re-add these — extend or fix in place.

| Command | git invocation | Notes |
|---|---|---|
| `git_status` | `status --porcelain=v1 -uall` + `diff --numstat [--cached]` | Computes ahead/behind via `rev-list --left-right --count @{u}...HEAD`; untracked line counts read from disk |
| `git_log` | `log --pretty=format:%H%x1f%P%x1f%ae%x1f%ar%x1f%D%x1f%s%x1e` | `assign_lanes()` packs commits into graph lanes from parents |
| `git_branches` | `branch --format=%(HEAD)%00%(refname:short)` | Local branches only so far |
| `git_diff` | `diff [--cached] -- <file>`; falls back to `diff --no-index -- /dev/null <file>` for untracked | Parsed by `parse_diff()` into `add`/`del`/`hunk`/`ctx` lines |
| `git_commit_changes` | `show --name-status --format= <hash>` + `--numstat` | Zips the two outputs |
| `git_commit_diff` | `show --format= <hash> -- <file>` | |
| `git_stage` / `_unstage` | `add -- <file>` / `restore --staged -- <file>` | |
| `git_stage_all` / `_unstage_all` | `add -A` / `reset --quiet HEAD --` | |
| `git_commit` | `commit -m <msg>` | Appends `Co-authored-by:` trailers from `co_authors` |
| `git_checkout` | `checkout [-b] <branch> [<from>]` | `create` + optional base ref |
| `git_default_branch` | `symbolic-ref --short refs/remotes/origin/HEAD` → fallback `main`/`master` → HEAD | |
| `git_fetch` / `_push` / `_pull` | `fetch --prune` / `push` / `pull --ff-only` | `--ff-only` is deliberate — no surprise merge commits |
| `watch_repo` / `unwatch_repo` | `notify` filesystem watcher | Emits `repo-changed` event; one repo watched at a time |

## Operation cookbook (for new work)

The exact invocations to wrap. Always machine-readable form, always `-C <dir>`.

### Branches & refs
- Local + remote: `branch -a --format=%(HEAD)%00%(refname:short)%00%(upstream:short)%00%(objectname:short)`
- Delete: `branch -d <name>` (safe) / `-D` (force). **Guard force-delete in UI.**
- Rename: `branch -m <old> <new>`
- Set upstream: `branch --set-upstream-to=<remote>/<branch>`
- Merged check (for delete guards): `branch --merged <target>`

### Remotes & sync
- List remotes: `remote -v` or `remote get-url origin`
- Push new branch: `push -u origin <branch>`
- Pull rebase variant: `pull --rebase` (current default is `--ff-only`)
- Clone (uses active SSH identity): `clone <url> <dir>` — set identity via
  `GIT_SSH_COMMAND` env or the rewritten `~/.ssh/config` (see config.rs).

### Stash (Phase 1 scope, not yet built)
- List: `stash list --format=%gd%x1f%s%x1f%cr` (ref, subject, relative date)
- Create named: `stash push -m <msg>` (add `-u` to include untracked)
- Apply / pop / drop: `stash apply <ref>` / `stash pop <ref>` / `stash drop <ref>`
- Show diff: `stash show -p <ref>` → reuse `parse_diff()`

### Tags (Phase 3)
- List: `tag --format=%(refname:short)%x1f%(creatordate:relative)`
- Create: `tag <name>` (lightweight) / `tag -a <name> -m <msg>` (annotated)
- Delete: `tag -d <name>`; push: `push origin <tag>` / `push --tags`

### Worktrees (Phase 2 — flagship feature)
- List: `worktree list --porcelain` (parse `worktree`/`HEAD`/`branch` blocks)
- Add existing branch: `worktree add <dir> <branch>`
- Add new branch: `worktree add -b <branch> <dir> [<from>]`
- Remove: `worktree remove <dir>` (add `--force` only behind a UI guard)
- Prune stale: `worktree prune`

### Inspecting
- File at revision: `show <rev>:<path>`
- Blame (porcelain): `blame --line-porcelain -- <file>`
- Single-commit full diff: `show --format= <hash>` (already used)

## Gotchas

- **Empty repo / no commits:** `rev-parse HEAD` fails; `@{u}` errors when no
  upstream — `git_status` already swallows that into `upstream: false`. Handle
  the no-HEAD case for any new ref-walking command.
- **Detached HEAD:** `rev-parse --abbrev-ref HEAD` returns `HEAD`. `git_status`
  maps that to `"detached"`.
- **Renames:** porcelain prints `old -> new`; status parsing already splits on
  `" -> "`. Add `-M` to diff/show if you need rename detection there too.
- **Untracked files** don't appear in `diff` — fall back to
  `diff --no-index /dev/null <file>` (the lenient helper), as `git_diff` does.
- **Binary files / no-newline markers** are filtered in `parse_diff()`'s `skip`
  list — extend that list rather than special-casing downstream.
- **Locale:** parsing assumes English/porcelain output. Stick to
  `--porcelain`/`--format` which are locale-stable; avoid scraping `status`
  long form or `log` default output.
- **Never block the UI on auth prompts.** push/pull/clone can hang waiting for
  SSH passphrase or host verification. Identity is set up out-of-band (ssh.rs /
  config.rs); assume the agent is loaded.

## Hard limits (permanent)

No cloud, AI, PR/issue management, login, telemetry, or notifications — see
[BRIEF.md](../../BRIEF.md). Git features that imply any of these (e.g. creating
PRs, fetching issue metadata) are out of scope. Surfacing merge/rebase
conflicts is allowed (Phase 3); resolving them via a custom 3-way engine is not
— shell out to `git mergetool`/`git rebase` semantics only.
