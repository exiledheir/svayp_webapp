import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { sendOtp } from '@/lib/api';
import { useI18n } from '@/lib/i18n';

export default function VerifyMethodPage() {
  const router = useRouter();
  const { t } = useI18n();
  const phone = (router.query.phone as string) ?? '';

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

          {/* SMS — primary (Google/Apple sign-in temporarily removed). */}
          <button
            type="button"
            onClick={handleSms}
            disabled={smsLoading}
            className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl
                       border border-gray-200 bg-white text-gray-900 text-sm font-semibold
                       hover:border-gray-400 disabled:opacity-40 active:scale-[0.98]
                       transition-all"
          >
            {smsLoading ? t.sending : t.verifyWithSms}
          </button>

        </div>
      </div>

    </div>
  );
}
