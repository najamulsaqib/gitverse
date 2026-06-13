import { useState } from "react";
import { Avatar } from "@/components/shared/Avatar";
import { IcUserPlus, IcX } from "@/components/shared/icons";
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
  const coAuthors = useReposStore((s) => s.coAuthors);
  const addCoAuthor = useReposStore((s) => s.addCoAuthor);
  const removeCoAuthor = useReposStore((s) => s.removeCoAuthor);
  const [coAuthorInput, setCoAuthorInput] = useState("");

  const account = accounts.find((a) => a.id === activeId) ?? accounts[0];
  const stagedCount = files.filter((f) => f.staged).length;
  const canCommit = stagedCount > 0 && summary.trim().length > 0;

  return (
    <div className="flex-none border-t border-border-soft p-3 flex flex-col gap-2.5 bg-[#13111f]">
      <div className="flex items-center gap-2.5">
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
      <div className="flex items-center gap-1.5 flex-wrap">
        <IcUserPlus s={14} className="text-text-3 flex-none" />
        {coAuthors.map((email) => (
          <span
            key={email}
            className="flex items-center gap-1.25 pl-2.25 pr-1.25 py-0.75 rounded-full bg-surface border border-border text-[11.5px] text-text-2"
          >
            {email}
            <button
              className="grid place-items-center text-text-3 transition-colors hover:text-text"
              title="Remove co-author"
              onClick={() => removeCoAuthor(email)}
            >
              <IcX s={10} sw={2} />
            </button>
          </span>
        ))}
        <input
          className="flex-1 min-w-32 bg-transparent border-none outline-none text-[12.5px] text-text placeholder:text-text-3"
          placeholder="Add co-author email"
          value={coAuthorInput}
          onChange={(e) => setCoAuthorInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== "Enter") return;
            const email = coAuthorInput.trim();
            if (email) addCoAuthor(email);
            setCoAuthorInput("");
          }}
        />
      </div>
      <button
        className="bg-linear-to-b from-indigo to-[#6a61dd] text-white font-semibold text-[13px] py-2.75 rounded-[9px] transition-all shadow-[0_6px_18px_-8px_rgba(123,114,232,0.8)] enabled:hover:brightness-110 disabled:bg-none disabled:bg-surface-2 disabled:text-text-3 disabled:shadow-none disabled:cursor-not-allowed"
        disabled={!canCommit}
        onClick={commit}
      >
        Commit {stagedCount} file{stagedCount !== 1 ? "s" : ""} to <strong className="font-bold">{branch}</strong>
      </button>
    </div>
  );
}
