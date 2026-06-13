import { Checkbox } from "@/components/shared/Checkbox";
import { IcChevron, IcFilter } from "@/components/shared/icons";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useReposStore } from "@/store/repos";

function fileName(p: string) {
  const i = p.lastIndexOf("/");
  return { dir: i >= 0 ? p.slice(0, i + 1) : "", base: i >= 0 ? p.slice(i + 1) : p };
}

export function ChangesPanel() {
  const repoId = useReposStore((s) => s.repoId);
  const files = useReposStore((s) => s.filesByRepo[repoId]);
  const selected = useReposStore((s) => s.selFile);
  const filter = useReposStore((s) => s.filter);
  const setFilter = useReposStore((s) => s.setFilter);
  const selectFile = useReposStore((s) => s.selectFile);
  const toggleFile = useReposStore((s) => s.toggleFile);
  const toggleAll = useReposStore((s) => s.toggleAll);

  const shown = files.filter((f) => f.path.toLowerCase().includes(filter.toLowerCase()));
  const stagedCount = files.filter((f) => f.staged).length;
  const allOn = stagedCount === files.length && files.length > 0;

  return (
    <>
      <div className="flex items-center gap-2 px-3 py-2.25 border-b border-border-soft">
        <button
          className="flex items-center gap-px text-text-3 p-1 rounded-md transition-colors duration-100 hover:bg-surface-2 hover:text-text-2"
          title="Filter"
        >
          <IcFilter s={13} />
          <IcChevron s={11} />
        </button>
        <input
          className="flex-1 bg-surface border border-border rounded-[7px] px-2.5 py-1.5 text-[12.5px] outline-none transition-colors focus:border-indigo"
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
