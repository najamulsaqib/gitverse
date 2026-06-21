import { useEffect, useState } from "react";
import { getRepoView } from "@/hooks/useRepo";
import { useProfilesStore } from "@/store/profiles";
import { useReposStore } from "@/store/repos";
import type { RepoOwnerView } from "@/types";

/** The current repo resolved with its owner, computed on the backend.
 *
 * Re-resolves when the repo switches or when the repo/account lists change
 * (e.g. the owner is reassigned). The previous view is kept while a new one
 * loads so the toolbar doesn't blank out on every repo switch. */
export function useRepoView(id: string): RepoOwnerView | null {
  const repos = useReposStore((s) => s.repos);
  const accounts = useProfilesStore((s) => s.accounts);
  const [view, setView] = useState<RepoOwnerView | null>(null);

  useEffect(() => {
    if (!id) {
      setView(null);
      return;
    }
    let alive = true;
    getRepoView(id)
      .then((v) => {
        if (alive) setView(v);
      })
      .catch(() => {
        /* leave the last good view in place on transient errors */
      });
    return () => {
      alive = false;
    };
  }, [id, repos, accounts]);

  return view;
}
