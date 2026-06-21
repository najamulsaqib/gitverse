use serde::{Deserialize, Serialize};

/// Live progress for a network git op, emitted as `git-progress` events.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GitProgress {
    pub pct: u8,
    pub text: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Profile {
    pub id: String,
    pub label: String,
    pub kind: String,
    pub name: String,
    pub handle: String,
    pub email: String,
    pub color: String,
    #[serde(default)]
    pub icon: String,
    pub host: String,
    pub key: String,
    pub fp: String,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProfilesData {
    pub profiles: Vec<Profile>,
    pub active_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Repo {
    pub id: String,
    pub name: String,
    pub owner: String,
    pub branch: String,
    pub path: String,
    pub remote: String,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReposData {
    pub repos: Vec<Repo>,
    pub active_id: Option<String>,
}

/// A repo resolved together with its owning profile, ready for the toolbar to
/// render without any client-side joining. `remote` is the boolean "tracks a
/// remote" flag rather than the raw URL.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RepoOwnerView {
    pub id: String,
    pub name: String,
    pub remote: bool,
    pub owner_color: String,
    pub owner_label: String,
}

/// What `validate_repo` reports back for the confirmation step.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RepoCandidate {
    pub name: String,
    pub path: String,
    pub branch: String,
    pub remote: String,
}

// ---- live git data (mirrors src/types/index.ts) ----

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FileChange {
    pub path: String,
    pub status: String,
    pub staged: bool,
    pub add: u32,
    pub del: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RepoStatus {
    pub branch: String,
    pub ahead: u32,
    pub behind: u32,
    pub upstream: bool,
    pub files: Vec<FileChange>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CommitRef {
    pub name: String,
    #[serde(skip_serializing_if = "std::ops::Not::not")]
    pub head: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Commit {
    pub hash: String,
    pub subject: String,
    pub by: String,
    pub when: String,
    pub add: u32,
    pub del: u32,
    pub files: u32,
    pub lane: u32,
    pub parents: Vec<String>,
    pub refs: Vec<CommitRef>,
    pub flag: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Branch {
    pub name: String,
    pub current: bool,
    pub remote: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CommitFileChange {
    pub path: String,
    pub status: String,
    pub add: u32,
    pub del: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DiffLine {
    pub t: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub n: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub a: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SshKeyInfo {
    pub name: String,
    pub key_type: String,
    pub public_key: String,
    pub comment: String,
    pub fingerprint: String,
}
