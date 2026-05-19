import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { sendOtp } from '@/lib/api';

const UZ_PREFIX = '+998';

export default function PhonePage() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 9) {
      setError('Enter at least 9 digits');
      return;
    }
    const fullPhone = `${UZ_PREFIX}${digits}`;
    setLoading(true);
    try {
      await sendOtp(fullPhone);
      router.push(`/auth/otp?phone=${encodeURIComponent(fullPhone)}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send OTP';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="phone-container flex flex-col items-center justify-center min-h-screen px-6 bg-white">
      <div className="w-full max-w-sm">
        {/* Logo / Brand */}
        <h1 className="text-4xl font-bold tracking-tighter text-center mb-2">SVΛYP</h1>
        <p className="text-sm text-gray-500 text-center mb-10">Discover fashion you love</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">
              Phone number
            </span>
            <div className="flex items-center border border-gray-300 rounded-xl overflow-hidden focus-within:border-black transition-colors">
              <span className="px-4 py-3.5 text-sm font-medium text-gray-700 bg-gray-50 border-r border-gray-300 select-none">
                {UZ_PREFIX}
              </span>
              <input
                type="tel"
                inputMode="numeric"
                placeholder="90 123 45 67"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value.replace(/[^\d\s]/g, ''));
                  setError('');
                }}
                className="flex-1 px-4 py-3.5 text-sm outline-none bg-white"
                autoComplete="tel"
                maxLength={12}
                disabled={loading}
              />
            </div>
          </label>

          {error && (
            <p className="text-xs text-red-500 mt-1">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || phone.replace(/\D/g, '').length < 9}
            className="w-full py-3.5 rounded-xl bg-black text-white text-sm font-semibold
                       disabled:opacity-40 active:scale-[0.98] transition-transform"
          >
            {loading ? 'Sending…' : 'Continue'}
          </button>
        </form>
      </div>
    </div>
  );
}
