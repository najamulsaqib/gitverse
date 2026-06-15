import { useState } from "react";
import { Button } from "@/components/shared/Button";
import { ContextMenu } from "@/components/shared/ContextMenu";
import { IconButton } from "@/components/shared/IconButton";
import { Modal } from "@/components/shared/Modal";
import { IcCheck, IcEdit, IcRepo, IcTrash, IcX } from "@/components/shared/icons";
import { useReposStore } from "@/store/repos";
import { useUiStore } from "@/store/ui";
import type { Repo } from "@/types";

export function RepoContextMenu() {
  const repoMenu = useUiStore((s) => s.repoMenu);
  const closeRepoMenu = useUiStore((s) => s.closeRepoMenu);
  const openEditRepo = useUiStore((s) => s.openEditRepo);
  const showToast = useUiStore((s) => s.showToast);
  const repos = useReposStore((s) => s.repos);
  const selectRepo = useReposStore((s) => s.selectRepo);
  const [confirmRepo, setConfirmRepo] = useState<Repo | null>(null);

  const menuRepo = repoMenu ? repos.find((r) => r.id === repoMenu.id) : undefined;

  const confirmRemove = async () => {
    if (!confirmRepo) return;
    try {
      await useReposStore.getState().removeRepo(confirmRepo.id);
      showToast({ title: `Removed ${confirmRepo.name}`, sub: "Removed from your list" });
      setConfirmRepo(null);
    } catch (e) {
      showToast({ title: "Failed to remove repository", sub: String(e), color: "#e8506e" });
    }
  };

  return (
    <>
      {repoMenu && menuRepo && (
        <ContextMenu
          x={repoMenu.x}
          y={repoMenu.y}
          onClose={closeRepoMenu}
          items={[
            {
              label: "Open",
              icon: <IcCheck s={14} />,
              onClick: () => {
                selectRepo(menuRepo.id);
                closeRepoMenu();
              },
            },
            {
              label: "Edit identity",
              icon: <IcEdit s={14} />,
              onClick: () => openEditRepo(menuRepo.id),
            },
            {
              label: "Remove from list",
              icon: <IcTrash s={14} />,
              variant: "danger",
              onClick: () => {
                setConfirmRepo(menuRepo);
                closeRepoMenu();
              },
            },
          ]}
        />
      )}
      {confirmRepo && (
        <Modal onClose={() => setConfirmRepo(null)} className="w-100 max-w-[calc(100%-40px)]">
          <div className="relative">
            <IconButton
              className="absolute top-3.5 right-3.5 w-7.5 h-7.5 rounded-lg z-2 text-text-3 hover:bg-surface-2 hover:text-text"
              onClick={() => setConfirmRepo(null)}
            >
              <IcX s={15} />
            </IconButton>
            <div className="pt-6.5 px-7 pb-5 flex flex-col gap-3.5">
              <h2 className="text-[19px] font-semibold tracking-[-0.01em]">Remove {confirmRepo.name}?</h2>
              <p className="text-[13px] text-text-2 leading-[1.55] -mt-1">
                This unpins the repository from GitVerse. You can add it back any time.
              </p>
              <div className="flex items-start gap-2.25 text-[12.5px] text-text-2 leading-normal bg-bg border border-border-soft rounded-[10px] py-2.75 px-3.25">
                <span className="flex-none mt-px text-teal">
                  <IcRepo s={14} />
                </span>
                <span>
                  The folder on disk{" "}
                  <code className="font-mono text-[11.5px] text-indigo-light break-all">{confirmRepo.path}</code> is
                  not touched — nothing is deleted from your machine.
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2.25 px-6 py-3.5 border-t border-border-soft bg-[#13111f]">
            <Button variant="ghost" onClick={() => setConfirmRepo(null)}>
              Cancel
            </Button>
            <button
              className="flex items-center gap-1.75 px-4.5 py-2.25 rounded-lg text-[13px] font-semibold text-white bg-linear-to-b from-red to-[#c43d57] transition-all shadow-[0_6px_18px_-8px_rgba(232,80,110,0.6)] hover:brightness-110"
              onClick={confirmRemove}
            >
              <IcTrash s={14} /> Remove repository
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
