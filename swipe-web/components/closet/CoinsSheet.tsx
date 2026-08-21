import React, { useEffect, useRef, useState } from 'react';
import { X, Loader2, Crown, ChevronRight } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import Diamond from '@/components/closet/Diamond';
import { coinsPrice, coinPackages, type CoinPricing } from '@/lib/coins';
import { logAnalyticsEvent } from '@/lib/analytics';
import { Events, Params } from '@/lib/analytics-events';
import { isInFlutterWebView } from '@/lib/flutter-bridge';
import { apiErrorCode } from '@/lib/api';
import PaymentLogo from '@/components/closet/PaymentLogos';
import PromoSection from '@/components/closet/PromoSection';
import PromoSuccessSheet from '@/components/closet/PromoSuccessSheet';
import { fetchMyPromo, fetchPromoQuote, type MyPromo, type PromoApplied, type PromoQuote } from '@/lib/promo';
import {
  createCoinPayment,
  goToCheckout,
  rememberPendingPayment,
  type PaymentOptions,
  type PaymentProvider,
} from '@/lib/payments';

// Use the t.me host: the native WebView's navigation delegate intercepts t.me
// links and opens them EXTERNALLY (native Telegram app), whereas telegram.me is
// not intercepted and loads the web landing page inside the WebView instead.
const TG_ADMIN = 'https://t.me/libasai_admin';

/** Названия провайдеров — теперь только для aria-label: в кнопках стоят логотипы. */
const PROVIDER_LABEL: Record<PaymentProvider, string> = {
  PAYME: 'Payme',
  CLICK: 'Click',
  PAYLOV: 'Paylov',
  UZUM: 'Uzum',
};

/**
 * Paylov скрыт из интерфейса решением продукта: остальные три бренда узнаваемы
 * по логотипам, а сервер по-прежнему может присылать его в списке — фильтруем
 * на клиенте, чтобы не ждать правку бэка.
 */
const HIDDEN_PROVIDERS: PaymentProvider[] = ['PAYLOV'];

/**
 * Порядок способов оплаты на экране. Сервер отдаёт providers в своём порядке,
 * поэтому раскладываем сами: Click идёт первым и он же выбран по умолчанию.
 * Незнакомые провайдеры уезжают в конец, а не в начало (indexOf вернул бы -1).
 */
const PROVIDER_ORDER: PaymentProvider[] = ['CLICK', 'PAYME', 'UZUM', 'PAYLOV'];
const providerRank = (p: PaymentProvider) => {
  const i = PROVIDER_ORDER.indexOf(p);
  return i === -1 ? PROVIDER_ORDER.length : i;
};

/**
 * Buy-diamonds sheet. Показывает баланс, готовые пакеты со скидкой 200+, свободную сумму
 * с живым итогом и кнопку покупки.
 *
 * Два режима оплаты:
 *  • онлайн (`paymentOptions.onlineEnabled`) — выбор провайдера и переход на страницу шлюза;
 *  • Telegram — прежний ручной флоу. Он остаётся для всех, кто вне вайтлиста тестового
 *    периода, чтобы возможность купить монеты не пропадала ни у кого.
 *
 * The per-action price list ("what you can do") was dropped on purpose: the
 * sheet opens when someone wants diamonds, and every priced action already
 * shows its own cost at the point of use.
 */
export default function CoinsSheet({
  balance,
  needMore = false,
  dark,
  onClose,
  pricing = null,
  paymentOptions = null,
  onOpenPlans,
}: {
  balance: number;
  needMore?: boolean;
  dark: boolean;
  onClose: () => void;
  /** Прайс с сервера (/app/coins/pricing). null → фолбэк на локальные константы. */
  pricing?: CoinPricing | null;
  /** Способы оплаты с сервера (/payments/options). null → онлайн-оплата недоступна. */
  paymentOptions?: PaymentOptions | null;
  /**
   * Открыть экран тарифов. Не задан — блока «Премиум» в шторке нет: пейволл выключен
   * или каталог пуст, и показывать кнопку, ведущую в пустоту, нельзя.
   */
  onOpenPlans?: () => void;
}) {
  const { t } = useI18n();
  const packages = coinPackages(pricing);
  const [qty, setQty] = useState<number>(packages[0]);

  // Дефолт выбора берём из ВИДИМОГО списка: если сервер пришлёт скрытый провайдер
  // первым, иначе оказался бы выбран способ, которого нет на экране.
  const visibleProviders = (paymentOptions?.providers ?? [])
    .filter((p) => !HIDDEN_PROVIDERS.includes(p))
    .sort((a, b) => providerRank(a) - providerRank(b));
  const onlineEnabled = !!paymentOptions?.onlineEnabled && visibleProviders.length > 0;
  const [provider, setProvider] = useState<PaymentProvider>(visibleProviders[0] ?? 'CLICK');
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState('');

  // Шторку могут открыть до ответа /payments/options — тогда в state лежит дефолтный
  // CLICK, которого может не оказаться в серверном списке. Как только список приехал,
  // переводим выбор на первый доступный способ, иначе оплата ушла бы в недоступный шлюз.
  const providerKey = visibleProviders.join(',');
  useEffect(() => {
    if (visibleProviders.length > 0 && !visibleProviders.includes(provider)) {
      setProvider(visibleProviders[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [providerKey, provider]);

  // Кнопка «назад» со страницы шлюза восстанавливает страницу из bfcache вместе с
  // состоянием React. Без сброса кнопка навсегда осталась бы в «Открываем оплату…»,
  // и повторно заплатить было бы нечем.
  useEffect(() => {
    const onShow = (e: PageTransitionEvent) => {
      if (!e.persisted) return;
      setPaying(false);
      // Оплата могла потратить скидку, а bfcache вернул страницу со старым состоянием —
      // без перечитывания плашка «−20%» висела бы над уже использованным кодом.
      fetchMyPromo()
        .then(setPromo)
        .catch(() => {});
    };
    window.addEventListener('pageshow', onShow);
    return () => window.removeEventListener('pageshow', onShow);
  }, []);

  // Swipe-down-to-close: only start the drag when the content is scrolled to top,
  // so it doesn't fight the scrollable list.
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
    if (close) onClose(); else setDragY(0);
  }

  const ink = dark ? '#fff' : '#141118';
  const sub = dark ? '#8e8e93' : '#9a8f98';
  const surface = dark ? '#1c1c1e' : '#fff';
  const line = dark ? '#2a2a2c' : '#ececed';
  const rowBg = dark ? '#141014' : '#faf7fb';

  const fmt = (n: number) => n.toLocaleString('uz-UZ');
  const tierPrice = coinsPrice(qty, pricing);

  // ── Промокод ───────────────────────────────────────────────────────────────
  // Цена со скидкой приходит С СЕРВЕРА, а не считается локально: минимум платежа,
  // округление и проверка срока живут там, и локальный расчёт разошёлся бы с суммой,
  // которую выставит createCoinPayment. Пока quote не пришёл, показываем тарифную цену —
  // хуже показать цену без скидки на долю секунды, чем показать неверную.
  const [promo, setPromo] = useState<MyPromo | null>(null);
  const [promoQuote, setPromoQuote] = useState<PromoQuote | null>(null);
  const [promoSuccess, setPromoSuccess] = useState<PromoApplied | null>(null);
  // Человек снял промокод с этой покупки: платим полную цену, но право на скидку не тратим —
  // код останется доступен на следующий раз.
  const [promoSkipped, setPromoSkipped] = useState(false);

  useEffect(() => {
    let alive = true;
    fetchMyPromo()
      .then((p) => alive && setPromo(p))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const discountLive = !!promo?.discountActive && !promoSkipped;

  /**
   * Котировка в пути. Нужна отдельным состоянием, потому что до ответа сервера показывать
   * нечего: полная цена заведомо неверна (скидка есть), а считать её на клиенте нельзя —
   * минимум платежа, округление и диапазон живут на сервере, и локальный расчёт разойдётся
   * с суммой, которую выставит платёжка.
   */
  const [quotePending, setQuotePending] = useState(false);

  useEffect(() => {
    if (!discountLive || qty < 1) {
      setPromoQuote(null);
      setQuotePending(false);
      return;
    }
    let alive = true;
    setQuotePending(true);
    const timer = setTimeout(() => {
      fetchPromoQuote(qty)
        .then((q) => {
          if (!alive) return;
          setPromoQuote(q);
          setQuotePending(false);
        })
        .catch(() => {
          if (!alive) return;
          setPromoQuote(null);
          setQuotePending(false);
        });
    }, 250);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [discountLive, qty]);

  const promoApplied = !!promoQuote && promoQuote.discountUzs > 0 && promoQuote.listUzs === tierPrice.total;

  // Код живой, но на выбранное количество не действует. Сравнение listUzs с текущим тиром —
  // защита от устаревшей котировки: количество уже изменилось, а ответ ещё не пришёл.
  const outOfRange =
    !!promoQuote && promoQuote.reason === 'OUT_OF_RANGE' && promoQuote.listUzs === tierPrice.total;
  const rangeHint =
    outOfRange && promoQuote
      ? (promoQuote.minCoins !== null && promoQuote.maxCoins !== null
          ? t.promo_range_between
          : promoQuote.minCoins !== null
            ? t.promo_range_from
            : t.promo_range_to
        )
          .replace('{code}', promoQuote.code ?? '')
          .replace('{min}', String(promoQuote.minCoins ?? ''))
          .replace('{max}', String(promoQuote.maxCoins ?? ''))
      : '';
  const price = promoApplied
    ? {
        total: promoQuote!.finalUzs,
        original: promoQuote!.listUzs,
        // Итоговый процент показываем от суммарной экономии: пользователю важна цифра
        // на ценнике, а не то, какая часть пришла от объёма, а какая от блогера.
        discountPct: Math.round((promoQuote!.discountUzs / promoQuote!.listUzs) * 100),
        perUnit: tierPrice.perUnit,
      }
    : tierPrice;

  function buyViaTelegram() {
    const priceStr = `${fmt(price.total)} ${t.cn_currency}`;
    const msg = t.cn_tg_msg.replace('{n}', String(qty)).replace('{price}', priceStr);
    const url = `${paymentOptions?.telegramUrl || TG_ADMIN}?text=${encodeURIComponent(msg)}`;
    // Inside the Flutter WebView (esp. iOS WKWebView) window.open('_blank') is a
    // no-op — the tap appears to do nothing. A real top-frame navigation instead
    // fires the native navigation delegate, which intercepts the t.me link and
    // launches the Telegram app externally (the page itself never loads).
    if (isInFlutterWebView()) {
      window.location.href = url;
    } else {
      window.open(url, '_blank');
    }
  }

  async function buyOnline() {
    setPaying(true);
    setPayError('');
    try {
      // Отдельный запрос quote отсюда убран: его результат нигде не использовался,
      // а лишний круг к серверу удлинял паузу между нажатием и переходом на оплату.
      // Сумму всё равно считает сервер внутри createCoinPayment — она и уходит в шлюз.
      const payment = await createCoinPayment(qty, provider, promoSkipped);
      if (!payment.checkoutUrl) {
        setPayError(t.cn_pay_error);
        setPaying(false);
        return;
      }
      // Пользователь может не вернуться по return_url (провайдер уводит в своё приложение) —
      // сохраняем id, чтобы страница возврата нашла платёж и без query-параметров.
      rememberPendingPayment(payment.paymentId);
      // Блокировку НЕ снимаем: дальше идёт переход на страницу шлюза, и он занимает
      // ещё секунду-другую. Если вернуть кнопку в обычный вид прямо здесь, экран
      // выглядит так, будто нажатие не сработало, и человек жмёт второй раз.
      goToCheckout(payment.checkoutUrl);
    } catch (err) {
      // «Способ не подключён» — не временный сбой: повтор с тем же провайдером
      // не сработает никогда, поэтому текст прямо предлагает выбрать другой.
      const code = apiErrorCode(err);
      setPayError(code === 'PAYMENT_PROVIDER_UNAVAILABLE' ? t.cn_pay_provider_down : t.cn_pay_error);
      setPaying(false);
    }
  }

  function buy() {
    if (qty < 1 || paying) return;
    logAnalyticsEvent(Events.UPGRADE_CTA_TAPPED);
    if (onlineEnabled) {
      void buyOnline();
    } else {
      buyViaTelegram();
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center" style={{ background: 'rgba(15,8,14,0.5)' }} onClick={onClose}>
      <div
        className="w-full max-w-[460px] rounded-t-3xl flex flex-col"
        style={{ background: surface, maxHeight: '94%', transform: dragY ? `translateY(${dragY}px)` : undefined, transition: dragStartRef.current == null ? 'transform 0.25s ease' : 'none' }}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div className="flex justify-center pt-3 pb-1"><div className="w-9 h-1 rounded-full" style={{ background: dark ? '#3a3a3c' : '#e2dbe1' }} /></div>
        <button onClick={onClose} aria-label={t.close} className="absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center" style={{ color: sub }}><X size={20} /></button>

        <div ref={scrollRef} className="px-5 pb-8 overflow-y-auto">
          {/* Header + balance */}
          <div className="flex flex-col items-center text-center pt-2 pb-1">
            <Diamond size={44} glow />
            <h2 className="text-[20px] font-extrabold mt-2" style={{ color: ink }}>{t.cn_title}</h2>
            <div className="flex items-center gap-1.5 mt-1">
              <Diamond size={15} />
              <span className="text-[15px] font-bold" style={{ color: ink }}>{t.cn_have.replace('{n}', fmt(balance))}</span>
            </div>
            {needMore && <p className="text-[13px] mt-2" style={{ color: '#E0559A' }}>{t.cn_need_more}</p>}
          </div>

          {/* Премиум как альтернатива разовой покупке: человек уже здесь ради лимитов,
              и подписка закрывает ту же потребность на месяц вперёд. */}
          {onOpenPlans && (
            <button
              onClick={onOpenPlans}
              className="w-full mt-4 rounded-2xl px-4 py-3 flex items-center justify-between gap-3 active:scale-[0.99] transition-transform"
              style={{
                border: `1.5px solid ${dark ? 'rgba(243,112,167,0.32)' : '#F8D3E4'}`,
                background: dark ? 'rgba(243,112,167,0.10)' : '#fdeef6',
              }}
            >
              <span className="flex items-center gap-2 min-w-0">
                <Crown size={18} color="#F370A7" />
                <span className="text-left min-w-0">
                  <span className="block text-[14px] font-extrabold" style={{ color: ink }}>{t.pl_title}</span>
                  <span className="block text-[12px]" style={{ color: sub }}>{t.pl_upsell_hint}</span>
                </span>
              </span>
              <ChevronRight size={18} color={sub} />
            </button>
          )}

          {/* Packages */}
          <p className="text-[15px] font-extrabold mt-4 mb-2.5" style={{ color: ink }}>{t.cn_pack_title}</p>
          <div className="grid grid-cols-3 gap-2.5">
            {packages.map((pkg) => {
              const p = coinsPrice(pkg, pricing);
              const active = qty === pkg;
              return (
                <button
                  key={pkg}
                  onClick={() => setQty(pkg)}
                  className="relative rounded-2xl px-2 py-3.5 flex flex-col items-center gap-1 active:scale-[0.97] transition-transform"
                  style={{ border: `1.5px solid ${active ? '#F370A7' : line}`, background: active ? (dark ? 'rgba(243,112,167,0.12)' : '#fdeef6') : 'transparent' }}
                >
                  {p.discountPct > 0 && (
                    <span className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[10px] font-extrabold text-white whitespace-nowrap" style={{ background: '#F370A7' }}>
                      {t.cn_off.replace('{n}', String(p.discountPct))}
                    </span>
                  )}
                  <Diamond size={22} glow={active} />
                  <span className="text-[16px] font-extrabold" style={{ color: ink }}>{pkg}</span>
                  {p.discountPct > 0 && <span className="text-[11px] line-through" style={{ color: sub }}>{fmt(p.original)}</span>}
                  <span className="text-[12px] font-bold" style={{ color: active ? '#F370A7' : ink }}>{fmt(p.total)}</span>
                </button>
              );
            })}
          </div>

          {/* Промокод: строка «Есть промокод?» либо плашка уже привязанного кода */}
          <PromoSection
            promo={promoSkipped ? null : promo}
            dark={dark}
            // Пока скидка действует и применяется к этой покупке, менять нечего: коды не
            // суммируются, и «есть другой промокод?» рядом с уже применённой скидкой читается
            // как «эта не сработала». Поле возвращаем, только если код не подошёл под
            // выбранное количество — иначе человек застрял бы с неподходящим кодом.
            allowReplaceWhileActive={outOfRange}
            onDismiss={() => setPromoSkipped(true)}
            onApplied={(result) => {
              setPromoSuccess(result);
              // Перечитываем состояние: у бонусного кода изменился баланс, у скидочного —
              // появилось право, от которого зависит цена.
              fetchMyPromo()
                .then(setPromo)
                .catch(() => {});
            }}
          />

          {/* Custom amount */}
          <p className="text-[13px] font-semibold mt-4 mb-1.5" style={{ color: sub }}>{t.cn_custom}</p>
          <input
            type="number"
            min={1}
            inputMode="numeric"
            value={qty || ''}
            onChange={(e) => setQty(Math.max(0, parseInt(e.target.value, 10) || 0))}
            placeholder={t.cn_custom_ph}
            className="w-full h-12 rounded-2xl px-4 text-[16px] font-semibold outline-none"
            style={{ background: rowBg, border: `1.5px solid ${line}`, color: ink }}
          />

          {/* Код есть, но на такую покупку не действует — это надо сказать вслух: иначе видно
              только полную цену, и выглядит как «промокод не сработал». */}
          {outOfRange && (
            <p className="text-[12px] mt-2" style={{ color: '#E0559A' }}>
              {rangeHint}
            </p>
          )}

          {/* Live total + discount */}
          <div className="flex items-center justify-between mt-3">
            <span className="text-[13px]" style={{ color: sub }}>{t.cn_total}</span>
            {/* Пока сервер считает цену со скидкой, полную цену НЕ показываем: она заведомо
                неверная, и человек видел бы «24 000 → 16 800» через секунду после открытия. */}
            {quotePending ? (
              <span className="h-[22px] w-28 rounded-lg animate-pulse" style={{ background: line }} />
            ) : (
              <span className="flex items-baseline gap-2">
                {price.discountPct > 0 && <span className="text-[12px] line-through" style={{ color: sub }}>{fmt(price.original)}</span>}
                <span className="text-[17px] font-extrabold" style={{ color: ink }}>{fmt(price.total)} {t.cn_currency}</span>
                {price.discountPct > 0 && <span className="text-[11px] font-extrabold px-1.5 py-0.5 rounded-full text-white" style={{ background: '#F370A7' }}>{t.cn_off.replace('{n}', String(price.discountPct))}</span>}
              </span>
            )}
          </div>

          {/* Способ оплаты — только когда онлайн-оплата доступна этому пользователю */}
          {onlineEnabled && (
            <>
              <p className="text-[13px] font-semibold mt-4 mb-1.5" style={{ color: sub }}>{t.cn_pay_method}</p>
              {/* До трёх колонок: три провайдера встают в один ряд, при двух сетка не разъезжается. */}
              <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(visibleProviders.length, 3)}, minmax(0, 1fr))` }}>
                {visibleProviders.map((p) => {
                  const active = provider === p;
                  return (
                    <button
                      key={p}
                      aria-label={PROVIDER_LABEL[p]}
                      onClick={() => {
                        setProvider(p);
                        // Ошибка относится к КОНКРЕТНОМУ способу оплаты. Если её не убрать,
                        // сообщение от прошлой попытки виснет под другим провайдером и
                        // выглядит как его ошибка — на этом мы сами один раз ошиблись в диагнозе.
                        setPayError('');
                      }}
                      className="h-11 rounded-xl flex items-center justify-center active:scale-[0.98] transition-transform"
                      style={{
                        border: `1.5px solid ${active ? '#F370A7' : line}`,
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

          {payError && <p className="text-[13px] mt-3 text-center" style={{ color: '#E0559A' }}>{payError}</p>}

          {/* Buy */}
          <button
            onClick={buy}
            disabled={qty < 1 || paying}
            className="w-full h-14 rounded-2xl mt-4 text-white text-[16px] font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-40"
            style={{ background: '#F370A7' }}
          >
            {paying ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                {t.cn_pay_redirecting}
              </>
            ) : (
              <>
                <Diamond size={18} />
                {t.cn_buy.replace('{n}', String(qty || 0))}
              </>
            )}
          </button>

          {/* Ручной флоу через админа. Когда онлайн-оплата включена, кнопка «купить» ведёт
              в шлюз, и телеграм-путь становится недостижим — а он единственный выход, если
              у человека не проходит карта. Поэтому оставляем его текстовой ссылкой; при
              выключенной онлайн-оплате основная кнопка и так ведёт в Telegram. */}
          {onlineEnabled && (
            <button
              onClick={() => {
                logAnalyticsEvent(Events.UPGRADE_CTA_TAPPED, { [Params.DESTINATION]: 'telegram_admin' });
                buyViaTelegram();
              }}
              className="w-full mt-3 py-2 text-[13px] font-semibold text-center active:opacity-60 transition-opacity"
              style={{ color: '#E0559A' }}
            >
              {t.cn_tg_contact}
            </button>
          )}
        </div>
      </div>

      {promoSuccess && (
        <PromoSuccessSheet result={promoSuccess} dark={dark} onClose={() => setPromoSuccess(null)} />
      )}
    </div>
  );
}
