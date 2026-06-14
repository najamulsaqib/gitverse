import { type ButtonHTMLAttributes } from "react";

export function IconButton({ className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={`grid place-items-center transition-colors ${className}`} {...props} />;
}
