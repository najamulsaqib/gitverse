// GitVerse — icon set, built on lucide-react (https://lucide.dev/icons/).

import {
  ArrowDown,
  ArrowUp,
  Check,
  ChevronDown,
  Circle,
  Cloud,
  Copy,
  Filter,
  FolderOpen,
  FolderGit2,
  GitBranch,
  Globe,
  KeyRound,
  Lock,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Terminal,
  Trash2,
  TriangleAlert,
  Undo2,
  UserPlus,
  X,
  SquareCode,
  type LucideIcon,
} from "lucide-react";

interface IconProps {
  s?: number;
  sw?: number;
  className?: string;
}

function icon(Lucide: LucideIcon) {
  return ({ s = 16, sw = 1.6, className }: IconProps) => (
    <Lucide size={s} strokeWidth={sw} className={className} aria-hidden="true" />
  );
}

export const IcRepo = icon(FolderGit2);
export const IcFolderOpen = icon(FolderOpen);
export const IcEditor = icon(SquareCode);
export const IcBranch = icon(GitBranch);
export const IcSync = icon(RefreshCw);
export const IcChevron = icon(ChevronDown);
export const IcCheck = icon(Check);
export const IcPlus = icon(Plus);
export const IcFilter = icon(Filter);
export const IcSearch = icon(Search);
export const IcLock = icon(Lock);
export const IcGlobe = icon(Globe);
export const IcCloud = icon(Cloud);
export const IcCopy = icon(Copy);
export const IcKey = icon(KeyRound);
export const IcArrowUp = icon(ArrowUp);
export const IcArrowDn = icon(ArrowDown);
export const IcX = icon(X);
export const IcUndo = icon(Undo2);
export const IcTerminal = icon(Terminal);
export const IcSettings = icon(Settings);
export const IcUserPlus = icon(UserPlus);
export const IcEdit = icon(Pencil);
export const IcTrash = icon(Trash2);
export const IcAlert = icon(TriangleAlert);

export const IcDot = ({ s = 8, color = "currentColor" }: { s?: number; color?: string }) => (
  <Circle size={s} fill={color} stroke="none" aria-hidden="true" />
);
