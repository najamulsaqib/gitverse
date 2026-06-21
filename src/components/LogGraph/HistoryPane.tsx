import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { CommitRow } from "@/components/LogGraph/CommitRow";
import { GraphCanvas } from "@/components/LogGraph/GraphCanvas";
import { buildGraph, ROW_H } from "@/components/LogGraph/graph";
import { useProfilesStore } from "@/store/profiles";
import { useReposStore } from "@/store/repos";
import { useUiStore } from "@/store/ui";

const EMPTY: never[] = [];
/** Rows rendered above/below the viewport. */
const BUFFER = 24;
/** Re-mount rows only when the viewport nears the buffer edge. */
const BUFFER_MARGIN = 8;

interface Range {
  start: number;
  end: number;
}

function visibleRange(scrollTop: number, viewH: number, total: number): Range {
  const visStart = Math.floor(scrollTop / ROW_H);
  const visEnd = Math.ceil((scrollTop + viewH) / ROW_H);
  return {
    start: Math.max(0, visStart - BUFFER),
    end: Math.min(total, visEnd + BUFFER),
  };
}

/** Expand the rendered window only when scrolling close to its edge. */
function nextRange(scrollTop: number, viewH: number, total: number, prev: Range): Range | null {
  const visStart = Math.floor(scrollTop / ROW_H);
  const visEnd = Math.ceil((scrollTop + viewH) / ROW_H);
  if (visStart >= prev.start + BUFFER_MARGIN && visEnd <= prev.end - BUFFER_MARGIN) return null;
  return visibleRange(scrollTop, viewH, total);
}

export function HistoryPane() {
  const accounts = useProfilesStore((s) => s.accounts);
  const repoId = useReposStore((s) => s.repoId);
  const commits = useReposStore((s) => s.historyByRepo[repoId]) ?? EMPTY;
  const selected = useReposStore((s) => s.selCommit);

  const scrollRef = useRef<HTMLDivElement>(null);
  const loading = useRef(false);
  const rangeRef = useRef<Range>({ start: 0, end: 0 });
  const [range, setRange] = useState<Range>({ start: 0, end: 0 });

  const layout = useMemo(() => buildGraph(commits), [commits]);
  const total = commits.length;
  const hasMore = useReposStore((s) => s.hasMoreByRepo[repoId] ?? false);

  const accountById = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);
  const hashes = useMemo(() => commits.map((c) => c.hash), [commits]);

  const applyRange = useCallback((next: Range) => {
    const prev = rangeRef.current;
    if (next.start === prev.start && next.end === prev.end) return;
    rangeRef.current = next;
    setRange(next);
  }, []);

  // Track viewport height and seed the first visible window.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const measure = () => {
      const next = visibleRange(el.scrollTop, el.clientHeight, total);
      applyRange(next);
    };
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    measure();
    return () => ro.disconnect();
  }, [applyRange, total]);

  // Reset scroll when switching repos.
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
    const el = scrollRef.current;
    applyRange(visibleRange(0, el?.clientHeight ?? 0, total));
  }, [repoId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Extend the rendered window when more history arrives (keep scroll position).
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const next = nextRange(el.scrollTop, el.clientHeight, total, rangeRef.current);
    if (next) applyRange(next);
    else if (rangeRef.current.end > total) applyRange(visibleRange(el.scrollTop, el.clientHeight, total));
  }, [total, applyRange]);

  // Passive native scroll — no rAF, no React re-render unless the buffer shifts.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || total === 0) return;

    const onScroll = () => {
      const top = el.scrollTop;
      const next = nextRange(top, el.clientHeight, total, rangeRef.current);
      if (next) applyRange(next);

      const { loadMoreHistory, hasMoreByRepo } = useReposStore.getState();
      const hasMore = hasMoreByRepo[repoId] ?? false;
      if (hasMore && !loading.current && top + el.clientHeight >= el.scrollHeight - ROW_H * 12) {
        loading.current = true;
        loadMoreHistory().finally(() => {
          loading.current = false;
        });
      }
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [repoId, total, applyRange]);

  const onSelect = useCallback((hash: string) => {
    useReposStore.getState().selectCommit(hash);
  }, []);

  const onContextMenu = useCallback((hash: string, x: number, y: number) => {
    useUiStore.getState().openGraphMenu(hash, x, y);
  }, []);

  if (commits.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-2 text-text-3 p-7.5">
        <img src="/placeholder.svg" alt="" width={64} height={64} style={{ opacity: 0.5 }} />
        <div className="text-[14px] font-semibold text-text-2">No commits yet</div>
      </div>
    );
  }

  const { start, end } = range;
  const visible = [];
  for (let i = start; i < end; i++) {
    const c = commits[i];
    visible.push(
      <CommitRow
        key={c.hash}
        commit={c}
        row={layout.rows[i]}
        account={accountById.get(c.by)}
        top={i * ROW_H}
        selected={selected === c.hash}
        onSelect={onSelect}
        onContextMenu={onContextMenu}
        hash={c.hash}
      />,
    );
  }

  return (
    <div ref={scrollRef} className="flex-1 overflow-auto overscroll-contain">
      <div className="relative" style={{ height: total * ROW_H }}>
        {visible}
        <GraphCanvas rows={layout.rows} start={start} end={end} selectedHash={selected} hashes={hashes} />
      </div>
      {hasMore && (
        <div className="flex items-center justify-center gap-2 py-3 text-[11px] text-text-3">
          <span className="w-3 h-3 rounded-full border-2 border-text-3/30 border-t-text-3 animate-spin-fast" />
          Loading more…
        </div>
      )}
    </div>
  );
}
