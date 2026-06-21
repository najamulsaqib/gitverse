import { useState } from "react";
import { Button } from "@/components/shared/Button";
import { Checkbox } from "@/components/shared/Checkbox";
import { Input } from "@/components/shared/Input";
import { Modal } from "@/components/shared/Modal";
import { IcStash, IcX } from "@/components/shared/icons";
import { useReposStore } from "@/store/repos";
import { useUiStore } from "@/store/ui";

/** Modal for stashing the working tree: an optional name and a toggle to include
 * untracked files (`git stash push -u`). */
export function StashModal() {
  const closeStashModal = useUiStore((s) => s.closeStashModal);
  const saveStash = useReposStore((s) => s.saveStash);

  const [message, setMessage] = useState("");
  const [includeUntracked, setIncludeUntracked] = useState(true);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (saving) return;
    setSaving(true);
    await saveStash(message, includeUntracked);
    closeStashModal();
  }

  return (
    <Modal onClose={closeStashModal} className="w-100">
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-border-soft">
        <span className="grid place-items-center text-teal">
          <IcStash s={16} />
        </span>
        <span className="text-[14px] font-semibold text-text">Stash changes</span>
        <button
          className="ml-auto grid place-items-center w-7 h-7 rounded-lg text-text-3 hover:bg-surface-2 hover:text-text transition-colors"
          onClick={closeStashModal}
        >
          <IcX s={15} />
        </button>
      </div>

      <div className="px-5 py-5 space-y-4">
        <div className="space-y-1.5">
          <label className="text-[12px] text-text-3 font-medium">Description (optional)</label>
          <Input
            autoFocus
            surface="surface-2"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && save()}
            placeholder="What are you setting aside?"
            className="w-full"
          />
        </div>

        <div
          className="flex items-center gap-2.5 cursor-pointer"
          onClick={() => setIncludeUntracked((v) => !v)}
        >
          <Checkbox
            checked={includeUntracked}
            onChange={() => setIncludeUntracked((v) => !v)}
            onClick={(e) => e.stopPropagation()}
          />
          <span className="flex flex-col">
            <span className="text-[13px] text-text">Include untracked files</span>
            <span className="text-[11px] text-text-3">Also stash files git isn’t tracking yet.</span>
          </span>
        </div>
      </div>

      <div className="flex justify-end gap-2 px-5 py-4 border-t border-border-soft">
        <Button variant="ghost" onClick={closeStashModal}>
          Cancel
        </Button>
        <Button className="px-4 py-2.25 rounded-lg text-[13px]" disabled={saving} onClick={save}>
          {saving ? "Stashing…" : "Stash changes"}
        </Button>
      </div>
    </Modal>
  );
}
