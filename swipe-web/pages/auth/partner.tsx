import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { adminLogin } from '@/lib/api';
import { saveTokens } from '@/lib/auth';
import { sendToFlutter } from '@/lib/flutter-bridge';
import { useI18n } from '@/lib/i18n';

export default function PartnerPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!username.trim()) {
      setError('Please enter your username or email');
      return;
    }
    if (!password) {
      setError('Please enter your password');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const result = await adminLogin(username.trim(), password);
      saveTokens(result.accessToken, result.refreshToken);

      sendToFlutter({
        type: 'partner_auth_complete',
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      });

      // Fallback for browser testing — navigate back
      router.replace('/');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t.partnerLoginFailed;
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Scrollable content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-10">
        <div className="w-full max-w-sm flex flex-col gap-6">

          {/* Back button */}
          <button
            type="button"
            onClick={() => router.back()}
            className="self-start flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Logo + badge */}
          <div className="flex flex-col items-center gap-2">
            <span className="text-5xl font-bold tracking-[2px] leading-none">
              LIB<span style={{ color: '#F370A7' }}>Λ</span>S
            </span>
            <span className="px-3 py-1 rounded-md bg-gray-100 text-xs font-semibold text-gray-500 tracking-wide">
              {t.partnerPortal}
            </span>
          </div>

          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-bold text-gray-900 leading-snug">
              {t.partnerWelcomeBack}
            </h1>
            <p className="text-sm text-gray-500 leading-relaxed">{t.partnerSignInSubtitle}</p>
          </div>

          <form onSubmit={handleSubmit} id="partner-form" className="flex flex-col gap-5">
          {/* Username */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-gray-900">
              {t.partnerUsernameLabel}
            </label>
            <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden focus-within:border-black transition-colors bg-white">
              <span className="px-3 text-gray-400">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </span>
              <input
                type="text"
                placeholder={t.partnerUsernameHint}
                value={username}
                onChange={(e) => { setUsername(e.target.value); setError(''); }}
                disabled={loading}
                autoComplete="username"
                className="flex-1 px-2 py-3.5 text-sm outline-none bg-transparent disabled:opacity-50"
              />
            </div>
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-gray-900">
              {t.partnerPasswordLabel}
            </label>
            <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden focus-within:border-black transition-colors bg-white">
              <span className="px-3 text-gray-400">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder={t.partnerPasswordHint}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                disabled={loading}
                autoComplete="current-password"
                className="flex-1 px-2 py-3.5 text-sm outline-none bg-transparent disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="px-3 text-gray-400 hover:text-gray-600 transition-colors"
                tabIndex={-1}
              >
                {showPassword ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19M1 1l22 22" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-500">{error}</p>
          )}
          </form>
        </div>
      </div>

      {/* Sticky bottom button */}
      <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 pt-4 pb-8
                      sm:relative sm:border-t-0 sm:pt-0 sm:pb-10">
        <div className="w-full max-w-sm mx-auto flex flex-col gap-3">
          <button
            type="submit"
            form="partner-form"
            disabled={loading || !username.trim() || !password}
            className="w-full py-4 rounded-2xl bg-black text-white text-sm font-semibold
                       disabled:opacity-40 active:scale-[0.98] transition-transform"
          >
            {loading ? '…' : t.partnerSignIn}
          </button>
          <p className="text-xs text-gray-400 text-center">{t.partnerNeedAccess}</p>
        </div>
      </div>
    </div>
  );
}
