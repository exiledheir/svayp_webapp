import { useEffect, useRef } from 'react';

/**
 * Makes the browser / hardware Back gesture close a full-screen overlay
 * (canvas, try-on, sheets) instead of navigating the page away.
 *
 * While `open` is true it pushes a history entry with the SAME url, so the
 * next Back press lands on this page as a popstate — which we translate into
 * `onClose()`. Composes with useRootBackGuard: the guard re-seeds its sentinel
 * on the same popstate, so history stays trapped on the tab root while the
 * overlay simply closes.
 *
 * Closing the overlay via its own UI (X / save) leaves the pushed entry in
 * history — harmless under the root guard, which absorbs stray Back presses.
 */
export function useOverlayBackClose(open: boolean, onClose: () => void): void {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open || typeof window === 'undefined') return;
    // Overlay counter read by the native shell's Back handler: while any overlay
    // is open, Back must go through history.back() (which closes it) even on a
    // tab-root page.
    const w = window as unknown as { __svaypOverlays?: number };
    w.__svaypOverlays = (w.__svaypOverlays ?? 0) + 1;
    // Same-url entry: Back now pops this instead of leaving the page.
    window.history.pushState(window.history.state, '', window.location.href);
    const onPop = () => closeRef.current();
    window.addEventListener('popstate', onPop);
    return () => {
      w.__svaypOverlays = Math.max(0, (w.__svaypOverlays ?? 1) - 1);
      window.removeEventListener('popstate', onPop);
    };
  }, [open]);
}
