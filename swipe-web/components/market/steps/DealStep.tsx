import React from 'react';
import { Zap } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import StepScaffold from './StepScaffold';
import type { StepProps } from './types';
import type { MarketCurrency, MarketDealType } from '@/types/market';

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!on)}
      className="w-[52px] h-[30px] rounded-full shrink-0 transition-colors relative"
      style={{ background: on ? '#F370A7' : 'rgba(128,128,128,0.35)' }}
      aria-pressed={on}
    >
      <span className="absolute top-[3px] w-6 h-6 rounded-full bg-white transition-all" style={{ left: on ? 25 : 3 }} />
    </button>
  );
}

export default function DealStep({ form, patch, onNext }: StepProps) {
  const { t } = useI18n();
  const dealType = form.dealType ?? 'sell';
  const currency = form.currency ?? 'UZS';
  const isFree = dealType === 'free';

  function setDeal(d: MarketDealType) {
    patch(d === 'free' ? { dealType: 'free', price: 0 } : { dealType: 'sell' });
  }

  const priceValid = isFree || (form.price ?? 0) > 0;

  return (
    <StepScaffold
      title={t.mk_deal_title}
      ctaLabel={t.mk_continue}
      ctaDisabled={!priceValid}
      onCta={onNext}
    >
      {/* Conditions segmented */}
      <p className="text-[15px] font-bold text-black dark:text-white mb-2">{t.mk_deal_conditions}</p>
      <div className="flex gap-2.5 mb-6">
        {(['sell', 'free'] as MarketDealType[]).map((d) => (
          <button
            key={d}
            onClick={() => setDeal(d)}
            className="flex-1 h-12 rounded-2xl text-[15px] font-semibold"
            style={{ background: dealType === d ? '#111' : 'rgba(128,128,128,0.12)', color: dealType === d ? '#fff' : undefined }}
          >
            <span className={dealType === d ? 'text-white' : 'text-black dark:text-white'}>
              {d === 'sell' ? t.mk_deal_sell : t.mk_deal_free}
            </span>
          </button>
        ))}
      </div>

      {/* Price */}
      {!isFree && (
        <>
          <p className="text-[15px] font-bold text-black dark:text-white mb-2">{t.mk_deal_price}</p>
          <div className="flex gap-2 mb-3">
            {(['UZS', 'USD'] as MarketCurrency[]).map((c) => (
              <button
                key={c}
                onClick={() => patch({ currency: c })}
                className="flex-1 h-11 rounded-xl text-[14px] font-semibold"
                style={{ background: currency === c ? '#fff' : 'rgba(128,128,128,0.10)', border: currency === c ? '1.5px solid #111' : '1.5px solid transparent' }}
              >
                <span className="text-black dark:text-white">{c === 'UZS' ? t.mk_currency_uzs : '$'}</span>
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 px-4 h-14 rounded-2xl" style={{ background: 'rgba(128,128,128,0.10)' }}>
            <input
              type="number"
              inputMode="numeric"
              value={form.price ? String(form.price) : ''}
              onChange={(e) => patch({ price: Math.max(0, parseInt(e.target.value || '0', 10) || 0) })}
              placeholder="0"
              className="flex-1 bg-transparent text-[18px] font-semibold outline-none text-black dark:text-white"
            />
            <span className="text-[16px] font-semibold text-black/45 dark:text-white/45">
              {currency === 'UZS' ? t.mk_currency_uzs : '$'}
            </span>
          </div>
        </>
      )}

      {/* Urgent */}
      {!isFree && (
        <div className="flex items-center gap-3 p-3.5 mt-5 rounded-2xl" style={{ background: 'rgba(128,128,128,0.08)' }}>
          <span className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: '#F370A7' }}>
            <Zap size={18} color="white" fill="white" />
          </span>
          <span className="flex-1 text-[15px] font-medium text-black dark:text-white">{t.mk_deal_urgent}</span>
          <Toggle on={!!form.isUrgent} onChange={(v) => patch({ isUrgent: v })} />
        </div>
      )}
    </StepScaffold>
  );
}
