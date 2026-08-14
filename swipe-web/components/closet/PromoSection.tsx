import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { apiErrorCode } from '@/lib/api';
import { logAnalyticsEvent } from '@/lib/analytics';
import { applyPromo, normalizePromoInput, type MyPromo, type PromoApplied } from '@/lib/promo';

/**
 * Строка «Есть промокод?» на экране покупки.
 *
 * Три состояния, и они разные по смыслу:
 *   • кода нет — свёрнутая строка, по тапу раскрывается поле ввода;
 *   • код привязан и скидка жива — плашка «Промокод MALIKA · −20%»;
 *   • код привязан, скидка потрачена или истекла — показываем сам код без плашки скидки,
 *     потому что привязка вечная, а право на скидку нет.
 *
 * Тексты ошибок берутся по коду из тела ответа — сервер отдаёт ровно четыре.
 */

const ERROR_KEYS = {
  PROMO_NOT_FOUND: 'promo_err_not_found',
  PROMO_EXPIRED: 'promo_err_expired',
  PROMO_LIMIT_REACHED: 'promo_err_limit',
  PROMO_ALREADY_HAS: 'promo_err_already',
} as const;

export default function PromoSection({
  promo,
  dark,
  onApplied,
}: {
  promo: MyPromo | null;
  dark: boolean;
  onApplied: (result: PromoApplied) => void;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const ink = dark ? '#fff' : '#141118';
  const sub = dark ? '#8e8e93' : '#9a8f98';
  const line = dark ? '#2a2a2c' : '#ececed';
  const rowBg = dark ? '#141014' : '#faf7fb';
  const accentBg = dark ? 'rgba(243,112,167,0.12)' : '#fdeef6';

  async function submit() {
    if (!code || busy) return;
    setBusy(true);
    setError('');
    try {
      const result = await applyPromo(code);
      logAnalyticsEvent('promo_applied', { code: result.code, type: result.type, value: result.value });
      setCode('');
      setOpen(false);
      onApplied(result);
    } catch (err) {
      const apiCode = apiErrorCode(err);
      logAnalyticsEvent('promo_apply_failed', { code, error_code: apiCode ?? 'UNKNOWN' });
      const key = ERROR_KEYS[apiCode as keyof typeof ERROR_KEYS];
      setError(key ? (t as unknown as Record<string, string>)[key] : t.promo_err_generic);
    } finally {
      setBusy(false);
    }
  }

  // Код привязан: показываем его. Плашка скидки — только пока право живо.
  if (promo) {
    const discountLive = promo.discountActive && promo.discountPercent !== null;
    return (
      <div
        className="mt-4 rounded-2xl px-3.5 py-3 flex items-center justify-between"
        style={{
          background: discountLive ? accentBg : rowBg,
          border: `1.5px solid ${discountLive ? '#F370A7' : line}`,
        }}
      >
        <span className="text-[13px] font-semibold" style={{ color: ink }}>
          {discountLive
            ? t.promo_badge.replace('{code}', promo.code).replace('{n}', String(promo.discountPercent))
            : t.promo_your_code.replace('{code}', promo.code)}
        </span>
        {!discountLive && promo.type === 'DISCOUNT_PERCENT' && (
          <span className="text-[11px]" style={{ color: sub }}>
            {t.promo_used}
          </span>
        )}
      </div>
    );
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-4 w-full rounded-2xl px-3.5 py-3 text-left text-[13px] font-semibold active:scale-[0.99] transition-transform"
        style={{ background: rowBg, border: `1.5px dashed ${line}`, color: '#E0559A' }}
      >
        {t.promo_have}
      </button>
    );
  }

  return (
    <div className="mt-4">
      <div className="flex gap-2">
        <input
          autoFocus
          value={code}
          onChange={(e) => {
            setCode(normalizePromoInput(e.target.value));
            setError('');
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void submit();
          }}
          placeholder={t.promo_placeholder}
          className="flex-1 h-12 rounded-2xl px-4 text-[15px] font-semibold uppercase outline-none"
          style={{ background: rowBg, border: `1.5px solid ${error ? '#E0559A' : line}`, color: ink }}
        />
        <button
          onClick={() => void submit()}
          disabled={code.length < 4 || busy}
          className="h-12 px-5 rounded-2xl text-white text-[14px] font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-40"
          style={{ background: '#F370A7' }}
        >
          {busy ? <Loader2 size={16} className="animate-spin" /> : t.promo_apply}
        </button>
      </div>
      {error && (
        <p className="text-[13px] mt-2" style={{ color: '#E0559A' }}>
          {error}
        </p>
      )}
    </div>
  );
}
