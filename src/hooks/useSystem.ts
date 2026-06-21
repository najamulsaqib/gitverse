import { invoke } from "@tauri-apps/api/core";
import { revealItemInDir } from "@tauri-apps/plugin-opener";

export function openRepoInEditor(path: string): Promise<void> {
  return invoke("open_repo_in_editor", { path });
}

export function revealRepoInFileManager(path: string): Promise<void> {
  return revealItemInDir(path);
}

/** Open a single repo-relative file in the user's editor. */
export function openFileInEditor(repoPath: string, file: string): Promise<void> {
  return invoke("open_file_in_editor", { repoPath, file });
}

/** Open a single repo-relative file with the OS default program. */
export function openFileWithDefault(repoPath: string, file: string): Promise<void> {
  return invoke("open_file_with_default", { repoPath, file });
}

/** Reveal an absolute file path in the system file manager. */
export function revealFileInFileManager(absPath: string): Promise<void> {
  return revealItemInDir(absPath);
}

/** Platform label for the “reveal in file manager” action. */
export function fileManagerActionLabel(): string {
  const ua = navigator.userAgent;
  if (ua.includes("Mac")) return "Show in Finder";
  if (ua.includes("Win")) return "Show in Explorer";
  return "Show in file manager";
}
