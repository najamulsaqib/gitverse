import { create } from "zustand";
import type { SyncPhase, ToastMessage } from "@/types";

export type SidebarTab = "changes" | "history";

interface UiState {
  tab: SidebarTab;
  openMenu: string | null;
  addAccountModalOpen: boolean;
  toast: ToastMessage | null;
  syncPhase: SyncPhase;
  accountMenu: { id: string; x: number; y: number } | null;
  editAccountId: string | null;
  setTab: (tab: SidebarTab) => void;
  setOpenMenu: (menu: string | null) => void;
  openAddAccount: () => void;
  closeAddAccount: () => void;
  showToast: (toast: Omit<ToastMessage, "id">) => void;
  setSyncPhase: (phase: SyncPhase) => void;
  openAccountMenu: (id: string, x: number, y: number) => void;
  closeAccountMenu: () => void;
  openEditAccount: (id: string) => void;
  closeEditAccount: () => void;
}

let toastTimer: ReturnType<typeof setTimeout> | null = null;

export const useUiStore = create<UiState>((set) => ({
  tab: "changes",
  openMenu: null,
  addAccountModalOpen: false,
  toast: null,
  syncPhase: "idle",
  accountMenu: null,
  editAccountId: null,

  setTab: (tab) => set({ tab }),
  setOpenMenu: (menu) => set({ openMenu: menu }),
  openAddAccount: () => set({ addAccountModalOpen: true }),
  closeAddAccount: () => set({ addAccountModalOpen: false }),

  showToast: (toast) => {
    if (toastTimer) clearTimeout(toastTimer);
    set({ toast: { ...toast, id: Date.now() } });
    toastTimer = setTimeout(() => set({ toast: null }), 3400);
  },

  setSyncPhase: (phase) => set({ syncPhase: phase }),

  openAccountMenu: (id, x, y) => set({ accountMenu: { id, x, y } }),
  closeAccountMenu: () => set({ accountMenu: null }),
  openEditAccount: (id) => set({ editAccountId: id, accountMenu: null }),
  closeEditAccount: () => set({ editAccountId: null }),
}));
