import { useEffect } from "react";
import "@/App.css";
import { AddAccountWizard } from "@/components/ProfileSetup/AddAccountWizard";
import { EditAccountModal } from "@/components/ProfileSetup/EditAccountModal";
import { AddRepoModal } from "@/components/RepoView/AddRepoModal";
import { CloneRepoModal } from "@/components/RepoView/CloneRepoModal";
import { MainPanel } from "@/components/RepoView/MainPanel";
import { NewBranchModal } from "@/components/RepoView/NewBranchModal";
import { StashModal } from "@/components/RepoView/StashModal";
import { GraphContextMenu } from "@/components/LogGraph/GraphContextMenu";
import { NoRepos } from "@/components/RepoView/NoRepos";
import { FileContextMenu } from "@/components/RepoView/FileContextMenu";
import { RepoContextMenu } from "@/components/RepoView/RepoContextMenu";
import { RepoSidebar } from "@/components/RepoView/RepoSidebar";
import { SidePanel } from "@/components/RepoView/SidePanel";
import { Toolbar } from "@/components/RepoView/Toolbar";
import { AccountRail } from "@/components/Sidebar/AccountRail";
import { SetupGate } from "@/components/SetupGate/SetupGate";
import { Toast } from "@/components/shared/Toast";
import { onGitProgress, onMenuAction, onRepoChanged } from "@/hooks/useGit";
import { useProfilesStore } from "@/store/profiles";
import { useReposStore } from "@/store/repos";
import { useUiStore } from "@/store/ui";

function App() {
  const repoSidebarOpen = useUiStore((s) => s.repoSidebarOpen);
  const closeRepoSidebar = useUiStore((s) => s.closeRepoSidebar);
  const addAccountModalOpen = useUiStore((s) => s.addAccountModalOpen);
  const addRepoModalOpen = useUiStore((s) => s.addRepoModalOpen);
  const cloneRepoModalOpen = useUiStore((s) => s.cloneRepoModalOpen);
  const stashModalOpen = useUiStore((s) => s.stashModalOpen);
  const editRepoId = useUiStore((s) => s.editRepoId);
  const editAccountId = useUiStore((s) => s.editAccountId);
  const newBranch = useUiStore((s) => s.newBranch);
  const toast = useUiStore((s) => s.toast);
  const sidePanelWidth = useUiStore((s) => s.sidePanelWidth);
  const loaded = useProfilesStore((s) => s.loaded);
  const accounts = useProfilesStore((s) => s.accounts);
  const repos = useReposStore((s) => s.repos);

  useEffect(() => {
    useProfilesStore.getState().loadProfiles();
    useReposStore.getState().loadRepos();
  }, []);

  // Live sync: the backend already debounces + classifies filesystem events and
  // emits a typed "repo-changed", so we refresh immediately (leading-edge, feels
  // instant). The store serializes overlapping refreshes and merges their scopes,
  // so a quick worktree-then-refs sequence still refreshes both without a stampede.
  useEffect(() => {
    const unlisten = onRepoChanged((change) => {
      useReposStore.getState().refresh(change);
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  // Auto-fetch: silently refresh remote refs every few minutes and whenever the
  // window regains focus, so a teammate's push surfaces as a "Pull origin" count
  // and new remote branches appear without a manual fetch.
  useEffect(() => {
    const tick = () => useReposStore.getState().autoFetch();
    const id = setInterval(tick, 180_000);
    window.addEventListener("focus", tick);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", tick);
    };
  }, []);

  // Live git progress: the backend streams `git-progress` while a network op runs.
  useEffect(() => {
    const unlisten = onGitProgress((p) => useUiStore.getState().setProgress(p));
    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  // Native menu actions: map each clicked item id to its store/ui action.
  useEffect(() => {
    const unlisten = onMenuAction((id) => {
      const ui = useUiStore.getState();
      const reposStore = useReposStore.getState();
      switch (id) {
        case "add-repo":
          ui.openAddRepo();
          break;
        case "clone-repo":
          ui.openCloneRepo();
          break;
        case "add-identity":
          ui.openAddAccount();
          break;
        case "new-branch":
          if (reposStore.repoId) ui.openNewBranch("");
          break;
        case "stage-all":
          reposStore.toggleAll(true);
          break;
        case "unstage-all":
          reposStore.toggleAll(false);
          break;
        case "stash-changes":
          if (reposStore.repoId) ui.openStashModal();
          break;
        case "sync":
          reposStore.runSync();
          break;
        case "refresh":
          reposStore.refresh();
          break;
      }
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      // Always swallow Escape so the webview's default action (exiting macOS
      // native fullscreen) never fires. Then close the topmost overlay, if any.
      e.preventDefault();
      const ui = useUiStore.getState();
      if (ui.newBranch) {
        ui.closeNewBranch();
      } else if (ui.stashModalOpen) {
        ui.closeStashModal();
      } else if (ui.graphMenu) {
        ui.closeGraphMenu();
      } else if (ui.openMenu) {
        ui.setOpenMenu(null);
      } else if (ui.editAccountId) {
        ui.closeEditAccount();
      } else if (ui.accountMenu) {
        ui.closeAccountMenu();
      } else if (ui.addAccountModalOpen) {
        ui.closeAddAccount();
      } else if (ui.addRepoModalOpen) {
        ui.closeAddRepo();
      } else if (ui.editRepoId) {
        ui.closeEditRepo();
      } else if (ui.repoMenu) {
        ui.closeRepoMenu();
      } else if (ui.repoSidebarOpen) {
        ui.closeRepoSidebar();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Drag the divider to resize the Changes/History panel (clamped in the store).
  const startResize = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = useUiStore.getState().sidePanelWidth;
    const onMove = (ev: PointerEvent) =>
      useUiStore.getState().setSidePanelWidth(startW + (ev.clientX - startX));
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";
  };

  if (!loaded) {
    return (
      <div className="h-screen w-screen bg-[radial-gradient(1200px_700px_at_18%_-10%,#1a1636_0%,#0a0913_55%,#07060d_100%)]" />
    );
  }

  if (accounts.length === 0) {
    return <SetupGate />;
  }

  return (
    <div
      className="h-screen w-screen overflow-hidden bg-[radial-gradient(1200px_700px_at_18%_-10%,#1a1636_0%,#0a0913_55%,#07060d_100%)]"
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="relative flex w-full h-full bg-bg overflow-hidden">
        <AccountRail />
        <div className="flex-1 flex flex-col min-w-0 relative">
          {repos.length === 0 ? (
            <NoRepos />
          ) : (
            <>
              <Toolbar />
              <div className="flex-1 flex min-h-0">
                <div
                  style={{ width: sidePanelWidth }}
                  className="flex-none min-w-0 min-h-0 overflow-hidden flex"
                >
                  <SidePanel />
                </div>
                <div
                  onPointerDown={startResize}
                  className="group relative w-px flex-none bg-border-soft cursor-col-resize"
                  title="Drag to resize"
                >
                  <span className="absolute inset-y-0 -left-1 -right-1 transition-colors group-hover:bg-indigo/30" />
                </div>
                <div className="flex-1 min-w-0 flex flex-col bg-bg">
                  <MainPanel />
                </div>
              </div>
            </>
          )}
          {repoSidebarOpen && repos.length > 0 && (
            <>
              <div className="absolute inset-0 z-40 bg-[rgba(6,5,12,0.45)] animate-fade-in" onClick={closeRepoSidebar} />
              <RepoSidebar />
            </>
          )}
        </div>

        {addAccountModalOpen && <AddAccountWizard />}
        {(addRepoModalOpen || editRepoId) && <AddRepoModal />}
        {cloneRepoModalOpen && <CloneRepoModal />}
        {stashModalOpen && <StashModal />}
        {newBranch && <NewBranchModal />}
        {editAccountId && <EditAccountModal />}
        <RepoContextMenu />
        <GraphContextMenu />
        <FileContextMenu />
        <Toast toast={toast} />
      </div>
    </div>
  );
}

export default App;
