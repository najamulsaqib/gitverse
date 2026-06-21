import { create } from "zustand";
import {
  gitBranches,
  gitCheckAccess,
  gitCheckout,
  gitCherryPick,
  gitCommit,
  gitDiscardFile,
  gitReset,
  gitRevert,
  gitFetch,
  gitFetchSilent,
  gitLog,
  gitPull,
  gitPush,
  gitStage,
  gitStageAll,
  gitStashApply,
  gitStashDrop,
  gitStashList,
  gitStashPop,
  gitStashSave,
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
import { openFileInEditor, openFileWithDefault, revealFileInFileManager } from "@/hooks/useSystem";
import { useProfilesStore } from "@/store/profiles";
import { useUiStore } from "@/store/ui";
import type { AccessState, Branch, Commit, FileChange, Repo, StashEntry, SyncState } from "@/types";

interface ReposState {
  repos: Repo[];
  repoId: string;
  branchByRepo: Record<string, string>;
  branchesByRepo: Record<string, Branch[]>;
  filesByRepo: Record<string, FileChange[]>;
  historyByRepo: Record<string, Commit[]>;
  historyLimitByRepo: Record<string, number>;
  hasMoreByRepo: Record<string, boolean>;
  syncByRepo: Record<string, SyncState>;
  accessByRepo: Record<string, AccessState>;
  stashesByRepo: Record<string, StashEntry[]>;
  selFile: string | null;
  selCommit: string | null;
  selStash: number | null;
  filter: string;
  summary: string;
  desc: string;
  coAuthors: string[];

  loadRepos: () => Promise<void>;
  addRepo: (repo: Repo) => Promise<void>;
  updateRepo: (repo: Repo) => Promise<void>;
  removeRepo: (id: string) => Promise<void>;
  selectRepo: (id: string) => void;
  refresh: (scope?: { worktree: boolean; refs: boolean }) => Promise<void>;
  loadMoreHistory: () => Promise<void>;
  selectBranch: (name: string) => Promise<void>;
  createBranch: (name: string, from: string) => Promise<void>;
  checkoutCommit: (hash: string) => Promise<void>;
  undoCommit: (hash: string) => Promise<void>;
  cherryPick: (hash: string) => Promise<void>;
  revertCommit: (hash: string) => Promise<void>;
  resetToCommit: (hash: string, mode: "soft" | "mixed" | "hard") => Promise<void>;
  selectFile: (path: string) => void;
  selectCommit: (hash: string) => void;
  selectStash: (index: number) => void;
  saveStash: (message: string, includeUntracked: boolean) => Promise<void>;
  stashFile: (path: string) => Promise<void>;
  applyStash: (index: number) => Promise<void>;
  popStash: (index: number) => Promise<void>;
  dropStash: (index: number) => Promise<void>;
  toggleFile: (path: string) => Promise<void>;
  toggleAll: (on: boolean) => Promise<void>;
  discardFile: (path: string) => Promise<void>;
  openFile: (path: string) => Promise<void>;
  openFileWith: (path: string) => Promise<void>;
  revealFile: (path: string) => Promise<void>;
  /** Absolute path of a repo-relative file, for copy/clipboard actions. */
  fileAbsPath: (path: string) => string;
  setFilter: (filter: string) => void;
  setSummary: (summary: string) => void;
  setDesc: (desc: string) => void;
  addCoAuthor: (email: string) => void;
  removeCoAuthor: (email: string) => void;
  runSync: () => Promise<void>;
  autoFetch: () => Promise<void>;
  checkAccess: () => Promise<void>;
  commit: () => Promise<void>;
}

/** Guards against overlapping background fetches on a slow network. */
let autoFetching = false;

/** Serializes refreshes: at most one runs at a time, and any requests that
 * arrive mid-flight collapse into one trailing run with the widest scope. A full
 * refresh is just the widest scope ({ worktree, refs } both true). */
let refreshing = false;
let refreshQueued: { worktree: boolean; refs: boolean } | null = null;

/** Commits loaded per repo on first view, and how many more each scroll adds. */
const DEFAULT_HISTORY_LIMIT = 150;
const HISTORY_PAGE = 150;

/** Map raw commit author emails onto configured identity ids where they match. */
const mapAuthors = (history: Commit[]) => {
  const accounts = useProfilesStore.getState().accounts;
  return history.map((c) => ({ ...c, by: accounts.find((a) => a.email === c.by)?.id ?? c.by }));
};

const toastErr = (title: string, e: unknown) =>
  useUiStore.getState().showToast({ title, sub: String(e), color: "#e8506e" });

/** Does this git error look like the remote rejecting the active identity? */
const isAccessDenied = (e: unknown) =>
  /permission denied|access rights|authentication failed|could not read from remote|publickey|repository not found|\b403\b/i.test(
    String(e),
  );

export const useReposStore = create<ReposState>((set, get) => ({
  repos: [],
  repoId: "",
  branchByRepo: {},
  branchesByRepo: {},
  filesByRepo: {},
  historyByRepo: {},
  historyLimitByRepo: {},
  hasMoreByRepo: {},
  syncByRepo: {},
  accessByRepo: {},
  stashesByRepo: {},
  selFile: null,
  selCommit: null,
  selStash: null,
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
      get().checkAccess();
      get().autoFetch();
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
    set({ repoId: id, selFile: null, selCommit: null, selStash: null, filter: "", summary: "", desc: "", coAuthors: [] });
    useUiStore.getState().setTab("changes");
    useUiStore.getState().setSyncPhase("idle");

    const repo = state.repos.find((r) => r.id === id);
    if (!repo) return;
    setActiveRepoCmd(id).catch(() => { });
    watchRepo(repo.path).catch(() => { });
    get().refresh();
    get().checkAccess();
    get().autoFetch();

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

  // `scope` (from the file watcher) narrows the work: a plain working-tree edit
  // only needs `git status`, while ref changes (commit/checkout/branch/fetch)
  // also need the expensive `git log` + `git branch`. A full refresh (no scope —
  // manual triggers, repo switch, post-commit) runs everything. `git status` is
  // cheap and always runs since it also drives the branch name and ahead/behind.
  refresh: async (scope) => {
    // Coalesce: if a refresh is already running, fold this request's scope into
    // the queued one and let the in-flight loop pick it up — never run two at once.
    // (An awaited refresh that gets queued resolves before its run completes, but
    // every caller only fires it as the last step of an action, so that's fine.)
    const req = scope ?? { worktree: true, refs: true };
    if (refreshing) {
      refreshQueued = refreshQueued
        ? { worktree: refreshQueued.worktree || req.worktree, refs: refreshQueued.refs || req.refs }
        : req;
      return;
    }

    refreshing = true;
    try {
      let cur: { worktree: boolean; refs: boolean } | null = req;
      while (cur) {
        const { repoId, repos, historyLimitByRepo } = get();
        const repo = repos.find((r) => r.id === repoId);
        if (!repo) break;

        const wantHistory = cur.refs;
        const limit = historyLimitByRepo[repoId] ?? DEFAULT_HISTORY_LIMIT;
        const [status, history, branches, stashes] = await Promise.all([
          gitStatus(repo.path),
          wantHistory ? gitLog(repo.path, limit) : Promise.resolve(null),
          wantHistory ? gitBranches(repo.path) : Promise.resolve(null),
          gitStashList(repo.path).catch(() => [] as StashEntry[]),
        ]);

        const mapped = history ? mapAuthors(history) : null;

        set((state) => {
          let selFile = state.selFile;
          if (status.files.length && !status.files.some((f) => f.path === selFile)) selFile = status.files[0].path;
          else if (!status.files.length) selFile = null;

          // When history was skipped, keep the existing list and selection.
          const nextHistory = mapped ?? state.historyByRepo[repoId] ?? [];
          let selCommit = state.selCommit;
          if (nextHistory.length && !nextHistory.some((c) => c.hash === selCommit)) selCommit = nextHistory[0].hash;

          // Stash indexes shift after every pop/drop, so re-anchor the selection
          // to a still-existing entry (or clear it when the stash is now empty).
          let selStash = state.selStash;
          if (stashes.length && !stashes.some((s) => s.index === selStash)) selStash = stashes[0].index;
          else if (!stashes.length) selStash = null;

          return {
            branchByRepo: { ...state.branchByRepo, [repoId]: status.branch },
            branchesByRepo: branches ? { ...state.branchesByRepo, [repoId]: branches } : state.branchesByRepo,
            filesByRepo: { ...state.filesByRepo, [repoId]: status.files },
            historyByRepo: mapped ? { ...state.historyByRepo, [repoId]: mapped } : state.historyByRepo,
            hasMoreByRepo:
              history ? { ...state.hasMoreByRepo, [repoId]: history.length >= limit } : state.hasMoreByRepo,
            syncByRepo: {
              ...state.syncByRepo,
              [repoId]: {
                ahead: status.ahead,
                behind: status.behind,
                upstream: status.upstream,
                lastFetch: status.upstream ? "tracking origin" : "no upstream",
              },
            },
            stashesByRepo: { ...state.stashesByRepo, [repoId]: stashes },
            selFile,
            selCommit,
            selStash,
          };
        });

        // Drain any request that arrived while we were awaiting git above.
        cur = refreshQueued;
        refreshQueued = null;
      }
    } finally {
      refreshing = false;
    }
  },

  // Grow this repo's loaded history by one page (driven by scrolling to the
  // bottom). Re-querying the log is fast; the per-row layout and virtualised
  // list keep rendering cheap regardless of how much is loaded.
  loadMoreHistory: async () => {
    const { repoId, repos, historyLimitByRepo, hasMoreByRepo } = get();
    if (hasMoreByRepo[repoId] === false) return;
    const repo = repos.find((r) => r.id === repoId);
    if (!repo) return;

    const limit = (historyLimitByRepo[repoId] ?? DEFAULT_HISTORY_LIMIT) + HISTORY_PAGE;
    let history;
    try {
      history = await gitLog(repo.path, limit);
    } catch {
      return;
    }
    set((state) => ({
      historyLimitByRepo: { ...state.historyLimitByRepo, [repoId]: limit },
      hasMoreByRepo: { ...state.hasMoreByRepo, [repoId]: history.length >= limit },
      historyByRepo: { ...state.historyByRepo, [repoId]: mapAuthors(history) },
    }));
  },

  selectBranch: async (name) => {
    const { repoId, repos, branchByRepo, branchesByRepo } = get();
    const repo = repos.find((r) => r.id === repoId);
    if (!repo || name === branchByRepo[repoId]) return;

    // A remote-only branch (e.g. "origin/feature") is checked out by its bare
    // name so git DWIM creates a local branch tracking it.
    const picked = (branchesByRepo[repoId] || []).find((b) => b.name === name);
    const target = picked?.remote ? name.replace(/^[^/]+\//, "") : name;
    if (target === branchByRepo[repoId]) return;
    try {
      await gitCheckout(repo.path, target, false);
      useUiStore.getState().showToast({
        title: `Checked out ${target}`,
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

  // Detached-HEAD checkout of an arbitrary commit from the graph.
  checkoutCommit: async (hash) => {
    const { repoId, repos } = get();
    const repo = repos.find((r) => r.id === repoId);
    if (!repo) return;
    try {
      await gitCheckout(repo.path, hash, false);
      useUiStore.getState().showToast({
        title: `Checked out ${hash.slice(0, 7)}`,
        sub: `${repo.name} · detached HEAD`,
        color: "var(--color-teal)",
      });
    } catch (e) {
      toastErr("Checkout failed", e);
      return;
    }
    await get().refresh();
  },

  // Undo the most recent (unpushed) commit: soft-reset to its parent so the
  // commit's changes return to the staging area, ready to amend and re-commit.
  undoCommit: async (hash) => {
    const { repoId, repos } = get();
    const repo = repos.find((r) => r.id === repoId);
    if (!repo) return;
    try {
      await gitReset(repo.path, `${hash}^`, "soft");
    } catch (e) {
      toastErr("Undo failed", e);
      return;
    }
    useUiStore.getState().showToast({
      title: "Commit undone",
      sub: `Changes kept staged · ${repo.name}`,
      color: "var(--color-teal)",
    });
    await get().refresh();
  },

  cherryPick: async (hash) => {
    const { repoId, repos } = get();
    const repo = repos.find((r) => r.id === repoId);
    if (!repo) return;
    try {
      await gitCherryPick(repo.path, hash);
    } catch (e) {
      toastErr("Cherry-pick failed", e);
      return;
    }
    useUiStore.getState().showToast({
      title: `Cherry-picked ${hash.slice(0, 7)}`,
      sub: repo.name,
      color: "var(--color-teal)",
    });
    await get().refresh();
  },

  revertCommit: async (hash) => {
    const { repoId, repos } = get();
    const repo = repos.find((r) => r.id === repoId);
    if (!repo) return;
    try {
      await gitRevert(repo.path, hash);
    } catch (e) {
      toastErr("Revert failed", e);
      return;
    }
    useUiStore.getState().showToast({
      title: `Reverted ${hash.slice(0, 7)}`,
      sub: repo.name,
      color: "var(--color-teal)",
    });
    await get().refresh();
  },

  resetToCommit: async (hash, mode) => {
    const { repoId, repos } = get();
    const repo = repos.find((r) => r.id === repoId);
    if (!repo) return;
    try {
      await gitReset(repo.path, hash, mode);
    } catch (e) {
      toastErr("Reset failed", e);
      return;
    }
    useUiStore.getState().showToast({
      title: `Reset to ${hash.slice(0, 7)}`,
      sub: `${mode} · ${repo.name}`,
      color: mode === "hard" ? "#e8506e" : "var(--color-teal)",
    });
    await get().refresh();
  },

  selectFile: (path) => set({ selFile: path }),
  selectCommit: (hash) => set({ selCommit: hash }),
  selectStash: (index) => set({ selStash: index }),

  saveStash: async (message, includeUntracked) => {
    const { repoId, repos } = get();
    const repo = repos.find((r) => r.id === repoId);
    if (!repo) return;
    try {
      await gitStashSave(repo.path, message, includeUntracked);
    } catch (e) {
      toastErr("Stash failed", e);
      return;
    }
    useUiStore.getState().showToast({
      title: "Changes stashed",
      sub: message.trim() ? `“${message.trim()}” · ${repo.name}` : repo.name,
      color: "var(--color-teal)",
    });
    // Stashing clears the working tree — surface the new entry on the Stash tab.
    useUiStore.getState().setTab("stash");
    await get().refresh();
  },

  // Stash a single file via pathspec, naming the stash after it so it's easy to
  // find in the list. Untracked files are included so a brand-new file stashes too.
  stashFile: async (path) => {
    const { repoId, repos } = get();
    const repo = repos.find((r) => r.id === repoId);
    if (!repo) return;
    try {
      await gitStashSave(repo.path, path, true, [path]);
    } catch (e) {
      toastErr("Stash failed", e);
      return;
    }
    useUiStore.getState().showToast({ title: "File stashed", sub: `${path} · ${repo.name}`, color: "var(--color-teal)" });
    await get().refresh();
  },

  applyStash: async (index) => {
    const { repoId, repos } = get();
    const repo = repos.find((r) => r.id === repoId);
    if (!repo) return;
    try {
      await gitStashApply(repo.path, index);
    } catch (e) {
      toastErr("Apply failed", e);
      return;
    }
    useUiStore.getState().showToast({ title: "Stash applied", sub: repo.name, color: "var(--color-teal)" });
    await get().refresh();
  },

  popStash: async (index) => {
    const { repoId, repos } = get();
    const repo = repos.find((r) => r.id === repoId);
    if (!repo) return;
    try {
      await gitStashPop(repo.path, index);
    } catch (e) {
      toastErr("Pop failed", e);
      return;
    }
    useUiStore.getState().showToast({ title: "Stash popped", sub: repo.name, color: "var(--color-teal)" });
    await get().refresh();
  },

  dropStash: async (index) => {
    const { repoId, repos } = get();
    const repo = repos.find((r) => r.id === repoId);
    if (!repo) return;
    try {
      await gitStashDrop(repo.path, index);
    } catch (e) {
      toastErr("Drop failed", e);
      return;
    }
    useUiStore.getState().showToast({ title: "Stash discarded", sub: repo.name });
    await get().refresh();
  },

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

  discardFile: async (path) => {
    const { repoId, repos } = get();
    const repo = repos.find((r) => r.id === repoId);
    if (!repo) return;
    try {
      await gitDiscardFile(repo.path, path);
    } catch (e) {
      toastErr("Failed to discard changes", e);
    }
    await get().refresh();
  },

  openFile: async (path) => {
    const { repoId, repos } = get();
    const repo = repos.find((r) => r.id === repoId);
    if (!repo) return;
    try {
      await openFileInEditor(repo.path, path);
    } catch (e) {
      toastErr("Couldn't open file in editor", e);
    }
  },

  openFileWith: async (path) => {
    const { repoId, repos } = get();
    const repo = repos.find((r) => r.id === repoId);
    if (!repo) return;
    try {
      await openFileWithDefault(repo.path, path);
    } catch (e) {
      toastErr("Couldn't open file", e);
    }
  },

  revealFile: async (path) => {
    try {
      await revealFileInFileManager(get().fileAbsPath(path));
    } catch (e) {
      toastErr("Couldn't reveal file", e);
    }
  },

  fileAbsPath: (path) => {
    const { repoId, repos } = get();
    const repo = repos.find((r) => r.id === repoId);
    if (!repo) return path;
    return `${repo.path.replace(/\/$/, "")}/${path}`;
  },

  runSync: async () => {
    const ui = useUiStore.getState();
    if (ui.syncPhase !== "idle") return;
    const { repoId, repos, syncByRepo } = get();
    const repo = repos.find((r) => r.id === repoId);
    if (!repo) return;
    const s = syncByRepo[repoId] ?? { ahead: 0, behind: 0, upstream: false, lastFetch: "" };

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
      set((st) => ({ accessByRepo: { ...st.accessByRepo, [repoId]: "ok" } }));
    } catch (e) {
      if (isAccessDenied(e)) {
        set((st) => ({ accessByRepo: { ...st.accessByRepo, [repoId]: "denied" } }));
        const { accounts, activeId } = useProfilesStore.getState();
        const account = accounts.find((a) => a.id === activeId) ?? accounts[0];
        ui.showToast({
          title: "No access to remote",
          sub: `${account?.label ?? "The active identity"} can’t reach ${repo.name}. Check this identity has access.`,
          color: "#e8506e",
        });
      } else {
        toastErr("Sync failed", e);
      }
    } finally {
      ui.setSyncPhase("idle");
      await get().refresh();
    }
  },

  // Silent periodic fetch (like VS Code / GitHub Desktop): refreshes remote refs
  // so a teammate's push surfaces as "Pull origin / N behind" and newly pushed
  // branches appear in the menu — without progress UI, toasts, or auth prompts.
  autoFetch: async () => {
    if (autoFetching) return;
    const ui = useUiStore.getState();
    if (ui.syncPhase !== "idle") return; // don't step on a manual push/pull/fetch
    const { repoId, repos } = get();
    const repo = repos.find((r) => r.id === repoId);
    if (!repo) return;
    autoFetching = true;
    try {
      await gitFetchSilent(repo.path);
      set((st) => ({ accessByRepo: { ...st.accessByRepo, [repoId]: "ok" } }));
      await get().refresh();
    } catch {
      // Offline or no access — stay quiet; checkAccess owns the access verdict.
    } finally {
      autoFetching = false;
    }
  },

  checkAccess: async () => {
    const { repoId, repos } = get();
    const repo = repos.find((r) => r.id === repoId);
    if (!repo) return;
    // Drop any stale verdict (e.g. the previous identity's) while we re-probe.
    set((st) => ({ accessByRepo: { ...st.accessByRepo, [repoId]: "unknown" } }));
    try {
      await gitCheckAccess(repo.path);
      set((st) => ({ accessByRepo: { ...st.accessByRepo, [repoId]: "ok" } }));
    } catch (e) {
      set((st) => ({
        accessByRepo: { ...st.accessByRepo, [repoId]: isAccessDenied(e) ? "denied" : "unknown" },
      }));
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
