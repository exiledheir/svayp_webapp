import React, { useState } from 'react';
import { Check, Search } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

export interface OptionItem {
  value: string;
  label: string;
  hex?: string; // for color swatches
}

interface Props {
  open: boolean;
  title: string;
  options: OptionItem[];
  value: string | null;
  onSelect: (value: string) => void;
  onClose: () => void;
  /** Show a filter input above the list (for long lists like countries). */
  searchable?: boolean;
}

/**
 * Generic bottom-sheet single-select list (Бренд / Размер / Цвет …). Mirrors the
 * shop category sheet chrome. Color options render a swatch when `hex` is set.
 */
export default function OptionSheet({ open, title, options, value, onSelect, onClose, searchable }: Props) {
  const { t } = useI18n();
  const [query, setQuery] = useState('');
  if (!open) return null;

  const q = query.trim().toLowerCase();
  const shown = q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options;

  return (
    <div
      className="absolute inset-0 z-[70] flex flex-col justify-end"
      style={{ background: 'rgba(0,0,0,0.4)' }}
      onClick={onClose}
    >
      <div
        className="flex flex-col bg-white dark:bg-[#1c1c1e]"
        style={{ borderRadius: '24px 24px 0 0', maxHeight: '78vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 pt-4 pb-2 shrink-0">
          <div className="w-9 h-1 rounded-full mx-auto mb-3" style={{ background: 'rgba(128,128,128,0.4)' }} />
          <h2 className="text-[16px] font-bold text-center text-black dark:text-white">{title}</h2>
          {searchable && (
            <div className="flex items-center gap-2 px-3.5 h-11 rounded-xl mt-3" style={{ background: 'rgba(128,128,128,0.10)' }}>
              <Search size={16} className="text-black/40 dark:text-white/40 shrink-0" />
              <input
                value={query}
                autoFocus
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t.mk_search}
                className="flex-1 bg-transparent outline-none text-[15px] text-black dark:text-white"
              />
            </div>
          )}
        </div>
        <div className="px-5 overflow-y-auto flex-1">
          {shown.map((opt) => {
            const active = opt.value === value;
            return (
              <button
                key={opt.value}
                className="w-full flex items-center gap-3 py-3.5 border-b border-black/5 dark:border-white/10 text-left"
                onClick={() => { onSelect(opt.value); onClose(); }}
              >
                {opt.hex && (
                  <span
                    className="w-6 h-6 rounded-full shrink-0 border border-black/10"
                    style={{ background: opt.hex }}
                  />
                )}
                <span className={`flex-1 text-[15px] ${active ? 'font-bold' : 'font-normal'} text-black dark:text-white`}>
                  {opt.label}
                </span>
                <span
                  className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                  style={{
                    border: active ? 'none' : '1.5px solid rgba(128,128,128,0.4)',
                    background: active ? '#F370A7' : 'transparent',
                  }}
                >
                  {active && <Check size={14} strokeWidth={3} color="white" />}
                </span>
              </button>
            );
          })}
        </div>
        <div className="px-5 pt-3 pb-6 shrink-0" style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom, 1.5rem))' }}>
          <button
            onClick={onClose}
            className="w-full py-3.5 rounded-2xl text-white font-semibold text-[15px] active:opacity-90"
            style={{ background: '#F370A7' }}
          >
            {t.mk_apply}
          </button>
        </div>
      </div>
    </div>
  );
}
