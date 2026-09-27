/**
 * useIsMobile — returns true when the viewport is narrower than the lg breakpoint (1024px).
 * Uses matchMedia so it reacts to resize without polling.
 */
import { useState, useEffect } from 'react';

const MOBILE_BREAKPOINT = 1024;

export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(
    () => window.innerWidth < MOBILE_BREAKPOINT
  );

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return isMobile;
}
