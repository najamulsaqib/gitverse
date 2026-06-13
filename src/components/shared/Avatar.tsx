import type { Account } from "@/types";

interface AvatarProps {
  acc: Account;
  size?: number;
  active?: boolean;
}

export function Avatar({ acc, size = 38, active }: AvatarProps) {
  return (
    <div
      className="grid place-items-center text-[#0b0a16] font-bold tracking-[0.02em] font-sans select-none"
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.32,
        background: `linear-gradient(150deg, ${acc.color}, ${acc.color}cc)`,
        boxShadow: active ? `0 0 0 2px var(--color-bg), 0 0 0 4px ${acc.color}` : "none",
        fontSize: size * 0.34,
      }}
    >
      {acc.initials}
    </div>
  );
}
