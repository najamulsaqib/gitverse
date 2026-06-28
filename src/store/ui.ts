import { create } from "zustand";
import type { GitProgress, SyncPhase, ToastMessage } from "@/types";

export type SidebarTab = "changes" | "history";

const SIDE_PANEL_MIN = 280;
const SIDE_PANEL_MAX = 560;

interface UiState {
  tab: SidebarTab;
  /** Index of the stash whose diff is shown in the main panel, or `null` when no
   * stash is open. Stashes are reached on-demand via the toolbar button, not a
   * persistent tab, so this lives outside `tab`. */
  stashView: number | null;
  /** Index of the stash pending drop-confirmation, or `null`. Drives an
   * App-level confirm modal, mounted like every other modal. */
  stashDropIndex: number | null;
  openMenu: string | null;
  syncPhase: SyncPhase;
  progress: GitProgress | null;
  sidePanelWidth: number;
  repoSidebarOpen: boolean;
  repoMenu: { id: string; x: number; y: number } | null;
  graphMenu: { hash: string; x: number; y: number } | null;
  fileMenu: { path: string; x: number; y: number } | null;
  addAccountModalOpen: boolean;
  addRepoModalOpen: boolean;
  cloneRepoModalOpen: boolean;
  stashModalOpen: boolean;
  editRepoId: string | null;
  /** `from`/`fromLabel` are set when branching off a specific commit from the
   * graph; otherwise the modal bases the branch on the default/current branch. */
  newBranch: { name: string; from?: string; fromLabel?: string } | null;
  toast: ToastMessage | null;
  accountMenu: { id: string; x: number; y: number } | null;
  editAccountId: string | null;
  setTab: (tab: SidebarTab) => void;
  openStashView: (index: number) => void;
  closeStashView: () => void;
  openDropStash: (index: number) => void;
  closeDropStash: () => void;
  setOpenMenu: (menu: string | null) => void;
  setSyncPhase: (phase: SyncPhase) => void;
  setProgress: (progress: GitProgress | null) => void;
  setSidePanelWidth: (px: number) => void;
  toggleRepoSidebar: () => void;
  closeRepoSidebar: () => void;
  openRepoMenu: (id: string, x: number, y: number) => void;
  closeRepoMenu: () => void;
  openGraphMenu: (hash: string, x: number, y: number) => void;
  closeGraphMenu: () => void;
  openFileMenu: (path: string, x: number, y: number) => void;
  closeFileMenu: () => void;
  openAddAccount: () => void;
  closeAddAccount: () => void;
  openAddRepo: () => void;
  closeAddRepo: () => void;
  openCloneRepo: () => void;
  closeCloneRepo: () => void;
  openStashModal: () => void;
  closeStashModal: () => void;
  openEditRepo: (id: string) => void;
  closeEditRepo: () => void;
  openNewBranch: (name: string, from?: string, fromLabel?: string) => void;
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
  stashView: null,
  stashDropIndex: null,
  openMenu: null,
  syncPhase: "idle",
  progress: null,
  sidePanelWidth: 344,
  repoSidebarOpen: false,
  repoMenu: null,
  graphMenu: null,
  fileMenu: null,
  addAccountModalOpen: false,
  addRepoModalOpen: false,
  cloneRepoModalOpen: false,
  stashModalOpen: false,
  editRepoId: null,
  newBranch: null,
  toast: null,
  accountMenu: null,
  editAccountId: null,

  setTab: (tab) => set({ tab, stashView: null }),
  openStashView: (index) => set({ stashView: index, openMenu: null }),
  closeStashView: () => set({ stashView: null }),
  openDropStash: (index) => set({ stashDropIndex: index, openMenu: null }),
  closeDropStash: () => set({ stashDropIndex: null }),
  setOpenMenu: (menu) => set({ openMenu: menu }),
  setSyncPhase: (phase) => set(phase === "idle" ? { syncPhase: phase, progress: null } : { syncPhase: phase }),
  setProgress: (progress) => set({ progress }),
  setSidePanelWidth: (px) =>
    set({ sidePanelWidth: Math.min(SIDE_PANEL_MAX, Math.max(SIDE_PANEL_MIN, px)) }),
  toggleRepoSidebar: () => set((s) => ({ repoSidebarOpen: !s.repoSidebarOpen, repoMenu: null })),
  closeRepoSidebar: () => set({ repoSidebarOpen: false, repoMenu: null }),
  openRepoMenu: (id, x, y) => set({ repoMenu: { id, x, y } }),
  closeRepoMenu: () => set({ repoMenu: null }),
  openGraphMenu: (hash, x, y) => set({ graphMenu: { hash, x, y } }),
  closeGraphMenu: () => set({ graphMenu: null }),
  openFileMenu: (path, x, y) => set({ fileMenu: { path, x, y } }),
  closeFileMenu: () => set({ fileMenu: null }),
  openAddAccount: () => set({ addAccountModalOpen: true }),
  closeAddAccount: () => set({ addAccountModalOpen: false }),
  openAddRepo: () => set({ addRepoModalOpen: true }),
  closeAddRepo: () => set({ addRepoModalOpen: false }),
  openCloneRepo: () => set({ cloneRepoModalOpen: true }),
  closeCloneRepo: () => set({ cloneRepoModalOpen: false }),
  openStashModal: () => set({ stashModalOpen: true }),
  closeStashModal: () => set({ stashModalOpen: false }),
  openEditRepo: (id) => set({ editRepoId: id, repoMenu: null }),
  closeEditRepo: () => set({ editRepoId: null }),
  openNewBranch: (name, from, fromLabel) => set({ newBranch: { name, from, fromLabel }, openMenu: null }),
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
