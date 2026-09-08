import React, { useRef, useState } from 'react';
import { X, Crown } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import Diamond from '@/components/closet/Diamond';
import CoinsPanel from '@/components/closet/CoinsPanel';
import PlansPanel from '@/components/closet/PlansPanel';
import PromoSuccessSheet from '@/components/closet/PromoSuccessSheet';
import { logAnalyticsEvent } from '@/lib/analytics';
import { Events } from '@/lib/analytics-events';
import { reportPurchaseFunnel } from '@/lib/purchase-funnel';
import type { PromoApplied } from '@/lib/promo';
import type { CoinPricing } from '@/lib/coins';
import type { Entitlements } from '@/lib/entitlements';
import type { PaymentOptions } from '@/lib/payments';

export type BillingTab = 'coins' | 'plans';

/**
 * Единая шторка покупок: разовые алмазы и подписка живут в одном оверлее и
 * переключаются вкладками сверху.
 *
 * Раньше это были две отдельные шторки с двумя кнопками в шапке, и из одной в
 * другую вёл переход-«апселл». Человеку приходилось угадывать, за какой из двух
 * кнопок лежит нужный ему способ заплатить, а шапка теряла место под две плашки.
 *
 * Шелл владеет всей «оболочкой» — фон, жест закрытия, крестик, вкладки и скролл, —
 * а вкладки остаются самостоятельными панелями со своей оплатой и промокодом.
 */
export default function BillingSheet({
  balance,
  needMore = false,
  dark,
  onClose,
  pricing = null,
  paymentOptions = null,
  entitlements = null,
  /** Показывать вкладку «Премиум». false → шторка работает как прежний экран алмазов. */
  plansTab = false,
  initialTab = 'coins',
  trigger,
  onPromoApplied,
}: {
  balance: number;
  needMore?: boolean;
  dark: boolean;
  onClose: () => void;
  /** Прайс с сервера (/app/coins/pricing). null → фолбэк на локальные константы. */
  pricing?: CoinPricing | null;
  /** Способы оплаты с сервера (/payments/options). null → онлайн-оплата недоступна. */
  paymentOptions?: PaymentOptions | null;
  entitlements?: Entitlements | null;
  plansTab?: boolean;
  initialTab?: BillingTab;
  /** Что привело сюда пользователя — уходит в воронку. */
  trigger?: string;
  /** Промокод меняет цену и баланс — родитель перечитывает состояние. */
  onPromoApplied?: () => void;
}) {
  const { t } = useI18n();

  // Вкладка тарифов существует только вместе с энтайтлментами: без каталога
  // показывать нечего, и пустая вкладка хуже её отсутствия.
  const showPlans = plansTab && !!entitlements;
  const [tab, setTab] = useState<BillingTab>(showPlans ? initialTab : 'coins');

  // Открытие шторки уже засчитал тот, кто её открыл. Здесь отмечаем только
  // РУЧНОЙ переход на вкладку тарифов — иначе один показ считался бы дважды.
  const seenPlans = useRef(tab === 'plans');
  function switchTo(next: BillingTab) {
    setTab(next);
    if (next === 'plans' && !seenPlans.current) {
      seenPlans.current = true;
      logAnalyticsEvent(Events.UPGRADE_MODAL_SHOWN, { trigger: 'billing_tab' });
      reportPurchaseFunnel('PAYWALL_SHOWN', 'billing_tab');
    }
  }

  // Плашка успешного промокода живёт в шелле: внутри панели она попала бы в
  // скроллируемый контейнер с transform, где position: fixed считается уже не от
  // экрана, и оверлей встал бы не на весь экран.
  const [promoSuccess, setPromoSuccess] = useState<PromoApplied | null>(null);

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
    if (close) onClose(); else setDragY(0);
  }

  const ink = dark ? '#fff' : '#141118';
  const sub = dark ? '#8e8e93' : '#9a8f98';
  const surface = dark ? '#1c1c1e' : '#fff';
  const track = dark ? '#141014' : '#f4f0f4';
  const accent = '#F370A7';

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center"
      style={{ background: 'rgba(15,8,14,0.5)' }}
      onClick={onClose}
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

        {/* Вкладки. Одна вкладка — не выбор, а лишняя полоса: сегмент-контрол
            показываем только когда тарифы действительно доступны. */}
        {showPlans && (
          <div className="mx-5 mt-2 mb-1 p-1 rounded-2xl flex gap-1 shrink-0" style={{ background: track }}>
            <TabButton
              active={tab === 'coins'}
              onClick={() => switchTo('coins')}
              label={t.cn_title}
              icon={<Diamond size={15} />}
              {...{ ink, sub, surface, accent, dark }}
            />
            <TabButton
              active={tab === 'plans'}
              onClick={() => switchTo('plans')}
              label={t.pl_title}
              icon={<Crown size={15} color={tab === 'plans' ? accent : sub} />}
              {...{ ink, sub, surface, accent, dark }}
            />
          </div>
        )}

        <div ref={scrollRef} className="px-5 pb-8 overflow-y-auto">
          {tab === 'coins' ? (
            <CoinsPanel
              balance={balance}
              needMore={needMore}
              dark={dark}
              // Без вкладок переключателя нет, и шторка осталась бы вообще без названия.
              showTitle={!showPlans}
              pricing={pricing}
              paymentOptions={paymentOptions}
              onPromoSuccess={setPromoSuccess}
            />
          ) : (
            entitlements && (
              <PlansPanel
                entitlements={entitlements}
                dark={dark}
                paymentOptions={paymentOptions}
                trigger={trigger}
                onPromoApplied={onPromoApplied}
                onPromoSuccess={setPromoSuccess}
              />
            )
          )}
        </div>
      </div>

      {promoSuccess && (
        <PromoSuccessSheet result={promoSuccess} dark={dark} onClose={() => setPromoSuccess(null)} />
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  label,
  icon,
  ink,
  sub,
  surface,
  accent,
  dark,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon: React.ReactNode;
  ink: string;
  sub: string;
  surface: string;
  accent: string;
  dark: boolean;
}) {
  return (
    <button
      onClick={onClick}
      role="tab"
      aria-selected={active}
      className="flex-1 h-10 rounded-xl flex items-center justify-center gap-1.5 text-[14px] font-extrabold active:scale-[0.98] transition-all"
      style={{
        background: active ? surface : 'transparent',
        color: active ? ink : sub,
        border: `1px solid ${active ? (dark ? 'rgba(243,112,167,0.32)' : '#F8D3E4') : 'transparent'}`,
        boxShadow: active ? (dark ? 'none' : '0 1px 3px rgba(20,17,24,0.08)') : 'none',
      }}
    >
      <span style={{ opacity: active ? 1 : 0.6, color: active ? accent : sub }}>{icon}</span>
      {label}
    </button>
  );
}
