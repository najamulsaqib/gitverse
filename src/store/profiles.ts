import { create } from "zustand";
import { ACCOUNTS_INIT } from "@/data/mockData";
import type { Account } from "@/types";

interface ProfilesState {
  accounts: Account[];
  activeId: string;
  /** Bumped on every identity switch so the sidebar can replay its pulse animation. */
  identityPulse: number;
  switchAccount: (id: string) => void;
  addAccount: (account: Account) => void;
}

export const useProfilesStore = create<ProfilesState>((set, get) => ({
  accounts: ACCOUNTS_INIT,
  activeId: "acme",
  identityPulse: 0,

  switchAccount: (id) => {
    if (id === get().activeId) return;
    set((state) => ({ activeId: id, identityPulse: state.identityPulse + 1 }));
  },

  addAccount: (account) => {
    set((state) => ({
      accounts: [...state.accounts, account],
      activeId: account.id,
      identityPulse: state.identityPulse + 1,
    }));
  },
}));
