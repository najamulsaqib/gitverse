import { memo, useCallback } from "react";
import { ROW_H, type RowLayout } from "@/components/LogGraph/graph";
import { IcBranch } from "@/components/shared/icons";
import type { Account, Commit } from "@/types";

interface CommitRowProps {
  commit: Commit;
  row: RowLayout;
  hash: string;
  account?: Account;
  top: number;
  selected: boolean;
  onSelect: (hash: string) => void;
  onContextMenu: (hash: string, x: number, y: number) => void;
}

function CommitRowImpl({
  commit,
  row,
  hash,
  account,
  top,
  selected,
  onSelect,
  onContextMenu,
}: CommitRowProps) {
  const author = account?.name ?? commit.by;
  const color = row.node.color;
  const tip = `${commit.subject}\n\n${author}${account ? ` <${account.email}>` : ""}\n${commit.when} · ${commit.hash.slice(0, 7)}${commit.flag && account ? `\n⚠ committed as ${account.label}, not this repo's owner` : ""
    }`;

  const handleClick = useCallback(() => onSelect(hash), [hash, onSelect]);
  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      onContextMenu(hash, e.clientX, e.clientY);
    },
    [hash, onContextMenu],
  );

  return (
    <div
      className="absolute left-0 right-0 flex items-center pr-4 pl-2 cursor-pointer transition-all duration-150 border-b border-white/1 group"
      style={{ top, height: ROW_H, contain: "layout paint" }}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      title={tip}
    >
      {/* Rounded selection and hover background */}
      <div
        className={`absolute inset-y-0 left-1.5 right-1.5 rounded-[7px] transition-all duration-150 -z-10 ${selected
          ? "bg-indigo/13"
          : "group-hover:bg-surface-2"
          }`}
      />
      {selected && (
        <span
          className="absolute left-1.5 inset-y-0 w-0.75 rounded-l-[7px]"
          style={{
            background: color,
            boxShadow: `0 0 12px 1.5px ${color}`
          }}
        />
      )}
      <span className="flex-none" style={{ width: row.width }} aria-hidden="true" />

      <div className="flex items-center gap-2 min-w-0 flex-1 h-full py-1">
        {(commit.refs || []).map((r) => (
          <span
            key={r.name}
            className="inline-flex items-center gap-1 font-mono text-[10px] font-semibold rounded-md py-0.5 px-2 whitespace-nowrap flex-none leading-normal shadow-sm"
            style={{
              color,
              background: `color-mix(in srgb, ${color} 12%, transparent)`,
              border: `1px solid color-mix(in srgb, ${color} 28%, transparent)`,
            }}
          >
            {r.head ? (
              <span
                className="text-[7.5px] font-black rounded px-1 py-0.5 tracking-wider uppercase leading-none"
                style={{ background: color, color: "#0c0b1a" }}
              >
                HEAD
              </span>
            ) : (
              <IcBranch s={10} sw={2} className="opacity-80" />
            )}
            <span className="truncate max-w-30">{r.name}</span>
          </span>
        ))}
        <span
          className={`min-w-0 truncate text-[12.5px] leading-none ${selected
            ? "text-text font-semibold tracking-wide"
            : "text-text-2 hover:text-text transition-colors duration-150"
            }`}
        >
          {commit.subject}
        </span>

        <span className="text-[11px] text-text-3 font-medium truncate trun max-w-35 tracking-wide">
          {author}
        </span>
      </div>
    </div>
  );
}

export const CommitRow = memo(CommitRowImpl);
