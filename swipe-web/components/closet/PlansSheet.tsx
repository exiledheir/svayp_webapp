import React, { useEffect, useRef, useState } from 'react';
import { X, Loader2, Check, Crown } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { apiErrorCode } from '@/lib/api';
import { logAnalyticsEvent } from '@/lib/analytics';
import { Events } from '@/lib/analytics-events';
import { reportPurchaseFunnel } from '@/lib/purchase-funnel';
import PaymentLogo from '@/components/closet/PaymentLogos';
import PromoSection from '@/components/closet/PromoSection';
import PromoSuccessSheet from '@/components/closet/PromoSuccessSheet';
import { fetchMyPromo, type MyPromo, type PromoApplied } from '@/lib/promo';
import { planSubtitle, planTitle, type Entitlements, type SubscriptionPlanView } from '@/lib/entitlements';
import {
  createSubscriptionPayment,
  goToCheckout,
  rememberPendingPayment,
  visiblePaymentProviders,
  type PaymentOptions,
  type PaymentProvider,
} from '@/lib/payments';

const PROVIDER_LABEL: Record<PaymentProvider, string> = {
  PAYME: 'Payme',
  CLICK: 'Click',
  PAYLOV: 'Paylov',
  UZUM: 'Uzum',
};

/**
 * Экран тарифов: карточки планов, промокод и оплата.
 *
 * Цену НЕ считаем на клиенте. Сервер отдаёт `finalPriceUzs` уже с промо-скидкой, и он же
 * выставит ровно эту сумму в чекауте — при строгой сверке суммы на бэкенде любое локальное
 * округление означало бы, что оплата не пройдёт вообще.
 *
 * Способы оплаты — общий список с покупкой алмазов (`visiblePaymentProviders`): два разных
 * набора в одном приложении невозможно объяснить в поддержке.
 */
export default function PlansSheet({
  entitlements,
  dark,
  onClose,
  onPromoApplied,
  paymentOptions = null,
  trigger,
}: {
  entitlements: Entitlements;
  dark: boolean;
  onClose: () => void;
  /** Промокод меняет цену и баланс — родитель перечитывает состояние. */
  onPromoApplied?: () => void;
  paymentOptions?: PaymentOptions | null;
  /** Что привело сюда пользователя — уходит в воронку. */
  trigger?: string;
}) {
  const { t, locale } = useI18n();

  const plans = entitlements.plans ?? [];
  const [selected, setSelected] = useState<string>(plans[0]?.code ?? '');
  const plan: SubscriptionPlanView | undefined = plans.find((p) => p.code === selected) ?? plans[0];

  const providers = visiblePaymentProviders(paymentOptions);
  const onlineEnabled = !!paymentOptions?.onlineEnabled && providers.length > 0;
  const [provider, setProvider] = useState<PaymentProvider>(providers[0] ?? 'CLICK');
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState('');
  const [promo, setPromo] = useState<MyPromo | null>(null);
  const [promoSuccess, setPromoSuccess] = useState<PromoApplied | null>(null);
  // Человек снял промокод с этой покупки. Право на скидку при этом не тратится — сервер
  // просто считает полную цену, и код останется доступен для следующей покупки.
  const [promoSkipped, setPromoSkipped] = useState(false);

  useEffect(() => {
    fetchMyPromo()
      .then(setPromo)
      .catch(() => {});
    logAnalyticsEvent(Events.UPGRADE_MODAL_SHOWN, { trigger: trigger ?? 'plans' });
    reportPurchaseFunnel('PAYWALL_SHOWN', trigger ?? 'plans');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Шторку могут открыть до ответа /payments/options — тогда в state лежит дефолтный CLICK,
  // которого может не оказаться в серверном списке. Как только список приехал, переводим
  // выбор на первый доступный способ, иначе оплата ушла бы в недоступный шлюз.
  const providerKey = providers.join(',');
  useEffect(() => {
    if (providers.length > 0 && !providers.includes(provider)) {
      setProvider(providers[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [providerKey, provider]);

  // Кнопка «назад» со страницы шлюза восстанавливает страницу из bfcache вместе с состоянием
  // React: кнопка навсегда осталась бы в «Открываем оплату…», а плашка промокода — висеть
  // со скидкой, которую оплата уже потратила. Поэтому не только сбрасываем кнопку, но и
  // перечитываем состояние кода и тарифов.
  useEffect(() => {
    const onShow = (e: PageTransitionEvent) => {
      if (!e.persisted) return;
      setPaying(false);
      fetchMyPromo()
        .then(setPromo)
        .catch(() => {});
      onPromoApplied?.();
    };
    window.addEventListener('pageshow', onShow);
    return () => window.removeEventListener('pageshow', onShow);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Swipe-down-to-close: тянем только когда список прокручен вверх, иначе жест дерётся со скроллом.
  const [dragY, setDragY] = useState(0);
  const dragStartRef = useRef<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  function onTouchStart(e: React.TouchEvent) {
    dragStartRef.current = (scrollRef.current?.scrollTop ?? 0) <= 0 ? e.touches[0].clientY : null;
  }
  function onTouchMove(e: React.TouchEvent) {
    if (dragStartRef.current == null) return;
    const dy = e.touches[0].clientY - dragStartRef.current;
    setDragY(dy > 0 ? dy : 0);
  }
  function onTouchEnd() {
    if (dragStartRef.current == null) return;
    const close = dragY > 90;
    dragStartRef.current = null;
    if (close) {
      reportPurchaseFunnel('PAYWALL_DISMISSED', trigger ?? 'plans');
      onClose();
    } else {
      setDragY(0);
    }
  }

  const ink = dark ? '#fff' : '#141118';
  const sub = dark ? '#8e8e93' : '#9a8f98';
  const surface = dark ? '#1c1c1e' : '#fff';
  const line = dark ? '#2a2a2c' : '#ececed';
  const accent = '#F370A7';

  const fmt = (n: number) => n.toLocaleString('uz-UZ');

  async function buy() {
    if (!plan || paying) return;
    setPaying(true);
    setPayError('');
    logAnalyticsEvent(Events.UPGRADE_CTA_TAPPED, { plan: plan.code });
    reportPurchaseFunnel('UPGRADE_CLICKED', trigger ?? 'plans');
    try {
      const payment = await createSubscriptionPayment(plan.code, provider, promoSkipped);
      if (!payment.checkoutUrl) {
        setPayError(t.cn_pay_error);
        setPaying(false);
        return;
      }
      // Пользователь может не вернуться по return_url (провайдер уводит в своё приложение) —
      // сохраняем id, чтобы страница возврата нашла платёж и без query-параметров.
      rememberPendingPayment(payment.paymentId);
      // Блокировку не снимаем: дальше переход на страницу шлюза, он занимает ещё секунду.
      goToCheckout(payment.checkoutUrl);
    } catch (err) {
      const code = apiErrorCode(err);
      // Каждый код лечится по-своему: «способ не подключён» не пройдёт и со второй попытки,
      // а выключенная продажа — вообще не про этого пользователя.
      if (code === 'PAYMENT_PROVIDER_UNAVAILABLE') setPayError(t.cn_pay_provider_down);
      else if (code === 'SUBSCRIPTION_DOWNGRADE_NOT_ALLOWED') setPayError(t.pl_downgrade_blocked);
      else if (code === 'PLANS_PURCHASE_DISABLED' || code === 'PLAN_NOT_FOUND') setPayError(t.pl_unavailable);
      else setPayError(t.cn_pay_error);
      setPaying(false);
    }
  }

  const activeUntil = entitlements.endsAt
    ? new Date(entitlements.endsAt).toLocaleDateString(locale === 'en' ? 'en-GB' : 'ru-RU')
    : null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center"
      style={{ background: 'rgba(15,8,14,0.5)' }}
      onClick={() => {
        reportPurchaseFunnel('PAYWALL_DISMISSED', trigger ?? 'plans');
        onClose();
      }}
    >
      <div
        className="w-full max-w-[460px] rounded-t-3xl flex flex-col"
        style={{
          background: surface,
          maxHeight: '94%',
          transform: dragY ? `translateY(${dragY}px)` : undefined,
          transition: dragStartRef.current == null ? 'transform 0.25s ease' : 'none',
        }}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-9 h-1 rounded-full" style={{ background: dark ? '#3a3a3c' : '#e2dbe1' }} />
        </div>
        <button
          onClick={onClose}
          aria-label={t.close}
          className="absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center"
          style={{ color: sub }}
        >
          <X size={20} />
        </button>

        <div ref={scrollRef} className="px-5 pb-8 overflow-y-auto">
          <div className="flex flex-col items-center text-center pt-2 pb-1">
            <Crown size={40} color={accent} />
            <h2 className="text-[20px] font-extrabold mt-2" style={{ color: ink }}>
              {t.pl_title}
            </h2>
            {entitlements.tier !== 'FREE' && activeUntil && (
              <p className="text-[13px] mt-1" style={{ color: sub }}>
                {t.pl_active_until.replace('{date}', activeUntil)}
              </p>
            )}
          </div>

          {plans.length === 0 && (
            <p className="text-[14px] text-center mt-6" style={{ color: sub }}>
              {t.pl_empty}
            </p>
          )}

          {/* Карточки тарифов */}
          <div className="flex flex-col gap-2.5 mt-4">
            {plans.map((p) => {
              const active = p.code === plan?.code;
              // Сняли промокод — показываем полную цену: карточка обязана совпадать с тем,
              // что выставит чекаут, иначе человек увидит в банке другую сумму.
              const discounted = !promoSkipped && p.discountPercent > 0;
              return (
                <button
                  key={p.code}
                  onClick={() => {
                    setSelected(p.code);
                    setPayError('');
                    reportPurchaseFunnel('PLAN_SELECTED', trigger ?? 'plans');
                  }}
                  className="relative w-full rounded-2xl px-4 py-3.5 flex items-center justify-between gap-3 text-left active:scale-[0.99] transition-transform"
                  style={{
                    border: `1.5px solid ${active ? accent : line}`,
                    background: active ? (dark ? 'rgba(243,112,167,0.12)' : '#fdeef6') : 'transparent',
                  }}
                >
                  {p.badge && (
                    <span
                      className="absolute -top-2 left-4 px-2 py-0.5 rounded-full text-[10px] font-extrabold text-white whitespace-nowrap"
                      style={{ background: accent }}
                    >
                      {p.badge === 'BEST_VALUE' ? t.pl_badge_best : t.pl_badge_popular}
                    </span>
                  )}
                  <span className="min-w-0">
                    <span className="flex items-center gap-1.5">
                      {active && <Check size={15} color={accent} />}
                      <span className="text-[16px] font-extrabold" style={{ color: ink }}>
                        {planTitle(p, locale)}
                      </span>
                    </span>
                    <span className="block text-[12px] mt-0.5" style={{ color: sub }}>
                      {planSubtitle(p, locale) ?? t.pl_duration.replace('{n}', String(p.durationDays))}
                    </span>
                  </span>
                  <span className="flex flex-col items-end shrink-0">
                    {discounted && (
                      <span className="text-[11px] line-through" style={{ color: sub }}>
                        {fmt(p.priceUzs)}
                      </span>
                    )}
                    <span className="text-[15px] font-extrabold" style={{ color: discounted ? accent : ink }}>
                      {fmt(discounted ? p.finalPriceUzs : p.priceUzs)} {t.cn_currency}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          {/* Что даёт выбранный тариф — из тех же лимитов, что энфорсит сервер */}
          {plan && (
            <ul className="mt-4 flex flex-col gap-1.5">
              <PerkRow ink={ink} accent={accent} text={limitText(t.pl_perk_tryon, plan.limits.tryOnMonthly, t.pl_unlimited)} />
              <PerkRow ink={ink} accent={accent} text={limitText(t.pl_perk_outfits, plan.limits.regenMonthly, t.pl_unlimited)} />
              <PerkRow ink={ink} accent={accent} text={limitText(t.pl_perk_items, plan.limits.wardrobeItems, t.pl_unlimited)} />
              {plan.limits.mlDailyOutfits && <PerkRow ink={ink} accent={accent} text={t.pl_perk_ai} />}
            </ul>
          )}

          {/* Промокод — тот же компонент, что и в покупке алмазов: право на скидку общее */}
          <PromoSection
            promo={promoSkipped ? null : promo}
            dark={dark}
            allowReplaceWhileActive={false}
            onDismiss={() => setPromoSkipped(true)}
            onApplied={(result) => {
              setPromoSuccess(result);
              fetchMyPromo()
                .then(setPromo)
                .catch(() => {});
              // Цена тарифа зависит от промокода и считается на сервере — просим родителя
              // перечитать энтайтлменты, иначе на карточке останется старая сумма.
              onPromoApplied?.();
            }}
          />

          {onlineEnabled && (
            <>
              <p className="text-[13px] font-semibold mt-4 mb-1.5" style={{ color: sub }}>
                {t.cn_pay_method}
              </p>
              <div
                className="grid gap-2"
                style={{ gridTemplateColumns: `repeat(${Math.min(providers.length, 3)}, minmax(0, 1fr))` }}
              >
                {providers.map((p) => {
                  const active = provider === p;
                  return (
                    <button
                      key={p}
                      aria-label={PROVIDER_LABEL[p]}
                      onClick={() => {
                        setProvider(p);
                        // Ошибка относится к КОНКРЕТНОМУ способу: иначе сообщение от прошлой
                        // попытки виснет под другим провайдером и читается как его ошибка.
                        setPayError('');
                      }}
                      className="h-11 rounded-xl flex items-center justify-center active:scale-[0.98] transition-transform"
                      style={{
                        border: `1.5px solid ${active ? accent : line}`,
                        background: active ? (dark ? 'rgba(243,112,167,0.12)' : '#fdeef6') : 'transparent',
                      }}
                    >
                      <PaymentLogo provider={p} ink={ink} dark={dark} />
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {payError && (
            <p className="text-[13px] mt-3 text-center" style={{ color: '#E0559A' }}>
              {payError}
            </p>
          )}

          {/* Кнопка может быть неактивна по двум разным причинам, и молчащая серая кнопка
              одинаково выглядит в обоих случаях. Говорим, что именно мешает. */}
          {plans.length > 0 && !onlineEnabled && (
            <p className="text-[13px] mt-4 text-center" style={{ color: sub }}>
              {t.pl_payment_unavailable}
            </p>
          )}
          {plans.length > 0 && onlineEnabled && plan && !plan.purchasable && (
            <p className="text-[13px] mt-4 text-center" style={{ color: sub }}>
              {t.pl_sales_disabled}
            </p>
          )}

          <button
            onClick={buy}
            disabled={!plan || !plan.purchasable || !onlineEnabled || paying}
            className="w-full h-14 rounded-2xl mt-4 text-white text-[16px] font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-40"
            style={{ background: accent }}
          >
            {paying ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                {t.cn_pay_redirecting}
              </>
            ) : (
              <>
                <Crown size={18} />
                {t.pl_buy}
              </>
            )}
          </button>
        </div>
      </div>

      {promoSuccess && (
        <PromoSuccessSheet result={promoSuccess} dark={dark} onClose={() => setPromoSuccess(null)} />
      )}
    </div>
  );
}

/** `null` в лимите означает безлимит — показываем словом, а не пустым местом. */
function limitText(template: string, value: number | null, unlimited: string): string {
  return template.replace('{n}', value === null ? unlimited : String(value));
}

function PerkRow({ ink, accent, text }: { ink: string; accent: string; text: string }) {
  return (
    <li className="flex items-start gap-2">
      <Check size={16} color={accent} className="mt-0.5 shrink-0" />
      <span className="text-[14px]" style={{ color: ink }}>
        {text}
      </span>
    </li>
  );
}
