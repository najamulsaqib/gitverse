import { useEffect, useState } from "react";
import { IcBranch, IcCheck, IcX } from "@/components/shared/icons";
import { Button } from "@/components/shared/Button";
import { Modal } from "@/components/shared/Modal";
import { gitDefaultBranch } from "@/hooks/useGit";
import { useReposStore } from "@/store/repos";
import { useUiStore } from "@/store/ui";

export function NewBranchModal() {
  const newBranch = useUiStore((s) => s.newBranch);
  const closeNewBranch = useUiStore((s) => s.closeNewBranch);
  const createBranch = useReposStore((s) => s.createBranch);
  const repos = useReposStore((s) => s.repos);
  const repoId = useReposStore((s) => s.repoId);
  const branches = useReposStore((s) => s.branchesByRepo[repoId]) ?? [];
  const currentBranch = useReposStore((s) => s.branchByRepo[repoId]);

  const repo = repos.find((r) => r.id === repoId);
  const current = currentBranch ?? branches.find((b) => b.current)?.name ?? "";

  const [name, setName] = useState(newBranch?.name ?? "");
  const [defaultBranch, setDefaultBranch] = useState("");
  const [base, setBase] = useState<"default" | "current">("default");
  const [creating, setCreating] = useState(false);

  // Resolve the repo's default branch; fall back to the current branch as base.
  useEffect(() => {
    if (!repo) return;
    let alive = true;
    gitDefaultBranch(repo.path)
      .then((b) => alive && setDefaultBranch(b))
      .catch(() => alive && setBase("current"));
    return () => {
      alive = false;
    };
  }, [repo?.path]);

  const trimmed = name.trim();
  const exists = branches.some((b) => b.name === trimmed);
  const baseName = base === "default" ? defaultBranch || current : current;
  const canCreate = !!trimmed && !exists && !!baseName && !creating;

  async function create() {
    if (!canCreate) return;
    setCreating(true);
    await createBranch(trimmed, baseName);
    closeNewBranch();
  }

  const Option = ({ value, label, branch }: { value: "default" | "current"; label: string; branch: string }) => (
    <button
      type="button"
      onClick={() => setBase(value)}
      className={`flex items-center gap-2.5 w-full px-3 py-2.5 rounded-lg border text-left transition-colors ${base === value ? "border-indigo bg-indigo/10" : "border-border hover:bg-surface-2"
        }`}
    >
      <span className="grid place-items-center flex-none text-text-2">
        <IcBranch s={14} />
      </span>
      <span className="flex flex-col min-w-0">
        <span className="text-[11px] text-text-3 font-medium">{label}</span>
        <span className="text-[13px] font-semibold text-text truncate">{branch || "—"}</span>
      </span>
      {base === value && <IcCheck s={15} className="ml-auto text-indigo-light flex-none" />}
    </button>
  );

  return (
    <Modal onClose={closeNewBranch} className="w-100">
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-border-soft">
        <span className="grid place-items-center text-teal">
          <IcBranch s={16} />
        </span>
        <span className="text-[14px] font-semibold text-text">Create branch</span>
        <button
          className="ml-auto grid place-items-center w-7 h-7 rounded-lg text-text-3 hover:bg-surface-2 hover:text-text transition-colors"
          onClick={closeNewBranch}
        >
          <IcX s={15} />
        </button>
      </div>

      <div className="px-5 py-5 space-y-4">
        <div className="space-y-1.5">
          <label className="text-[12px] text-text-3 font-medium">Branch name</label>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && create()}
            placeholder="feature/my-branch"
            className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2.25 text-[13px] text-text outline-none focus:border-indigo"
          />
          {exists && <div className="text-[12px] text-red">A branch named “{trimmed}” already exists.</div>}
        </div>

        <div className="space-y-1.5">
          <span className="text-[12px] text-text-3 font-medium">Create from</span>
          <div className="space-y-2">
            <Option value="default" label="Default branch" branch={defaultBranch} />
            <Option value="current" label="Current branch" branch={current} />
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2 px-5 py-4 border-t border-border-soft">
        <Button variant="ghost" onClick={closeNewBranch}>
          Cancel
        </Button>
        <Button className="px-4 py-2.25 rounded-lg text-[13px]" disabled={!canCreate} onClick={create}>
          {creating ? "Creating…" : "Create branch"}
        </Button>
      </div>
    </Modal>
  );
}
