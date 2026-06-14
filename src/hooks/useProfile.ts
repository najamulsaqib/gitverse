import { invoke } from "@tauri-apps/api/core";
import type { Account, ProfilesData, SshKeyInfo } from "@/types";

export function generateSshKey(name: string, email: string): Promise<SshKeyInfo> {
  return invoke<SshKeyInfo>("generate_ssh_key", { name, email });
}

export function listSshKeys(): Promise<SshKeyInfo[]> {
  return invoke<SshKeyInfo[]>("list_ssh_keys");
}

export function getProfiles(): Promise<ProfilesData> {
  return invoke<ProfilesData>("get_profiles");
}

export function addProfile(profile: Account): Promise<ProfilesData> {
  return invoke<ProfilesData>("add_profile", { profile });
}

export function updateProfile(profile: Account): Promise<ProfilesData> {
  return invoke<ProfilesData>("update_profile", { profile });
}

export function removeProfile(id: string): Promise<ProfilesData> {
  return invoke<ProfilesData>("remove_profile", { id });
}

export function setActiveProfile(id: string): Promise<ProfilesData> {
  return invoke<ProfilesData>("set_active_profile", { id });
}
