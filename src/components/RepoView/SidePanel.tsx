import { ChangesPanel } from "@/components/RepoView/ChangesPanel";
import { CommitBox } from "@/components/RepoView/CommitBox";
import { HistoryPane } from "@/components/LogGraph/HistoryPane";
import { useReposStore } from "@/store/repos";
import { useUiStore } from "@/store/ui";

export function SidePanel() {
  const tab = useUiStore((s) => s.tab);
  const setTab = useUiStore((s) => s.setTab);
  const repoId = useReposStore((s) => s.repoId);
  const files = useReposStore((s) => s.filesByRepo[repoId]) ?? [];

  return (
    <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden bg-[#13111f]">
      <div className="relative flex border-b border-border-soft flex-none">
        <button
          className={`flex-1 px-2 py-3 text-[13px] font-semibold transition-colors duration-100 flex items-center justify-center gap-1.75 hover:text-text-2 ${tab === "changes" ? "text-text" : "text-text-3"
            }`}
          onClick={() => setTab("changes")}
        >
          Changes
          {files.length > 0 && (
            <span
              className={`text-[11px] font-semibold font-mono rounded-full px-1.75 py-px ${tab === "changes" ? "bg-indigo/20 text-indigo-light" : "bg-surface-3 text-text-2"
                }`}
            >
              {files.length}
            </span>
          )}
        </button>
        <button
          className={`flex-1 px-2 py-3 text-[13px] font-semibold transition-colors duration-100 flex items-center justify-center gap-1.75 hover:text-text-2 ${tab === "history" ? "text-text" : "text-text-3"
            }`}
          onClick={() => setTab("history")}
        >
          History
        </button>
        <span
          className="absolute -bottom-px left-0 w-1/2 h-0.5 bg-indigo transition-transform duration-220 ease-[cubic-bezier(0.5,0.1,0.3,1)]"
          style={{ transform: `translateX(${tab === "changes" ? 0 : 100}%)` }}
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
