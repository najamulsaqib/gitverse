import { useState } from "react";
import { Button } from "@/components/shared/Button";
import { ContextMenu } from "@/components/shared/ContextMenu";
import { IconButton } from "@/components/shared/IconButton";
import { Modal } from "@/components/shared/Modal";
import { IcBranch, IcStash, IcStashApply, IcTrash, IcUndo, IcX } from "@/components/shared/icons";
import { useReposStore } from "@/store/repos";
import type { StashEntry } from "@/types";

/** The Stash tab: every `git stash` entry for the repo, with apply / pop / drop
 * actions. Clicking an entry shows its file changes + diffs in the main panel. */
export function StashPanel() {
  const repoId = useReposStore((s) => s.repoId);
  const stashes = useReposStore((s) => s.stashesByRepo[repoId]) ?? [];
  const selStash = useReposStore((s) => s.selStash);
  const selectStash = useReposStore((s) => s.selectStash);
  const applyStash = useReposStore((s) => s.applyStash);
  const popStash = useReposStore((s) => s.popStash);
  const dropStash = useReposStore((s) => s.dropStash);

  const [menu, setMenu] = useState<{ entry: StashEntry; x: number; y: number } | null>(null);
  const [confirm, setConfirm] = useState<StashEntry | null>(null);

  if (stashes.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-2 text-text-3 p-7.5">
        <span className="text-text-3">
          <IcStash s={40} />
        </span>
        <div className="text-[14px] font-semibold text-text-2">No stashes</div>
        <div className="text-[12px] text-center">Set aside changes from the Changes tab to find them here.</div>
      </div>
    );
  }

  return (
    <>
      <div className="flex-1 overflow-auto p-1.5">
        {stashes.map((s) => (
          <div
            key={s.index}
            className={`relative flex items-center gap-2.5 px-2.5 py-2 rounded-[7px] cursor-pointer transition-all duration-150 ${selStash === s.index ? "bg-indigo/13" : "hover:bg-surface-2"}`}
            onClick={() => selectStash(s.index)}
            onContextMenu={(e) => {
              e.preventDefault();
              selectStash(s.index);
              setMenu({ entry: s, x: e.clientX, y: e.clientY });
            }}
          >
            {selStash === s.index && (
              <span
                className="absolute left-0 inset-y-0 w-0.75 rounded-l-[7px]"
                style={{ background: "#7b72e8", boxShadow: "0 0 12px 1.5px #7b72e8" }}
              />
            )}
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
          </div>
        ))}
      </div>

      {menu && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          onClose={() => setMenu(null)}
          items={[
            {
              label: "Apply stash",
              icon: <IcStashApply s={14} />,
              onClick: () => {
                applyStash(menu.entry.index);
                setMenu(null);
              },
            },
            {
              label: "Pop stash",
              icon: <IcUndo s={14} />,
              onClick: () => {
                popStash(menu.entry.index);
                setMenu(null);
              },
            },
            {
              label: "Drop stash…",
              icon: <IcTrash s={14} />,
              variant: "danger",
              separatorBefore: true,
              onClick: () => {
                setConfirm(menu.entry);
                setMenu(null);
              },
            },
          ]}
        />
      )}

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
