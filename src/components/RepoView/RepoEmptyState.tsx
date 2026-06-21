import { useState } from "react";
import { Button } from "@/components/shared/Button";
import { IcEditor, IcFolderOpen } from "@/components/shared/icons";
import {
  fileManagerActionLabel,
  openRepoInEditor,
  revealRepoInFileManager,
} from "@/hooks/useSystem";
import { useUiStore } from "@/store/ui";

interface RepoEmptyStateProps {
  title: string;
  subtitle?: string;
  repoPath: string;
}

export function RepoEmptyState({ title, subtitle, repoPath }: RepoEmptyStateProps) {
  const showToast = useUiStore((s) => s.showToast);
  const [busy, setBusy] = useState<"editor" | "finder" | null>(null);

  const run = async (kind: "editor" | "finder", fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(kind);
    try {
      await fn();
    } catch (e) {
      showToast({
        title: kind === "editor" ? "Could not open editor" : "Could not open folder",
        sub: String(e),
        color: "#e8506e",
      });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-3 text-text-3 p-7.5 min-h-0">
      <img src="/placeholder.svg" alt="" width={64} height={64} style={{ opacity: 0.5 }} />
      <div className="flex flex-col items-center gap-1 text-center max-w-[320px]">
        <div className="text-[14px] font-semibold text-text-2">{title}</div>
        {subtitle && <div className="text-[12px] leading-normal">{subtitle}</div>}
      </div>

      <code className="font-mono text-[10.5px] text-text-3/80 truncate max-w-full px-2" title={repoPath}>
        {repoPath}
      </code>

      <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
        <Button
          variant="ghost"
          className="inline-flex items-center gap-1.75 px-3.5 py-2 rounded-lg border border-border-soft bg-surface/40"
          disabled={!!busy}
          onClick={() => run("editor", () => openRepoInEditor(repoPath))}
        >
          <IcEditor s={14} />
          {busy === "editor" ? "Opening…" : "Open in editor"}
        </Button>
        <Button
          variant="ghost"
          className="inline-flex items-center gap-1.75 px-3.5 py-2 rounded-lg border border-border-soft bg-surface/40"
          disabled={!!busy}
          onClick={() => run("finder", () => revealRepoInFileManager(repoPath))}
        >
          <IcFolderOpen s={14} />
          {busy === "finder" ? "Opening…" : fileManagerActionLabel()}
        </Button>
      </div>
    </div>
  );
}
