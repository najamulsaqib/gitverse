import { useEffect, useState } from "react";
import type { ToastMessage } from "@/types";

export function Toast({ toast }: { toast: ToastMessage | null }) {
  const [shown, setShown] = useState<ToastMessage | null>(toast);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (toast) {
      setShown(toast);
      setClosing(false);
    } else if (shown) {
      setClosing(true);
    }
  }, [toast, shown]);

  if (!shown) return null;

  return (
    <div className="absolute bottom-4.5 left-1/2 -translate-x-1/2 z-60">
      <div
        key={shown.id}
        className={`flex items-center gap-2.75 bg-surface border border-border rounded-[11px] py-2.75 pr-4 pl-3.25 shadow-[0_20px_50px_-16px_rgba(0,0,0,0.8)] min-w-70 max-w-110 origin-bottom ${closing ? "animate-toast-out" : "animate-toast-in"
          }`}
        onAnimationEnd={() => {
          if (closing) setShown(null);
        }}
      >
        <span
          className="w-2.25 h-2.25 rounded-full flex-none shadow-[0_0_10px_1px_currentColor]"
          style={{ background: shown.color || "var(--color-teal)" }}
        />
        <div>
          <div className="text-[13px] font-semibold">{shown.title}</div>
          {shown.sub && <div className="text-[11.5px] text-text-3 mt-0.5 font-mono">{shown.sub}</div>}
        </div>
      </div>
    </div>
  );
}
