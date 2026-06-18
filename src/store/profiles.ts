import { create } from "zustand";
import { addProfile, getProfiles, removeProfile, setActiveProfile, updateProfile } from "@/hooks/useProfile";
import { useReposStore } from "@/store/repos";
import type { Account } from "@/types";

interface ProfilesState {
  accounts: Account[];
  activeId: string;
  loaded: boolean;
  /** Bumped on every identity switch so the sidebar can replay its pulse animation. */
  identityPulse: number;
  loadProfiles: () => Promise<void>;
  switchAccount: (id: string) => Promise<void>;
  addAccount: (account: Account) => Promise<void>;
  updateAccount: (account: Account) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;
}

export const useProfilesStore = create<ProfilesState>((set, get) => ({
  accounts: [],
  activeId: "",
  loaded: false,
  identityPulse: 0,

  loadProfiles: async () => {
    const data = await getProfiles();
    set({ accounts: data.profiles, activeId: data.activeId ?? "", loaded: true });
  },

  switchAccount: async (id) => {
    if (id === get().activeId) return;
    const data = await setActiveProfile(id);
    set((state) => ({ activeId: data.activeId ?? "", identityPulse: state.identityPulse + 1 }));
    // The new identity may have different remote access — re-probe the open repo.
    useReposStore.getState().checkAccess();
  },

  addAccount: async (account) => {
    const data = await addProfile(account);
    set((state) => ({
      accounts: data.profiles,
      activeId: data.activeId ?? account.id,
      identityPulse: state.identityPulse + 1,
    }));
  },

  updateAccount: async (account) => {
    const data = await updateProfile(account);
    set({ accounts: data.profiles });
  },

  deleteAccount: async (id) => {
    const data = await removeProfile(id);
    set({ accounts: data.profiles, activeId: data.activeId ?? "" });
  },
}));
