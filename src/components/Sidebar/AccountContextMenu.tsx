import { useState } from "react";
import { Button } from "@/components/shared/Button";
import { ContextMenu } from "@/components/shared/ContextMenu";
import { IconButton } from "@/components/shared/IconButton";
import { Modal } from "@/components/shared/Modal";
import { IcEdit, IcKey, IcTrash, IcX } from "@/components/shared/icons";
import { useProfilesStore } from "@/store/profiles";
import { useUiStore } from "@/store/ui";
import type { Account } from "@/types";

export function AccountContextMenu() {
  const accountMenu = useUiStore((s) => s.accountMenu);
  const closeAccountMenu = useUiStore((s) => s.closeAccountMenu);
  const openEditAccount = useUiStore((s) => s.openEditAccount);
  const showToast = useUiStore((s) => s.showToast);
  const accounts = useProfilesStore((s) => s.accounts);
  const [confirmAccount, setConfirmAccount] = useState<Account | null>(null);

  const menuAccount = accountMenu ? accounts.find((a) => a.id === accountMenu.id) : undefined;

  const confirmDelete = async () => {
    if (!confirmAccount) return;
    try {
      await useProfilesStore.getState().deleteAccount(confirmAccount.id);
      showToast({
        title: `${confirmAccount.label} removed`,
        sub: "Profile deleted",
        color: confirmAccount.color,
      });
      setConfirmAccount(null);
    } catch (e) {
      showToast({
        title: "Failed to delete profile",
        sub: String(e),
        color: "#e8506e",
      });
    }
  };

  return (
    <>
      {accountMenu && menuAccount && (
        <ContextMenu
          x={accountMenu.x}
          y={accountMenu.y}
          onClose={closeAccountMenu}
          items={[
            {
              label: "Edit profile",
              icon: <IcEdit s={14} />,
              onClick: () => openEditAccount(menuAccount.id),
            },
            {
              label: "Delete profile",
              icon: <IcTrash s={14} />,
              variant: "danger",
              onClick: () => {
                setConfirmAccount(menuAccount);
                closeAccountMenu();
              },
            },
          ]}
        />
      )}
      {confirmAccount && (
        <Modal onClose={() => setConfirmAccount(null)} className="w-100 max-w-[calc(100%-40px)]">
          <div className="relative">
            <IconButton
              className="absolute top-3.5 right-3.5 w-7.5 h-7.5 rounded-lg z-2 text-text-3 hover:bg-surface-2 hover:text-text"
              onClick={() => setConfirmAccount(null)}
            >
              <IcX s={15} />
            </IconButton>
            <div className="pt-6.5 px-7 pb-5 flex flex-col gap-3.5">
              <h2 className="text-[19px] font-semibold tracking-[-0.01em]">Delete {confirmAccount.label}?</h2>
              <p className="text-[13px] text-text-2 leading-[1.55] -mt-1">
                This removes the identity from GitVerse. Its git config and SSH host alias will no longer be used.
              </p>
              <div className="flex items-start gap-2.25 text-[12.5px] text-text-2 leading-normal bg-bg border border-border-soft rounded-[10px] py-2.75 px-3.25">
                <span className="flex-none mt-px text-teal">
                  <IcKey s={14} />
                </span>
                <span>
                  The SSH key{" "}
                  <code className="font-mono text-[11.5px] text-indigo-light">~/.ssh/{confirmAccount.key}</code> is
                  not deleted — it stays in place and can be reused for another identity or removed manually.
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2.25 px-6 py-3.5 border-t border-border-soft bg-[#13111f]">
            <Button variant="ghost" onClick={() => setConfirmAccount(null)}>
              Cancel
            </Button>
            <button
              className="flex items-center gap-1.75 px-4.5 py-2.25 rounded-lg text-[13px] font-semibold text-white bg-linear-to-b from-red to-[#c43d57] transition-all shadow-[0_6px_18px_-8px_rgba(232,80,110,0.6)] hover:brightness-110"
              onClick={confirmDelete}
            >
              <IcTrash s={14} /> Delete profile
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
