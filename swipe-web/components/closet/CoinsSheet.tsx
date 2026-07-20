import React, { useRef, useState } from 'react';
import { X } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import Diamond from '@/components/closet/Diamond';
import { coinsPrice, coinPackages, actionCosts, type CoinPricing } from '@/lib/coins';
import { logAnalyticsEvent } from '@/lib/analytics';
import { Events } from '@/lib/analytics-events';
import { isInFlutterWebView } from '@/lib/flutter-bridge';

// Use the t.me host: the native WebView's navigation delegate intercepts t.me
// links and opens them EXTERNALLY (native Telegram app), whereas telegram.me is
// not intercepted and loads the web landing page inside the WebView instead.
const TG_ADMIN = 'https://t.me/libasai_admin';

/**
 * Buy-diamonds sheet (coins BRD, stage 1: manual Telegram top-up). Shows the
 * balance, the action price-list, ready packages with the 200+ discount, a
 * free-form amount with live totals, the non-refundable warning, and a "Buy"
 * button that opens Telegram with a prefilled message. No in-app payment yet.
 */
export default function CoinsSheet({
  balance,
  needMore = false,
  dark,
  onClose,
  pricing = null,
}: {
  balance: number;
  needMore?: boolean;
  dark: boolean;
  onClose: () => void;
  /** Прайс с сервера (/app/coins/pricing). null → фолбэк на локальные константы. */
  pricing?: CoinPricing | null;
}) {
  const { t } = useI18n();
  const packages = coinPackages(pricing);
  const cost = actionCosts(pricing);
  const [qty, setQty] = useState<number>(packages[0]);

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
  const price = coinsPrice(qty, pricing);

  function buy() {
    if (qty < 1) return;
    const priceStr = `${fmt(price.total)} ${t.cn_currency}`;
    const msg = t.cn_tg_msg.replace('{n}', String(qty)).replace('{price}', priceStr);
    logAnalyticsEvent(Events.UPGRADE_CTA_TAPPED);
    const url = `${TG_ADMIN}?text=${encodeURIComponent(msg)}`;
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

  const actions = [
    { label: t.cn_do_upload, cost: 0, free: true },
    { label: t.cn_do_outfit, cost: cost.createOutfit, free: false },
    { label: t.cn_do_beautify, cost: cost.beautify, free: false },
    { label: t.cn_do_tryon, cost: cost.tryOn, free: false },
  ];

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

          {/* Action price-list */}
          <div className="rounded-2xl mt-4 overflow-hidden" style={{ background: rowBg, border: `1px solid ${line}` }}>
            <p className="text-[12px] font-bold px-4 pt-3 pb-1 uppercase tracking-wide" style={{ color: sub }}>{t.cn_do_title}</p>
            {actions.map((a, i) => (
              <div key={a.label} className="flex items-center justify-between px-4 py-2.5" style={i > 0 ? { borderTop: `1px solid ${line}` } : undefined}>
                <span className="text-[14px] font-semibold" style={{ color: ink }}>{a.label}</span>
                {a.free ? (
                  <span className="text-[13px] font-bold" style={{ color: '#2FB27A' }}>{t.cn_free}</span>
                ) : (
                  <span className="flex items-center gap-1 text-[14px] font-bold" style={{ color: ink }}><Diamond size={14} />{a.cost}</span>
                )}
              </div>
            ))}
          </div>

          {/* Packages */}
          <p className="text-[15px] font-extrabold mt-5 mb-2.5" style={{ color: ink }}>{t.cn_pack_title}</p>
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

          {/* Custom amount */}
          <p className="text-[13px] font-semibold mt-4 mb-1.5" style={{ color: sub }}>{t.cn_custom}</p>
          <input
            type="number"
            min={1}
            inputMode="numeric"
            value={qty || ''}
            onChange={(e) => setQty(Math.max(0, parseInt(e.target.value, 10) || 0))}
            placeholder={t.cn_custom_ph}
            className="w-full h-12 rounded-2xl px-4 text-[15px] font-semibold outline-none"
            style={{ background: rowBg, border: `1.5px solid ${line}`, color: ink }}
          />

          {/* Live total + discount */}
          <div className="flex items-center justify-between mt-3">
            <span className="text-[13px]" style={{ color: sub }}>{t.cn_total}</span>
            <span className="flex items-baseline gap-2">
              {price.discountPct > 0 && <span className="text-[12px] line-through" style={{ color: sub }}>{fmt(price.original)}</span>}
              <span className="text-[17px] font-extrabold" style={{ color: ink }}>{fmt(price.total)} {t.cn_currency}</span>
              {price.discountPct > 0 && <span className="text-[11px] font-extrabold px-1.5 py-0.5 rounded-full text-white" style={{ background: '#F370A7' }}>{t.cn_off.replace('{n}', String(price.discountPct))}</span>}
            </span>
          </div>

          {/* Buy */}
          <button
            onClick={buy}
            disabled={qty < 1}
            className="w-full h-14 rounded-2xl mt-4 text-white text-[16px] font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-40"
            style={{ background: '#F370A7' }}
          >
            <Diamond size={18} />{t.cn_buy.replace('{n}', String(qty || 0))}
          </button>
        </div>
      </div>
    </div>
  );
}
