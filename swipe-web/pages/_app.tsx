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
import {
  initAnalytics,
  logAnalyticsEvent,
  setAnalyticsUser,
  setAnalyticsUserProperties,
} from '@/lib/analytics';
import '@/styles/globals.css';
import 'react-image-crop/dist/ReactCrop.css';

// Pages that do not require authentication
// Market browsing + posting funnel are public; posting enforces auth in-page
// at the wizard's phone step (so the browse→post funnel stays open).
const PUBLIC_PATHS = new Set(['/auth/phone', '/auth/otp', '/auth/verify-method', '/auth/basic-info', '/auth/telegram/callback', '/auth/partner', '/market', '/market/[id]', '/market/onboarding', '/market/create', '/market/mine', '/market/liked', '/market/chat/[id]']);

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  // Block rendering until auth check (including CloudStorage restore) is done.
  // This prevents race-condition API calls before we know if the user is authed.
  const [ready, setReady] = useState(false);

  // Initialise Firebase Analytics once on mount (client-only, SSR-safe)
  // Set user identity in Analytics once the auth state is known
  useEffect(() => {
    if (!ready) return;
    // After Firebase is initialized, set the user identity
    initAnalytics().then(() => {
      const user = getUser();
      if (user) {
        const userId = (user.id ?? user.userId ?? user.user_id) as string | undefined;
        if (userId) setAnalyticsUser(String(userId));
      }

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
      setAnalyticsUserProperties({ client_context: context });

      // Track the initial page view (subsequent ones are handled by route events)
      logAnalyticsEvent('page_view', { page_path: router.asPath });
    });

    const handleRouteChange = (url: string) => {
      logAnalyticsEvent('page_view', { page_path: url });
    };
    router.events.on('routeChangeComplete', handleRouteChange);
    return () => router.events.off('routeChangeComplete', handleRouteChange);
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
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-visual"
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
