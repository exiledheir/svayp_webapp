import React, { useMemo, useState } from 'react';
import { X, Sparkles, ChevronRight } from 'lucide-react';
import MarketCategorySheet from '@/components/market/MarketCategorySheet';
import { suggestCategory, getCategory } from '@/lib/market-attributes';
import { useI18n } from '@/lib/i18n';
import StepScaffold from './StepScaffold';
import type { StepProps } from './types';

const TITLE_MAX = 50;
const DESC_MAX = 1000;
// Brand purple — matches the Market palette.
const PURPLE = '#8E5BD6';

/** Combined step: title + AI-suggested category + description, on one page. */
export default function DetailsStep({ form, patch, onNext }: StepProps) {
  const { t } = useI18n();
  const [showSheet, setShowSheet] = useState(false);
  const title = form.title ?? '';
  const desc = form.description ?? '';

  const suggested = useMemo(() => suggestCategory(title), [title]);
  const selected = getCategory(form.category) ?? null;
  // Effective category = the user's explicit pick, else the AI suggestion (if
  // any). No default — when neither exists the user must choose one to continue.
  const effective = selected ?? suggested;
  const isSuggestion = !selected && !!suggested;

  return (
    <>
      <StepScaffold
        title={t.mk_details_title}
        ctaLabel={t.mk_continue}
        ctaDisabled={title.trim().length < 2 || !effective || desc.trim().length === 0}
        onCta={() => { if (effective) patch({ category: effective.key }); onNext(); }}
      >
        {/* Title */}
        <label className="block text-[15px] font-bold text-black dark:text-white mb-2">{t.mk_title_title}</label>
        <div className="flex items-center gap-2 px-4 h-14 rounded-2xl" style={{ background: 'rgba(128,128,128,0.10)' }}>
          <input
            value={title}
            maxLength={TITLE_MAX}
            autoFocus
            onChange={(e) => patch({ title: e.target.value })}
            placeholder={t.mk_title_placeholder}
            className="flex-1 bg-transparent outline-none text-[16px] text-black dark:text-white"
          />
          {title && (
            <button onClick={() => patch({ title: '' })} aria-label="Clear">
              <X size={18} className="text-black/40 dark:text-white/40" />
            </button>
          )}
        </div>
        <p className="text-right text-[12px] text-black/40 dark:text-white/40 mt-1.5">{title.length}/{TITLE_MAX}</p>

        {/* Category — single self-updating selector. Opens the picker; reflects the
            current pick (or the AI suggestion). No redundant "other category" row. */}
        <label className="block text-[15px] font-bold text-black dark:text-white mt-6 mb-2">
          {t.mk_categories}{isSuggestion ? ' ✨' : ''}
        </label>
        <button
          onClick={() => setShowSheet(true)}
          className="w-full flex items-center gap-3 p-4 rounded-2xl text-left"
          style={{
            border: effective ? `1.5px solid ${PURPLE}` : '1.5px solid transparent',
            background: effective ? 'transparent' : 'rgba(128,128,128,0.10)',
          }}
        >
          <span className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: 'rgba(142,91,214,0.12)' }}>
            <Sparkles size={18} style={{ color: PURPLE }} />
          </span>
          <span className="flex-1 min-w-0">
            {effective ? (
              <>
                <span className="block text-[15px] font-semibold text-black dark:text-white truncate">{effective.label}</span>
                <span className="block text-[12px] text-black/45 dark:text-white/45 truncate">
                  {effective.parent}{isSuggestion ? ` · ${t.mk_category_suggested}` : ''}
                </span>
              </>
            ) : (
              <span className="text-[15px] font-semibold text-black/40 dark:text-white/40">{t.mk_category_choose}</span>
            )}
          </span>
          <ChevronRight size={18} className="text-black/35 dark:text-white/35 shrink-0" />
        </button>

        {/* Description */}
        <label className="block text-[15px] font-bold text-black dark:text-white mt-6 mb-2">{t.mk_desc_title}</label>
        <textarea
          value={desc}
          maxLength={DESC_MAX}
          rows={4}
          onChange={(e) => patch({ description: e.target.value })}
          placeholder={t.mk_desc_placeholder}
          className="w-full p-4 rounded-2xl text-[16px] resize-none outline-none text-black dark:text-white"
          style={{ background: 'rgba(128,128,128,0.10)' }}
        />
        <p className="text-right text-[12px] text-black/40 dark:text-white/40 mt-1.5">{desc.length}/{DESC_MAX}</p>
      </StepScaffold>

      <MarketCategorySheet
        open={showSheet}
        value={form.category ?? null}
        onSelect={(key) => patch({ category: key ?? undefined })}
        onClose={() => setShowSheet(false)}
      />
    </>
  );
}
