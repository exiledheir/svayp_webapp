import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { useI18n } from '@/lib/i18n';
import type { Locale } from '@/lib/translations';
import { getHostPlatform } from '@/lib/flutter-bridge';

const UZ_PREFIX = '+998';

const LOCALES: { code: Locale; flag: string; label: string }[] = [
  { code: 'uz', flag: '🇺🇿', label: "O'zbek" },
  { code: 'ru', flag: '🇷🇺', label: 'Русский' },
  { code: 'en', flag: '🇬🇧', label: 'English' },
];

export default function PhonePage() {
  const router = useRouter();
  const { t, locale, setLocale } = useI18n();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [langOpen, setLangOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setLangOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Persist the host platform (from the ?platform= param the Flutter WebView
  // injects) so the next screen can show the right social button after the
  // param is dropped on navigation.
  useEffect(() => {
    getHostPlatform();
  }, []);

  // 5-tap logo easter egg → partner login
  const tapCount = useRef(0);
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleLogoTap = useCallback(() => {
    tapCount.current++;
    if (tapTimer.current) clearTimeout(tapTimer.current);
    if (tapCount.current >= 5) {
      tapCount.current = 0;
      router.push('/auth/partner');
    } else {
      tapTimer.current = setTimeout(() => { tapCount.current = 0; }, 2000);
    }
  }, [router]);

  const currentLocale = LOCALES.find((l) => l.code === locale) ?? LOCALES[0];
  const digits = phone.replace(/\D/g, '');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (digits.length < 9) {
      setError(t.enterAtLeast9);
      return;
    }
    const fullPhone = `${UZ_PREFIX}${digits}`;
    const redirect = typeof router.query.redirect === 'string' ? router.query.redirect : '';
    router.push(
      `/auth/verify-method?phone=${encodeURIComponent(fullPhone)}` +
      (redirect ? `&redirect=${encodeURIComponent(redirect)}` : '')
    );
  }

  return (
    <div className="flex flex-col min-h-[100dvh] bg-white">
      {/* ── Scrollable content ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 sm:py-10">
        <div className="w-full max-w-sm flex flex-col gap-6">

          {/* Logo */}
          <button
            type="button"
            onClick={handleLogoTap}
            className="self-center bg-transparent border-none outline-none cursor-default select-none"
            tabIndex={-1}
          >
            <span className="text-5xl font-bold tracking-[2px] leading-none">
              LIB<span style={{ color: '#F370A7' }}>Λ</span>S
            </span>
          </button>

          {/* Title */}
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-bold text-gray-900 leading-snug">
              {t.enterPhoneNumber}
            </h1>
            <p className="text-sm text-gray-500 leading-relaxed">
              {t.phoneVerificationSubtitle}
            </p>
          </div>

          {/* Language dropdown */}
          <div ref={dropdownRef} className="relative">
            <button
              type="button"
              onClick={() => setLangOpen((v) => !v)}
              className="flex items-center gap-2 px-4 py-3 w-full border border-gray-200 rounded-xl
                         bg-white text-sm font-medium text-gray-800 hover:border-gray-400
                         transition-colors focus:outline-none focus:border-black"
            >
              <span className="text-lg leading-none">{currentLocale.flag}</span>
              <span className="flex-1 text-left">{currentLocale.label}</span>
              <svg
                width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                className={`text-gray-400 transition-transform duration-150 ${langOpen ? 'rotate-180' : ''}`}
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>

            {langOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200
                              rounded-xl shadow-lg overflow-hidden z-50">
                {LOCALES.map(({ code, flag, label }) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => { setLocale(code); setLangOpen(false); }}
                    className={`flex items-center gap-3 w-full px-4 py-3 text-sm text-left
                                transition-colors hover:bg-gray-50
                                ${locale === code ? 'font-semibold text-black bg-gray-50' : 'text-gray-700'}`}
                  >
                    <span className="text-lg leading-none">{flag}</span>
                    <span>{label}</span>
                    {locale === code && (
                      <svg className="ml-auto" width="14" height="14" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Phone input */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-3" id="phone-form">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold text-gray-700">
                {t.phoneNumber}
              </span>
              <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden
                              focus-within:border-black transition-colors bg-white">
                <span className="px-4 py-3.5 text-sm font-semibold text-gray-700 bg-gray-50
                                 border-r border-gray-200 select-none whitespace-nowrap">
                  {UZ_PREFIX}
                </span>
                <input
                  type="tel"
                  inputMode="numeric"
                  placeholder="90 123 45 67"
                  value={phone}
                  onChange={(e) => { setPhone(e.target.value.replace(/[^\d\s]/g, '')); setError(''); }}
                  className="flex-1 px-4 py-3.5 text-sm outline-none bg-white min-w-0"
                  autoComplete="tel"
                  maxLength={12}
                  disabled={loading}
                />
              </div>
            </label>

            {error && (
              <p className="text-xs text-red-500">{error}</p>
            )}
          </form>
        </div>
      </div>

      {/* ── Sticky bottom button ── */}
      <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 pt-4
                      pb-[max(2rem,env(safe-area-inset-bottom))]
                      sm:relative sm:border-t-0 sm:pt-0 sm:pb-10">
        <div className="w-full max-w-sm mx-auto">
          <button
            type="submit"
            form="phone-form"
            disabled={loading || digits.length < 9}
            className="w-full py-4 rounded-2xl bg-black text-white text-sm font-semibold
                       disabled:opacity-40 active:scale-[0.98] transition-transform"
          >
            {loading ? t.sending : t.continueBtn}
          </button>
        </div>
      </div>
    </div>
  );
}
