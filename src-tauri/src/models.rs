use serde::{Deserialize, Serialize};

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
    pub initials: String,
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
pub struct SshKeyInfo {
    pub name: String,
    pub key_type: String,
    pub public_key: String,
    pub comment: String,
    pub fingerprint: String,
}
