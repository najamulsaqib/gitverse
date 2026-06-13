import { useState } from "react";
import { IcCheck, IcFilter, IcGlobe, IcLock } from "@/components/shared/icons";
import { useProfilesStore } from "@/store/profiles";
import { useReposStore } from "@/store/repos";
import type { Repo } from "@/types";

interface RepoMenuProps {
  current: Repo;
  onPick: (id: string) => void;
}

export function RepoMenu({ current, onPick }: RepoMenuProps) {
  const [q, setQ] = useState("");
  const accounts = useProfilesStore((s) => s.accounts);
  const repos = useReposStore((s) => s.repos);

  const groups = accounts
    .map((a) => ({
      acc: a,
      items: repos.filter((r) => r.owner === a.id && r.name.toLowerCase().includes(q.toLowerCase())),
    }))
    .filter((g) => g.items.length);

  return (
    <div className="absolute top-[calc(100%+6px)] left-2 z-40 w-85 bg-surface border border-border rounded-xl shadow-[0_24px_60px_-18px_rgba(0,0,0,0.7)] overflow-hidden animate-pop">
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border-soft text-text-3">
        <IcFilter s={13} />
        <input
          autoFocus
          placeholder="Filter repositories"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="flex-1 bg-transparent border-none outline-none text-[13px] text-text"
        />
      </div>
      <div className="max-h-80 overflow-auto p-1.5">
        {groups.map((g) => (
          <div key={g.acc.id} className="mb-1">
            <div className="flex items-center gap-1.75 px-2.5 pt-2 pb-1.25 text-[11px] font-semibold tracking-[0.04em] uppercase text-text-3">
              <span className="w-2 h-2 rounded-[3px]" style={{ background: g.acc.color }} />
              {g.acc.label}
              <span className="ml-auto font-mono normal-case tracking-normal font-normal text-[10.5px] text-[#4f4b78]">
                {g.acc.host}
              </span>
            </div>
            {g.items.map((r) => (
              <button
                key={r.id}
                className={`flex items-center gap-2.25 w-full px-2.5 py-2 rounded-lg text-[13px] text-text-2 transition-colors duration-100 hover:bg-surface-2 hover:text-text ${r.id === current.id ? "text-text bg-indigo/10" : ""
                  }`}
                onClick={() => onPick(r.id)}
              >
                <span className="grid place-items-center flex-none" style={{ color: g.acc.color }}>
                  {r.private ? <IcLock s={14} /> : <IcGlobe s={14} />}
                </span>
                <span className="flex-1 text-left whitespace-nowrap overflow-hidden text-ellipsis font-medium">
                  {r.name}
                </span>
                {r.id === current.id && <IcCheck s={14} className="text-teal flex-none" />}
              </button>
            ))}
          </div>
        ))}
        {!groups.length && (
          <div className="px-3.5 py-4.5 text-[12.5px] text-text-3 text-center">No repositories match “{q}”.</div>
        )}
      </div>
    </div>
  );
}
