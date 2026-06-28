import { Button } from "@/components/shared/Button";
import { IconButton } from "@/components/shared/IconButton";
import { Modal } from "@/components/shared/Modal";
import { IcTrash, IcX } from "@/components/shared/icons";
import { useReposStore } from "@/store/repos";
import { useUiStore } from "@/store/ui";

/** Confirm dialog for discarding a stash. Mounted at the App root like every
 * other modal, driven by `stashDropIndex` in the UI store. */
export function DropStashModal() {
  const index = useUiStore((s) => s.stashDropIndex);
  const closeDropStash = useUiStore((s) => s.closeDropStash);
  const repoId = useReposStore((s) => s.repoId);
  const stashes = useReposStore((s) => s.stashesByRepo[repoId]) ?? [];
  const dropStash = useReposStore((s) => s.dropStash);

  if (index == null) return null;
  const stash = stashes.find((s) => s.index === index);
  const label = stash?.message || `stash@{${index}}`;

  return (
    <Modal onClose={closeDropStash} className="w-100 max-w-[calc(100%-40px)]">
      <div className="relative">
        <IconButton
          className="absolute top-3.5 right-3.5 w-7.5 h-7.5 rounded-lg z-2 text-text-3 hover:bg-surface-2 hover:text-text"
          onClick={closeDropStash}
        >
          <IcX s={15} />
        </IconButton>
        <div className="pt-6.5 px-7 pb-5 flex flex-col gap-3.5">
          <h2 className="text-[19px] font-semibold tracking-[-0.01em]">Drop stash?</h2>
          <p className="text-[13px] text-text-2 leading-[1.55] -mt-1">
            <code className="font-mono text-[11.5px] text-indigo-light break-all">{label}</code> will be permanently
            deleted. This can't be undone.
          </p>
        </div>
      </div>
      <div className="flex items-center justify-end gap-2.25 px-6 py-3.5 border-t border-border-soft bg-[#13111f]">
        <Button variant="ghost" onClick={closeDropStash}>
          Cancel
        </Button>
        <button
          className="flex items-center gap-1.75 px-4.5 py-2.25 rounded-lg text-[13px] font-semibold text-white bg-linear-to-b from-red to-[#c43d57] transition-all shadow-[0_6px_18px_-8px_rgba(232,80,110,0.6)] hover:brightness-110"
          onClick={() => {
            dropStash(index);
            closeDropStash();
          }}
        >
          <IcTrash s={14} /> Drop stash
        </button>
      </div>
    </Modal>
  );
}
