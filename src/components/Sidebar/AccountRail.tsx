import { Avatar } from "@/components/shared/Avatar";
import { IcPlus, IcSettings } from "@/components/shared/icons";
import { useProfilesStore } from "@/store/profiles";
import { useReposStore } from "@/store/repos";
import { useUiStore } from "@/store/ui";

export function AccountRail() {
  const accounts = useProfilesStore((s) => s.accounts);
  const activeId = useProfilesStore((s) => s.activeId);
  const switchAccount = useProfilesStore((s) => s.switchAccount);
  const repos = useReposStore((s) => s.repos);
  const repoId = useReposStore((s) => s.repoId);
  const showToast = useUiStore((s) => s.showToast);
  const openAddAccount = useUiStore((s) => s.openAddAccount);

  const handleSwitch = (id: string) => {
    if (id === activeId) return;
    const a = accounts.find((x) => x.id === id)!;
    const repo = repos.find((r) => r.id === repoId)!;
    switchAccount(id);
    showToast({
      title: `Active identity → ${a.label}`,
      sub: `${a.email} written to ${repo.name}/.git/config`,
      color: a.color,
    });
  };

  return (
    <div className="w-15 flex-none bg-[#0b0a16] border-r border-border-soft flex flex-col items-center pt-2.5 pb-3 gap-1">
      <div className="w-10 h-10 grid place-items-center rounded-[11px]" title="GitVerse">
        <img
          src="/mark.svg"
          alt="GitVerse"
          width={38}
          height={38}
          className="block drop-shadow-[0_2px_6px_rgba(123,114,232,0.25)]"
        />
      </div>
      <div className="w-6 h-px bg-border mt-1.5 mb-2" />
      <div className="flex flex-col items-center gap-2.25 flex-1">
        {accounts.map((a) => {
          const isActive = a.id === activeId;
          return (
            <button
              key={a.id}
              className="group relative grid place-items-center p-0 rounded-[13px] transition-transform duration-150 hover:-translate-y-px active:scale-[0.94]"
              onClick={() => handleSwitch(a.id)}
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
        <button
          className="w-9.5 h-9.5 rounded-[11px] grid place-items-center text-text-3 border border-dashed border-[#322c56] transition-colors duration-150 hover:text-indigo-light hover:border-indigo hover:bg-indigo/8"
          onClick={openAddAccount}
          title="Add account"
        >
          <IcPlus s={18} sw={1.8} />
        </button>
      </div>
      <button
        className="w-9.5 h-9.5 rounded-[11px] grid place-items-center text-text-3 transition-colors duration-150 hover:text-text"
        title="Settings"
      >
        <IcSettings s={18} />
      </button>
    </div>
  );
}
