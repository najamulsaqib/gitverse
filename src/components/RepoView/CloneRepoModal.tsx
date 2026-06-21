import { useState } from "react";
import { IcBranch, IcCloud, IcFolderOpen, IcGlobe, IcX } from "@/components/shared/icons";
import { Button } from "@/components/shared/Button";
import { Input } from "@/components/shared/Input";
import { Modal } from "@/components/shared/Modal";
import { Select } from "@/components/shared/Select";
import { cloneRepo, pickRepoFolder } from "@/hooks/useRepo";
import { useProfilesStore } from "@/store/profiles";
import { useReposStore } from "@/store/repos";
import { useUiStore } from "@/store/ui";
import type { Repo, RepoCandidate } from "@/types";

type Phase = "form" | "cloning" | "confirm" | "error";

function slugId(name: string): string {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "repo";
  return `${base}-${Math.random().toString(36).slice(2, 8)}`;
}

export function CloneRepoModal() {
  const accounts = useProfilesStore((s) => s.accounts);
  const activeId = useProfilesStore((s) => s.activeId);
  const addRepo = useReposStore((s) => s.addRepo);
  const close = useUiStore((s) => s.closeCloneRepo);
  const showToast = useUiStore((s) => s.showToast);

  const [phase, setPhase] = useState<Phase>("form");
  const [url, setUrl] = useState("");
  const [destDir, setDestDir] = useState<string | null>(null);
  const [candidate, setCandidate] = useState<RepoCandidate | null>(null);
  const [owner, setOwner] = useState(activeId || accounts[0]?.id || "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function chooseFolder() {
    const path = await pickRepoFolder();
    if (path !== null) setDestDir(path);
  }

  async function clone() {
    if (!url.trim() || !destDir) return;
    setPhase("cloning");
    setError("");
    try {
      const found = await cloneRepo(url.trim(), destDir);
      setCandidate(found);
      setPhase("confirm");
    } catch (e) {
      setError(String(e));
      setPhase("error");
    }
  }

  async function confirm() {
    if (!candidate || !owner) return;
    setSaving(true);
    try {
      const repo: Repo = {
        id: slugId(candidate.name),
        name: candidate.name,
        owner,
        branch: candidate.branch,
        path: candidate.path,
        remote: candidate.remote,
      };
      await addRepo(repo);
      showToast({ title: `Cloned ${repo.name}`, sub: repo.path, color: accounts.find((a) => a.id === owner)?.color });
      close();
    } catch (e) {
      setSaving(false);
      setError(String(e));
      setPhase("error");
    }
  }

  return (
    <Modal onClose={close} className="w-110">
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-border-soft">
        <span className="grid place-items-center text-teal">
          <IcCloud s={16} />
        </span>
        <span className="text-[14px] font-semibold text-text">Clone remote repository</span>
        <button
          className="ml-auto grid place-items-center w-7 h-7 rounded-lg text-text-3 hover:bg-surface-2 hover:text-text transition-colors"
          onClick={close}
        >
          <IcX s={15} />
        </button>
      </div>

      {phase === "form" && (
        <>
          <div className="px-5 py-5 space-y-4">
            <div className="space-y-1.75">
              <label className="text-[12.5px] text-text-3">SSH URL</label>
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="git@github.com:owner/repo.git"
                className="w-full font-mono"
                autoFocus
                spellCheck={false}
              />
              <p className="text-[11.5px] text-text-3 leading-relaxed">
                Use the SSH URL, not HTTPS — GitVerse authenticates with your per-identity SSH key.
              </p>
            </div>
            <div className="space-y-1.75">
              <label className="text-[12.5px] text-text-3">Clone into</label>
              <button
                className="flex items-center gap-2.5 w-full text-left rounded-lg border border-border bg-bg px-2.75 py-2.25 text-[13px] hover:border-indigo transition-colors"
                onClick={chooseFolder}
              >
                <IcFolderOpen s={15} className="flex-none text-text-3" />
                <span className={`min-w-0 break-all ${destDir ? "text-text-2 font-mono text-[12.5px]" : "text-text-3"}`}>
                  {destDir ?? "Choose a destination folder…"}
                </span>
              </button>
            </div>
          </div>
          <div className="flex justify-end gap-2 px-5 py-4 border-t border-border-soft">
            <Button variant="ghost" onClick={close}>
              Cancel
            </Button>
            <Button
              className="px-4 py-2.25 rounded-lg text-[13px]"
              disabled={!url.trim() || !destDir}
              onClick={clone}
            >
              Clone
            </Button>
          </div>
        </>
      )}

      {phase === "cloning" && (
        <div className="px-5 py-8 text-center text-[13px] text-text-3">Cloning repository…</div>
      )}

      {phase === "error" && (
        <>
          <div className="px-5 py-5">
            <div className="rounded-xl border border-red/30 bg-red/8 px-4 py-3.5 text-[13px] text-red leading-relaxed whitespace-pre-wrap wrap-break-word">
              {error}
            </div>
          </div>
          <div className="flex justify-end gap-2 px-5 py-4 border-t border-border-soft">
            <Button variant="ghost" onClick={close}>
              Cancel
            </Button>
            <Button className="px-4 py-2.25 rounded-lg text-[13px]" onClick={() => setPhase("form")}>
              Back
            </Button>
          </div>
        </>
      )}

      {phase === "confirm" && candidate && (
        <>
          <div className="px-5 py-5 space-y-3.5">
            <div className="flex items-baseline gap-2.5">
              <span className="text-[13px] text-text-3 w-16 flex-none">Name</span>
              <span className="text-[13.5px] font-semibold text-text">{candidate.name}</span>
            </div>
            <div className="flex items-baseline gap-2.5">
              <span className="text-[13px] text-text-3 w-16 flex-none">Path</span>
              <span className="text-[12.5px] font-mono text-text-2 break-all">{candidate.path}</span>
            </div>
            <div className="flex items-baseline gap-2.5">
              <span className="text-[13px] text-text-3 w-16 flex-none">Branch</span>
              <span className="inline-flex items-center gap-1.5 text-[13px] text-text-2">
                <IcBranch s={13} />
                {candidate.branch}
              </span>
            </div>
            {candidate.remote && (
              <div className="flex items-baseline gap-2.5">
                <span className="text-[13px] text-text-3 w-16 flex-none">Remote</span>
                <span className="inline-flex items-center gap-1.5 text-[12.5px] font-mono text-text-2 break-all">
                  <IcGlobe s={13} className="flex-none" />
                  {candidate.remote}
                </span>
              </div>
            )}
            <div className="flex items-center gap-2.5 pt-1">
              <span className="text-[13px] text-text-3 w-16 flex-none">Identity</span>
              <div className="flex-1">
                <Select value={owner} onChange={(e) => setOwner(e.target.value)}>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.label} · {a.host}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 px-5 py-4 border-t border-border-soft">
            <Button variant="ghost" onClick={close}>
              Cancel
            </Button>
            <Button
              className="px-4 py-2.25 rounded-lg text-[13px]"
              disabled={saving || !owner}
              onClick={confirm}
            >
              {saving ? "Saving…" : "Add repository"}
            </Button>
          </div>
        </>
      )}
    </Modal>
  );
}
