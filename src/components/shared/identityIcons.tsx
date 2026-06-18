// Identity avatar icons — the GitVerse mark (default) plus a curated set of
// selectable lucide glyphs. Replaces the old initials on each Account.

import {
  Anchor,
  Bot,
  Briefcase,
  Cat,
  Cloud,
  Code,
  Coffee,
  Compass,
  Crown,
  Flame,
  Gem,
  Ghost,
  Globe,
  Heart,
  Leaf,
  Moon,
  Rocket,
  Shield,
  Sparkles,
  Star,
  Terminal,
  User,
  Zap,
  type LucideIcon,
} from "lucide-react";

/** Stored on `Account.icon`. Empty / unknown values fall back to this. */
export const DEFAULT_IDENTITY_ICON = "gitverse";

const LUCIDE_ICONS: Record<string, LucideIcon> = {
  user: User,
  briefcase: Briefcase,
  code: Code,
  terminal: Terminal,
  rocket: Rocket,
  bot: Bot,
  ghost: Ghost,
  cat: Cat,
  heart: Heart,
  star: Star,
  sparkles: Sparkles,
  gem: Gem,
  crown: Crown,
  zap: Zap,
  flame: Flame,
  coffee: Coffee,
  leaf: Leaf,
  cloud: Cloud,
  moon: Moon,
  globe: Globe,
  compass: Compass,
  anchor: Anchor,
  shield: Shield,
};

/** All selectable icon keys, GitVerse mark first. */
export const IDENTITY_ICON_KEYS = [DEFAULT_IDENTITY_ICON, ...Object.keys(LUCIDE_ICONS)];

/** Monochrome GitVerse mark (foreground colour), shaped like public/mark.svg. */
function GitVerseMark({ s = 18 }: { s?: number }) {
  return (
    <svg width={s} height={s} viewBox="0 0 120 120" fill="none" aria-hidden="true">
      <g stroke="currentColor" strokeWidth={8} strokeLinecap="round">
        <path d="M40 28 V92" />
        <path d="M40 46 H80 V70" />
      </g>
      <circle cx="40" cy="28" r="10" fill="currentColor" />
      <circle cx="80" cy="46" r="9.5" fill="currentColor" />
      <circle cx="80" cy="70" r="9" fill="currentColor" />
      <circle cx="40" cy="92" r="10" fill="currentColor" />
    </svg>
  );
}

/** Renders the icon for a given key in the current foreground colour. */
export function IdentityIcon({ icon, s = 18 }: { icon?: string; s?: number }) {
  const Lucide = icon ? LUCIDE_ICONS[icon] : undefined;
  if (!Lucide) return <GitVerseMark s={s} />;
  return <Lucide size={s} strokeWidth={2} aria-hidden="true" />;
}

/** Swatch grid for choosing an identity icon; selected one previews on accent. */
export function IdentityIconPicker({
  value,
  color,
  onChange,
}: {
  value: string;
  color: string;
  onChange: (key: string) => void;
}) {
  return (
    <div className="grid grid-cols-8 gap-1.75">
      {IDENTITY_ICON_KEYS.map((k) => {
        const selected = k === value;
        return (
          <button
            key={k}
            type="button"
            className={`aspect-square rounded-[9px] grid place-items-center border-2 transition-all ${selected
              ? "border-text text-[#0b0a16] scale-[1.08]"
              : "border-transparent bg-surface-2 text-text-3 hover:text-text"
              }`}
            style={selected ? { background: `linear-gradient(150deg, ${color}, ${color}cc)` } : undefined}
            onClick={() => onChange(k)}
          >
            <IdentityIcon icon={k} s={23} />
          </button>
        );
      })}
    </div>
  );
}
