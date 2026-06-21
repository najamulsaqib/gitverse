import { ContextMenu } from "@/components/shared/ContextMenu";
import { IcCopy } from "@/components/shared/icons";
import { useReposStore } from "@/store/repos";
import { useUiStore } from "@/store/ui";

/**
 * Right-click menu for a commit in the history graph. Today it offers the
 * always-safe copy actions; this is the single place upcoming commit actions
 * (checkout, create branch/tag here, revert, cherry-pick, reset) get appended.
 */
export function GraphContextMenu() {
  const graphMenu = useUiStore((s) => s.graphMenu);
  const closeGraphMenu = useUiStore((s) => s.closeGraphMenu);
  const repoId = useReposStore((s) => s.repoId);
  const commits = useReposStore((s) => s.historyByRepo[repoId]) ?? [];

  if (!graphMenu) return null;
  const commit = commits.find((c) => c.hash === graphMenu.hash);
  if (!commit) return null;

  const copy = (text: string) => {
    navigator.clipboard?.writeText(text).catch(() => { });
    closeGraphMenu();
  };

  return (
    <ContextMenu
      x={graphMenu.x}
      y={graphMenu.y}
      onClose={closeGraphMenu}
      items={[
        { label: "Copy SHA", icon: <IcCopy s={14} />, onClick: () => copy(commit.hash) },
        { label: "Copy short SHA", icon: <IcCopy s={14} />, onClick: () => copy(commit.hash.slice(0, 7)) },
        { label: "Copy message", icon: <IcCopy s={14} />, onClick: () => copy(commit.subject) },
      ]}
    />
  );
}
