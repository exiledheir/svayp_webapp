import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import axios from 'axios';
import type { AppProps } from 'next/app';
import { useRouter } from 'next/router';
import { isAuthenticated, saveTokens, getRefreshFromCloud, getUser } from '@/lib/auth';
import { restoreOnboardingFromCloud } from '@/lib/onboarding-storage';
import { I18nProvider } from '@/lib/i18n';
import { ThemeProvider } from '@/lib/theme';
import { FeatureFlagsProvider } from '@/lib/feature-flags-context';
import { initAnalytics, logPageViewEvent } from '@/lib/analytics';
import { initAppEvents, setAppEventsScreen } from '@/lib/app-events';
import '@/styles/globals.css';
import 'react-image-crop/dist/ReactCrop.css';

// Pages that do not require authentication
// Market browsing + posting funnel are public; posting enforces auth in-page
// at the wizard's phone step (so the browse→post funnel stays open).
const PUBLIC_PATHS = new Set(['/auth/phone', '/auth/otp', '/auth/verify-method', '/auth/basic-info', '/auth/telegram/callback', '/auth/partner', '/market', '/market/[id]', '/market/onboarding', '/market/create', '/market/mine', '/market/liked', '/market/chat/[id]', '/feed', '/feed/[username]', '/feed/p/[id]']);

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  // Block rendering until auth check (including CloudStorage restore) is done.
  // This prevents race-condition API calls before we know if the user is authed.
  const [ready, setReady] = useState(false);

  // Initialise Firebase Analytics once on mount (client-only, SSR-safe)
  // Set user identity in Analytics once the auth state is known
  useEffect(() => {
    if (!ready) return;
    // Start the backend app_events sink first: events fired during Firebase
    // init are queued there immediately and buffered for Firebase.
    initAppEvents();
    setAppEventsScreen(router.pathname);

    const user = getUser();
    const userId = user
      ? ((user.id ?? user.userId ?? user.user_id) as string | undefined)
      : undefined;

    // Detect which surface this session is running on
    const context = (() => {
      if (/flutter/i.test(navigator.userAgent)) return 'webview_flutter';
      if (
        typeof window !== 'undefined' &&
        (window as unknown as { Telegram?: { WebApp?: { initData?: string } } })
          .Telegram?.WebApp?.initData
      ) return 'telegram_miniapp';
      return 'browser';
    })();

    // Identity is passed into init so buffered startup events keep attribution.
    initAnalytics({
      userId: userId ? String(userId) : undefined,
      userProperties: { client_context: context },
    });

    // Track page views, deduping the initial route (routeChangeComplete can
    // re-fire for the path we already logged manually).
    let lastLoggedPath: string | null = null;
    const logPageView = (url: string) => {
      if (url === lastLoggedPath) return;
      lastLoggedPath = url;
      setAppEventsScreen(url);
      logPageViewEvent(url);
    };
    logPageView(router.asPath);
    router.events.on('routeChangeComplete', logPageView);
    return () => router.events.off('routeChangeComplete', logPageView);
  }, [ready]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    // Extract auth tokens injected by the Flutter WebView as query params and
    // store them in localStorage before the auth guard runs. This ensures the
    // web app is authenticated on first load without a JS injection timing race.
    const params = new URLSearchParams(window.location.search);
    const token = params.get('auth_token');
    const refresh = params.get('refresh_token');
    if (token) {
      localStorage.setItem('auth_token', token);
      if (refresh) localStorage.setItem('refresh_token', refresh);
      // Strip the tokens from the URL so they are never visible or bookmarked.
      params.delete('auth_token');
      params.delete('refresh_token');
      const newSearch = params.toString();
      const cleanUrl = window.location.pathname + (newSearch ? `?${newSearch}` : '');
      window.history.replaceState({}, '', cleanUrl);
    }

    // Public pages and already-authenticated sessions are ready immediately.
    if (PUBLIC_PATHS.has(router.pathname) || isAuthenticated()) {
      restoreOnboardingFromCloud().finally(() => setReady(true));
      return;
    }

    // Not authenticated — before forcing OTP, try a silent restore via Telegram
    // CloudStorage (survives the Telegram Mini App being closed on iOS/Android).
    (async () => {
      try {
        const rt = await getRefreshFromCloud();
        if (rt) {
          // Exchange the saved refresh token for a fresh access token.
          const res = await axios.post('/proxy/auth/token/refresh', { refresh_token: rt });
          const data = res.data?.data ?? res.data;
          if (data?.access_token) {
            saveTokens(data.access_token, data.refresh_token ?? rt);
            await restoreOnboardingFromCloud();
            setReady(true);
            return; // Restored — no OTP needed
          }
        }
      } catch { /* CloudStorage unavailable or refresh token expired — fall through */ }
      // Silent restore failed: redirect to phone auth
      router.replace('/auth/phone');
      setReady(true);
    })();
  }, [router.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  // Make the Closet & Market sections feel like the native app: suppress web
  // text selection / highlighting, the iOS long-press callout, and the grey
  // tap-highlight flash. Toggled per-route on <body> so the rest of the web app
  // keeps normal selection; form fields opt back in (see globals.css).
  useEffect(() => {
    const path = router.pathname;
    const nativeFeel = path.startsWith('/closet') || path.startsWith('/market') || path.startsWith('/feed');
    document.body.classList.toggle('app-no-select', nativeFeel);
    return () => document.body.classList.remove('app-no-select');
  }, [router.pathname]);

  // Render nothing until auth check is complete to prevent flash + API races.
  if (!ready) return null;

  return (
    <>
      {/*
        `interactive-widget=resizes-visual` makes the on-screen keyboard overlay
        the page (resizing only the *visual* viewport) instead of shrinking the
        layout. Without it the Android WebView shrinks our `100dvh` containers
        when the keyboard opens, which reflows the layout — pinned buttons jump
        up against the keys and a white gap appears. With it the layout stays
        put and the keyboard simply slides over the bottom; bottom-anchored
        sheets lift themselves via `useKeyboardInset`. `viewport-fit=cover`
        keeps the `env(safe-area-inset-*)` paddings the app already relies on.
      */}
      <Head>
        {/* maximum-scale=1 + user-scalable=no disable pinch / double-tap zoom, which
            otherwise fire accidentally mid-scroll and read as inconsistent scroll speed. */}
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover, interactive-widget=resizes-visual"
        />
      </Head>
      <FeatureFlagsProvider>
        <ThemeProvider>
          <I18nProvider>
            <Component {...pageProps} />
          </I18nProvider>
        </ThemeProvider>
      </FeatureFlagsProvider>
    </>
  );
}
