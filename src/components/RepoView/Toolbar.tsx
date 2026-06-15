import { BranchMenu } from "@/components/RepoView/BranchMenu";
import { IcArrowDn, IcArrowUp, IcBranch, IcChevron, IcGlobe, IcLock, IcSync } from "@/components/shared/icons";
import { useProfilesStore } from "@/store/profiles";
import { useReposStore } from "@/store/repos";
import { useUiStore } from "@/store/ui";
import { useClickOutside } from "@/hooks/useClickOutside";

function ToolbarButton({ className = "", children, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`flex items-center gap-2.5 w-full px-3.5 text-left transition-colors duration-100 hover:bg-white/[0.035] aria-expanded:bg-indigo/10 ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

export function Toolbar() {
  const accounts = useProfilesStore((s) => s.accounts);
  const repos = useReposStore((s) => s.repos);
  const repoId = useReposStore((s) => s.repoId);
  const branch = useReposStore((s) => s.branchByRepo[repoId]);
  const branches = useReposStore((s) => s.branchesByRepo[repoId]);
  const sync = useReposStore((s) => s.syncByRepo[repoId]);
  const selectBranch = useReposStore((s) => s.selectBranch);
  const runSync = useReposStore((s) => s.runSync);
  const repoSidebarOpen = useUiStore((s) => s.repoSidebarOpen);
  const toggleRepoSidebar = useUiStore((s) => s.toggleRepoSidebar);
  const openMenu = useUiStore((s) => s.openMenu);
  const setOpenMenu = useUiStore((s) => s.setOpenMenu);
  const branchRef = useClickOutside<HTMLDivElement>(() => setOpenMenu(null));
  const openNewBranch = useUiStore((s) => s.openNewBranch);
  const syncPhase = useUiStore((s) => s.syncPhase);

  const repo = repos.find((r) => r.id === repoId);
  if (!repo) return null;
  const owner = accounts.find((a) => a.id === repo.owner) ?? accounts[0];
  const ahead = sync?.ahead ?? 0;
  const behind = sync?.behind ?? 0;

  let syncLabel = "Fetch origin";
  let SyncIcon = IcSync;
  let syncSub = sync?.lastFetch ?? "";
  if (syncPhase === "fetching") {
    syncLabel = "Fetching…";
    syncSub = "Contacting origin";
  } else if (syncPhase === "pushing") {
    syncLabel = "Pushing…";
    syncSub = `${ahead} commit${ahead !== 1 ? "s" : ""}`;
  } else if (syncPhase === "pulling") {
    syncLabel = "Pulling…";
    syncSub = `${behind} commit${behind !== 1 ? "s" : ""}`;
  } else if (ahead > 0) {
    syncLabel = "Push origin";
    SyncIcon = IcArrowUp;
    syncSub = `${ahead} local commit${ahead !== 1 ? "s" : ""}`;
  } else if (behind > 0) {
    syncLabel = "Pull origin";
    SyncIcon = IcArrowDn;
    syncSub = `${behind} commit${behind !== 1 ? "s" : ""} behind`;
  }

  const busy = syncPhase !== "idle";

  return (
    <div className="h-14 flex-none flex items-stretch bg-[#13111f] border-b border-border-soft">
      {/* Repository — toggles the repositories side panel */}
      <div className="flex items-stretch w-86 flex-none border-r border-border-soft">
        <ToolbarButton onClick={toggleRepoSidebar} aria-expanded={repoSidebarOpen}>
          <span className="grid place-items-center flex-none text-text-2" style={{ color: owner?.color }}>
            {repo.private ? <IcLock /> : <IcGlobe />}
          </span>
          <span className="flex flex-col justify-center flex-1 min-w-0 leading-[1.3]">
            <span className="text-[11px] text-text-3 font-medium tracking-[0.02em] whitespace-nowrap overflow-hidden text-ellipsis">
              Current Repository
            </span>
            <span className="text-[13.5px] font-semibold text-text whitespace-nowrap overflow-hidden text-ellipsis">
              {repo.name}
            </span>
          </span>
          <IcChevron s={13} className="ml-auto text-text-3 flex-none" />
        </ToolbarButton>
      </div>

      {/* Branch */}
      <div ref={branchRef} className="relative flex items-stretch flex-1 min-w-0 border-r border-border-soft">
        <ToolbarButton
          onClick={() => setOpenMenu(openMenu === "branch" ? null : "branch")}
          aria-expanded={openMenu === "branch"}
        >
          <span className="grid place-items-center flex-none text-text-2">
            <IcBranch />
          </span>
          <span className="flex flex-col justify-center flex-1 min-w-0 leading-[1.3]">
            <span className="text-[11px] text-text-3 font-medium tracking-[0.02em] whitespace-nowrap overflow-hidden text-ellipsis">
              Current Branch
            </span>
            <span className="text-[13.5px] font-semibold text-text whitespace-nowrap overflow-hidden text-ellipsis">
              {branch ?? "—"}
            </span>
          </span>
          <IcChevron s={13} className="ml-auto text-text-3 flex-none" />
        </ToolbarButton>
        {openMenu === "branch" && (
          <BranchMenu
            branches={branches ?? []}
            onPick={(n) => {
              selectBranch(n);
              setOpenMenu(null);
            }}
            onNewBranch={openNewBranch}
          />
        )}
      </div>

      {/* Sync */}
      <div className="relative flex items-stretch w-67 flex-none">
        <ToolbarButton className={busy ? "opacity-85 cursor-default" : ""} disabled={busy} onClick={runSync}>
          <span
            className={`grid place-items-center flex-none text-text-2 ${syncPhase === "fetching" ? "animate-spin-fast" : ""}`}
          >
            <SyncIcon />
          </span>
          <span className="flex flex-col justify-center flex-1 min-w-0 leading-[1.3]">
            <span className="text-[13.5px] font-semibold text-text whitespace-nowrap overflow-hidden text-ellipsis">
              {syncLabel}
            </span>
            <span className="text-[11px] text-text-3 font-medium tracking-[0.02em] whitespace-nowrap overflow-hidden text-ellipsis">
              {syncSub}
            </span>
          </span>
          {(ahead > 0 || behind > 0) && !busy && (
            <span className="ml-auto flex items-center gap-0.5 text-[12px] font-semibold font-mono text-indigo-light bg-indigo/[0.14] border border-indigo/30 px-1.75 py-0.5 rounded-full">
              {ahead > 0 ? ahead : behind}
              {ahead > 0 ? <IcArrowUp s={11} sw={2} /> : <IcArrowDn s={11} sw={2} />}
            </span>
          )}
        </ToolbarButton>
      </div>
    </div>
  );
}
