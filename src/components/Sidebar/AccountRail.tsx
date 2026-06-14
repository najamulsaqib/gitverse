import { AccountContextMenu } from "@/components/Sidebar/AccountContextMenu";
import { Avatar } from "@/components/shared/Avatar";
import { IconButton } from "@/components/shared/IconButton";
import { IcPlus } from "@/components/shared/icons";
import { useProfilesStore } from "@/store/profiles";
import { useUiStore } from "@/store/ui";

export function AccountRail() {
  const accounts = useProfilesStore((s) => s.accounts);
  const activeId = useProfilesStore((s) => s.activeId);
  const switchAccount = useProfilesStore((s) => s.switchAccount);
  const showToast = useUiStore((s) => s.showToast);
  const openAddAccount = useUiStore((s) => s.openAddAccount);
  const openAccountMenu = useUiStore((s) => s.openAccountMenu);

  const handleSwitch = async (id: string) => {
    if (id === activeId) return;
    const a = accounts.find((x) => x.id === id)!;
    try {
      await switchAccount(id);
      showToast({
        title: `Active identity → ${a.label}`,
        sub: `${a.email} is now the active identity (global git config)`,
        color: a.color,
      });
    } catch (e) {
      showToast({
        title: "Failed to switch identity",
        sub: String(e),
        color: "#e8506e",
      });
    }
  };

  return (
    <div className="w-15 flex-none bg-[#0b0a16] border-r border-border-soft flex flex-col items-center pt-2.5 pb-3 gap-1 overflow-hidden">
      <div className="w-10 h-10 grid place-items-center rounded-[11px] flex-none" title="GitVerse">
        <img
          src="/mark.svg"
          alt="GitVerse"
          width={38}
          height={38}
          className="block drop-shadow-[0_2px_6px_rgba(123,114,232,0.25)]"
        />
      </div>
      <div className="w-6 h-px bg-border mt-1.5 mb-2 flex-none" />
      <div className="account-rail-scroll flex flex-col items-center gap-2.25 flex-1 min-h-0 w-full overflow-y-auto scrollbar-none pt-1.5 pb-5">
        {accounts.map((a, i) => {
          const isActive = a.id === activeId;
          return (
            <button
              key={`${a.id}-${i}`}
              className="group relative grid place-items-center p-0 rounded-[13px] transition-transform duration-150 hover:-translate-y-px active:scale-[0.94] flex-none"
              onClick={() => handleSwitch(a.id)}
              onContextMenu={(e) => {
                e.preventDefault();
                openAccountMenu(a.id, e.clientX, e.clientY);
              }}
              title={`${a.label} — ${a.handle} (${a.host})`}
            >
              {isActive && (
                <span
                  className="absolute -left-2.5 top-1/2 -translate-y-1/2 w-1 h-5.5 rounded-r-[3px]"
                  style={{ background: a.color }}
                />
              )}
              <span
                className={`grid place-items-center transition-[opacity,filter] duration-150 ${isActive ? "" : "opacity-[0.62] saturate-[0.7] group-hover:opacity-100 group-hover:saturate-100"
                  }`}
              >
                <Avatar acc={a} active={isActive} />
              </span>
            </button>
          );
        })}
      </div>
      <IconButton
        className="flex-none w-9.5 h-9.5 rounded-[11px] text-text-3 border border-dashed border-[#322c56] duration-150 hover:text-indigo-light hover:border-indigo hover:bg-indigo/8"
        onClick={openAddAccount}
        title="Add account"
      >
        <IcPlus s={18} sw={1.8} />
      </IconButton>
      <AccountContextMenu />
    </div>
  );
}
