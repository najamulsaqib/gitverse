import { create } from "zustand";
import type { SyncPhase, ToastMessage } from "@/types";

export type SidebarTab = "changes" | "history";

interface UiState {
  tab: SidebarTab;
  openMenu: string | null;
  syncPhase: SyncPhase;
  repoSidebarOpen: boolean;
  repoMenu: { id: string; x: number; y: number } | null;
  addAccountModalOpen: boolean;
  addRepoModalOpen: boolean;
  editRepoId: string | null;
  newBranch: { name: string } | null;
  toast: ToastMessage | null;
  accountMenu: { id: string; x: number; y: number } | null;
  editAccountId: string | null;
  setTab: (tab: SidebarTab) => void;
  setOpenMenu: (menu: string | null) => void;
  setSyncPhase: (phase: SyncPhase) => void;
  toggleRepoSidebar: () => void;
  closeRepoSidebar: () => void;
  openRepoMenu: (id: string, x: number, y: number) => void;
  closeRepoMenu: () => void;
  openAddAccount: () => void;
  closeAddAccount: () => void;
  openAddRepo: () => void;
  closeAddRepo: () => void;
  openEditRepo: (id: string) => void;
  closeEditRepo: () => void;
  openNewBranch: (name: string) => void;
  closeNewBranch: () => void;
  showToast: (toast: Omit<ToastMessage, "id">) => void;
  openAccountMenu: (id: string, x: number, y: number) => void;
  closeAccountMenu: () => void;
  openEditAccount: (id: string) => void;
  closeEditAccount: () => void;
}

let toastTimer: ReturnType<typeof setTimeout> | null = null;

export const useUiStore = create<UiState>((set) => ({
  tab: "changes",
  openMenu: null,
  syncPhase: "idle",
  repoSidebarOpen: false,
  repoMenu: null,
  addAccountModalOpen: false,
  addRepoModalOpen: false,
  editRepoId: null,
  newBranch: null,
  toast: null,
  accountMenu: null,
  editAccountId: null,

  setTab: (tab) => set({ tab }),
  setOpenMenu: (menu) => set({ openMenu: menu }),
  setSyncPhase: (phase) => set({ syncPhase: phase }),
  toggleRepoSidebar: () => set((s) => ({ repoSidebarOpen: !s.repoSidebarOpen, repoMenu: null })),
  closeRepoSidebar: () => set({ repoSidebarOpen: false, repoMenu: null }),
  openRepoMenu: (id, x, y) => set({ repoMenu: { id, x, y } }),
  closeRepoMenu: () => set({ repoMenu: null }),
  openAddAccount: () => set({ addAccountModalOpen: true }),
  closeAddAccount: () => set({ addAccountModalOpen: false }),
  openAddRepo: () => set({ addRepoModalOpen: true }),
  closeAddRepo: () => set({ addRepoModalOpen: false }),
  openEditRepo: (id) => set({ editRepoId: id, repoMenu: null }),
  closeEditRepo: () => set({ editRepoId: null }),
  openNewBranch: (name) => set({ newBranch: { name }, openMenu: null }),
  closeNewBranch: () => set({ newBranch: null }),

  showToast: (toast) => {
    if (toastTimer) clearTimeout(toastTimer);
    set({ toast: { ...toast, id: Date.now() } });
    toastTimer = setTimeout(() => set({ toast: null }), 3400);
  },

  openAccountMenu: (id, x, y) => set({ accountMenu: { id, x, y } }),
  closeAccountMenu: () => set({ accountMenu: null }),
  openEditAccount: (id) => set({ editAccountId: id, accountMenu: null }),
  closeEditAccount: () => set({ editAccountId: null }),
}));
