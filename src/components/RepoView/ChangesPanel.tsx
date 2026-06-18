import { useState } from "react";
import { Checkbox } from "@/components/shared/Checkbox";
import { IcCheck, IcChevron, IcFilter } from "@/components/shared/icons";
import { Input } from "@/components/shared/Input";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useClickOutside } from "@/hooks/useClickOutside";
import { useReposStore } from "@/store/repos";

type FilterMode = "all" | "staged" | "unstaged" | "M" | "A" | "D";

const FILTER_OPTIONS: { mode: FilterMode; label: string }[] = [
  { mode: "all", label: "All changes" },
  { mode: "staged", label: "Staged" },
  { mode: "unstaged", label: "Unstaged" },
  { mode: "M", label: "Modified" },
  { mode: "A", label: "Added" },
  { mode: "D", label: "Deleted" },
];

function fileName(p: string) {
  const i = p.lastIndexOf("/");
  return { dir: i >= 0 ? p.slice(0, i + 1) : "", base: i >= 0 ? p.slice(i + 1) : p };
}

export function ChangesPanel() {
  const repoId = useReposStore((s) => s.repoId);
  const files = useReposStore((s) => s.filesByRepo[repoId]) ?? [];
  const selected = useReposStore((s) => s.selFile);
  const filter = useReposStore((s) => s.filter);
  const setFilter = useReposStore((s) => s.setFilter);
  const selectFile = useReposStore((s) => s.selectFile);
  const toggleFile = useReposStore((s) => s.toggleFile);
  const toggleAll = useReposStore((s) => s.toggleAll);

  const [mode, setMode] = useState<FilterMode>("all");
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useClickOutside<HTMLDivElement>(() => setMenuOpen(false));

  const matchesMode = (f: (typeof files)[number]) =>
    mode === "all" ? true : mode === "staged" ? f.staged : mode === "unstaged" ? !f.staged : f.status === mode;

  const shown = files.filter((f) => matchesMode(f) && f.path.toLowerCase().includes(filter.toLowerCase()));
  const stagedCount = files.filter((f) => f.staged).length;
  const allOn = stagedCount === files.length && files.length > 0;

  return (
    <>
      <div className="flex items-center gap-2 px-3 py-2.25 border-b border-border-soft">
        <div ref={menuRef} className="relative">
          <button
            className={`flex items-center gap-px p-1 rounded-md transition-colors duration-100 hover:bg-surface-2 ${mode !== "all" ? "text-indigo-light" : "text-text-3 hover:text-text-2"
              }`}
            title="Filter by status"
            onClick={() => setMenuOpen((o) => !o)}
            aria-expanded={menuOpen}
          >
            <IcFilter s={13} />
            <IcChevron s={11} />
          </button>
          {menuOpen && (
            <div className="absolute top-[calc(100%+6px)] left-0 z-40 w-44 bg-surface border border-border rounded-xl shadow-[0_24px_60px_-18px_rgba(0,0,0,0.7)] overflow-hidden animate-pop p-1.5">
              {FILTER_OPTIONS.map((o) => (
                <button
                  key={o.mode}
                  className={`flex items-center gap-2.25 w-full px-2.5 py-1.75 rounded-lg text-[12.5px] text-text-2 transition-colors duration-100 hover:bg-surface-2 hover:text-text ${mode === o.mode ? "text-text bg-indigo/10" : ""
                    }`}
                  onClick={() => {
                    setMode(o.mode);
                    setMenuOpen(false);
                  }}
                >
                  <span className="flex-1 text-left">{o.label}</span>
                  {mode === o.mode && <IcCheck s={13} className="text-teal flex-none" />}
                </button>
              ))}
            </div>
          )}
        </div>
        <Input
          inputSize="sm"
          surface="surface"
          className="flex-1"
          placeholder="Filter changed files"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>
      <div className="flex items-center gap-2.5 px-3.5 py-2.25 border-b border-border-soft">
        <Checkbox checked={allOn} indeterminate={stagedCount > 0 && !allOn} onChange={() => toggleAll(!allOn)} />
        <span className="text-[12px] text-text-3 font-medium">
          {stagedCount} of {files.length} changed file{files.length !== 1 ? "s" : ""}
        </span>
      </div>
      <div className="flex-1 overflow-auto p-1.5">
        {shown.map((f) => {
          const { dir, base } = fileName(f.path);
          return (
            <div
              key={f.path}
              className={`flex items-center gap-2.5 px-2 py-1.5 rounded-[7px] cursor-pointer transition-colors duration-100 hover:bg-surface-2 ${selected === f.path ? "bg-indigo/13" : ""
                }`}
              onClick={() => selectFile(f.path)}
            >
              <Checkbox checked={f.staged} onChange={() => toggleFile(f.path)} onClick={(e) => e.stopPropagation()} />
              <span className="flex-1 min-w-0 text-[12.5px] whitespace-nowrap overflow-hidden text-ellipsis [direction:rtl] text-left">
                <span className="text-text-3">{dir}</span>
                {base}
              </span>
              <StatusBadge status={f.status} />
            </div>
          );
        })}
      </div>
    </>
  );
}
