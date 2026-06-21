import { useMemo } from "react";
import { BranchMenu } from "@/components/RepoView/BranchMenu";
import { IcArrowDn, IcArrowUp, IcBranch, IcChevron, IcCloud, IcRepo, IcSync } from "@/components/shared/icons";
import { useClickOutside } from "@/hooks/useClickOutside";
import { useRepoView } from "@/hooks/useRepoView";
import { useReposStore } from "@/store/repos";
import { useUiStore } from "@/store/ui";

function ToolbarButton({ className = "", children, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`flex items-center gap-2.5 w-full h-full px-3.5 text-left transition-colors duration-100 hover:bg-white/[0.035] aria-expanded:bg-indigo/10 ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

/** Stacked label (small, top) + value (bold, bottom) used by every section. */
function Stack({ label, value }: { label: string; value: string }) {
  return (
    <span className="flex flex-col justify-center flex-1 min-w-0 leading-[1.3]">
      <span className="text-[11px] text-text-3 font-medium tracking-[0.02em] truncate">{label}</span>
      <span className="text-[13.5px] font-semibold text-text truncate">{value}</span>
    </span>
  );
}

export function Toolbar() {
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
  const openNewBranch = useUiStore((s) => s.openNewBranch);
  const syncPhase = useUiStore((s) => s.syncPhase);
  const progress = useUiStore((s) => s.progress);
  const sidePanelWidth = useUiStore((s) => s.sidePanelWidth);
  const branchRef = useClickOutside<HTMLDivElement>(() => setOpenMenu(null));

  const ahead = sync?.ahead ?? 0;
  const behind = sync?.behind ?? 0;
  const busy = syncPhase !== "idle";

  // Resolve the sync section's label/sub/icon for the current state. Memoized so
  // the derived view is stable across renders and recomputes only when an input
  // actually changes. Must stay above any early return to satisfy the hook rules.
  const { syncLabel, syncSub, SyncIcon } = useMemo(() => {
    if (busy) {
      return {
        syncLabel: syncPhase === "pushing" ? "Pushing…" : syncPhase === "pulling" ? "Pulling…" : "Fetching…",
        syncSub: progress ? `${progress.text} ${progress.pct}%` : "Contacting origin",
        SyncIcon: IcSync,
      };
    }
    if (ahead > 0) {
      return {
        syncLabel: "Push origin",
        syncSub: `${ahead} local commit${ahead !== 1 ? "s" : ""}`,
        SyncIcon: IcArrowUp,
      };
    }
    if (behind > 0) {
      return {
        syncLabel: "Pull origin",
        syncSub: `${behind} commit${behind !== 1 ? "s" : ""} behind`,
        SyncIcon: IcArrowDn,
      };
    }
    return { syncLabel: "Fetch origin", syncSub: sync?.lastFetch ?? "", SyncIcon: IcSync };
  }, [busy, syncPhase, progress, ahead, behind, sync?.lastFetch]);

  // Repo + owner resolved on the backend (repo_view) — no client-side join.
  const repo = useRepoView(repoId);
  if (!repo) return null;

  return (
    <div className="h-14 flex-none flex items-stretch bg-[#13111f] border-b border-border-soft">
      {/* Repository — width tracks the panel below, but may shrink when the
          window is too narrow to keep Branch/Sync from being crowded out. */}
      <div
        style={{ flexBasis: sidePanelWidth, maxWidth: sidePanelWidth }}
        className="min-w-0 border-r border-border-soft"
      >
        <ToolbarButton onClick={toggleRepoSidebar} aria-expanded={repoSidebarOpen}>
          <span className="grid place-items-center flex-none" style={{ color: repo.ownerColor }}>
            {repo.remote ? <IcCloud /> : <IcRepo />}
          </span>
          <Stack label="Current Repository" value={repo.name} />
          <IcChevron s={13} className="ml-auto text-text-3 flex-none" />
        </ToolbarButton>
      </div>

      {/* Branch */}
      <div ref={branchRef} className="relative flex items-stretch flex-1 min-w-32 border-r border-border-soft">
        <ToolbarButton
          onClick={() => setOpenMenu(openMenu === "branch" ? null : "branch")}
          aria-expanded={openMenu === "branch"}
        >
          <span className="grid place-items-center flex-none text-text-2">
            <IcBranch />
          </span>
          <Stack label="Current Branch" value={branch ?? "—"} />
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

      {/* Sync — bold label on top, status below, live progress fill while busy */}
      <div className="relative w-67 flex-none min-w-0">
        <ToolbarButton className={busy ? "opacity-85 cursor-default" : ""} disabled={busy} onClick={runSync}>
          <span className={`grid place-items-center flex-none text-text-2 ${busy ? "animate-spin-fast" : ""}`}>
            <SyncIcon />
          </span>
          <span className="flex flex-col justify-center flex-1 min-w-0 leading-[1.3]">
            <span className="text-[13.5px] font-semibold text-text truncate">{syncLabel}</span>
            <span className="text-[11px] text-text-3 font-medium tracking-[0.02em] truncate">{syncSub}</span>
          </span>
          {(ahead > 0 || behind > 0) && !busy && (
            <span className="ml-auto flex items-center gap-0.5 text-[12px] font-semibold font-mono text-indigo-light bg-indigo/[0.14] border border-indigo/30 px-1.75 py-0.5 rounded-full">
              {ahead > 0 ? ahead : behind}
              {ahead > 0 ? <IcArrowUp s={11} sw={2} /> : <IcArrowDn s={11} sw={2} />}
            </span>
          )}
        </ToolbarButton>
        {busy && (
          <span
            className="absolute bottom-0 left-0 h-0.5 bg-indigo transition-[width] duration-200 ease-out"
            style={{ width: `${progress?.pct ?? 0}%` }}
          />
        )}
      </div>
    </div>
  );
}
