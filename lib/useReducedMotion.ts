import { useEffect, useState } from "react";

/**
 * Tracks the user's `prefers-reduced-motion` setting, kept current if they
 * toggle it mid-session. Returns false on the server and the first client render
 * (no media access yet), then settles to the real value after mount - so callers
 * default to playing animations and only suppress them once a reduce preference
 * is confirmed.
 */
export function useReducedMotion(): boolean {
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mql.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);
  return reducedMotion;
}
