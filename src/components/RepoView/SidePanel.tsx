import { ChangesPanel } from "@/components/RepoView/ChangesPanel";
import { CommitBox } from "@/components/RepoView/CommitBox";
import { HistoryPane } from "@/components/LogGraph/HistoryPane";
import { useReposStore } from "@/store/repos";
import { useUiStore } from "@/store/ui";
import type { SidebarTab } from "@/store/ui";

export function SidePanel() {
  const tab = useUiStore((s) => s.tab);
  const setTab = useUiStore((s) => s.setTab);
  const repoId = useReposStore((s) => s.repoId);
  const files = useReposStore((s) => s.filesByRepo[repoId]) ?? [];

  const tabs: { key: SidebarTab; label: string; count?: number }[] = [
    { key: "changes", label: "Changes", count: files.length },
    { key: "history", label: "History" },
  ];
  const activeIndex = tabs.findIndex((t) => t.key === tab);

  return (
    <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden bg-[#13111f]">
      <div className="relative flex border-b border-border-soft flex-none">
        {tabs.map((t) => (
          <button
            key={t.key}
            className={`flex-1 px-2 py-3 text-[13px] font-semibold transition-colors duration-100 flex items-center justify-center gap-1.75 hover:text-text-2 ${tab === t.key ? "text-text" : "text-text-3"}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
            {!!t.count && (
              <span
                className={`text-[11px] font-semibold font-mono rounded-full px-1.75 py-px ${tab === t.key ? "bg-indigo/20 text-indigo-light" : "bg-surface-3 text-text-2"}`}
              >
                {t.count}
              </span>
            )}
          </button>
        ))}
        <span
          className="absolute -bottom-px left-0 w-1/2 h-0.5 bg-indigo transition-transform duration-220 ease-[cubic-bezier(0.5,0.1,0.3,1)]"
          style={{ transform: `translateX(${activeIndex * 100}%)` }}
        />
      </div>

      {tab === "changes" ? (
        <>
          {files.length > 0 ? (
            <ChangesPanel />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-2 text-text-3 p-7.5">
              <img src="/placeholder.svg" alt="" width={64} height={64} style={{ opacity: 0.5 }} />
              <div className="text-[14px] font-semibold text-text-2">No local changes</div>
              <div className="text-[12px]">Working tree clean.</div>
            </div>
          )}
          {files.length > 0 && <CommitBox />}
        </>
      ) : (
        <HistoryPane />
      )}
    </div>
  );
}
