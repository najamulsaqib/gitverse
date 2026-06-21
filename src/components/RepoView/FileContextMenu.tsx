import { useState } from "react";
import { Button } from "@/components/shared/Button";
import { ContextMenu } from "@/components/shared/ContextMenu";
import { IconButton } from "@/components/shared/IconButton";
import { Modal } from "@/components/shared/Modal";
import { IcCopy, IcEditor, IcFolderOpen, IcGlobe, IcUndo, IcX } from "@/components/shared/icons";
import { fileManagerActionLabel } from "@/hooks/useSystem";
import { useReposStore } from "@/store/repos";
import { useUiStore } from "@/store/ui";

function baseName(p: string) {
  const i = p.lastIndexOf("/");
  return i >= 0 ? p.slice(i + 1) : p;
}

/** Right-click menu for a changed file in the changes pane: discard, copy paths,
 * and open actions. Discarding is confirmed first since it can't be undone. */
export function FileContextMenu() {
  const fileMenu = useUiStore((s) => s.fileMenu);
  const closeFileMenu = useUiStore((s) => s.closeFileMenu);
  const showToast = useUiStore((s) => s.showToast);
  const discardFile = useReposStore((s) => s.discardFile);
  const openFile = useReposStore((s) => s.openFile);
  const openFileWith = useReposStore((s) => s.openFileWith);
  const revealFile = useReposStore((s) => s.revealFile);
  const fileAbsPath = useReposStore((s) => s.fileAbsPath);
  const [confirmPath, setConfirmPath] = useState<string | null>(null);

  const copy = (text: string, what: string) => {
    navigator.clipboard?.writeText(text).catch(() => { });
    showToast({ title: `Copied ${what}` });
    closeFileMenu();
  };

  const run = (fn: (path: string) => void) => {
    if (fileMenu) fn(fileMenu.path);
    closeFileMenu();
  };

  const confirmDiscard = async () => {
    if (!confirmPath) return;
    await discardFile(confirmPath);
    setConfirmPath(null);
  };

  return (
    <>
      {fileMenu && (
        <ContextMenu
          x={fileMenu.x}
          y={fileMenu.y}
          onClose={closeFileMenu}
          items={[
            {
              label: "Discard changes…",
              icon: <IcUndo s={14} />,
              variant: "danger",
              onClick: () => {
                setConfirmPath(fileMenu.path);
                closeFileMenu();
              },
            },
            {
              label: "Copy file path",
              icon: <IcCopy s={14} />,
              separatorBefore: true,
              onClick: () => copy(fileAbsPath(fileMenu.path), "file path"),
            },
            {
              label: "Copy relative file path",
              icon: <IcCopy s={14} />,
              onClick: () => copy(fileMenu.path, "relative path"),
            },
            {
              label: fileManagerActionLabel(),
              icon: <IcFolderOpen s={14} />,
              separatorBefore: true,
              onClick: () => run(revealFile),
            },
            {
              label: "Open in editor",
              icon: <IcEditor s={14} />,
              onClick: () => run(openFile),
            },
          ]}
        />
      )}
      {confirmPath && (
        <Modal onClose={() => setConfirmPath(null)} className="w-100 max-w-[calc(100%-40px)]">
          <div className="relative">
            <IconButton
              className="absolute top-3.5 right-3.5 w-7.5 h-7.5 rounded-lg z-2 text-text-3 hover:bg-surface-2 hover:text-text"
              onClick={() => setConfirmPath(null)}
            >
              <IcX s={15} />
            </IconButton>
            <div className="pt-6.5 px-7 pb-5 flex flex-col gap-3.5">
              <h2 className="text-[19px] font-semibold tracking-[-0.01em]">Discard changes?</h2>
              <p className="text-[13px] text-text-2 leading-[1.55] -mt-1">
                All uncommitted changes to{" "}
                <code className="font-mono text-[11.5px] text-indigo-light break-all">{baseName(confirmPath)}</code> will
                be permanently lost. This can't be undone.
              </p>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2.25 px-6 py-3.5 border-t border-border-soft bg-[#13111f]">
            <Button variant="ghost" onClick={() => setConfirmPath(null)}>
              Cancel
            </Button>
            <button
              className="flex items-center gap-1.75 px-4.5 py-2.25 rounded-lg text-[13px] font-semibold text-white bg-linear-to-b from-red to-[#c43d57] transition-all shadow-[0_6px_18px_-8px_rgba(232,80,110,0.6)] hover:brightness-110"
              onClick={confirmDiscard}
            >
              <IcUndo s={14} /> Discard changes
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
