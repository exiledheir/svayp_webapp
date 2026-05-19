import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/router';
import { verifyOtp } from '@/lib/api';
import { saveTokens, saveUser } from '@/lib/auth';

const CODE_LENGTH = 6;

export default function OtpPage() {
  const router = useRouter();
  const phone = (router.query.phone as string) ?? '';
  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(''));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRefs = useRef<Array<HTMLInputElement | null>>(Array(CODE_LENGTH).fill(null));

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  function handleChange(idx: number, val: string) {
    const digit = val.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[idx] = digit;
    setDigits(next);
    setError('');
    if (digit && idx < CODE_LENGTH - 1) {
      inputRefs.current[idx + 1]?.focus();
    }
  }

  function handleKeyDown(idx: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !digits[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, CODE_LENGTH);
    const next = Array(CODE_LENGTH).fill('');
    text.split('').forEach((c, i) => { next[i] = c; });
    setDigits(next);
    inputRefs.current[Math.min(text.length, CODE_LENGTH - 1)]?.focus();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const code = digits.join('');
    if (code.length < CODE_LENGTH) {
      setError('Enter the full 6-digit code');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = await verifyOtp(phone, code);
      saveTokens(result.accessToken, result.refreshToken);
      if (result.user) saveUser(result.user);
      router.replace('/discover');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid code';
      setError(msg);
      setDigits(Array(CODE_LENGTH).fill(''));
      setTimeout(() => inputRefs.current[0]?.focus(), 50);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="phone-container flex flex-col items-center justify-center min-h-screen px-6 bg-white">
      <div className="w-full max-w-sm">
        <h1 className="text-4xl font-bold tracking-tighter text-center mb-2">SVΛYP</h1>
        <p className="text-sm text-gray-500 text-center mb-1">Enter the code we sent to</p>
        <p className="text-sm font-semibold text-center mb-10">{phone}</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="flex gap-3 justify-center" onPaste={handlePaste}>
            {digits.map((d, i) => (
              <input
                key={i}
                ref={(el) => { inputRefs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={d}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                className="w-12 h-14 text-center text-xl font-semibold border border-gray-300
                           rounded-xl focus:border-black focus:outline-none transition-colors"
                disabled={loading}
              />
            ))}
          </div>

          {error && (
            <p className="text-xs text-red-500 text-center -mt-3">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || digits.join('').length < CODE_LENGTH}
            className="w-full py-3.5 rounded-xl bg-black text-white text-sm font-semibold
                       disabled:opacity-40 active:scale-[0.98] transition-transform"
          >
            {loading ? 'Verifying…' : 'Confirm'}
          </button>

          <button
            type="button"
            className="text-sm text-gray-500 text-center underline"
            onClick={() => router.back()}
          >
            Change number
          </button>
        </form>
      </div>
    </div>
  );
}
