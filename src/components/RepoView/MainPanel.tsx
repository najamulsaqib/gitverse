import { CommitDetail } from "@/components/RepoView/CommitDetail";
import { DiffView } from "@/components/RepoView/DiffView";
import { EmptyState } from "@/components/RepoView/EmptyState";
import { DIFFS } from "@/data/mockData";
import { useProfilesStore } from "@/store/profiles";
import { useReposStore } from "@/store/repos";
import { useUiStore } from "@/store/ui";

export function MainPanel() {
  const tab = useUiStore((s) => s.tab);
  const accounts = useProfilesStore((s) => s.accounts);
  const repos = useReposStore((s) => s.repos);
  const repoId = useReposStore((s) => s.repoId);
  const files = useReposStore((s) => s.filesByRepo[repoId]);
  const selectedFile = useReposStore((s) => s.selFile);
  const history = useReposStore((s) => s.historyByRepo[repoId]);
  const selectedCommit = useReposStore((s) => s.selCommit);

  const repo = repos.find((r) => r.id === repoId)!;

  if (tab === "history") {
    const c = history.find((x) => x.hash === selectedCommit) || history[0];
    if (!c) return <div className="flex-1 grid place-items-center text-text-3">No commits yet.</div>;
    const a = accounts.find((x) => x.id === c.by) || accounts[0];
    return <CommitDetail key={c.hash} commit={c} account={a} />;
  }

  if (!files.length) return <EmptyState repo={repo} />;

  const f = files.find((x) => x.path === selectedFile) || files[0];
  const diff = DIFFS[f.path] || [{ t: "hunk" as const, a: "@@ binary or unchanged @@" }];
  return <DiffView path={f.path} status={f.status} add={f.add} del={f.del} diff={diff} />;
}
