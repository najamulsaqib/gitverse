import { IconButton } from "@/components/shared/IconButton";
import { IcBranch, IcStash, IcStashApply, IcTrash, IcUndo } from "@/components/shared/icons";
import { useReposStore } from "@/store/repos";
import { useUiStore } from "@/store/ui";

/** Dropdown listing every `git stash` entry for the repo, opened from the
 * toolbar's stash button. Clicking an entry shows its diff in the main panel;
 * each row carries apply / pop / drop actions. */
export function StashMenu() {
  const repoId = useReposStore((s) => s.repoId);
  const stashes = useReposStore((s) => s.stashesByRepo[repoId]) ?? [];
  const applyStash = useReposStore((s) => s.applyStash);
  const popStash = useReposStore((s) => s.popStash);
  const stashView = useUiStore((s) => s.stashView);
  const openStashView = useUiStore((s) => s.openStashView);
  const openDropStash = useUiStore((s) => s.openDropStash);

  return (
    <div className="absolute top-[calc(100%+6px)] right-2 z-40 w-84 max-w-[calc(100vw-24px)] bg-surface border border-border rounded-xl shadow-[0_24px_60px_-18px_rgba(0,0,0,0.7)] overflow-hidden animate-pop">
      <div className="flex items-center gap-1.75 px-3.5 py-2.75 border-b border-border-soft text-[11px] font-semibold tracking-[0.04em] uppercase text-text-3">
        <IcStash s={13} />
        {stashes.length} stash{stashes.length !== 1 ? "es" : ""}
      </div>
      <div className="max-h-96 overflow-auto p-1.5">
        {stashes.map((s) => (
          <div
            key={s.index}
            className={`group relative flex items-center gap-2.5 px-2.5 py-2 rounded-[7px] cursor-pointer transition-colors duration-150 ${stashView === s.index ? "bg-indigo/13" : "hover:bg-surface-2"}`}
            onClick={() => openStashView(s.index)}
          >
            <span className="grid place-items-center flex-none text-text-3">
              <IcStash s={15} />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-[12.5px] text-text truncate">{s.message || `stash@{${s.index}}`}</span>
              <span className="flex items-center gap-1.5 text-[11px] text-text-3 mt-px">
                {s.branch && (
                  <>
                    <IcBranch s={11} />
                    <span className="truncate">{s.branch}</span>
                    <span className="text-border">·</span>
                  </>
                )}
                <span className="flex-none">{s.when}</span>
              </span>
            </span>
            <span className="flex-none flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <IconButton
                className="w-7 h-7 rounded-md text-text-3 hover:bg-surface-3 hover:text-text"
                title="Apply stash"
                onClick={(e) => {
                  e.stopPropagation();
                  applyStash(s.index);
                }}
              >
                <IcStashApply s={13.5} />
              </IconButton>
              <IconButton
                className="w-7 h-7 rounded-md text-text-3 hover:bg-surface-3 hover:text-teal"
                title="Pop stash"
                onClick={(e) => {
                  e.stopPropagation();
                  popStash(s.index);
                }}
              >
                <IcUndo s={13.5} />
              </IconButton>
              <IconButton
                className="w-7 h-7 rounded-md text-text-3 hover:bg-surface-3 hover:text-red"
                title="Drop stash…"
                onClick={(e) => {
                  e.stopPropagation();
                  openDropStash(s.index);
                }}
              >
                <IcTrash s={13.5} />
              </IconButton>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
