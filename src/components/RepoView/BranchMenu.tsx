import { useState } from "react";
import { IcBranch, IcCheck, IcFilter, IcPlus } from "@/components/shared/icons";
import { Input } from "@/components/shared/Input";
import type { Branch } from "@/types";

interface BranchMenuProps {
  branches: Branch[];
  onPick: (name: string) => void;
  onNewBranch: (name: string) => void;
}

export function BranchMenu({ branches, onPick, onNewBranch }: BranchMenuProps) {
  const [q, setQ] = useState("");
  const items = branches.filter((b) => b.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="absolute top-[calc(100%+6px)] left-2 z-40 w-82.5 bg-surface border border-border rounded-xl shadow-[0_24px_60px_-18px_rgba(0,0,0,0.7)] overflow-hidden animate-pop">
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border-soft text-text-3">
        <IcFilter s={13} />
        <Input
          autoFocus
          variant="ghost"
          placeholder="Filter branches"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="flex-1"
        />
      </div>
      <div className="max-h-80 overflow-auto p-1.5">
        <div className="flex items-center gap-1.75 px-2.5 pt-2 pb-1.25 text-[11px] font-semibold tracking-[0.04em] uppercase text-text-3">
          Branches
        </div>
        {items.map((b) => (
          <button
            key={b.name}
            className={`flex items-center gap-2.25 w-full px-2.5 py-2 rounded-lg text-[13px] text-text-2 transition-colors duration-100 hover:bg-surface-2 hover:text-text ${b.current ? "text-text bg-indigo/10" : ""
              }`}
            onClick={() => onPick(b.name)}
          >
            <span className="grid place-items-center flex-none">
              <IcBranch s={14} />
            </span>
            <span className="flex-1 text-left whitespace-nowrap overflow-hidden text-ellipsis font-medium">
              {b.name}
            </span>
            {b.current && <IcCheck s={14} className="text-teal flex-none" />}
          </button>
        ))}
      </div>
      <button
        className="flex items-center gap-2 w-full px-3.5 py-2.75 border-t border-border-soft text-[12.5px] font-medium text-indigo-light hover:bg-indigo/8"
        onClick={() => onNewBranch(q.trim())}
      >
        <IcPlus s={13} /> {q.trim() ? `New branch “${q.trim()}”…` : "New branch…"}
      </button>
    </div>
  );
}
