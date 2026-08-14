import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { apiErrorCode } from '@/lib/api';
import { logAnalyticsEvent } from '@/lib/analytics';
import { applyPromo, normalizePromoInput, type MyPromo, type PromoApplied } from '@/lib/promo';

/**
 * Строка «Есть промокод?» на экране покупки.
 *
 * Два состояния, и граница между ними — ЖИВОЕ право на скидку, а не факт применения кода:
 *   • скидка жива — плашка «Промокод MALIKA · −20%», вводить нечего: коды не суммируются,
 *     на одну покупку идёт ровно один;
 *   • скидки нет (потрачена, истекла или кода не было вовсе) — открыто поле ввода для
 *     СЛЕДУЮЩЕГО кода. Человек применил код, купил, вернулся — и вводит другой.
 *
 * Именно поэтому «код применён» больше не запирает секцию навсегда: раньше после покупки
 * на экране висело «Скидка уже использована» и ввести новый код было физически негде.
 *
 * Тексты ошибок берутся по коду из тела ответа.
 */

const ERROR_KEYS = {
  PROMO_NOT_FOUND: 'promo_err_not_found',
  PROMO_EXPIRED: 'promo_err_expired',
  PROMO_LIMIT_REACHED: 'promo_err_limit',
  PROMO_ALREADY_USED: 'promo_err_already_used',
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

  const discountLive = !!promo && promo.discountActive && promo.discountPercent !== null;

  // Действующая скидка. Показываем её всегда, но НЕ вместо поля ввода: новый код заменяет
  // прежний, и человек не должен застревать с кодом, который не подходит под его покупку.
  const badge = discountLive && promo && (
    <div
      className="mt-4 rounded-2xl px-3.5 py-3"
      style={{ background: accentBg, border: '1.5px solid #F370A7' }}
    >
      <span className="text-[13px] font-semibold" style={{ color: ink }}>
        {t.promo_badge.replace('{code}', promo.code).replace('{n}', String(promo.discountPercent))}
      </span>
    </div>
  );

  if (!open) {
    return (
      <div>
        {badge}
        <div className="mt-2">
          <button
            onClick={() => setOpen(true)}
            className="w-full rounded-2xl px-3.5 py-3 text-left text-[13px] font-semibold active:scale-[0.99] transition-transform"
            style={{ background: rowBg, border: `1.5px dashed ${line}`, color: '#E0559A' }}
          >
            {promo ? t.promo_have_another : t.promo_have}
          </button>
          {/* Прежний код никуда не делся — покупки по-прежнему засчитываются блогеру. */}
          {promo && !discountLive && (
            <p className="mt-1.5 px-1 text-[11px]" style={{ color: sub }}>
              {t.promo_your_code.replace('{code}', promo.code)}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      {badge}
      <div className="mt-2 flex gap-2">
        {/*
          min-w-0 обязателен: у флекс-элемента min-width по умолчанию auto, и <input> не
          сжимается уже своей внутренней ширины (~20 символов). Без этого строка становится
          шире листа, кнопка «Применить» уезжает за край, а вся страница получает
          горизонтальную прокрутку — на телефоне это выглядит как «вебка съехала и зумится».
          size={1} убирает саму внутреннюю ширину, чтобы флексу было от чего отталкиваться.
        */}
        <input
          autoFocus
          size={1}
          value={code}
          onChange={(e) => {
            setCode(normalizePromoInput(e.target.value));
            setError('');
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void submit();
          }}
          placeholder={t.promo_placeholder}
          className="flex-1 min-w-0 h-12 rounded-2xl px-4 text-[16px] font-semibold uppercase outline-none"
          style={{ background: rowBg, border: `1.5px solid ${error ? '#E0559A' : line}`, color: ink }}
        />
        <button
          onClick={() => void submit()}
          disabled={code.length < 4 || busy}
          className="shrink-0 h-12 px-5 rounded-2xl text-white text-[14px] font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-40"
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
