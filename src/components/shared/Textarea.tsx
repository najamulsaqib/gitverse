import { type TextareaHTMLAttributes } from "react";
import { inputSurface } from "@/components/shared/Input";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  surface?: "bg" | "surface" | "surface-2";
}

/** Multi-line counterpart to {@link Input}, sharing its border/focus styling. */
export function Textarea({ surface = "bg", className = "", ...props }: TextareaProps) {
  return (
    <textarea
      className={`border border-border rounded-lg px-2.75 py-2.25 text-[12.5px] text-text outline-none transition-colors focus:border-indigo resize-none ${inputSurface[surface]} ${className}`}
      {...props}
    />
  );
}
