import { useEffect, useState } from "react";
import { CommitDetail } from "@/components/RepoView/CommitDetail";
import { DiffView } from "@/components/RepoView/DiffView";
import { gitDiff } from "@/hooks/useGit";
import { useProfilesStore } from "@/store/profiles";
import { useReposStore } from "@/store/repos";
import { useUiStore } from "@/store/ui";
import type { DiffLine } from "@/types";

export function MainPanel() {
  const tab = useUiStore((s) => s.tab);
  const accounts = useProfilesStore((s) => s.accounts);
  const repos = useReposStore((s) => s.repos);
  const repoId = useReposStore((s) => s.repoId);
  const files = useReposStore((s) => s.filesByRepo[repoId]) ?? [];
  const selectedFile = useReposStore((s) => s.selFile);
  const history = useReposStore((s) => s.historyByRepo[repoId]) ?? [];
  const selectedCommit = useReposStore((s) => s.selCommit);

  const repo = repos.find((r) => r.id === repoId);
  const f = files.find((x) => x.path === selectedFile) ?? files[0];

  const [diff, setDiff] = useState<DiffLine[]>([]);
  useEffect(() => {
    if (tab !== "changes" || !repo || !f) {
      setDiff([]);
      return;
    }
    let alive = true;
    gitDiff(repo.path, f.path, f.staged)
      .then((d) => alive && setDiff(d))
      .catch(() => alive && setDiff([]));
    return () => {
      alive = false;
    };
  }, [tab, repo?.path, f?.path, f?.staged, f?.add, f?.del]);

  if (!repo) return null;

  if (tab === "history") {
    const c = history.find((x) => x.hash === selectedCommit) ?? history[0];
    if (!c)
      return (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 text-text-3 p-7.5">
          <img src="/placeholder.svg" alt="" width={64} height={64} style={{ opacity: 0.5 }} />
          <div className="text-[14px] font-semibold text-text-2">No commits yet</div>
        </div>
      );
    const a = accounts.find((x) => x.id === c.by) ?? accounts[0];
    return <CommitDetail key={c.hash} commit={c} account={a} repoPath={repo.path} />;
  }

  if (!f) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-2 text-text-3 p-7.5">
        <img src="/placeholder.svg" alt="" width={64} height={64} style={{ opacity: 0.5 }} />
        <div className="text-[14px] font-semibold text-text-2">No local changes</div>
        <div className="text-[12px]">Working tree clean.</div>
      </div>
    );
  }

  return <DiffView path={f.path} status={f.status} add={f.add} del={f.del} diff={diff} />;
}
