import React from 'react';
import { MARKET_CATEGORIES, categoryLabel, categoryParentLabel } from '@/lib/market-attributes';
import { useI18n } from '@/lib/i18n';

interface Props {
  open: boolean;
  value: string | null; // selected category key, or null
  onSelect: (key: string | null) => void;
  onClose: () => void;
  /** Show an "All categories" row (feed filter). Hidden in the create wizard. */
  includeAll?: boolean;
}

export default function MarketCategorySheet({ open, value, onSelect, onClose, includeAll }: Props) {
  const { t, locale } = useI18n();
  if (!open) return null;

  return (
    <div
      className="absolute inset-0 z-[60] flex flex-col justify-end"
      style={{ background: 'rgba(0,0,0,0.4)' }}
      onClick={onClose}
    >
      <div
        className="px-5 pt-4 pb-8 overflow-y-auto bg-white dark:bg-[#1c1c1e]"
        style={{ borderRadius: '24px 24px 0 0', maxHeight: '72vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-9 h-1 rounded-full mx-auto mb-4" style={{ background: 'rgba(128,128,128,0.4)' }} />
        <h2 className="text-[16px] font-bold mb-3 text-black dark:text-white">{t.mk_categories}</h2>
        <div className="flex flex-col">
          {includeAll && (
            <Row
              label={t.mk_all_categories}
              active={value === null}
              onClick={() => { onSelect(null); onClose(); }}
            />
          )}
          {MARKET_CATEGORIES.map((cat) => (
            <Row
              key={cat.key}
              label={categoryLabel(cat.key, locale)}
              sub={categoryParentLabel(cat, locale)}
              active={value === cat.key}
              onClick={() => { onSelect(cat.key); onClose(); }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function Row({ label, sub, active, onClick }: { label: string; sub?: string; active: boolean; onClick: () => void }) {
  return (
    <button
      className="flex items-center justify-between py-3 px-2 rounded-xl text-left"
      style={{ background: active ? 'rgba(243,112,167,0.10)' : 'transparent' }}
      onClick={onClick}
    >
      <span>
        <span className="block text-[14px]" style={{ fontWeight: active ? 700 : 500 }}>
          <span className={active ? 'text-[#F370A7]' : 'text-black dark:text-white'}>{label}</span>
        </span>
        {sub && <span className="block text-[11px] text-black/40 dark:text-white/40 mt-0.5">{sub}</span>}
      </span>
      {active && <div className="w-2 h-2 rounded-full" style={{ background: '#F370A7' }} />}
    </button>
  );
}
