import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { sendOtp } from '@/lib/api';
import { buildTelegramAuthUrl } from '@/lib/telegram-auth';
import { sendToFlutter, isInFlutterWebView } from '@/lib/flutter-bridge';
import { useI18n } from '@/lib/i18n';

export default function VerifyMethodPage() {
  const router = useRouter();
  const { t } = useI18n();
  const phone = (router.query.phone as string) ?? '';

  const [telegramLoading, setTelegramLoading] = useState(false);
  const [smsLoading, setSmsLoading] = useState(false);
  const [error, setError] = useState('');

  // Format phone as +998 (90) 123-12-12
  function formatPhone(p: string): string {
    const d = p.replace(/\D/g, '');
    if (d.length === 12 && d.startsWith('998')) {
      return `+${d.slice(0, 3)} (${d.slice(3, 5)}) ${d.slice(5, 8)}-${d.slice(8, 10)}-${d.slice(10, 12)}`;
    }
    return p;
  }

  async function handleTelegram() {
    setTelegramLoading(true);
    setError('');
    try {
      const { url, session } = await buildTelegramAuthUrl();

      // If running inside Flutter WebView: send PKCE session to Flutter
      // so it can store it and use it when intercepting the deep-link callback.
      if (isInFlutterWebView()) {
        sendToFlutter({
          type: 'telegram_auth_start',
          codeVerifier: session.codeVerifier,
          state: session.state,
          nonce: session.nonce,
          redirectUri: session.redirectUri,
        });
      }

      window.location.href = url;
    } catch {
      setError(t.telegramAuthError);
      setTelegramLoading(false);
    }
  }

  async function handleSms() {
    if (!phone) { router.back(); return; }
    setSmsLoading(true);
    setError('');
    try {
      await sendOtp(phone);
      router.push(`/auth/otp?phone=${encodeURIComponent(phone)}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send SMS';
      setError(msg);
      setSmsLoading(false);
    }
  }

  const isAnyLoading = telegramLoading || smsLoading;

  return (
    <div className="flex flex-col min-h-screen bg-white">

      {/* ── Scrollable content ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-10">
        <div className="w-full max-w-sm flex flex-col gap-6">

          {/* Back */}
          <button
            type="button"
            onClick={() => router.back()}
            className="self-start -ml-1 p-2 rounded-xl text-gray-500 hover:text-gray-900
                       hover:bg-gray-100 transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Logo */}
          <div className="flex justify-center">
            <span className="text-5xl font-bold tracking-[2px] leading-none select-none">
              LIB<span style={{ color: '#F370A7' }}>Λ</span>S
            </span>
          </div>

          {/* Title + phone number chip */}
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-bold text-gray-900 leading-snug">
              {t.verifyMethodTitle}
            </h1>
            <p className="text-sm text-gray-500 leading-relaxed">
              {t.verifyMethodSubtitle}
            </p>
            {phone && (
              <div className="inline-flex self-start items-center gap-1.5 mt-1
                              px-3 py-1.5 bg-gray-100 rounded-full">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  className="text-gray-400">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.6 3.35 2 2 0 0 1 3.56 1.18h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 8.9a16 16 0 0 0 6 6l.9-.9a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 21.6 16.18z" />
                </svg>
                <span className="text-xs font-semibold text-gray-700">{formatPhone(phone)}</span>
              </div>
            )}
          </div>

          {error && (
            <p className="text-xs text-red-500">{error}</p>
          )}

        </div>
      </div>

      {/* ── Sticky bottom ── */}
      <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 pt-4 pb-8
                      sm:relative sm:border-t-0 sm:pt-0 sm:pb-10">
        <div className="w-full max-w-sm mx-auto flex flex-col gap-3">

          {/* Primary: Telegram */}
          <button
            type="button"
            onClick={handleTelegram}
            disabled={isAnyLoading}
            className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl
                       bg-black text-white text-sm font-semibold
                       disabled:opacity-40 active:scale-[0.98] transition-transform"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="12" fill="#229ED9" />
              <path d="M17.207 7.228 5.648 11.66c-.783.314-.779.752-.143.947l2.937.916 6.8-4.293c.321-.195.614-.09.373.124l-5.503 4.966-.213 3.1c.312 0 .45-.143.623-.31l1.496-1.455 3.109 2.295c.573.316.985.153 1.127-.531l2.04-9.617c.21-.84-.32-1.22-.887-.947z"
                fill="white" />
            </svg>
            {telegramLoading ? t.telegramVerifying : t.continueWithTelegram}
          </button>

          {/* Secondary: SMS */}
          <button
            type="button"
            onClick={handleSms}
            disabled={isAnyLoading}
            className="w-full py-3 text-sm font-medium text-gray-400
                       hover:text-gray-700 transition-colors disabled:opacity-40"
          >
            {smsLoading ? t.sending : t.verifyWithSms}
          </button>

        </div>
      </div>

    </div>
  );
}
