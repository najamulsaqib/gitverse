import { type ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "ghost";
}

const variantClasses: Record<string, string> = {
  primary:
    "bg-linear-to-b from-indigo to-[#6a61dd] text-white font-semibold transition-all shadow-[0_6px_18px_-8px_rgba(123,114,232,0.8)] enabled:hover:brightness-110 disabled:bg-none disabled:bg-surface-2 disabled:text-text-3 disabled:shadow-none disabled:cursor-not-allowed",
  ghost: "px-4 py-2.25 rounded-lg text-[13px] font-semibold text-text-2 transition-colors hover:bg-surface-2 hover:text-text",
};

export function Button({ variant = "primary", className = "", ...props }: ButtonProps) {
  return <button className={`${variantClasses[variant]} ${className}`} {...props} />;
}
