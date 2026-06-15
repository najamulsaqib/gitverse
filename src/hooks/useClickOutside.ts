import { useEffect, useRef } from "react";

// Calls `onOutside` when a mousedown lands outside the returned ref's element.
// Mirrors the dismissal pattern used by ContextMenu, shared so dropdowns don't
// reimplement it.
export function useClickOutside<T extends HTMLElement>(onOutside: () => void) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onOutside();
      }
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [onOutside]);

  return ref;
}
