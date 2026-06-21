import { useState } from "react";
import { Button } from "@/components/shared/Button";
import { ContextMenu } from "@/components/shared/ContextMenu";
import { IconButton } from "@/components/shared/IconButton";
import { Modal } from "@/components/shared/Modal";
import { IcBranch, IcCheckout, IcCherry, IcCopy, IcReset, IcRevert, IcUndo, IcX } from "@/components/shared/icons";
import { useReposStore } from "@/store/repos";
import { useUiStore } from "@/store/ui";
import type { Commit } from "@/types";

type ResetMode = "soft" | "mixed" | "hard";

const RESET_MODES: { mode: ResetMode; label: string; desc: string; danger?: boolean }[] = [
  { mode: "soft", label: "Soft", desc: "Move the branch only — keep all changes staged." },
  { mode: "mixed", label: "Mixed", desc: "Keep changes in the working tree, unstaged. (Default)" },
  { mode: "hard", label: "Hard", desc: "Discard all working-tree and staged changes. Can't be undone.", danger: true },
];

/**
 * Right-click menu for a commit in the history graph: checkout, branch, revert,
 * cherry-pick, reset, and copy actions. Resetting opens a confirm modal where
 * the mode (soft/mixed/hard) is chosen, since a hard reset is destructive.
 */
export function GraphContextMenu() {
  const graphMenu = useUiStore((s) => s.graphMenu);
  const closeGraphMenu = useUiStore((s) => s.closeGraphMenu);
  const openNewBranch = useUiStore((s) => s.openNewBranch);
  const repoId = useReposStore((s) => s.repoId);
  const commits = useReposStore((s) => s.historyByRepo[repoId]) ?? [];
  const sync = useReposStore((s) => s.syncByRepo[repoId]);
  const branch = useReposStore((s) => s.branchByRepo[repoId]);
  const checkoutCommit = useReposStore((s) => s.checkoutCommit);
  const undoCommit = useReposStore((s) => s.undoCommit);
  const cherryPick = useReposStore((s) => s.cherryPick);
  const revertCommit = useReposStore((s) => s.revertCommit);
  const resetToCommit = useReposStore((s) => s.resetToCommit);

  const [resetTarget, setResetTarget] = useState<Commit | null>(null);

  const commit = graphMenu ? commits.find((c) => c.hash === graphMenu.hash) : null;

  // "Undo commit" is only offered for the branch tip while it's still local
  // (ahead of upstream, or no upstream at all) and has a parent to fall back to —
  // i.e. exactly the unpushed commit you'd safely soft-reset away.
  const isHead = commit?.refs?.some((r) => r.head) ?? false;
  const onBranch = !!branch && branch !== "detached";
  const unpushed = (sync?.ahead ?? 0) > 0 || !sync?.upstream;
  const canUndo = !!commit && isHead && onBranch && unpushed && commit.parents.length > 0;

  const copy = (text: string) => {
    navigator.clipboard?.writeText(text).catch(() => { });
    closeGraphMenu();
  };
  const run = (fn: (hash: string) => void) => {
    if (commit) fn(commit.hash);
    closeGraphMenu();
  };

  const short = (h: string) => h.slice(0, 7);

  return (
    <>
      {graphMenu && commit && (
        <ContextMenu
          x={graphMenu.x}
          y={graphMenu.y}
          onClose={closeGraphMenu}
          items={[
            ...(canUndo
              ? [{ label: "Undo commit", icon: <IcUndo s={14} />, onClick: () => run(undoCommit) }]
              : []),
            {
              label: "Checkout commit",
              icon: <IcCheckout s={14} />,
              separatorBefore: canUndo,
              onClick: () => run(checkoutCommit),
            },
            {
              label: "Create branch from here…",
              icon: <IcBranch s={14} />,
              onClick: () => {
                openNewBranch("", commit.hash, short(commit.hash));
                closeGraphMenu();
              },
            },
            {
              label: "Cherry-pick commit",
              icon: <IcCherry s={14} />,
              separatorBefore: true,
              onClick: () => run(cherryPick),
            },
            {
              label: "Revert commit",
              icon: <IcRevert s={14} />,
              onClick: () => run(revertCommit),
            },
            {
              label: "Reset to commit…",
              icon: <IcReset s={14} />,
              variant: "danger",
              onClick: () => {
                setResetTarget(commit);
                closeGraphMenu();
              },
            },
            {
              label: "Copy SHA",
              icon: <IcCopy s={14} />,
              separatorBefore: true,
              onClick: () => copy(commit.hash),
            },
            { label: "Copy short SHA", icon: <IcCopy s={14} />, onClick: () => copy(short(commit.hash)) },
            { label: "Copy message", icon: <IcCopy s={14} />, onClick: () => copy(commit.subject) },
          ]}
        />
      )}

      {resetTarget && (
        <Modal onClose={() => setResetTarget(null)} className="w-108 max-w-[calc(100%-40px)]">
          <div className="relative">
            <IconButton
              className="absolute top-3.5 right-3.5 w-7.5 h-7.5 rounded-lg z-2 text-text-3 hover:bg-surface-2 hover:text-text"
              onClick={() => setResetTarget(null)}
            >
              <IcX s={15} />
            </IconButton>
            <div className="pt-6.5 px-7 pb-2 flex flex-col gap-2">
              <h2 className="text-[19px] font-semibold tracking-[-0.01em]">Reset to commit</h2>
              <p className="text-[13px] text-text-2 leading-[1.55]">
                Move the current branch to{" "}
                <code className="font-mono text-[11.5px] text-indigo-light">{short(resetTarget.hash)}</code>. Choose how
                to handle your current changes:
              </p>
            </div>
          </div>
          <div className="px-7 py-4 flex flex-col gap-2">
            {RESET_MODES.map((m) => (
              <button
                key={m.mode}
                className={`flex items-start gap-2.5 w-full px-3.5 py-2.75 rounded-lg border text-left transition-colors ${m.danger
                  ? "border-red/40 hover:bg-red/10"
                  : "border-border hover:bg-surface-2 hover:border-indigo"
                  }`}
                onClick={() => {
                  resetToCommit(resetTarget.hash, m.mode);
                  setResetTarget(null);
                }}
              >
                <span className={`grid place-items-center flex-none mt-px ${m.danger ? "text-red" : "text-text-2"}`}>
                  <IcReset s={15} />
                </span>
                <span className="flex flex-col min-w-0">
                  <span className={`text-[13.5px] font-semibold ${m.danger ? "text-red" : "text-text"}`}>
                    {m.label}
                  </span>
                  <span className="text-[12px] text-text-3 leading-[1.45]">{m.desc}</span>
                </span>
              </button>
            ))}
          </div>
          <div className="flex items-center justify-end px-6 py-3.5 border-t border-border-soft bg-[#13111f]">
            <Button variant="ghost" onClick={() => setResetTarget(null)}>
              Cancel
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}
