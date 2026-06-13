import { useUiStore } from "@/store/ui";
import type { Repo } from "@/types";

interface SuggestionProps {
  title: string;
  sub: string;
  kbd?: string[];
  btn: string;
  onClick?: () => void;
}

function Suggestion({ title, sub, kbd, btn, onClick }: SuggestionProps) {
  return (
    <div className="flex items-center justify-between gap-4.5 px-5.5 py-4.5 border-b border-border-soft last:border-b-0">
      <div>
        <div className="text-[14px] font-semibold">{title}</div>
        <div className="text-[12.5px] text-text-3 mt-0.75 font-mono">{sub}</div>
        {kbd && (
          <div className="text-[11.5px] text-text-3 mt-2 flex items-center gap-1.25">
            Repository menu or{" "}
            {kbd.map((k, i) => (
              <kbd
                key={i}
                className="font-mono text-[11px] bg-surface-2 border border-border border-b-2 rounded-[5px] px-1.5 py-px text-text-2"
              >
                {k}
              </kbd>
            ))}
          </div>
        )}
      </div>
      <button
        className="flex-none text-[13px] font-semibold py-2.25 px-4 rounded-lg bg-surface-2 border border-border transition-colors duration-150 text-text hover:bg-surface-3 hover:border-indigo"
        onClick={onClick}
      >
        {btn}
      </button>
    </div>
  );
}

export function EmptyState({ repo }: { repo: Repo }) {
  const openAddAccount = useUiStore((s) => s.openAddAccount);

  return (
    <div className="flex-1 overflow-auto py-13.5 px-16 max-w-230 w-full mx-auto">
      <div className="flex items-start justify-between gap-7.5 mb-8.5">
        <div>
          <h1 className="text-[30px] font-semibold tracking-[-0.01em]">No local changes</h1>
          <p className="text-[14px] text-text-2 mt-2.5 leading-[1.55] max-w-115">
            There are no uncommitted changes in <strong className="text-text">{repo.name}</strong>. Here are some
            friendly suggestions for what to do next.
          </p>
        </div>
        <img className="opacity-40 flex-none" src="/placeholder.svg" alt="" width={96} height={96} />
      </div>
      <div className="flex flex-col border border-border-soft rounded-[13px] overflow-hidden bg-[#13111f]">
        <Suggestion
          title="Open the repository in your editor"
          sub="Configure your editor in Settings"
          kbd={["⌘", "⇧", "A"]}
          btn="Open in VS Code"
        />
        <Suggestion title="View the files of your repository" sub={repo.path} kbd={["⌘", "⇧", "F"]} btn="Show in Finder" />
        <Suggestion
          title="Open the repository page in your browser"
          sub={repo.remote}
          kbd={["⌘", "⇧", "G"]}
          btn="View on remote"
        />
        <Suggestion
          title="Add another account to GitVerse"
          sub="Generate an SSH key and switch identities in one click"
          btn="Add account"
          onClick={openAddAccount}
        />
      </div>
    </div>
  );
}
