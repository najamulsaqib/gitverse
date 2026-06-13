import { useProfilesStore } from "@/store/profiles";
import { useReposStore } from "@/store/repos";

export function CommitBox() {
  const accounts = useProfilesStore((s) => s.accounts);
  const activeId = useProfilesStore((s) => s.activeId);
  const identityPulse = useProfilesStore((s) => s.identityPulse);
  const repoId = useReposStore((s) => s.repoId);
  const branch = useReposStore((s) => s.branchByRepo[repoId]);
  const files = useReposStore((s) => s.filesByRepo[repoId]);
  const summary = useReposStore((s) => s.summary);
  const desc = useReposStore((s) => s.desc);
  const setSummary = useReposStore((s) => s.setSummary);
  const setDesc = useReposStore((s) => s.setDesc);
  const commit = useReposStore((s) => s.commit);

  const account = accounts.find((a) => a.id === activeId) ?? accounts[0];
  const stagedCount = files.filter((f) => f.staged).length;
  const canCommit = stagedCount > 0 && summary.trim().length > 0;

  return (
    <div className="flex-none border-t border-border-soft p-3 flex flex-col gap-2.5 bg-[#13111f]">
      <div
        key={identityPulse}
        className={`relative flex items-center gap-2.5 px-2.75 py-2.25 rounded-[10px] ${identityPulse > 0 ? "animate-id-pulse" : ""}`}
        style={{
          background: `color-mix(in srgb, ${account.color} 12%, transparent)`,
          border: `1px solid color-mix(in srgb, ${account.color} 36%, transparent)`,
          "--pulse-color": account.color,
        } as React.CSSProperties}
      >
        <div
          className="w-8.5 h-8.5 rounded-[10px] grid place-items-center text-[#0b0a16] font-bold text-[12.5px] flex-none"
          style={{ background: `linear-gradient(150deg, ${account.color}, ${account.color}bb)` }}
        >
          {account.initials}
        </div>
        <div className="flex-1 min-w-0 leading-[1.32]">
          <div className="text-[12px] text-text-2">
            Committing as <strong className="text-text font-semibold">{account.name}</strong>
          </div>
          <div className="text-[11.5px] text-text-3 whitespace-nowrap overflow-hidden text-ellipsis">
            {account.email} · <span style={{ color: account.color }}>{account.label}</span>
          </div>
        </div>
        <div
          className="font-mono text-[10px] flex-none rounded-[5px] px-1.5 py-0.5 tracking-[-0.01em]"
          style={{ color: account.color, border: `1px solid color-mix(in srgb, ${account.color} 40%, transparent)` }}
          title="This identity is written into .git/config for this commit"
        >
          .gitconfig
        </div>
      </div>
      <div className="flex flex-col gap-1.75">
        <input
          className="bg-surface border border-border rounded-lg px-2.75 py-2.25 text-[13px] outline-none transition-colors focus:border-indigo"
          placeholder="Summary (required)"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
        />
        <textarea
          className="bg-surface border border-border rounded-lg px-2.75 py-2.25 text-[12.5px] outline-none transition-colors focus:border-indigo resize-none h-15.5"
          placeholder="Description"
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
        />
      </div>
      <button
        className="bg-linear-to-b from-indigo to-[#6a61dd] text-white font-semibold text-[13px] py-2.75 rounded-[9px] transition-all shadow-[0_6px_18px_-8px_rgba(123,114,232,0.8)] enabled:hover:brightness-110 disabled:bg-surface-2 disabled:text-text-3 disabled:shadow-none disabled:cursor-not-allowed"
        disabled={!canCommit}
        onClick={commit}
      >
        Commit {stagedCount} file{stagedCount !== 1 ? "s" : ""} to <strong className="font-bold">{branch}</strong>
      </button>
    </div>
  );
}
