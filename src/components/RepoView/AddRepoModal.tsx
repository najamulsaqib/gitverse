import { useEffect, useRef, useState } from "react";
import { IcBranch, IcGlobe, IcRepo, IcX } from "@/components/shared/icons";
import { Button } from "@/components/shared/Button";
import { Modal } from "@/components/shared/Modal";
import { Select } from "@/components/shared/Select";
import { pickRepoFolder, validateRepo } from "@/hooks/useRepo";
import { useProfilesStore } from "@/store/profiles";
import { useReposStore } from "@/store/repos";
import { useUiStore } from "@/store/ui";
import type { Repo, RepoCandidate } from "@/types";

type Phase = "picking" | "error" | "confirm";

function slugId(name: string): string {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "repo";
  return `${base}-${Math.random().toString(36).slice(2, 8)}`;
}

export function AddRepoModal() {
  const accounts = useProfilesStore((s) => s.accounts);
  const activeId = useProfilesStore((s) => s.activeId);
  const repos = useReposStore((s) => s.repos);
  const addRepo = useReposStore((s) => s.addRepo);
  const updateRepo = useReposStore((s) => s.updateRepo);
  const editRepoId = useUiStore((s) => s.editRepoId);
  const closeAddRepo = useUiStore((s) => s.closeAddRepo);
  const closeEditRepo = useUiStore((s) => s.closeEditRepo);
  const showToast = useUiStore((s) => s.showToast);

  const editing = editRepoId ? repos.find((r) => r.id === editRepoId) : undefined;
  const isEdit = !!editing;

  const close = () => (isEdit ? closeEditRepo() : closeAddRepo());

  const [phase, setPhase] = useState<Phase>(isEdit ? "confirm" : "picking");
  const [candidate, setCandidate] = useState<RepoCandidate | null>(
    editing ? { name: editing.name, path: editing.path, branch: editing.branch, remote: editing.remote } : null,
  );
  const [error, setError] = useState("");
  const [owner, setOwner] = useState(editing?.owner || activeId || accounts[0]?.id || "");
  const [saving, setSaving] = useState(false);
  const startedRef = useRef(false);

  async function pick() {
    setPhase("picking");
    setError("");
    const path = await pickRepoFolder();
    if (path === null) {
      close();
      return;
    }
    try {
      const found = await validateRepo(path);
      setCandidate(found);
      setPhase("confirm");
    } catch (e) {
      setError(String(e));
      setPhase("error");
    }
  }

  // In add mode, open the native folder picker as soon as the modal mounts (once).
  useEffect(() => {
    if (isEdit || startedRef.current) return;
    startedRef.current = true;
    pick();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function confirm() {
    if (!candidate || !owner) return;
    setSaving(true);
    try {
      if (isEdit && editing) {
        await updateRepo({ ...editing, owner });
        showToast({
          title: `Updated ${editing.name}`,
          sub: "Linked identity changed",
          color: accounts.find((a) => a.id === owner)?.color,
        });
      } else {
        const repo: Repo = {
          id: slugId(candidate.name),
          name: candidate.name,
          owner,
          branch: candidate.branch,
          path: candidate.path,
          remote: candidate.remote,
        };
        await addRepo(repo);
        showToast({ title: `Added ${repo.name}`, sub: repo.path, color: accounts.find((a) => a.id === owner)?.color });
      }
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
          <IcRepo s={16} />
        </span>
        <span className="text-[14px] font-semibold text-text">
          {isEdit ? "Edit repository" : "Add local repository"}
        </span>
        <button
          className="ml-auto grid place-items-center w-7 h-7 rounded-lg text-text-3 hover:bg-surface-2 hover:text-text transition-colors"
          onClick={close}
        >
          <IcX s={15} />
        </button>
      </div>

      {phase === "picking" && (
        <div className="px-5 py-8 text-center text-[13px] text-text-3">Opening folder picker…</div>
      )}

      {phase === "error" && (
        <>
          <div className="px-5 py-5">
            <div className="rounded-xl border border-red/30 bg-red/8 px-4 py-3.5 text-[13px] text-red leading-relaxed">
              {error}
            </div>
          </div>
          <div className="flex justify-end gap-2 px-5 py-4 border-t border-border-soft">
            <Button variant="ghost" onClick={close}>
              Cancel
            </Button>
            <Button
              className="px-4 py-2.25 rounded-lg text-[13px]"
              onClick={isEdit ? () => setPhase("confirm") : pick}
            >
              {isEdit ? "Back" : "Choose another folder"}
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
              disabled={saving || !owner || (isEdit && owner === editing?.owner)}
              onClick={confirm}
            >
              {saving ? "Saving…" : isEdit ? "Save changes" : "Add repository"}
            </Button>
          </div>
        </>
      )}
    </Modal>
  );
}
