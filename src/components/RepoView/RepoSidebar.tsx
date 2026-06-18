import { useState } from "react";
import { IcCheck, IcCloud, IcFilter, IcPlus, IcRepo, IcX } from "@/components/shared/icons";
import { Input } from "@/components/shared/Input";
import { useProfilesStore } from "@/store/profiles";
import { useReposStore } from "@/store/repos";
import { useUiStore } from "@/store/ui";

export function RepoSidebar() {
  const [q, setQ] = useState("");
  const accounts = useProfilesStore((s) => s.accounts);
  const repos = useReposStore((s) => s.repos);
  const repoId = useReposStore((s) => s.repoId);
  const selectRepo = useReposStore((s) => s.selectRepo);
  const openAddRepo = useUiStore((s) => s.openAddRepo);
  const openRepoMenu = useUiStore((s) => s.openRepoMenu);
  const closeRepoSidebar = useUiStore((s) => s.closeRepoSidebar);

  const pick = (id: string) => {
    selectRepo(id);
    closeRepoSidebar();
  };

  const matches = (name: string) => name.toLowerCase().includes(q.toLowerCase());
  const groups = accounts
    .map((a) => ({ acc: a, items: repos.filter((r) => r.owner === a.id && matches(r.name)) }))
    .filter((g) => g.items.length);
  const orphans = repos.filter((r) => !accounts.some((a) => a.id === r.owner) && matches(r.name));

  return (
    <div className="absolute inset-y-0 left-0 z-50 w-72 flex flex-col min-h-0 bg-[#13111f] border-r border-border shadow-[24px_0_70px_-20px_rgba(0,0,0,0.8)] animate-fade-in">
      <div className="flex items-center gap-2 px-3.5 h-14 flex-none border-b border-border-soft">
        <span className="text-[13px] font-semibold text-text">Repositories</span>
        <span className="text-[11px] font-mono text-text-3">{repos.length}</span>
        <button
          className="ml-auto grid place-items-center w-7 h-7 rounded-lg text-text-3 hover:bg-surface-2 hover:text-text transition-colors"
          title="Close"
          onClick={closeRepoSidebar}
        >
          <IcX s={15} />
        </button>
      </div>

      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border-soft text-text-3">
        <IcFilter s={13} />
        <Input
          autoFocus
          variant="ghost"
          placeholder="Filter repositories"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="flex-1"
        />
      </div>

      <div className="flex-1 overflow-auto p-1.5">
        {[...groups, ...(orphans.length ? [{ acc: null, items: orphans }] : [])].map((g) => (
          <div key={g.acc?.id ?? "unassigned"} className="mb-1">
            <div className="flex items-center gap-1.75 px-2.5 pt-2 pb-1.25 text-[11px] font-semibold tracking-[0.04em] uppercase text-text-3">
              <span className="w-2 h-2 rounded-[3px]" style={{ background: g.acc?.color ?? "#4f4b78" }} />
              {g.acc?.label ?? "Unassigned"}
              {g.acc && (
                <span className="ml-auto font-mono normal-case tracking-normal font-normal text-[10.5px] text-[#4f4b78]">
                  {g.acc.host}
                </span>
              )}
            </div>
            {g.items.map((r) => (
              <button
                key={r.id}
                className={`flex items-center gap-2.25 w-full px-2.5 py-2 rounded-lg text-[13px] text-text-2 transition-colors duration-100 hover:bg-surface-2 hover:text-text ${r.id === repoId ? "text-text bg-indigo/10" : ""
                  }`}
                onClick={() => pick(r.id)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  openRepoMenu(r.id, e.clientX, e.clientY);
                }}
              >
                <span
                  className="grid place-items-center flex-none"
                  style={{ color: g.acc?.color }}
                  title={r.remote ? "Tracks a remote" : "Local-only repository"}
                >
                  {r.remote ? <IcCloud s={14} /> : <IcRepo s={14} />}
                </span>
                <span className="flex-1 text-left whitespace-nowrap overflow-hidden text-ellipsis font-medium">
                  {r.name}
                </span>
                {r.id === repoId && <IcCheck s={14} className="text-teal flex-none" />}
              </button>
            ))}
          </div>
        ))}
        {!groups.length && !orphans.length && (
          <div className="px-3.5 py-4.5 text-[12.5px] text-text-3 text-center">No repositories match “{q}”.</div>
        )}
      </div>

      <div className="border-t border-border-soft p-1.5 flex-none">
        <button
          className="flex items-center gap-2.25 w-full px-2.5 py-2 rounded-lg text-[13px] font-medium text-text-2 transition-colors duration-100 hover:bg-surface-2 hover:text-text"
          onClick={openAddRepo}
        >
          <span className="grid place-items-center flex-none text-teal">
            <IcPlus s={14} />
          </span>
          Add local repository…
        </button>
      </div>
    </div>
  );
}
