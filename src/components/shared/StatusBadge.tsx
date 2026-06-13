import type { FileStatus } from "@/types";

const STYLES: Record<FileStatus, string> = {
  M: "text-amber bg-amber/[0.14]",
  A: "text-teal bg-teal/[0.14]",
  D: "text-red bg-red/[0.14]",
};

export function StatusBadge({ status }: { status: FileStatus }) {
  return (
    <span
      className={`flex-none w-4.25 h-4.25 rounded-sm grid place-items-center text-[10px] font-bold font-mono ${STYLES[status] ?? STYLES.M}`}
    >
      {status}
    </span>
  );
}
