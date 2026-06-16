/**
 * /auth/telegram/callback
 *
 * Telegram OIDC redirect handler. After the user approves the consent screen,
 * Telegram redirects here with ?code=...&state=...
 *
 * This page:
 *   1. Reads code + state from the URL
 *   2. Loads the PKCE session stored in sessionStorage (verifier, nonce, redirectUri)
 *   3. Validates that state matches (CSRF protection)
 *   4. POSTs to POST /auth/telegram/oidc on the backend
 *   5. On success: bridges to Flutter (auth_complete) or navigates to /auth/basic-info
 *   6. Shows a clear error state on any failure
 */

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { telegramOidcLogin } from '@/lib/api';
import { saveTokens, saveUser } from '@/lib/auth';
import { sendToFlutter } from '@/lib/flutter-bridge';
import { loadSession, clearSession } from '@/lib/telegram-auth';
import { useI18n } from '@/lib/i18n';

type Status = 'loading' | 'error' | 'cancelled';

export default function TelegramCallbackPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [status, setStatus] = useState<Status>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    // router.query is only populated after hydration on client
    if (!router.isReady) return;

    const { code, state, error: tgError } = router.query as Record<string, string | undefined>;

    // User cancelled the Telegram consent screen
    if (tgError === 'access_denied' || (!code && !state)) {
      setStatus('cancelled');
      return;
    }

    if (!code || !state) {
      setErrorMsg(t.telegramAuthError);
      setStatus('error');
      return;
    }

    const session = loadSession();

    if (!session) {
      setErrorMsg(t.telegramAuthError);
      setStatus('error');
      return;
    }

    // CSRF: verify state matches what we generated
    if (session.state !== state) {
      setErrorMsg(t.telegramAuthError);
      setStatus('error');
      return;
    }

    // Exchange code for tokens via backend
    async function exchange() {
      if (!session) return;
      try {
        clearSession(); // one-time use — clear before the network call
        const result = await telegramOidcLogin({
          code: code!,
          codeVerifier: session.codeVerifier,
          redirectUri: session.redirectUri,
          nonce: session.nonce,
        });

        saveTokens(result.accessToken, result.refreshToken);
        if (result.user) saveUser(result.user);

        const user = result.user as Record<string, unknown>;
        const hasProfile = !!user?.hasProfile || !!user?.has_profile;
        const userId = String(user?.id ?? '');
        const username = String(user?.username ?? '');
        const phone = String(user?.phoneNumber ?? user?.phone_number ?? '');

        if (hasProfile) {
          sendToFlutter({
            type: 'auth_complete',
            accessToken: result.accessToken,
            refreshToken: result.refreshToken,
            userId,
            phone,
            username,
          });
          // Fallback for browser (non-WebView) testing
          router.replace('/closet');
        } else {
          router.replace(`/auth/basic-info?phone=${encodeURIComponent(phone)}`);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : t.telegramAuthError;
        setErrorMsg(msg);
        setStatus('error');
      }
    }

    exchange();
  }, [router.isReady]); // eslint-disable-line react-hooks/exhaustive-deps

  if (status === 'cancelled') {
    return (
      <div className="flex flex-col min-h-screen bg-white items-center justify-center px-6">
        <div className="w-full max-w-sm flex flex-col items-center gap-6 text-center">
          <span className="text-5xl font-bold tracking-[2px] leading-none select-none">
            LIB<span style={{ color: '#F370A7' }}>Λ</span>S
          </span>
          <p className="text-sm text-gray-500">
            {/* User pressed "Cancel" in Telegram */}
            Telegram kirish bekor qilindi.
          </p>
          <button
            type="button"
            onClick={() => router.back()}
            className="w-full py-4 rounded-2xl bg-black text-white text-sm font-semibold
                       active:scale-[0.98] transition-transform"
          >
            {t.back ?? 'Orqaga'}
          </button>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex flex-col min-h-screen bg-white items-center justify-center px-6">
        <div className="w-full max-w-sm flex flex-col items-center gap-6 text-center">
          <span className="text-5xl font-bold tracking-[2px] leading-none select-none">
            LIB<span style={{ color: '#F370A7' }}>Λ</span>S
          </span>
          <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold text-red-500">{t.telegramAuthError}</p>
            {errorMsg && errorMsg !== t.telegramAuthError && (
              <p className="text-xs text-gray-400">{errorMsg}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => router.replace('/auth/phone')}
            className="w-full py-4 rounded-2xl bg-black text-white text-sm font-semibold
                       active:scale-[0.98] transition-transform"
          >
            {t.back ?? 'Orqaga'}
          </button>
        </div>
      </div>
    );
  }

  // status === 'loading'
  return (
    <div className="flex flex-col min-h-screen bg-white items-center justify-center px-6">
      <div className="w-full max-w-sm flex flex-col items-center gap-8 text-center">
        <span className="text-5xl font-bold tracking-[2px] leading-none select-none">
          LIB<span style={{ color: '#F370A7' }}>Λ</span>S
        </span>

        {/* Spinner */}
        <svg
          className="animate-spin text-gray-400"
          width="32" height="32" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" strokeWidth="2.5"
          strokeLinecap="round" strokeLinejoin="round"
        >
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>

        <p className="text-sm text-gray-500">{t.telegramVerifying}</p>
      </div>
    </div>
  );
}
