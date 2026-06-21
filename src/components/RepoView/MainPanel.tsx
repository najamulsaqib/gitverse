import { useEffect, useState } from "react";
import { CommitDetail } from "@/components/RepoView/CommitDetail";
import { DiffView } from "@/components/RepoView/DiffView";
import { RepoEmptyState } from "@/components/RepoView/RepoEmptyState";
import { StashDetail } from "@/components/RepoView/StashDetail";
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
  const stashes = useReposStore((s) => s.stashesByRepo[repoId]) ?? [];
  const selectedStash = useReposStore((s) => s.selStash);

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

  if (tab === "stash") {
    const s = stashes.find((x) => x.index === selectedStash) ?? stashes[0];
    if (!s) {
      return <RepoEmptyState title="No stashes" subtitle="Stash changes to see them here." repoPath={repo.path} />;
    }
    return <StashDetail key={s.index} stash={s} repoPath={repo.path} />;
  }

  if (tab === "history") {
    const c = history.find((x) => x.hash === selectedCommit) ?? history[0];
    if (!c) {
      return (
        <RepoEmptyState title="No commits yet" subtitle="This repository has no commit history." repoPath={repo.path} />
      );
    }
    const a = accounts.find((x) => x.id === c.by);
    return <CommitDetail key={c.hash} commit={c} account={a} repoPath={repo.path} />;
  }

  if (!f) {
    return (
      <RepoEmptyState title="No local changes" subtitle="Working tree clean." repoPath={repo.path} />
    );
  }

  return <DiffView path={f.path} status={f.status} add={f.add} del={f.del} diff={diff} />;
}
