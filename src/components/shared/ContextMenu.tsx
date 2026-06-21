import { useEffect, useRef, type ReactNode } from "react";

export interface ContextMenuItem {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  variant?: "default" | "danger";
  /** Render a divider above this item to group related actions. */
  separatorBefore?: boolean;
}

interface ContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

export function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="fixed z-70 min-w-46 w-max max-w-80 bg-surface border border-border rounded-xl shadow-[0_24px_60px_-18px_rgba(0,0,0,0.7)] overflow-hidden animate-pop p-1.5"
      style={{ left: x, top: y }}
    >
      {items.map((item, i) => (
        <div key={i}>
          {item.separatorBefore && <div className="my-1 -mx-1.5 border-t border-border-soft" />}
          <button
            className={`flex items-center gap-2.25 w-full px-2.5 py-2 rounded-lg text-[13px] whitespace-nowrap transition-colors duration-100 ${item.variant === "danger" ? "text-red hover:bg-red/10" : "text-text-2 hover:bg-surface-2 hover:text-text"}`}
            onClick={item.onClick}
          >
            {item.icon}
            {item.label}
          </button>
        </div>
      ))}
    </div>
  );
}
