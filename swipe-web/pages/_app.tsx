import React, { useEffect, useState } from 'react';
import axios from 'axios';
import type { AppProps } from 'next/app';
import { useRouter } from 'next/router';
import { isAuthenticated, saveTokens, getRefreshFromCloud } from '@/lib/auth';
import { I18nProvider } from '@/lib/i18n';
import '@/styles/globals.css';
import 'react-image-crop/dist/ReactCrop.css';

// Pages that do not require authentication
const PUBLIC_PATHS = new Set(['/auth/phone', '/auth/otp']);

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  // Block rendering until auth check (including CloudStorage restore) is done.
  // This prevents race-condition API calls before we know if the user is authed.
  const [ready, setReady] = useState(false);

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
      setReady(true);
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
    <I18nProvider>
      <Component {...pageProps} />
    </I18nProvider>
  );
}
