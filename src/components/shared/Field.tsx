import { type ReactNode } from "react";

/** Label + control wrapper used by the profile forms. */
export function Field({
  label,
  className = "",
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={`flex flex-col gap-1.5 ${className}`}>
      <span className="text-[12px] font-medium text-text-2">{label}</span>
      {children}
    </label>
  );
}
