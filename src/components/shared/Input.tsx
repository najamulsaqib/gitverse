import { type InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  inputSize?: "md" | "sm";
  surface?: "bg" | "surface" | "surface-2";
  /** "box" is the bordered field; "ghost" is a transparent inline filter. */
  variant?: "box" | "ghost";
}

export const inputSurface: Record<NonNullable<InputProps["surface"]>, string> = {
  bg: "bg-bg",
  surface: "bg-surface",
  "surface-2": "bg-surface-2",
};

const textBySize: Record<NonNullable<InputProps["inputSize"]>, string> = {
  md: "text-[13px]",
  sm: "text-[12.5px]",
};

const boxBySize: Record<NonNullable<InputProps["inputSize"]>, string> = {
  md: "rounded-lg px-2.75 py-2.25",
  sm: "rounded-[7px] px-2.5 py-1.5",
};

/** Standard form text input — the single source of truth for input styling. */
export function Input({
  inputSize = "md",
  surface = "bg",
  variant = "box",
  className = "",
  ...props
}: InputProps) {
  const base =
    variant === "ghost"
      ? "bg-transparent border-none placeholder:text-text-3"
      : `border border-border focus:border-indigo ${inputSurface[surface]} ${boxBySize[inputSize]}`;
  return (
    <input
      className={`text-text outline-none transition-colors ${textBySize[inputSize]} ${base} ${className}`}
      {...props}
    />
  );
}
