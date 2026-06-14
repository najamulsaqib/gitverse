// Shared types for GitVerse — mirrors the eventual Rust models in
// src-tauri/src/models.rs (camelCase on both sides via serde rename_all).

export interface Account {
  id: string;
  label: string;
  kind: string;
  name: string;
  handle: string;
  email: string;
  color: string;
  initials: string;
  host: string;
  key: string;
  fp: string;
}

export interface SshKeyInfo {
  name: string;
  keyType: string;
  publicKey: string;
  comment: string;
  fingerprint: string;
}

export interface ProfilesData {
  profiles: Account[];
  activeId: string | null;
}

export interface Repo {
  id: string;
  name: string;
  owner: string;
  branch: string;
  path: string;
  private: boolean;
  remote: string;
}

export interface Branch {
  name: string;
  current: boolean;
}

export interface SyncState {
  ahead: number;
  behind: number;
  lastFetch: string;
}

export type FileStatus = "M" | "A" | "D";

export interface FileChange {
  path: string;
  status: FileStatus;
  staged: boolean;
  add: number;
  del: number;
}

export type DiffLineType = "hunk" | "ctx" | "add" | "del";

export interface DiffLine {
  t: DiffLineType;
  n?: string;
  a?: string;
}

export interface CommitRef {
  name: string;
  head?: boolean;
}

export interface CommitFileChange {
  path: string;
  status: FileStatus;
  add: number;
  del: number;
}

export interface Commit {
  hash: string;
  subject: string;
  by: string;
  when: string;
  add: number;
  del: number;
  files: number;
  lane: number;
  parents: string[];
  refs?: CommitRef[];
  flag?: boolean;
  changes?: CommitFileChange[];
}

export type SyncPhase = "idle" | "fetching" | "pushing" | "pulling";

export interface ToastMessage {
  id: number;
  title: string;
  sub?: string;
  color?: string;
}
