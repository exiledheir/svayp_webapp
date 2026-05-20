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
