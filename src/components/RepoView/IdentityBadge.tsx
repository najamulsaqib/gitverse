import { Avatar } from "@/components/shared/Avatar";
import { IcAlert } from "@/components/shared/icons";
import { useProfilesStore } from "@/store/profiles";
import { useReposStore } from "@/store/repos";
import type { Account } from "@/types";

/**
 * The active-identity badge shown above the commit box: avatar, name, email.
 * Git can only tell us whether this identity can *reach* the remote (a
 * `git ls-remote` probe) — not a repo's host-side visibility — so when access
 * is denied the row takes on a warning tint and explains it on hover.
 */
export function IdentityBadge({ account }: { account: Account }) {
  const identityPulse = useProfilesStore((s) => s.identityPulse);
  const repoId = useReposStore((s) => s.repoId);
  const denied = useReposStore((s) => s.accessByRepo[repoId]) === "denied";

  return (
    <div className="group relative">
      <div
        className={`flex items-center gap-2.5 rounded-lg border transition-colors ${denied ? "border-red/35 bg-red/8 hover:bg-red/12 px-2 py-1.5 cursor-help" : "border-transparent"
          }`}
      >
        <div
          key={identityPulse}
          className={`rounded-[9.6px] flex-none ${identityPulse > 0 ? "animate-id-pulse" : ""}`}
          style={{ "--pulse-color": account.color } as React.CSSProperties}
        >
          <Avatar acc={account} size={20} />
        </div>
        <div className="flex-1 min-w-0 text-[12.5px] whitespace-nowrap overflow-hidden text-ellipsis">
          <span className="text-text font-semibold">{account.name}</span>
          <span className="text-text-3"> · {account.email}</span>
        </div>
        {denied && <IcAlert s={14} className="flex-none text-[#f0859c]" />}
      </div>

      {denied && (
        <div className="pointer-events-none absolute inset-x-0 bottom-full z-60 mb-2 translate-y-1 opacity-0 transition-all duration-150 group-hover:translate-y-0 group-hover:opacity-100">
          <div className="flex items-start gap-1.75 rounded-[11px] border border-red/40 bg-surface px-3 py-2.5 shadow-[0_20px_50px_-16px_rgba(0,0,0,0.8)]">
            <IcAlert s={13} className="mt-px flex-none text-[#f0859c]" />
            <span className="text-[11.5px] leading-snug text-text-2">
              <strong className="font-semibold text-[#f0859c]">No remote access</strong>
              {" — "}
              <strong className="font-semibold text-text">{account.label}</strong> can't reach this
              repo's remote. Pull and push will fail until this identity is granted access.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
