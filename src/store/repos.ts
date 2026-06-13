import { create } from "zustand";
import { FILES, HISTORY, REPOS, SYNC, type RepoId } from "@/data/mockData";
import { useProfilesStore } from "@/store/profiles";
import { useUiStore } from "@/store/ui";
import type { Commit, FileChange, SyncState } from "@/types";

const clone = <T>(o: T): T => JSON.parse(JSON.stringify(o)) as T;

interface ReposState {
  repos: typeof REPOS;
  repoId: RepoId;
  branchByRepo: Record<RepoId, string>;
  filesByRepo: Record<RepoId, FileChange[]>;
  historyByRepo: Record<RepoId, Commit[]>;
  syncByRepo: Record<RepoId, SyncState>;
  selFile: string | null;
  selCommit: string | null;
  filter: string;
  summary: string;
  desc: string;

  selectRepo: (id: RepoId) => void;
  selectBranch: (name: string) => void;
  selectFile: (path: string) => void;
  selectCommit: (hash: string) => void;
  toggleFile: (path: string) => void;
  toggleAll: (on: boolean) => void;
  setFilter: (filter: string) => void;
  setSummary: (summary: string) => void;
  setDesc: (desc: string) => void;
  runSync: () => void;
  commit: () => void;
}

export const useReposStore = create<ReposState>((set, get) => ({
  repos: REPOS,
  repoId: "mobile-app",
  branchByRepo: Object.fromEntries(REPOS.map((r) => [r.id, r.branch])) as Record<RepoId, string>,
  filesByRepo: clone(FILES),
  historyByRepo: clone(HISTORY),
  syncByRepo: clone(SYNC),
  selFile: "src/screens/LoginScreen.tsx",
  selCommit: HISTORY["mobile-app"][0]?.hash ?? null,
  filter: "",
  summary: "",
  desc: "",

  selectRepo: (id) => {
    const state = get();
    if (id === state.repoId) return;
    const repo = state.repos.find((r) => r.id === id)!;
    const files = state.filesByRepo[id] || [];
    const history = state.historyByRepo[id] || [];

    let selFile = state.selFile;
    if (files.length && !files.some((f) => f.path === selFile)) selFile = files[0].path;

    useUiStore.getState().setTab("changes");
    useUiStore.getState().setSyncPhase("idle");

    set({
      repoId: id,
      filter: "",
      selFile,
      selCommit: history.length ? history[0].hash : null,
    });

    const { accounts, activeId } = useProfilesStore.getState();
    if (repo.owner !== activeId) {
      const a = accounts.find((x) => x.id === repo.owner)!;
      useUiStore.getState().showToast({
        title: `Opened ${repo.name}`,
        sub: `Tip: this repo belongs to ${a.label}. Click the rail to switch.`,
        color: a.color,
      });
    }
  },

  selectBranch: (name) => {
    const state = get();
    const branch = state.branchByRepo[state.repoId];
    if (name === branch) return;
    const repo = state.repos.find((r) => r.id === state.repoId)!;
    const { accounts, activeId } = useProfilesStore.getState();
    const account = accounts.find((a) => a.id === activeId) ?? accounts[0];

    set({ branchByRepo: { ...state.branchByRepo, [state.repoId]: name } });
    useUiStore.getState().showToast({ title: `Checked out ${name}`, sub: repo.name, color: account.color });
  },

  selectFile: (path) => set({ selFile: path }),
  selectCommit: (hash) => set({ selCommit: hash }),
  setFilter: (filter) => set({ filter }),
  setSummary: (summary) => set({ summary }),
  setDesc: (desc) => set({ desc }),

  toggleFile: (path) =>
    set((state) => ({
      filesByRepo: {
        ...state.filesByRepo,
        [state.repoId]: state.filesByRepo[state.repoId].map((f) =>
          f.path === path ? { ...f, staged: !f.staged } : f,
        ),
      },
    })),

  toggleAll: (on) =>
    set((state) => ({
      filesByRepo: {
        ...state.filesByRepo,
        [state.repoId]: state.filesByRepo[state.repoId].map((f) => ({ ...f, staged: on })),
      },
    })),

  runSync: () => {
    const state = get();
    const ui = useUiStore.getState();
    if (ui.syncPhase !== "idle") return;

    const { repoId } = state;
    const s = state.syncByRepo[repoId];
    const repo = state.repos.find((r) => r.id === repoId)!;
    const branch = state.branchByRepo[repoId];
    const { accounts, activeId } = useProfilesStore.getState();
    const account = accounts.find((a) => a.id === activeId) ?? accounts[0];

    if (s.ahead > 0) {
      ui.setSyncPhase("pushing");
      setTimeout(() => {
        set((st) => ({
          syncByRepo: { ...st.syncByRepo, [repoId]: { ...st.syncByRepo[repoId], ahead: 0, lastFetch: "just now" } },
        }));
        useUiStore.getState().setSyncPhase("idle");
        useUiStore.getState().showToast({
          title: `Pushed ${s.ahead} commit${s.ahead !== 1 ? "s" : ""} to origin`,
          sub: `${repo.name} · ${branch}`,
          color: account.color,
        });
      }, 1500);
    } else if (s.behind > 0) {
      ui.setSyncPhase("pulling");
      setTimeout(() => {
        set((st) => ({
          syncByRepo: { ...st.syncByRepo, [repoId]: { ...st.syncByRepo[repoId], behind: 0, lastFetch: "just now" } },
        }));
        useUiStore.getState().setSyncPhase("idle");
        useUiStore.getState().showToast({
          title: `Pulled ${s.behind} commit${s.behind !== 1 ? "s" : ""}`,
          sub: `${repo.name} is up to date`,
          color: "var(--color-teal)",
        });
      }, 1500);
    } else {
      ui.setSyncPhase("fetching");
      setTimeout(() => {
        set((st) => ({
          syncByRepo: { ...st.syncByRepo, [repoId]: { ...st.syncByRepo[repoId], lastFetch: "just now" } },
        }));
        useUiStore.getState().setSyncPhase("idle");
        useUiStore.getState().showToast({
          title: "Up to date",
          sub: `Fetched origin/${branch}`,
          color: "var(--color-teal)",
        });
      }, 1400);
    }
  },

  commit: () => {
    const state = get();
    const { repoId, summary, filesByRepo, historyByRepo, syncByRepo, branchByRepo, repos } = state;
    const files = filesByRepo[repoId];
    const staged = files.filter((f) => f.staged);
    if (staged.length === 0 || !summary.trim()) return;

    const { accounts, activeId } = useProfilesStore.getState();
    const account = accounts.find((a) => a.id === activeId) ?? accounts[0];
    const repo = repos.find((r) => r.id === repoId)!;
    const branch = branchByRepo[repoId];

    const add = staged.reduce((s, f) => s + f.add, 0);
    const del = staged.reduce((s, f) => s + f.del, 0);
    const hash = Math.random().toString(16).slice(2, 9);
    const prev = historyByRepo[repoId] || [];
    const prevHead = prev[0]?.hash ?? null;
    const cleaned = prev.map((c) => (c.refs ? { ...c, refs: c.refs.filter((r) => !r.head) } : c));
    const newCommit: Commit = {
      hash,
      subject: summary,
      by: activeId,
      when: "just now",
      add,
      del,
      files: staged.length,
      flag: repo.owner !== activeId,
      lane: 0,
      parents: prevHead ? [prevHead] : [],
      refs: [{ name: branch, head: true }],
    };

    set({
      historyByRepo: { ...historyByRepo, [repoId]: [newCommit, ...cleaned] },
      filesByRepo: { ...filesByRepo, [repoId]: files.filter((f) => !f.staged) },
      syncByRepo: { ...syncByRepo, [repoId]: { ...syncByRepo[repoId], ahead: syncByRepo[repoId].ahead + 1 } },
      summary: "",
      desc: "",
    });

    useUiStore.getState().showToast({
      title: `Committed as ${account.label}`,
      sub: `${staged.length} file${staged.length !== 1 ? "s" : ""} · ${account.email}`,
      color: account.color,
    });
  },
}));
