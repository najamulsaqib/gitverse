// GitVerse — small geometric icon set, ported from the Claude Design prototype.

interface IconProps {
  s?: number;
  sw?: number;
  className?: string;
}

interface BaseIconProps extends IconProps {
  d?: string;
  fill?: string;
  vb?: number;
  children?: React.ReactNode;
}

function I({ d, s = 16, sw = 1.6, fill = "none", children, vb = 16, className }: BaseIconProps) {
  return (
    <svg
      width={s}
      height={s}
      viewBox={`0 0 ${vb} ${vb}`}
      fill={fill}
      stroke={fill === "none" ? "currentColor" : "none"}
      strokeWidth={sw}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {d ? <path d={d} /> : children}
    </svg>
  );
}

export const IcRepo = (p: IconProps) => <I {...p} d="M3 2.5h7.5a2 2 0 0 1 2 2V13.5H4.5a1.5 1.5 0 0 0-1.5 1.5V2.5Zm0 11A1.5 1.5 0 0 0 4.5 12h8" />;

export const IcBranch = (p: IconProps) => (
  <I {...p}>
    <circle cx="4" cy="3.5" r="1.6" />
    <circle cx="4" cy="12.5" r="1.6" />
    <circle cx="12" cy="5" r="1.6" />
    <path d="M4 5.1v5.8M5.6 4.4C8 4.4 12 4 12 6.6c0 2.4-3 2.4-5 2.4" />
  </I>
);

export const IcSync = (p: IconProps) => (
  <I {...p}>
    <path d="M13.5 7a5.5 5.5 0 0 0-9.4-3.4M2.5 9a5.5 5.5 0 0 0 9.4 3.4" />
    <path d="M11.2 1.8 13.6 3 12.4 5.4M4.8 14.2 2.4 13l1.2-2.4" />
  </I>
);

export const IcChevron = (p: IconProps) => <I {...p} d="M4 6l4 4 4-4" />;
export const IcCheck = (p: IconProps) => <I {...p} d="M3.5 8.5l3 3 6-7" />;
export const IcPlus = (p: IconProps) => <I {...p} d="M8 3.5v9M3.5 8h9" />;
export const IcFilter = (p: IconProps) => <I {...p} d="M2.5 4h11M4.5 8h7M6.5 12h3" />;

export const IcLock = (p: IconProps) => (
  <I {...p}>
    <rect x="3.5" y="7" width="9" height="6.5" rx="1.3" />
    <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" />
  </I>
);

export const IcGlobe = (p: IconProps) => (
  <I {...p}>
    <circle cx="8" cy="8" r="5.5" />
    <path d="M2.5 8h11M8 2.5c1.6 1.5 2.4 3.4 2.4 5.5S9.6 12 8 13.5C6.4 12 5.6 10.1 5.6 8S6.4 3.5 8 2.5Z" />
  </I>
);

export const IcCopy = (p: IconProps) => (
  <I {...p}>
    <rect x="5" y="5" width="8" height="8" rx="1.4" />
    <path d="M11 5V3.6A1.6 1.6 0 0 0 9.4 2H4.6A1.6 1.6 0 0 0 3 3.6v4.8A1.6 1.6 0 0 0 4.6 10H5" />
  </I>
);

export const IcKey = (p: IconProps) => (
  <I {...p}>
    <circle cx="5.5" cy="5.5" r="2.8" />
    <path d="M7.6 7.6 13 13M11 11l1.4-1.4M9.6 9.6 11 8.2" />
  </I>
);

export const IcArrowUp = (p: IconProps) => <I {...p} d="M8 12.5v-9M4 7.5l4-4 4 4" />;
export const IcArrowDn = (p: IconProps) => <I {...p} d="M8 3.5v9M4 8.5l4 4 4-4" />;
export const IcX = (p: IconProps) => <I {...p} d="M4 4l8 8M12 4l-8 8" />;

export const IcUndo = (p: IconProps) => (
  <I {...p}>
    <path d="M5 6H3V4M3 6a5 5 0 1 1-1 3" />
  </I>
);

export const IcDot = ({ s = 8, color = "currentColor" }: { s?: number; color?: string }) => (
  <svg width={s} height={s} viewBox="0 0 8 8">
    <circle cx="4" cy="4" r="4" fill={color} />
  </svg>
);

export const IcTerminal = (p: IconProps) => (
  <I {...p}>
    <rect x="2" y="3" width="12" height="10" rx="1.5" />
    <path d="M4.5 6.5L6.5 8l-2 1.5M8.5 9.5h3" />
  </I>
);

export const IcSettings = (p: IconProps) => (
  <I {...p}>
    <circle cx="8" cy="8" r="2" />
    <path d="M8 1.5v2M8 12.5v2M14.5 8h-2M3.5 8h-2M12.6 3.4l-1.4 1.4M4.8 11.2l-1.4 1.4M12.6 12.6l-1.4-1.4M4.8 4.8 3.4 3.4" />
  </I>
);
