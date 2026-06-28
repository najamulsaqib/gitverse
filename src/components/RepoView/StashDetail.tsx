import { useEffect, useState } from "react";
import { DiffView } from "@/components/RepoView/DiffView";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { IcBranch, IcStash, IcStashApply, IcUndo, IcX } from "@/components/shared/icons";
import { IconButton } from "@/components/shared/IconButton";
import { gitStashChanges, gitStashDiff } from "@/hooks/useGit";
import { useReposStore } from "@/store/repos";
import type { CommitFileChange, DiffLine, StashEntry } from "@/types";

interface StashFileRowProps {
  f: CommitFileChange;
  selected: boolean;
  onSelect: () => void;
}

function StashFileRow({ f, selected, onSelect }: StashFileRowProps) {
  const i = f.path.lastIndexOf("/");
  const dir = i >= 0 ? f.path.slice(0, i + 1) : "";
  const base = i >= 0 ? f.path.slice(i + 1) : f.path;
  return (
    <div
      className={`relative flex items-center gap-2.25 px-2.25 py-1.75 rounded-[7px] cursor-pointer transition-all duration-150 ${selected ? "bg-indigo/13" : "hover:bg-surface-2"}`}
      onClick={onSelect}
      title={f.path}
    >
      {selected && (
        <span
          className="absolute left-0 inset-y-0 w-0.75 rounded-l-[7px]"
          style={{ background: "#7b72e8", boxShadow: "0 0 12px 1.5px #7b72e8" }}
        />
      )}
      <StatusBadge status={f.status} />
      <span
        className={`flex-1 min-w-0 text-[12.5px] whitespace-nowrap overflow-hidden text-ellipsis [direction:rtl] text-left ${selected ? "text-text" : "text-text-2"}`}
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

interface StashDetailProps {
  stash: StashEntry;
  repoPath: string;
  onClose: () => void;
}

/** Inspect a single stash: its file changes (left) and per-file diff (right),
 * plus Apply / Pop actions in the header. Mirrors CommitDetail. */
export function StashDetail({ stash, repoPath, onClose }: StashDetailProps) {
  const applyStash = useReposStore((s) => s.applyStash);
  const popStash = useReposStore((s) => s.popStash);

  const [changes, setChanges] = useState<CommitFileChange[]>([]);
  const [sel, setSel] = useState<string | null>(null);
  const [diff, setDiff] = useState<DiffLine[]>([]);

  useEffect(() => {
    let alive = true;
    gitStashChanges(repoPath, stash.index)
      .then((c) => {
        if (!alive) return;
        setChanges(c);
        setSel(c[0]?.path ?? null);
      })
      .catch(() => {
        if (!alive) return;
        setChanges([]);
        setSel(null);
      });
    return () => {
      alive = false;
    };
  }, [repoPath, stash.index]);

  const cur = changes.find((c) => c.path === sel) ?? changes[0];

  useEffect(() => {
    if (!cur) {
      setDiff([]);
      return;
    }
    let alive = true;
    gitStashDiff(repoPath, stash.index, cur.path)
      .then((d) => alive && setDiff(d))
      .catch(() => alive && setDiff([]));
    return () => {
      alive = false;
    };
  }, [repoPath, stash.index, cur?.path]);

  const totalAdd = changes.reduce((s, c) => s + c.add, 0);
  const totalDel = changes.reduce((s, c) => s + c.del, 0);

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex items-center gap-3.25 px-5 py-4 border-b border-border-soft bg-[#13111f]">
        <div className="w-9.5 h-9.5 rounded-[11px] grid place-items-center text-teal bg-teal/12 flex-none">
          <IcStash s={19} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[15px] font-semibold truncate">{stash.message || `stash@{${stash.index}}`}</div>
          <div className="text-[12px] text-text-3 mt-0.75 flex items-center gap-1.5">
            {stash.branch && (
              <>
                <IcBranch s={12} />
                <span className="truncate">{stash.branch}</span>
                <span className="text-border">·</span>
              </>
            )}
            <span className="flex-none">stashed {stash.when}</span>
          </div>
        </div>
        <button
          className="flex items-center gap-1.5 px-3 py-1.75 rounded-lg text-[12.5px] font-semibold text-text-2 bg-surface-2 border border-border transition-colors hover:bg-surface-3 hover:text-text"
          onClick={() => applyStash(stash.index)}
        >
          <IcStashApply s={14} /> Apply
        </button>
        <button
          className="flex items-center gap-1.5 px-3 py-1.75 rounded-lg text-[12.5px] font-semibold text-white bg-linear-to-b from-teal to-[#1f9e8f] transition-all hover:brightness-110"
          onClick={() => popStash(stash.index)}
        >
          <IcUndo s={14} /> Pop
        </button>
        <IconButton
          className="w-8 h-8 rounded-lg text-text-3 hover:bg-surface-2 hover:text-text"
          onClick={onClose}
          title="Close stash"
        >
          <IcX s={15} />
        </IconButton>
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
              <StashFileRow key={f.path} f={f} selected={!!cur && f.path === cur.path} onSelect={() => setSel(f.path)} />
            ))}
          </div>
        </div>
        <div className="flex-1 min-w-0 flex flex-col min-h-0">
          {cur ? (
            <DiffView path={cur.path} status={cur.status} add={cur.add} del={cur.del} diff={diff} />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-2 text-text-3 p-7.5">
              <img src="/placeholder.svg" alt="" width={64} height={64} style={{ opacity: 0.5 }} />
              <div className="text-[14px] font-semibold text-text-2">No file changes in this stash</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
