import "@/App.css";
import { AddAccountWizard } from "@/components/ProfileSetup/AddAccountWizard";
import { MainPanel } from "@/components/RepoView/MainPanel";
import { SidePanel } from "@/components/RepoView/SidePanel";
import { Toolbar } from "@/components/RepoView/Toolbar";
import { AccountRail } from "@/components/Sidebar/AccountRail";
import { Toast } from "@/components/shared/Toast";
import { useUiStore } from "@/store/ui";

function App() {
  const openMenu = useUiStore((s) => s.openMenu);
  const setOpenMenu = useUiStore((s) => s.setOpenMenu);
  const addAccountModalOpen = useUiStore((s) => s.addAccountModalOpen);
  const toast = useUiStore((s) => s.toast);

  return (
    <div
      className="h-screen w-screen overflow-hidden bg-[radial-gradient(1200px_700px_at_18%_-10%,#1a1636_0%,#0a0913_55%,#07060d_100%)]"
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="relative flex w-full h-full bg-bg overflow-hidden">
        <AccountRail />
        <div className="flex-1 flex flex-col min-w-0">
          <Toolbar />
          <div className="flex-1 flex min-h-0">
            <div className="w-86 flex-none min-w-0 max-w-86 min-h-0 overflow-hidden flex border-r border-border-soft">
              <SidePanel />
            </div>
            <div className="flex-1 min-w-0 flex flex-col bg-bg">
              <MainPanel />
            </div>
          </div>
        </div>

        {openMenu && <div className="absolute inset-0 z-30" onClick={() => setOpenMenu(null)} />}
        {addAccountModalOpen && <AddAccountWizard />}
        <Toast toast={toast} />
      </div>
    </div>
  );
}

export default App;
