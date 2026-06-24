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
 *  2. On every popstate it re-pushes the sentinel, so Back is a no-op while this
 *     page is mounted. The url never changes, so Next's router treats it as the
 *     same route and doesn't navigate.
 *
 * Use only on genuine root/entry pages where Back should not leave the app.
 */
export function useRootBackGuard(): void {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.history.pushState(null, '', window.location.href);
    const onPopState = () => {
      window.history.pushState(null, '', window.location.href);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);
}
