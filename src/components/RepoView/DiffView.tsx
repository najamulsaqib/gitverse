import { useEffect, useRef, useState } from "react";
import { hl } from "@/components/shared/highlight";
import type { DiffLine, FileStatus } from "@/types";

interface DiffViewProps {
  path: string;
  status: FileStatus;
  add: number;
  del: number;
  diff: DiffLine[];
}

function fileName(p: string) {
  const i = p.lastIndexOf("/");
  return { dir: i >= 0 ? p.slice(0, i + 1) : "", base: i >= 0 ? p.slice(i + 1) : p };
}

/**
 * Render diffs in chunks instead of all at once — a large diff would freeze
 * the DOM. We paint CHUNK rows immediately and append another CHUNK each time the
 * bottom sentinel scrolls into view (à la GitHub Desktop), so files of any size
 * stay responsive.
 */
const CHUNK = 500;

/**
 * Progressively grow `count` toward `total` as `sentinel` scrolls into view.
 * Resets to one chunk whenever `resetKey` changes (e.g. a new file selected).
 */
function useProgressiveCount(total: number, resetKey: unknown) {
  const [count, setCount] = useState(CHUNK);
  const sentinel = useRef<HTMLDivElement>(null);

  useEffect(() => setCount(CHUNK), [resetKey]);

  useEffect(() => {
    if (count >= total) return;
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) setCount((c) => Math.min(c + CHUNK, total));
    });
    io.observe(el);
    return () => io.disconnect();
  }, [count, total]);

  return { count, sentinel };
}

function DiffRow({ line }: { line: DiffLine }) {
  if (line.t === "hunk") {
    return (
      <div className="flex items-start min-h-5.25 pr-4.5 bg-indigo/6 my-1.25">
        <span className="flex-none w-7.5 text-center text-[#4a4670] select-none text-[11px]" />
        <span className="flex-none w-7.5 text-center text-[#4a4670] select-none text-[11px]" />
        <span className="flex-1 whitespace-pre-wrap wrap-break-word pl-1.5 text-indigo-light opacity-80">{line.a}</span>
      </div>
    );
  }
  const sign = line.t === "add" ? "+" : line.t === "del" ? "-" : "";
  const rowBg = line.t === "add" ? "bg-teal/[0.07]" : line.t === "del" ? "bg-red/[0.07]" : "";
  const signColor = line.t === "add" ? "text-teal" : line.t === "del" ? "text-red" : "text-[#4a4670]";
  return (
    <div className={`flex items-start min-h-5.25 pr-4.5 ${rowBg}`}>
      <span className={`flex-none w-7.5 text-center select-none text-[11px] font-semibold ${signColor}`}>{sign}</span>
      <span
        className="flex-1 whitespace-pre-wrap wrap-break-word pl-1.5 text-text-2"
        dangerouslySetInnerHTML={{ __html: hl(line.n ?? "") }}
      />
    </div>
  );
}

export function DiffView({ path, status, add, del, diff }: DiffViewProps) {
  const { dir, base } = fileName(path);
  const { count, sentinel } = useProgressiveCount(diff.length, path);
  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex items-center gap-3 px-4.5 py-3 border-b border-border-soft bg-[#13111f] flex-none">
        <div className="text-[13px] font-mono text-text-2">
          <span className="text-text-3">{dir}</span>
          <strong className="text-text font-semibold">{base}</strong>
        </div>
        <div className="ml-auto flex items-center gap-3 font-mono text-[12px]">
          <span className="text-teal">+{add}</span>
          <span className="text-red">−{del}</span>
          <span className="font-sans text-[11px] text-text-3 border border-border px-2.25 py-0.5 rounded-full">
            {status === "A" ? "Added" : status === "D" ? "Deleted" : "Modified"}
          </span>
        </div>
      </div>
      <div className="flex-1 overflow-auto font-mono text-[12.5px] leading-[1.7] py-2 select-text">
        {diff.slice(0, count).map((l, i) => (
          <DiffRow key={i} line={l} />
        ))}
        {count < diff.length && (
          <div
            ref={sentinel}
            className="font-sans text-[12px] text-text-3 text-center px-4 py-4 mt-1.5 border-t border-border-soft"
          >
            Loading more… {count.toLocaleString()} of {diff.length.toLocaleString()} lines
          </div>
        )}
      </div>
    </div>
  );
}
