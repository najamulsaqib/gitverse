import { create } from "zustand";
import {
  gitBranches,
  gitCheckout,
  gitCommit,
  gitFetch,
  gitLog,
  gitPull,
  gitPush,
  gitStage,
  gitStageAll,
  gitStatus,
  gitUnstage,
  gitUnstageAll,
  watchRepo,
} from "@/hooks/useGit";
import {
  addRepo as addRepoCmd,
  getRepos,
  removeRepo as removeRepoCmd,
  setActiveRepo as setActiveRepoCmd,
  updateRepo as updateRepoCmd,
} from "@/hooks/useRepo";
import { useProfilesStore } from "@/store/profiles";
import { useUiStore } from "@/store/ui";
import type { Branch, Commit, FileChange, Repo, SyncState } from "@/types";

interface ReposState {
  repos: Repo[];
  repoId: string;
  branchByRepo: Record<string, string>;
  branchesByRepo: Record<string, Branch[]>;
  filesByRepo: Record<string, FileChange[]>;
  historyByRepo: Record<string, Commit[]>;
  syncByRepo: Record<string, SyncState>;
  selFile: string | null;
  selCommit: string | null;
  filter: string;
  summary: string;
  desc: string;
  coAuthors: string[];

  loadRepos: () => Promise<void>;
  addRepo: (repo: Repo) => Promise<void>;
  updateRepo: (repo: Repo) => Promise<void>;
  removeRepo: (id: string) => Promise<void>;
  selectRepo: (id: string) => void;
  refresh: () => Promise<void>;
  selectBranch: (name: string) => Promise<void>;
  createBranch: (name: string, from: string) => Promise<void>;
  selectFile: (path: string) => void;
  selectCommit: (hash: string) => void;
  toggleFile: (path: string) => Promise<void>;
  toggleAll: (on: boolean) => Promise<void>;
  setFilter: (filter: string) => void;
  setSummary: (summary: string) => void;
  setDesc: (desc: string) => void;
  addCoAuthor: (email: string) => void;
  removeCoAuthor: (email: string) => void;
  runSync: () => Promise<void>;
  commit: () => Promise<void>;
}

const toastErr = (title: string, e: unknown) =>
  useUiStore.getState().showToast({ title, sub: String(e), color: "#e8506e" });

export const useReposStore = create<ReposState>((set, get) => ({
  repos: [],
  repoId: "",
  branchByRepo: {},
  branchesByRepo: {},
  filesByRepo: {},
  historyByRepo: {},
  syncByRepo: {},
  selFile: null,
  selCommit: null,
  filter: "",
  summary: "",
  desc: "",
  coAuthors: [],

  loadRepos: async () => {
    const { repos, activeId } = await getRepos();
    set((state) => ({ repos, repoId: state.repoId || activeId || repos[0]?.id || "" }));
    const repo = get().repos.find((r) => r.id === get().repoId);
    if (repo) {
      watchRepo(repo.path).catch(() => { });
      await get().refresh();
    }
  },

  addRepo: async (repo) => {
    const { repos } = await addRepoCmd(repo);
    set({ repos });
    get().selectRepo(repo.id);
  },

  updateRepo: async (repo) => {
    const { repos } = await updateRepoCmd(repo);
    set({ repos });
  },

  removeRepo: async (id) => {
    const { repos } = await removeRepoCmd(id);
    const wasCurrent = get().repoId === id;
    set((state) => ({ repos, repoId: wasCurrent ? repos[0]?.id ?? "" : state.repoId }));
    if (wasCurrent) {
      const repo = get().repos.find((r) => r.id === get().repoId);
      if (repo) {
        watchRepo(repo.path).catch(() => { });
        await get().refresh();
      }
    }
  },

  selectRepo: (id) => {
    const state = get();
    if (id === state.repoId) return;
    set({ repoId: id, selFile: null, selCommit: null, filter: "", summary: "", desc: "", coAuthors: [] });
    useUiStore.getState().setTab("changes");
    useUiStore.getState().setSyncPhase("idle");

    const repo = state.repos.find((r) => r.id === id);
    if (!repo) return;
    setActiveRepoCmd(id).catch(() => { });
    watchRepo(repo.path).catch(() => { });
    get().refresh();

    const { accounts, activeId } = useProfilesStore.getState();
    if (repo.owner && repo.owner !== activeId) {
      const a = accounts.find((x) => x.id === repo.owner);
      if (a) {
        useUiStore.getState().showToast({
          title: `Opened ${repo.name}`,
          sub: `Tagged ${a.label}. Click the rail to switch identity.`,
          color: a.color,
        });
      }
    }
  },

  refresh: async () => {
    const { repoId, repos } = get();
    const repo = repos.find((r) => r.id === repoId);
    if (!repo) return;

    const [status, history, branches] = await Promise.all([
      gitStatus(repo.path),
      gitLog(repo.path, 100),
      gitBranches(repo.path),
    ]);

    const accounts = useProfilesStore.getState().accounts;
    const mapped = history.map((c) => ({ ...c, by: accounts.find((a) => a.email === c.by)?.id ?? c.by }));

    set((state) => {
      let selFile = state.selFile;
      if (status.files.length && !status.files.some((f) => f.path === selFile)) selFile = status.files[0].path;
      else if (!status.files.length) selFile = null;

      let selCommit = state.selCommit;
      if (mapped.length && !mapped.some((c) => c.hash === selCommit)) selCommit = mapped[0].hash;

      return {
        branchByRepo: { ...state.branchByRepo, [repoId]: status.branch },
        branchesByRepo: { ...state.branchesByRepo, [repoId]: branches },
        filesByRepo: { ...state.filesByRepo, [repoId]: status.files },
        historyByRepo: { ...state.historyByRepo, [repoId]: mapped },
        syncByRepo: {
          ...state.syncByRepo,
          [repoId]: {
            ahead: status.ahead,
            behind: status.behind,
            lastFetch: status.upstream ? "tracking origin" : "no upstream",
          },
        },
        selFile,
        selCommit,
      };
    });
  },

  selectBranch: async (name) => {
    const { repoId, repos, branchByRepo, branchesByRepo } = get();
    const repo = repos.find((r) => r.id === repoId);
    if (!repo || name === branchByRepo[repoId]) return;

    const exists = (branchesByRepo[repoId] || []).some((b) => b.name === name);
    try {
      await gitCheckout(repo.path, name, !exists);
      useUiStore.getState().showToast({
        title: exists ? `Checked out ${name}` : `Created ${name}`,
        sub: repo.name,
        color: "var(--color-teal)",
      });
    } catch (e) {
      toastErr("Checkout failed", e);
      return;
    }
    await get().refresh();
  },

  createBranch: async (name, from) => {
    const { repoId, repos, branchesByRepo } = get();
    const repo = repos.find((r) => r.id === repoId);
    const trimmed = name.trim();
    if (!repo || !trimmed) return;

    if ((branchesByRepo[repoId] || []).some((b) => b.name === trimmed)) {
      toastErr("Create failed", `Branch "${trimmed}" already exists`);
      return;
    }
    try {
      await gitCheckout(repo.path, trimmed, true, from);
      useUiStore.getState().showToast({
        title: `Created ${trimmed}`,
        sub: `from ${from} · ${repo.name}`,
        color: "var(--color-teal)",
      });
    } catch (e) {
      toastErr("Create failed", e);
      return;
    }
    await get().refresh();
  },

  selectFile: (path) => set({ selFile: path }),
  selectCommit: (hash) => set({ selCommit: hash }),
  setFilter: (filter) => set({ filter }),
  setSummary: (summary) => set({ summary }),
  setDesc: (desc) => set({ desc }),

  addCoAuthor: (email) =>
    set((state) => (state.coAuthors.includes(email) ? state : { coAuthors: [...state.coAuthors, email] })),
  removeCoAuthor: (email) => set((state) => ({ coAuthors: state.coAuthors.filter((e) => e !== email) })),

  toggleFile: async (path) => {
    const { repoId, repos, filesByRepo } = get();
    const repo = repos.find((r) => r.id === repoId);
    const file = (filesByRepo[repoId] || []).find((f) => f.path === path);
    if (!repo || !file) return;
    try {
      await (file.staged ? gitUnstage(repo.path, path) : gitStage(repo.path, path));
    } catch (e) {
      toastErr("Failed to stage file", e);
    }
    await get().refresh();
  },

  toggleAll: async (on) => {
    const { repoId, repos } = get();
    const repo = repos.find((r) => r.id === repoId);
    if (!repo) return;
    try {
      await (on ? gitStageAll(repo.path) : gitUnstageAll(repo.path));
    } catch (e) {
      toastErr("Failed to stage files", e);
    }
    await get().refresh();
  },

  runSync: async () => {
    const ui = useUiStore.getState();
    if (ui.syncPhase !== "idle") return;
    const { repoId, repos, syncByRepo } = get();
    const repo = repos.find((r) => r.id === repoId);
    if (!repo) return;
    const s = syncByRepo[repoId] ?? { ahead: 0, behind: 0, lastFetch: "" };

    try {
      if (s.ahead > 0) {
        ui.setSyncPhase("pushing");
        await gitPush(repo.path);
        ui.showToast({ title: `Pushed ${s.ahead} commit${s.ahead !== 1 ? "s" : ""}`, sub: repo.name, color: "var(--color-teal)" });
      } else if (s.behind > 0) {
        ui.setSyncPhase("pulling");
        await gitPull(repo.path);
        ui.showToast({ title: `Pulled ${s.behind} commit${s.behind !== 1 ? "s" : ""}`, sub: repo.name, color: "var(--color-teal)" });
      } else {
        ui.setSyncPhase("fetching");
        await gitFetch(repo.path);
        ui.showToast({ title: "Up to date", sub: `Fetched ${repo.name}`, color: "var(--color-teal)" });
      }
    } catch (e) {
      toastErr("Sync failed", e);
    } finally {
      ui.setSyncPhase("idle");
      await get().refresh();
    }
  },

  commit: async () => {
    const { repoId, repos, summary, desc, coAuthors, filesByRepo } = get();
    const repo = repos.find((r) => r.id === repoId);
    if (!repo) return;
    const staged = (filesByRepo[repoId] || []).filter((f) => f.staged);
    if (staged.length === 0 || !summary.trim()) return;

    const { accounts, activeId } = useProfilesStore.getState();
    const account = accounts.find((a) => a.id === activeId) ?? accounts[0];
    try {
      await gitCommit(repo.path, summary, desc, coAuthors);
    } catch (e) {
      toastErr("Commit failed", e);
      return;
    }
    set({ summary: "", desc: "", coAuthors: [] });
    useUiStore.getState().showToast({
      title: account ? `Committed as ${account.label}` : "Committed",
      sub: `${staged.length} file${staged.length !== 1 ? "s" : ""}${account ? ` · ${account.email}` : ""}`,
      color: account?.color,
    });
    await get().refresh();
  },
}));
