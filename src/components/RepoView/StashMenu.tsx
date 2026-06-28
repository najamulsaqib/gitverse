import { useState } from "react";
import { Button } from "@/components/shared/Button";
import { IconButton } from "@/components/shared/IconButton";
import { Modal } from "@/components/shared/Modal";
import { IcBranch, IcStash, IcStashApply, IcTrash, IcUndo, IcX } from "@/components/shared/icons";
import { useReposStore } from "@/store/repos";
import { useUiStore } from "@/store/ui";
import type { StashEntry } from "@/types";

/** Dropdown listing every `git stash` entry for the repo, opened from the
 * toolbar's stash button. Clicking an entry shows its diff in the main panel;
 * each row carries apply / pop / drop actions. */
export function StashMenu() {
  const repoId = useReposStore((s) => s.repoId);
  const stashes = useReposStore((s) => s.stashesByRepo[repoId]) ?? [];
  const applyStash = useReposStore((s) => s.applyStash);
  const popStash = useReposStore((s) => s.popStash);
  const dropStash = useReposStore((s) => s.dropStash);
  const stashView = useUiStore((s) => s.stashView);
  const openStashView = useUiStore((s) => s.openStashView);

  const [confirm, setConfirm] = useState<StashEntry | null>(null);

  return (
    <>
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
                    setConfirm(s);
                  }}
                >
                  <IcTrash s={13.5} />
                </IconButton>
              </span>
            </div>
          ))}
        </div>
      </div>

      {confirm && (
        <Modal onClose={() => setConfirm(null)} className="w-100 max-w-[calc(100%-40px)]">
          <div className="relative">
            <IconButton
              className="absolute top-3.5 right-3.5 w-7.5 h-7.5 rounded-lg z-2 text-text-3 hover:bg-surface-2 hover:text-text"
              onClick={() => setConfirm(null)}
            >
              <IcX s={15} />
            </IconButton>
            <div className="pt-6.5 px-7 pb-5 flex flex-col gap-3.5">
              <h2 className="text-[19px] font-semibold tracking-[-0.01em]">Drop stash?</h2>
              <p className="text-[13px] text-text-2 leading-[1.55] -mt-1">
                <code className="font-mono text-[11.5px] text-indigo-light break-all">
                  {confirm.message || `stash@{${confirm.index}}`}
                </code>{" "}
                will be permanently deleted. This can't be undone.
              </p>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2.25 px-6 py-3.5 border-t border-border-soft bg-[#13111f]">
            <Button variant="ghost" onClick={() => setConfirm(null)}>
              Cancel
            </Button>
            <button
              className="flex items-center gap-1.75 px-4.5 py-2.25 rounded-lg text-[13px] font-semibold text-white bg-linear-to-b from-red to-[#c43d57] transition-all shadow-[0_6px_18px_-8px_rgba(232,80,110,0.6)] hover:brightness-110"
              onClick={() => {
                dropStash(confirm.index);
                setConfirm(null);
              }}
            >
              <IcTrash s={14} /> Drop stash
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
