import React, { useEffect, useState } from 'react';
import { Loader2, Check, Crown } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { apiErrorCode } from '@/lib/api';
import { logAnalyticsEvent } from '@/lib/analytics';
import { Events } from '@/lib/analytics-events';
import { reportPurchaseFunnel } from '@/lib/purchase-funnel';
import PaymentLogo from '@/components/closet/PaymentLogos';
import PromoSection from '@/components/closet/PromoSection';
import { fetchMyPromo, type MyPromo, type PromoApplied } from '@/lib/promo';
import type { Translations } from '@/lib/translations';
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

/** Граница «месячного» тарифа. Всё, что длиннее, — годовые, их на витрине нет. */
const MONTHLY_MAX_DAYS = 31;

/**
 * Вкладка «Премиум» внутри BillingSheet: карточки планов, промокод и оплата.
 * Оболочку (фон, жест закрытия, крестик, скролл) держит BillingSheet.
 *
 * Цену НЕ считаем на клиенте. Сервер отдаёт `finalPriceUzs` уже с промо-скидкой, и он же
 * выставит ровно эту сумму в чекауте — при строгой сверке суммы на бэкенде любое локальное
 * округление означало бы, что оплата не пройдёт вообще.
 *
 * Способы оплаты — общий список с покупкой алмазов (`visiblePaymentProviders`): два разных
 * набора в одном приложении невозможно объяснить в поддержке.
 */
/**
 * Состояние промокода из ответа на применение.
 *
 * Показываем плашку сразу, не дожидаясь повторного /promo/me: запрос может опоздать или
 * упасть, и тогда только что применённый код исчезал бы с экрана. Ответ применения уже
 * содержит всё нужное, а фоновый refetch потом уточнит владельца кода.
 */
function promoFromApplied(result: PromoApplied): MyPromo {
  const isDiscount = result.type === 'DISCOUNT_PERCENT';
  return {
    code: result.code,
    ownerName: '',
    type: result.type,
    value: result.value,
    activatedAt: new Date().toISOString(),
    discountActive: result.discountActive ?? isDiscount,
    discountPercent: isDiscount ? result.value : null,
    discountExpiresAt: result.discountExpiresAt ?? null,
  };
}

export default function PlansPanel({
  entitlements,
  dark,
  onPromoApplied,
  onPromoSuccess,
  paymentOptions = null,
  trigger,
}: {
  entitlements: Entitlements;
  dark: boolean;
  /** Промокод меняет цену и баланс — родитель перечитывает состояние. */
  onPromoApplied?: () => void;
  /** Плашку «промокод применён» рисует шелл — она перекрывает всю шторку. */
  onPromoSuccess?: (result: PromoApplied) => void;
  paymentOptions?: PaymentOptions | null;
  /** Что привело сюда пользователя — уходит в воронку. */
  trigger?: string;
}) {
  const { t, locale } = useI18n();

  // Годовые тарифы из витрины убраны: выбирают по месячной цене, а четыре карточки
  // превращали вкладку в прайс-лист. Сервер их по-прежнему отдаёт и продаёт — здесь
  // мы только не показываем. Если месячных не осталось совсем (админ выключил их),
  // показываем что есть: пустая витрина хуже неожиданной карточки.
  const allPlans = entitlements.plans ?? [];
  const monthlyPlans = allPlans.filter((p) => p.durationDays <= MONTHLY_MAX_DAYS);
  const plans = monthlyPlans.length > 0 ? monthlyPlans : allPlans;
  const [selected, setSelected] = useState<string>(plans[0]?.code ?? '');
  const plan: SubscriptionPlanView | undefined = plans.find((p) => p.code === selected) ?? plans[0];

  const providers = visiblePaymentProviders(paymentOptions);
  const onlineEnabled = !!paymentOptions?.onlineEnabled && providers.length > 0;
  const [provider, setProvider] = useState<PaymentProvider>(providers[0] ?? 'CLICK');
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState('');
  const [promo, setPromo] = useState<MyPromo | null>(null);
  // Человек снял промокод с этой покупки. Право на скидку при этом не тратится — сервер
  // просто считает полную цену, и код останется доступен для следующей покупки.
  const [promoSkipped, setPromoSkipped] = useState(false);

  useEffect(() => {
    fetchMyPromo()
      .then(setPromo)
      .catch(() => {});
    // Показ пейволла считает BillingSheet: вкладка перемонтируется на каждом
    // переключении, и отсюда один показ уехал бы в аналитику несколько раз.
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

  const ink = dark ? '#fff' : '#141118';
  const sub = dark ? '#8e8e93' : '#9a8f98';
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
    <>
      {/* Название вкладки уже стоит в переключателе сверху — здесь оставляем
          только корону и срок действия купленного тарифа. */}
      <div className="flex flex-col items-center text-center pt-2 pb-1">
        <Crown size={38} color={accent} />
        {entitlements.tier !== 'FREE' && activeUntil && (
          <p className="text-[13px] mt-2" style={{ color: sub }}>
            {t.pl_active_until.replace('{date}', activeUntil)}
          </p>
        )}
      </div>

      {plans.length === 0 && (
        <p className="text-[14px] text-center mt-6" style={{ color: sub }}>
          {t.pl_empty}
        </p>
      )}

      {/* Карточки тарифов — плитками, как пакеты алмазов на соседней вкладке: два
          тарифа стоят рядом со своими лимитами, и выбор делается сравнением колонок,
          а не переключением карточек по очереди.
          Одна колонка — только когда тариф единственный: половина ряда под ним пустует. */}
      <div
        className="grid gap-2.5 mt-4"
        style={{ gridTemplateColumns: `repeat(${plans.length > 1 ? 2 : 1}, minmax(0, 1fr))` }}
      >
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
              className="relative h-full rounded-2xl px-3 pt-4 pb-3 flex flex-col items-center text-center active:scale-[0.98] transition-transform"
              style={{
                border: `1.5px solid ${active ? accent : line}`,
                background: active ? (dark ? 'rgba(243,112,167,0.12)' : '#fdeef6') : 'transparent',
              }}
            >
              {p.badge && (
                <span
                  className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[10px] font-extrabold text-white whitespace-nowrap"
                  style={{ background: accent }}
                >
                  {p.badge === 'BEST_VALUE' ? t.pl_badge_best : t.pl_badge_popular}
                </span>
              )}
              <span className="flex items-center justify-center gap-1">
                {active && <Check size={14} color={accent} className="shrink-0" />}
                <span className="text-[15px] font-extrabold leading-tight" style={{ color: ink }}>
                  {planTitle(p, locale)}
                </span>
              </span>
              <span className="block text-[11px] leading-snug mt-1" style={{ color: sub }}>
                {planSubtitle(p, locale) ?? t.pl_duration.replace('{n}', String(p.durationDays))}
              </span>
              <span className="flex flex-col items-center mt-2">
                {discounted && (
                  <span className="text-[11px] line-through" style={{ color: sub }}>
                    {fmt(p.priceUzs)}
                  </span>
                )}
                <span
                  className="text-[16px] font-extrabold whitespace-nowrap"
                  style={{ color: discounted || active ? accent : ink }}
                >
                  {fmt(discounted ? p.finalPriceUzs : p.priceUzs)} {t.cn_currency}
                </span>
              </span>

              {/* Что даёт тариф — прямо в карточке. Общий список под карточками
                  описывал только выбранный тариф, и чтобы сравнить два, приходилось
                  тыкать в них по очереди и запоминать цифры. */}
              <span className="w-full h-px my-2.5" style={{ background: line }} />
              <span className="flex flex-col gap-1 w-full text-left">
                {planPerks(p, t).map((text) => (
                  <span key={text} className="flex items-start gap-1">
                    <Check size={12} color={accent} className="mt-[3px] shrink-0" />
                    <span className="text-[11px] leading-snug" style={{ color: ink }}>
                      {text}
                    </span>
                  </span>
                ))}
              </span>
            </button>
          );
        })}
      </div>

      {/* Промокод — тот же компонент, что и в покупке алмазов: право на скидку общее */}
      <PromoSection
        promo={promoSkipped ? null : promo}
        dark={dark}
        allowReplaceWhileActive={false}
        onDismiss={() => setPromoSkipped(true)}
        onApplied={(result) => {
          onPromoSuccess?.(result);
          // Новый код отменяет прежнее снятие: иначе плашка только что применённого
          // промокода была бы скрыта флагом от предыдущего отказа.
          setPromoSkipped(false);
          setPromo(promoFromApplied(result));
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
    </>
  );
}

/**
 * Что тариф даёт — строками для карточки. Берём те же лимиты, которые энфорсит сервер,
 * чтобы обещание на витрине не разошлось с тем, что человек реально получит.
 */
function planPerks(plan: SubscriptionPlanView, t: Translations): string[] {
  const rows = [
    limitText(t.pl_perk_tryon, plan.limits.tryOnMonthly, t.pl_unlimited),
    limitText(t.pl_perk_outfits, plan.limits.regenMonthly, t.pl_unlimited),
  ];
  // Улучшения фото: ноль — это «только за монеты», перком такое не назовёшь.
  if (plan.limits.enhanceMonthly !== 0) {
    rows.push(limitText(t.pl_perk_enhance, plan.limits.enhanceMonthly, t.pl_unlimited));
  }
  // Кап вещей снят у всех тиров, и «без ограничений» здесь не преимущество тарифа —
  // строку показываем, только если админ вернул капу конкретное число.
  if (plan.limits.wardrobeItems !== null) {
    rows.push(limitText(t.pl_perk_items, plan.limits.wardrobeItems, t.pl_unlimited));
  }
  if (plan.limits.mlDailyOutfits) rows.push(t.pl_perk_ai);
  return rows;
}

/** `null` в лимите означает безлимит — показываем словом, а не пустым местом. */
function limitText(template: string, value: number | null, unlimited: string): string {
  return template.replace('{n}', value === null ? unlimited : String(value));
}
