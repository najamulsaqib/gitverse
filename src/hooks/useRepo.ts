import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import type { Repo, RepoCandidate, RepoOwnerView, ReposData } from "@/types";

/** Open the native folder picker. Returns the chosen path, or null if cancelled. */
export async function pickRepoFolder(): Promise<string | null> {
  const selected = await open({ directory: true, multiple: false });
  return typeof selected === "string" ? selected : null;
}

export function validateRepo(path: string): Promise<RepoCandidate> {
  return invoke<RepoCandidate>("validate_repo", { path });
}

/** Clone an SSH remote into `destDir` and return the resulting repo's details. */
export function cloneRepo(url: string, destDir: string): Promise<RepoCandidate> {
  return invoke<RepoCandidate>("clone_repo", { url, destDir });
}

export function getRepos(): Promise<ReposData> {
  return invoke<ReposData>("get_repos");
}

/** Resolve a repo + its owner into a ready-to-render view model (backend join). */
export function getRepoView(id: string): Promise<RepoOwnerView | null> {
  return invoke<RepoOwnerView | null>("repo_view", { id });
}

export function addRepo(repo: Repo): Promise<ReposData> {
  return invoke<ReposData>("add_repo", { repo });
}

export function updateRepo(repo: Repo): Promise<ReposData> {
  return invoke<ReposData>("update_repo", { repo });
}

export function removeRepo(id: string): Promise<ReposData> {
  return invoke<ReposData>("remove_repo", { id });
}

export function setActiveRepo(id: string): Promise<ReposData> {
  return invoke<ReposData>("set_active_repo", { id });
}
