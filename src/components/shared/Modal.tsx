import { type ReactNode } from "react";

interface ModalProps {
  onClose?: () => void;
  className?: string;
  children: ReactNode;
}

export function Modal({ onClose, className = "", children }: ModalProps) {
  return (
    <div
      className="absolute inset-0 z-80 bg-[rgba(6,5,12,0.62)] backdrop-blur-[3px] grid place-items-center animate-fade-in"
      onMouseDown={onClose}
    >
      <div
        className={`bg-surface border border-border rounded-2xl overflow-hidden shadow-[0_50px_120px_-30px_rgba(0,0,0,0.85)] animate-pop ${className}`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
