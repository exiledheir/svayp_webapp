import { useEffect } from 'react';

/**
 * Traps the browser / hardware Back gesture on a root tab page (Market, Closet,
 * …) so it doesn't pop the WebView's history off the app entirely — which shows
 * up as a blank "black screen".
 *
 * How it works:
 *  1. On mount it pushes a sentinel history entry with the SAME url. Inside the
 *     native WebView this makes `canGoBack()` true, so the OS routes a Back press
 *     INTO the page (a popstate) instead of exiting the WebView.
 *  2. On every popstate it re-pushes the sentinel, so Back stays on this page
 *     while it's mounted. The url never changes, so it doesn't leave the tab.
 *
 * The sentinel reuses Next's CURRENT `history.state` (never `null`). A `null`
 * state would lack Next's `__N` marker, and once the user navigated to a child
 * page (e.g. a listing detail) the buried sentinel would break that page's Back
 * button: Next's popstate handler ignores marker-less entries, so Back landed on
 * it and did nothing. Cloning the live state keeps the entry a valid Next route.
 *
 * Use only on genuine root/entry pages where Back should not leave the app.
 */
export function useRootBackGuard(): void {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    // Marker read by the native shell's Back handler: while a tab-root page is
    // mounted (and no overlay is open — see use-overlay-back-close), Back should
    // fall through to native tab-switch / app-exit instead of history.back().
    (window as unknown as { __svaypTabRoot?: boolean }).__svaypTabRoot = true;
    const seed = () => window.history.pushState(window.history.state, '', window.location.href);
    seed();
    const onPopState = () => seed();
    window.addEventListener('popstate', onPopState);
    return () => {
      (window as unknown as { __svaypTabRoot?: boolean }).__svaypTabRoot = false;
      window.removeEventListener('popstate', onPopState);
    };
  }, []);
}
