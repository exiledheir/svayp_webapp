import React, { useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { createProfileV2 } from '@/lib/api';
import { invalidateUserProfileCache } from '@/lib/wardrobe-api';
import { getToken, getRefreshToken, getUser } from '@/lib/auth';
import { sendToFlutter } from '@/lib/flutter-bridge';
import { useI18n } from '@/lib/i18n';

const CURRENT_YEAR = new Date().getFullYear();

function clamp(n: number, min: number, max: number) {
  return Math.min(Math.max(n, min), max);
}

function daysInMonth(month: number, year: number): number {
  return new Date(year, month, 0).getDate();
}

export default function BasicInfoPage() {
  const router = useRouter();
  const { t } = useI18n();
  const phone = (router.query.phone as string) ?? '';

  const [name, setName] = useState('');
  const [day, setDay] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const [gender, setGender] = useState<'FEMALE' | 'MALE'>('FEMALE');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const monthRef = useRef<HTMLInputElement>(null);
  const yearRef = useRef<HTMLInputElement>(null);

  // Validate that the full date is a real calendar date
  function getValidDate(): string | null {
    const d = parseInt(day, 10);
    const m = parseInt(month, 10);
    const y = parseInt(year, 10);
    if (
      isNaN(d) || isNaN(m) || isNaN(y) ||
      m < 1 || m > 12 ||
      d < 1 || d > daysInMonth(m, y) ||
      y < 1900 || y > CURRENT_YEAR
    ) {
      return null;
    }
    const mm = String(m).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    return `${y}-${mm}-${dd}`;
  }

  const isFormReady =
    name.trim().length > 0 &&
    day.length === 2 &&
    month.length === 2 &&
    year.length === 4;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    const dateStr = getValidDate();
    if (!dateStr) {
      setError(t.invalidDateError);
      return;
    }

    setLoading(true);
    try {
      await createProfileV2({
        fullName: name.trim(),
        dateOfBirth: dateStr,
        gender,
      });
      invalidateUserProfileCache();

      const accessToken = getToken() ?? '';
      const refreshToken = getRefreshToken() ?? '';
      const user = getUser() as Record<string, unknown> | null;
      const userId = String(user?.id ?? '');
      const username = String(user?.username ?? '');

      sendToFlutter({
        type: 'onboarding_complete',
        accessToken,
        refreshToken,
        userId,
        phone,
        username,
      });

      // Fallback for browser testing
      router.replace('/closet');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save profile';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  function handleDayChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value.replace(/\D/g, '').slice(0, 2);
    setDay(val);
    if (val.length === 2) {
      const n = parseInt(val, 10);
      if (n >= 1 && n <= 31) monthRef.current?.focus();
    }
  }

  function handleMonthChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value.replace(/\D/g, '').slice(0, 2);
    setMonth(val);
    if (val.length === 2) {
      const n = parseInt(val, 10);
      if (n >= 1 && n <= 12) yearRef.current?.focus();
    }
  }

  function handleYearChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value.replace(/\D/g, '').slice(0, 4);
    setYear(val);
  }

  // Clamp on blur
  function handleDayBlur() {
    if (day.length > 0 && day.length < 2) {
      const n = clamp(parseInt(day, 10), 1, 31);
      setDay(String(n).padStart(2, '0'));
    }
  }

  function handleMonthBlur() {
    if (month.length > 0 && month.length < 2) {
      const n = clamp(parseInt(month, 10), 1, 12);
      setMonth(String(n).padStart(2, '0'));
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-white">

      {/* ── Scrollable content ── */}
      <div className="flex-1 flex flex-col px-6 pt-12 pb-6">
        <div className="w-full max-w-sm mx-auto flex flex-col gap-8">

          {/* Logo */}
          <div className="flex justify-center">
            <span className="text-5xl font-bold tracking-[2px] leading-none select-none">
              LIB<span style={{ color: '#F370A7' }}>Λ</span>S
            </span>
          </div>

          {/* Title + subtitle */}
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-bold text-gray-900 leading-snug">
              {t.tellUsAboutYourself}
            </h1>
            <p className="text-sm text-gray-500 leading-relaxed">
              {t.personalizeExperience}
            </p>
          </div>

          {/* Form fields */}
          <form
            id="basic-info-form"
            onSubmit={handleSubmit}
            className="flex flex-col gap-6"
          >
            {/* Full name */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-gray-700">
                {t.fullName}
              </label>
              <input
                type="text"
                placeholder={t.enterYourName}
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
                autoComplete="name"
                className="w-full px-4 py-3.5 text-sm border border-gray-200 rounded-xl
                           outline-none focus:border-black transition-colors bg-white
                           disabled:opacity-50"
              />
            </div>

            {/* Date of birth */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-gray-700">
                {t.dateOfBirth}
              </label>
              <div className="flex items-center gap-2">
                {/* Day */}
                <div className="flex flex-col flex-1">
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder={t.day}
                    value={day}
                    onChange={handleDayChange}
                    onBlur={handleDayBlur}
                    disabled={loading}
                    maxLength={2}
                    className="w-full px-2 py-3.5 text-base text-center font-semibold
                               border border-gray-200 rounded-xl outline-none
                               focus:border-black transition-colors bg-white
                               disabled:opacity-50"
                  />
                </div>

                {/* Month */}
                <div className="flex flex-col flex-1">
                  <input
                    ref={monthRef}
                    type="text"
                    inputMode="numeric"
                    placeholder={t.month}
                    value={month}
                    onChange={handleMonthChange}
                    onBlur={handleMonthBlur}
                    disabled={loading}
                    maxLength={2}
                    className="w-full px-2 py-3.5 text-base text-center font-semibold
                               border border-gray-200 rounded-xl outline-none
                               focus:border-black transition-colors bg-white
                               disabled:opacity-50"
                  />
                </div>

                {/* Year */}
                <div className="flex flex-col flex-[1.6]">
                  <input
                    ref={yearRef}
                    type="text"
                    inputMode="numeric"
                    placeholder={t.year}
                    value={year}
                    onChange={handleYearChange}
                    disabled={loading}
                    maxLength={4}
                    className="w-full px-2 py-3.5 text-base text-center font-semibold
                               border border-gray-200 rounded-xl outline-none
                               focus:border-black transition-colors bg-white
                               disabled:opacity-50"
                  />
                </div>
              </div>
            </div>

            {/* Gender */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-gray-700">
                {t.gender}
              </label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setGender('FEMALE')}
                  disabled={loading}
                  className={`flex-1 py-3.5 rounded-xl text-sm font-semibold border-2 transition-colors
                    ${
                      gender === 'FEMALE'
                        ? 'border-black bg-black text-white'
                        : 'border-gray-200 bg-white text-gray-500 hover:border-gray-400'
                    }`}
                >
                  {t.genderFemale}
                </button>
                <button
                  type="button"
                  onClick={() => setGender('MALE')}
                  disabled={loading}
                  className={`flex-1 py-3.5 rounded-xl text-sm font-semibold border-2 transition-colors
                    ${
                      gender === 'MALE'
                        ? 'border-black bg-black text-white'
                        : 'border-gray-200 bg-white text-gray-500 hover:border-gray-400'
                    }`}
                >
                  {t.genderMale}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-xs text-red-500">{error}</p>
            )}
          </form>

        </div>
      </div>

      {/* ── Sticky bottom button ── */}
      <div className="sticky bottom-0 bg-white border-t border-gray-100
                      px-6 pt-4 pb-8 sm:relative sm:border-t-0 sm:pt-0 sm:pb-12">
        <div className="w-full max-w-sm mx-auto">
          <button
            type="submit"
            form="basic-info-form"
            disabled={loading || !isFormReady}
            className="w-full py-4 rounded-2xl bg-black text-white text-sm font-semibold
                       disabled:opacity-40 active:scale-[0.98] transition-transform"
          >
            {loading ? '…' : t.continueBtn}
          </button>
        </div>
      </div>

    </div>
  );
}
