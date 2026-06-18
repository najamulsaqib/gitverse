import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import type { Branch, Commit, CommitFileChange, DiffLine, FileChange, GitProgress } from "@/types";

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
export const gitCommit = (path: string, summary: string, description: string, coAuthors: string[]) =>
  invoke<void>("git_commit", { path, summary, description, coAuthors });
export const gitCheckout = (path: string, branch: string, create: boolean, from?: string) =>
  invoke<void>("git_checkout", { path, branch, create, from: from ?? null });
export const gitDefaultBranch = (path: string) => invoke<string>("git_default_branch", { path });
export const gitFetch = (path: string) => invoke<void>("git_fetch", { path });
export const gitPush = (path: string) => invoke<void>("git_push", { path });
export const gitPull = (path: string) => invoke<void>("git_pull", { path });
export const gitCheckAccess = (path: string) => invoke<void>("git_check_access", { path });

export const watchRepo = (path: string) => invoke<void>("watch_repo", { path });
export const unwatchRepo = () => invoke<void>("unwatch_repo");
export const onRepoChanged = (cb: () => void): Promise<UnlistenFn> => listen("repo-changed", () => cb());
export const onGitProgress = (cb: (p: GitProgress) => void): Promise<UnlistenFn> =>
  listen<GitProgress>("git-progress", (e) => cb(e.payload));
