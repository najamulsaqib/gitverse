import { type SelectHTMLAttributes } from "react";
import { IcChevron } from "@/components/shared/icons";

/**
 * Form select styled to match {@link Input} exactly — `appearance-none` drops
 * the native control so the height/padding line up, with our own chevron.
 */
export function Select({ className = "", children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select
        className={`w-full appearance-none bg-bg border border-border rounded-lg pl-2.75 pr-8 py-2.25 text-[13px] text-text outline-none transition-colors focus:border-indigo ${className}`}
        {...props}
      >
        {children}
      </select>
      <IcChevron
        s={14}
        className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-text-3"
      />
    </div>
  );
}
