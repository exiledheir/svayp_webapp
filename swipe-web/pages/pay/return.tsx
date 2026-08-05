import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { Check, X, Loader2, HelpCircle, Clock } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useTheme } from '@/lib/theme';
import Diamond from '@/components/closet/Diamond';
import {
  clearPendingPayment,
  fetchPaymentStatus,
  isTerminal,
  pollPaymentUntilTerminal,
  readPendingPayment,
  type Payment,
} from '@/lib/payments';

/**
 * Страница возврата после оплаты.
 *
 * Провайдер возвращает сюда пользователя, но полагаться на это нельзя: он мог уйти в
 * приложение Payme/Click и не вернуться, а вебхук — задержаться. Поэтому здесь только
 * ОТОБРАЖЕНИЕ статуса: деньги зачисляет сервер (вебхук либо фолбэк-опрос), а мы опрашиваем
 * его до терминального статуса и даём кнопку «проверить ещё раз».
 *
 * Страница объявлена публичной (PUBLIC_PATHS в _app.tsx): если возврат случился во внешнем
 * браузере, токена там нет, и auth-гард увёл бы на экран логина вместо результата оплаты.
 */
export default function PaymentReturnPage() {
  const router = useRouter();
  const { t } = useI18n();
  const { theme } = useTheme();
  const dark = theme === 'dark';

  const [payment, setPayment] = useState<Payment | null>(null);
  const [phase, setPhase] = useState<'loading' | 'waiting' | 'stalled' | 'success' | 'failed' | 'unknown'>(
    'loading',
  );
  const [rechecking, setRechecking] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  /**
   * id платежа определяется РОВНО один раз и дальше не меняется.
   *
   * Раньше он вычислялся на каждом рендере из localStorage — а `applyPayment` этот же
   * localStorage чистит по достижении терминального статуса. Из-за этого сразу после
   * успешной оплаты id превращался в null, эффект перезапускался и экран на миг показывал
   * «оплата не прошла» поверх уже успешного результата.
   */
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [resolved, setResolved] = useState(false);

  useEffect(() => {
    if (!router.isReady || resolved) return;
    const fromQuery = typeof router.query.paymentId === 'string' ? router.query.paymentId : null;
    setPaymentId(fromQuery ?? readPendingPayment());
    setResolved(true);
  }, [router.isReady, router.query.paymentId, resolved]);

  /**
   * @param pendingPhase чем показывать неоплаченный платёж: `waiting` — пока идёт
   *   автоматический опрос (спиннер), `stalled` — когда ждать дальше бессмысленно.
   */
  const applyPayment = useCallback((p: Payment, pendingPhase: 'waiting' | 'stalled' = 'waiting') => {
    setPayment(p);
    if (p.status === 'FULFILLED') {
      setPhase('success');
      clearPendingPayment();
    } else if (isTerminal(p.status)) {
      setPhase('failed');
      clearPendingPayment();
    } else {
      setPhase(pendingPhase);
    }
  }, []);

  useEffect(() => {
    if (!resolved) return;
    if (!paymentId) {
      setPhase('unknown');
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;

    (async () => {
      try {
        applyPayment(await fetchPaymentStatus(paymentId, true));
      } catch {
        setPhase('unknown');
        return;
      }
      const final = await pollPaymentUntilTerminal(paymentId, {
        intervalMs: 2000,
        timeoutMs: 90_000,
        signal: controller.signal,
        onTick: applyPayment,
      });
      if (final) {
        applyPayment(final);
      } else if (!controller.signal.aborted) {
        // Опрос выдохся (90 с либо приложение было свёрнуто и время истекло в фоне).
        // Без этой ветки экран навсегда застывал на «Подтверждаем оплату» — в том числе
        // у людей, которые просто передумали платить.
        setPhase('stalled');
      }
    })();

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolved, paymentId]);

  /**
   * Возврат в приложение — самый вероятный момент, когда статус уже изменился:
   * человек либо заплатил в приложении банка, либо закрыл его, не заплатив.
   * Проверяем сразу, не дожидаясь следующего тика опроса.
   */
  useEffect(() => {
    if (!paymentId) return;
    function onVisibilityChange() {
      if (document.visibilityState !== 'visible') return;
      if (phase === 'success' || phase === 'failed') return;
      void recheck();
    }
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentId, phase]);

  async function recheck() {
    if (!paymentId || rechecking) return;
    setRechecking(true);
    try {
      applyPayment(await fetchPaymentStatus(paymentId, true), 'stalled');
    } catch {
      /* остаёмся в текущем состоянии */
    } finally {
      setRechecking(false);
    }
  }

  function goBack() {
    abortRef.current?.abort();
    if (payment?.purpose === 'ORDER') router.replace('/');
    else router.replace('/closet');
  }

  const ink = dark ? '#fff' : '#141118';
  const sub = dark ? '#8e8e93' : '#9a8f98';
  const bg = dark ? '#000' : '#fff';

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center px-6 text-center" style={{ background: bg }}>
      {(phase === 'loading' || phase === 'waiting') && (
        <>
          <Loader2 size={44} className="animate-spin" style={{ color: '#F370A7' }} />
          <h1 className="text-[20px] font-extrabold mt-4" style={{ color: ink }}>{t.pay_checking_title}</h1>
          <p className="text-[14px] mt-2 max-w-[300px]" style={{ color: sub }}>{t.pay_checking_sub}</p>
          <button
            onClick={recheck}
            disabled={rechecking}
            className="mt-6 h-12 px-6 rounded-2xl text-[15px] font-bold disabled:opacity-40"
            style={{ border: `1.5px solid ${dark ? '#2a2a2c' : '#ececed'}`, color: ink }}
          >
            {rechecking ? t.pay_rechecking : t.pay_recheck}
          </button>
        </>
      )}

      {/* Опрос закончился, а оплаты нет: чаще всего человек просто передумал.
          Показываем понятный итог и оба пути — проверить ещё раз или вернуться. */}
      {phase === 'stalled' && (
        <>
          <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: dark ? '#2a2a2c' : '#f2f2f4' }}>
            <Clock size={34} style={{ color: sub }} strokeWidth={2.5} />
          </div>
          <h1 className="text-[22px] font-extrabold mt-4" style={{ color: ink }}>{t.pay_stalled_title}</h1>
          <p className="text-[14px] mt-2 max-w-[320px]" style={{ color: sub }}>{t.pay_stalled_sub}</p>
          <button
            onClick={recheck}
            disabled={rechecking}
            className="mt-6 h-12 px-6 rounded-2xl text-[15px] font-bold disabled:opacity-40"
            style={{ border: `1.5px solid ${dark ? '#2a2a2c' : '#ececed'}`, color: ink }}
          >
            {rechecking ? t.pay_rechecking : t.pay_recheck}
          </button>
          <button
            onClick={goBack}
            className="mt-3 w-full max-w-[320px] h-14 rounded-2xl text-white text-[16px] font-bold"
            style={{ background: '#F370A7' }}
          >
            {t.pay_back}
          </button>
        </>
      )}

      {phase === 'success' && (
        <>
          <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: '#2FB27A' }}>
            <Check size={34} color="#fff" strokeWidth={3} />
          </div>
          <h1 className="text-[22px] font-extrabold mt-4" style={{ color: ink }}>{t.pay_success_title}</h1>
          {payment?.purpose === 'COINS' && payment.coins != null && (
            <p className="flex items-center justify-center gap-1.5 text-[15px] font-bold mt-2" style={{ color: ink }}>
              <Diamond size={16} />
              {t.pay_success_coins.replace('{n}', String(payment.coins))}
            </p>
          )}
          {payment?.coinBalance != null && (
            <p className="text-[14px] mt-1" style={{ color: sub }}>
              {t.pay_balance_now.replace('{n}', payment.coinBalance.toLocaleString('uz-UZ'))}
            </p>
          )}
          <button
            onClick={goBack}
            className="mt-7 h-13 w-full max-w-[320px] h-14 rounded-2xl text-white text-[16px] font-bold"
            style={{ background: '#F370A7' }}
          >
            {t.pay_continue}
          </button>
        </>
      )}

      {/* «Не нашли платёж» — это НЕ отказ: деньги могли уйти, просто мы не знаем, за каким
          платежом смотреть (открыли ссылку заново, вернулись из другого браузера). Красный
          крест и «оплата не прошла» здесь врут пользователю, поэтому состояние отдельное. */}
      {phase === 'unknown' && (
        <>
          <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: dark ? '#2a2a2c' : '#f2f2f4' }}>
            <HelpCircle size={34} style={{ color: sub }} strokeWidth={2.5} />
          </div>
          <h1 className="text-[22px] font-extrabold mt-4" style={{ color: ink }}>{t.pay_unknown_title}</h1>
          <p className="text-[14px] mt-2 max-w-[320px]" style={{ color: sub }}>{t.pay_unknown_sub}</p>
          <button
            onClick={goBack}
            className="mt-7 w-full max-w-[320px] h-14 rounded-2xl text-white text-[16px] font-bold"
            style={{ background: '#F370A7' }}
          >
            {t.pay_back}
          </button>
        </>
      )}

      {phase === 'failed' && (
        <>
          <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: dark ? '#2a2a2c' : '#f2f2f4' }}>
            <X size={34} style={{ color: '#E0559A' }} strokeWidth={3} />
          </div>
          <h1 className="text-[22px] font-extrabold mt-4" style={{ color: ink }}>{t.pay_failed_title}</h1>
          <p className="text-[14px] mt-2 max-w-[320px]" style={{ color: sub }}>
            {payment?.status === 'AMOUNT_MISMATCH' ? t.pay_failed_mismatch : t.pay_failed_sub}
          </p>
          <button
            onClick={goBack}
            className="mt-7 w-full max-w-[320px] h-14 rounded-2xl text-white text-[16px] font-bold"
            style={{ background: '#F370A7' }}
          >
            {t.pay_back}
          </button>
        </>
      )}
    </div>
  );
}
