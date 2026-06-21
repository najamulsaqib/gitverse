import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import type { Branch, Commit, CommitFileChange, DiffLine, FileChange, GitProgress, StashEntry } from "@/types";

export interface RepoStatus {
  branch: string;
  ahead: number;
  behind: number;
  upstream: boolean;
  files: FileChange[];
}

export const gitStatus = (path: string) => invoke<RepoStatus>("git_status", { path });
export const gitLog = (path: string, limit = 100) => invoke<Commit[]>("git_log", { path, limit });
export const gitBranches = (path: string) => invoke<Branch[]>("git_branches", { path });
export const gitDiff = (path: string, file: string, staged: boolean) =>
  invoke<DiffLine[]>("git_diff", { path, file, staged });
export const gitCommitChanges = (path: string, hash: string) =>
  invoke<CommitFileChange[]>("git_commit_changes", { path, hash });
export const gitCommitDiff = (path: string, hash: string, file: string) =>
  invoke<DiffLine[]>("git_commit_diff", { path, hash, file });

export const gitStage = (path: string, file: string) => invoke<void>("git_stage", { path, file });
export const gitUnstage = (path: string, file: string) => invoke<void>("git_unstage", { path, file });
export const gitStageAll = (path: string) => invoke<void>("git_stage_all", { path });
export const gitUnstageAll = (path: string) => invoke<void>("git_unstage_all", { path });
export const gitDiscardFile = (path: string, file: string) => invoke<void>("git_discard_file", { path, file });

export const gitStashList = (path: string) => invoke<StashEntry[]>("git_stash_list", { path });
export const gitStashSave = (path: string, message: string, includeUntracked: boolean, files: string[] = []) =>
  invoke<void>("git_stash_save", { path, message, includeUntracked, files });
export const gitStashApply = (path: string, index: number) => invoke<void>("git_stash_apply", { path, index });
export const gitStashPop = (path: string, index: number) => invoke<void>("git_stash_pop", { path, index });
export const gitStashDrop = (path: string, index: number) => invoke<void>("git_stash_drop", { path, index });
export const gitStashChanges = (path: string, index: number) =>
  invoke<CommitFileChange[]>("git_stash_changes", { path, index });
export const gitStashDiff = (path: string, index: number, file: string) =>
  invoke<DiffLine[]>("git_stash_diff", { path, index, file });
export const gitCommit = (path: string, summary: string, description: string, coAuthors: string[]) =>
  invoke<void>("git_commit", { path, summary, description, coAuthors });
export const gitCheckout = (path: string, branch: string, create: boolean, from?: string) =>
  invoke<void>("git_checkout", { path, branch, create, from: from ?? null });
export const gitCherryPick = (path: string, hash: string) => invoke<void>("git_cherry_pick", { path, hash });
export const gitRevert = (path: string, hash: string) => invoke<void>("git_revert", { path, hash });
export const gitReset = (path: string, hash: string, mode: "soft" | "mixed" | "hard") =>
  invoke<void>("git_reset", { path, hash, mode });
export const gitDefaultBranch = (path: string) => invoke<string>("git_default_branch", { path });
export const gitFetch = (path: string) => invoke<void>("git_fetch", { path });
export const gitPush = (path: string) => invoke<void>("git_push", { path });
export const gitPull = (path: string) => invoke<void>("git_pull", { path });
export const gitFetchSilent = (path: string) => invoke<void>("git_fetch_silent", { path });
export const gitCheckAccess = (path: string) => invoke<void>("git_check_access", { path });

export const watchRepo = (path: string) => invoke<void>("watch_repo", { path });
export const unwatchRepo = () => invoke<void>("unwatch_repo");
/** What the watcher reports changed. `worktree` → a file edit (status only);
 * `refs` → a commit/checkout/branch/fetch (also needs log + branch list). */
export interface RepoChange {
  worktree: boolean;
  refs: boolean;
}
export const onRepoChanged = (cb: (c: RepoChange) => void): Promise<UnlistenFn> =>
  listen<RepoChange>("repo-changed", (e) => cb(e.payload));
export const onGitProgress = (cb: (p: GitProgress) => void): Promise<UnlistenFn> =>
  listen<GitProgress>("git-progress", (e) => cb(e.payload));
/** Native menu clicks arrive as a `menu-action` event carrying the item id. */
export const onMenuAction = (cb: (id: string) => void): Promise<UnlistenFn> =>
  listen<string>("menu-action", (e) => cb(e.payload));
