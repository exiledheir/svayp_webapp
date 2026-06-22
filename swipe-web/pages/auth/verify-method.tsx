import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { sendOtp, getSmsOtpEnabled } from '@/lib/api';
import {
  sendToFlutter,
  isInFlutterWebView,
  getHostPlatform,
  type HostPlatform,
} from '@/lib/flutter-bridge';
import { useI18n } from '@/lib/i18n';

export default function VerifyMethodPage() {
  const router = useRouter();
  const { t } = useI18n();
  const phone = (router.query.phone as string) ?? '';

  const [socialLoading, setSocialLoading] = useState(false);
  const [smsLoading, setSmsLoading] = useState(false);
  const [error, setError] = useState('');
  // iOS → Apple, Android → Google (mirrors the native app). Resolved on the
  // client to avoid an SSR/CSR mismatch.
  const [platform, setPlatform] = useState<HostPlatform>('android');
  // Gated behind the `feature.sms_otp_enabled` backend flag. Defaults to false
  // so SMS stays hidden until the flag resolves true — Google/Apple is the
  // intended primary path.
  const [smsEnabled, setSmsEnabled] = useState(false);

  useEffect(() => {
    setPlatform(getHostPlatform());
    getSmsOtpEnabled().then(setSmsEnabled).catch(() => setSmsEnabled(false));
  }, []);

  // Format phone as +998 (90) 123-12-12
  function formatPhone(p: string): string {
    const d = p.replace(/\D/g, '');
    if (d.length === 12 && d.startsWith('998')) {
      return `+${d.slice(0, 3)} (${d.slice(3, 5)}) ${d.slice(5, 8)}-${d.slice(8, 10)}-${d.slice(10, 12)}`;
    }
    return p;
  }

  // Hand off to Flutter, which runs the native Google/Apple SDK and completes
  // the auth flow itself (saving tokens + navigating). The button stays in its
  // loading state while Flutter drives the rest. Outside the WebView there is no
  // provider available, so we surface an error.
  function handleSocial() {
    setError('');
    if (!isInFlutterWebView()) {
      setError(t.socialAuthError);
      return;
    }
    setSocialLoading(true);
    sendToFlutter({
      type: platform === 'ios' ? 'apple_auth_start' : 'google_auth_start',
      phone, // fallback for the backend
    });
  }

  async function handleSms() {
    if (!phone) { router.back(); return; }
    setSmsLoading(true);
    setError('');
    try {
      await sendOtp(phone);
      const redirect = typeof router.query.redirect === 'string' ? router.query.redirect : '';
      router.push(
        `/auth/otp?phone=${encodeURIComponent(phone)}` +
        (redirect ? `&redirect=${encodeURIComponent(redirect)}` : '')
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send SMS';
      setError(msg);
      setSmsLoading(false);
    }
  }

  const isAnyLoading = socialLoading || smsLoading;
  const socialLabel = platform === 'ios' ? t.continueWithApple : t.continueWithGoogle;

  return (
    <div className="flex flex-col min-h-[100dvh] bg-white">

      {/* ── Scrollable content ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 sm:py-10">
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
      <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 pt-4
                      pb-[max(2rem,env(safe-area-inset-bottom))]
                      sm:relative sm:border-t-0 sm:pt-0 sm:pb-10">
        <div className="w-full max-w-sm mx-auto flex flex-col gap-3">

          {/* Primary: Google (Android) / Apple (iOS) */}
          <button
            type="button"
            onClick={handleSocial}
            disabled={isAnyLoading}
            className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl
                       border border-gray-200 bg-white text-gray-900 text-sm font-semibold
                       hover:border-gray-400 disabled:opacity-40 active:scale-[0.98]
                       transition-all"
          >
            {platform === 'ios' ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                <path d="M16.365 1.43c0 1.14-.42 2.2-1.13 3.02-.83.96-2.18 1.7-3.34 1.61-.14-1.13.42-2.32 1.1-3.07.78-.85 2.13-1.5 3.37-1.56zM20.5 17.2c-.6 1.38-.89 2-1.66 3.22-1.08 1.7-2.6 3.82-4.48 3.83-1.67.02-2.1-1.09-4.37-1.08-2.27.01-2.74 1.1-4.41 1.08-1.88-.02-3.32-1.93-4.4-3.63C-1.3 16.65-1.6 11-.36 8.07.97 5.16 3.5 3.78 5.88 3.78c1.86 0 3.03 1.02 4.57 1.02 1.49 0 2.4-1.02 4.57-1.02 1.65 0 3.4.9 4.65 2.46-4.08 2.24-3.42 8.06.83 8.96z" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" fill="#34A853" />
                <path d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38z" fill="#EA4335" />
              </svg>
            )}
            {socialLoading ? t.signingIn : socialLabel}
          </button>

          {/* Secondary: SMS — only when `feature.sms_otp_enabled` is on.
              Deliberately understated (small, light grey) so Google/Apple
              reads as the primary action. */}
          {smsEnabled && (
            <button
              type="button"
              onClick={handleSms}
              disabled={isAnyLoading}
              className="w-full py-2 text-xs font-normal text-gray-400
                         hover:text-gray-500 transition-colors disabled:opacity-40"
            >
              {smsLoading ? t.sending : t.verifyWithSms}
            </button>
          )}

        </div>
      </div>

    </div>
  );
}
