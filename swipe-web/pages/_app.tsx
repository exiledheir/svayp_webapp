import React, { useEffect } from 'react';
import type { AppProps } from 'next/app';
import { useRouter } from 'next/router';
import { isAuthenticated } from '@/lib/auth';
import { I18nProvider } from '@/lib/i18n';
import '@/styles/globals.css';
import 'react-image-crop/dist/ReactCrop.css';

// Pages that do not require authentication
const PUBLIC_PATHS = new Set(['/auth/phone', '/auth/otp']);

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();

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

    // Redirect to auth if not logged in and trying to access a protected route
    if (!PUBLIC_PATHS.has(router.pathname) && !isAuthenticated()) {
      router.replace('/auth/phone');
    }
  }, [router.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <I18nProvider>
      <Component {...pageProps} />
    </I18nProvider>
  );
}
