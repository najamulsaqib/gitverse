import { useEffect } from "react";
import "@/App.css";
import { AddAccountWizard } from "@/components/ProfileSetup/AddAccountWizard";
import { EditAccountModal } from "@/components/ProfileSetup/EditAccountModal";
import { AddRepoModal } from "@/components/RepoView/AddRepoModal";
import { MainPanel } from "@/components/RepoView/MainPanel";
import { NewBranchModal } from "@/components/RepoView/NewBranchModal";
import { NoRepos } from "@/components/RepoView/NoRepos";
import { RepoContextMenu } from "@/components/RepoView/RepoContextMenu";
import { RepoSidebar } from "@/components/RepoView/RepoSidebar";
import { SidePanel } from "@/components/RepoView/SidePanel";
import { Toolbar } from "@/components/RepoView/Toolbar";
import { AccountRail } from "@/components/Sidebar/AccountRail";
import { SetupGate } from "@/components/SetupGate/SetupGate";
import { Toast } from "@/components/shared/Toast";
import { onGitProgress, onRepoChanged } from "@/hooks/useGit";
import { useProfilesStore } from "@/store/profiles";
import { useReposStore } from "@/store/repos";
import { useUiStore } from "@/store/ui";

function App() {
  const repoSidebarOpen = useUiStore((s) => s.repoSidebarOpen);
  const closeRepoSidebar = useUiStore((s) => s.closeRepoSidebar);
  const addAccountModalOpen = useUiStore((s) => s.addAccountModalOpen);
  const addRepoModalOpen = useUiStore((s) => s.addRepoModalOpen);
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

  // Live sync: the backend watches the selected repo and emits "repo-changed"
  // on any working-tree/.git change. Debounce a burst into a single refresh.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const unlisten = onRepoChanged(() => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => useReposStore.getState().refresh(), 200);
    });
    return () => {
      if (timer) clearTimeout(timer);
      unlisten.then((fn) => fn());
    };
  }, []);

  // Live git progress: the backend streams `git-progress` while a network op runs.
  useEffect(() => {
    const unlisten = onGitProgress((p) => useUiStore.getState().setProgress(p));
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
        {newBranch && <NewBranchModal />}
        {editAccountId && <EditAccountModal />}
        <RepoContextMenu />
        <Toast toast={toast} />
      </div>
    </div>
  );
}

export default App;
