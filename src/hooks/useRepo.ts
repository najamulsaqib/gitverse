import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import type { Repo, RepoCandidate, ReposData } from "@/types";

/** Open the native folder picker. Returns the chosen path, or null if cancelled. */
export async function pickRepoFolder(): Promise<string | null> {
  const selected = await open({ directory: true, multiple: false });
  return typeof selected === "string" ? selected : null;
}

export function validateRepo(path: string): Promise<RepoCandidate> {
  return invoke<RepoCandidate>("validate_repo", { path });
}

export function getRepos(): Promise<ReposData> {
  return invoke<ReposData>("get_repos");
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
