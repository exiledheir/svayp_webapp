import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { verifyOtp, sendOtp } from '@/lib/api';
import { saveTokens, saveUser } from '@/lib/auth';
import { sendToFlutter } from '@/lib/flutter-bridge';
import { useI18n } from '@/lib/i18n';

const CODE_LENGTH = 6;
const RESEND_SECONDS = 60;

export default function OtpPage() {
  const router = useRouter();
  const { t } = useI18n();
  const phone = (router.query.phone as string) ?? '';
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);
  const [canResend, setCanResend] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Start/restart the resend countdown
  const startTimer = useCallback(() => {
    setSecondsLeft(RESEND_SECONDS);
    setCanResend(false);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(timerRef.current!);
          setCanResend(true);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => {
    startTimer();
    setTimeout(() => inputRef.current?.focus(), 100);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [startTimer]);

  // Format phone as +998 (90) 123-12-12
  function formatPhone(p: string): string {
    const d = p.replace(/\D/g, '');
    if (d.length === 12 && d.startsWith('998')) {
      return `+${d.slice(0, 3)} (${d.slice(3, 5)}) ${d.slice(5, 8)}-${d.slice(8, 10)}-${d.slice(10, 12)}`;
    }
    return p;
  }

  async function submit(otp: string) {
    if (otp.length !== CODE_LENGTH) return;
    setLoading(true);
    setError('');
    try {
      const result = await verifyOtp(phone, otp);
      saveTokens(result.accessToken, result.refreshToken);
      if (result.user) saveUser(result.user);

      const user = result.user as Record<string, unknown>;
      const hasProfile = !!user?.hasProfile || !!user?.has_profile;
      const userId = String(user?.id ?? '');
      const username = String(user?.username ?? '');

      if (hasProfile) {
        sendToFlutter({
          type: 'auth_complete',
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          userId,
          phone,
          username,
        });
        // Fallback for browser (non-WebView) testing. Honor an optional
        // ?redirect= target (e.g. the market create wizard) so flows that
        // bounce through auth return where they started.
        const redirect = typeof router.query.redirect === 'string' ? router.query.redirect : '';
        router.replace(redirect || '/closet');
      } else {
        const redirect = typeof router.query.redirect === 'string' ? router.query.redirect : '';
        router.push(
          `/auth/basic-info?phone=${encodeURIComponent(phone)}` +
          (redirect ? `&redirect=${encodeURIComponent(redirect)}` : '')
        );
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t.enterFull6Digit;
      setError(msg);
      setCode('');
      setTimeout(() => inputRef.current?.focus(), 50);
    } finally {
      setLoading(false);
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value.replace(/\D/g, '').slice(0, CODE_LENGTH);
    setCode(val);
    setError('');
    if (val.length === CODE_LENGTH) {
      submit(val);
    }
  }

  async function handleResend() {
    if (!canResend || loading) return;
    setLoading(true);
    try {
      await sendOtp(phone);
      startTimer();
      setCode('');
      setTimeout(() => inputRef.current?.focus(), 50);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to resend';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-white">

      {/* ── Scrollable content ── */}
      <div className="flex-1 flex flex-col px-6 pt-12 pb-6">
        <div className="w-full max-w-sm mx-auto flex flex-col gap-8">

          {/* Back arrow */}
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

          {/* Title + subtitle */}
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-bold text-gray-900 leading-snug">
              {t.verifyPhoneNumber}
            </h1>
            <p className="text-sm text-gray-500 leading-relaxed">
              {t.enterCodeSentTo}{' '}
              <span className="font-semibold text-gray-900">{formatPhone(phone)}</span>
            </p>
          </div>

          {/* OTP input */}
          <div className="flex flex-col gap-3">
            <label className="text-sm font-semibold text-gray-700">
              {t.phoneNumber.includes('raqam') ? 'Tasdiqlash kodi' : 'Verification code'}
            </label>
            <input
              ref={inputRef}
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={CODE_LENGTH}
              value={code}
              onChange={handleChange}
              disabled={loading}
              className="w-full text-center text-4xl font-bold py-5
                         border-2 border-gray-200 rounded-2xl outline-none
                         focus:border-black transition-colors bg-gray-50
                         disabled:opacity-50 tracking-[1rem]"
            />
            {error && (
              <p className="text-xs text-red-500 text-center">{error}</p>
            )}
          </div>

          {/* Resend */}
          <div className="text-center">
            {canResend ? (
              <button
                type="button"
                onClick={handleResend}
                disabled={loading}
                className="text-sm font-semibold text-black underline
                           underline-offset-2 disabled:opacity-40"
              >
                {t.resendCode}
              </button>
            ) : (
              <p className="text-sm text-gray-400">
                {t.resendCodeIn.replace('{n}', String(secondsLeft))}
              </p>
            )}
          </div>

        </div>
      </div>

      {/* ── Sticky bottom button ── */}
      <div className="sticky bottom-0 bg-white border-t border-gray-100
                      px-6 pt-4 pb-8 sm:relative sm:border-t-0 sm:pt-0 sm:pb-12">
        <div className="w-full max-w-sm mx-auto">
          <button
            type="button"
            onClick={() => submit(code)}
            disabled={loading || code.length < CODE_LENGTH}
            className="w-full py-4 rounded-2xl bg-black text-white text-sm font-semibold
                       disabled:opacity-40 active:scale-[0.98] transition-transform"
          >
            {loading ? t.verifying : t.confirmBtn}
          </button>
        </div>
      </div>

    </div>
  );
}
