import { useState } from "react";
import { DiffView } from "@/components/RepoView/DiffView";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { COMMIT_CHANGES, DIFFS } from "@/data/mockData";
import type { Account, Commit, CommitFileChange } from "@/types";

interface CommitFileRowProps {
  f: CommitFileChange;
  selected: boolean;
  onSelect: () => void;
}

function CommitFileRow({ f, selected, onSelect }: CommitFileRowProps) {
  const i = f.path.lastIndexOf("/");
  const dir = i >= 0 ? f.path.slice(0, i + 1) : "";
  const base = i >= 0 ? f.path.slice(i + 1) : f.path;
  return (
    <div
      className={`flex items-center gap-2.25 px-2.25 py-1.75 rounded-[7px] cursor-pointer border-l-2 transition-colors duration-100 hover:bg-surface-2 ${selected ? "bg-indigo/13 border-indigo" : "border-transparent"
        }`}
      onClick={onSelect}
      title={f.path}
    >
      <StatusBadge status={f.status} />
      <span
        className={`flex-1 min-w-0 text-[12.5px] whitespace-nowrap overflow-hidden text-ellipsis [direction:rtl] text-left ${selected ? "text-text" : "text-text-2"
          }`}
      >
        <span className="text-text-3">{dir}</span>
        {base}
      </span>
      <span className="flex-none flex gap-1.5 font-mono text-[11px]">
        <span className="text-teal">+{f.add}</span>
        <span className="text-red">−{f.del}</span>
      </span>
    </div>
  );
}

interface CommitDetailProps {
  commit: Commit;
  account: Account;
}

export function CommitDetail({ commit, account }: CommitDetailProps) {
  const changes = commit.changes || COMMIT_CHANGES[commit.hash] || [];
  const [sel, setSel] = useState<string | null>(changes[0]?.path ?? null);
  const cur = changes.find((c) => c.path === sel) || changes[0];
  const totalAdd = changes.reduce((s, c) => s + c.add, 0);
  const totalDel = changes.reduce((s, c) => s + c.del, 0);
  const diff = cur ? DIFFS[cur.path] || [{ t: "hunk" as const, a: `@@ ${cur.path} @@` }] : [];

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex items-center gap-3.25 px-5 py-4 border-b border-border-soft bg-[#13111f]">
        <div
          className="w-9.5 h-9.5 rounded-[11px] grid place-items-center text-[#0b0a16] font-bold text-[14px] flex-none"
          style={{ background: `linear-gradient(150deg, ${account.color}, ${account.color}bb)` }}
        >
          {account.initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[15px] font-semibold">{commit.subject}</div>
          <div className="text-[12px] text-text-3 mt-0.75 font-mono">
            <strong className="text-text-2 font-semibold">{account.name}</strong> &lt;{account.email}&gt; committed{" "}
            {commit.when}
          </div>
        </div>
        {commit.flag && (
          <span className="flex-none text-[11px] text-amber bg-amber/12 border border-amber/30 px-2.25 py-0.75 rounded-full">
            as <strong className="font-bold">{account.label}</strong>
          </span>
        )}
        <div className="font-mono text-[12px] text-text-2 bg-surface-2 px-2.5 py-1.25 rounded-[7px] border border-border">
          {commit.hash}
        </div>
      </div>
      <div className="flex-1 flex min-h-0">
        <div className="w-68 flex-none border-r border-border-soft bg-[#13111f] flex flex-col min-h-0">
          <div className="flex items-center justify-between px-3.5 py-2.75 text-[11px] uppercase tracking-[0.04em] text-text-3 font-semibold border-b border-border-soft">
            <span>
              {changes.length} changed file{changes.length !== 1 ? "s" : ""}
            </span>
            <span className="flex gap-2 font-mono normal-case tracking-normal text-[11px]">
              <span className="text-teal">+{totalAdd}</span>
              <span className="text-red">−{totalDel}</span>
            </span>
          </div>
          <div className="flex-1 overflow-auto p-1.25">
            {changes.map((f) => (
              <CommitFileRow key={f.path} f={f} selected={!!cur && f.path === cur.path} onSelect={() => setSel(f.path)} />
            ))}
          </div>
        </div>
        <div className="flex-1 min-w-0 flex flex-col min-h-0">
          {cur ? (
            <DiffView path={cur.path} status={cur.status} add={cur.add} del={cur.del} diff={diff} />
          ) : (
            <div className="flex-1 grid place-items-center text-text-3">No file changes in this commit.</div>
          )}
        </div>
      </div>
    </div>
  );
}
