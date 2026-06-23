import React, { useMemo, useState } from 'react';
import { X, Sparkles, ChevronRight, Check } from 'lucide-react';
import MarketCategorySheet from '@/components/market/MarketCategorySheet';
import { suggestCategory, getCategory } from '@/lib/market-attributes';
import { useI18n } from '@/lib/i18n';
import StepScaffold from './StepScaffold';
import type { StepProps } from './types';

const TITLE_MAX = 50;
const DESC_MAX = 1000;

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
        ctaDisabled={title.trim().length < 2 || !effective}
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

        {/* Category — chosen card (explicit pick or AI suggestion), then picker. */}
        <label className="block text-[15px] font-bold text-black dark:text-white mt-6 mb-2">
          {t.mk_categories}{isSuggestion ? ' ✨' : ''}
        </label>
        {effective && (
          <button
            onClick={() => patch({ category: effective.key })}
            className="w-full flex items-center gap-3 p-4 rounded-2xl text-left"
            style={{ border: '1.5px solid #F370A7' }}
          >
            <Sparkles size={18} className="text-[#F370A7] shrink-0" />
            <span className="flex-1">
              <span className="block text-[15px] font-semibold text-black dark:text-white">{effective.label}</span>
              <span className="block text-[12px] text-black/45 dark:text-white/45">
                {effective.parent}{isSuggestion ? ` · ${t.mk_category_suggested}` : ''}
              </span>
            </span>
            <span className="w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ background: '#F370A7' }}>
              <Check size={14} strokeWidth={3} color="white" />
            </span>
          </button>
        )}
        <button
          onClick={() => setShowSheet(true)}
          className="w-full flex items-center justify-between p-3.5 mt-2.5 rounded-2xl"
          style={{ background: 'rgba(128,128,128,0.10)' }}
        >
          <span className="text-[14px] font-semibold text-black dark:text-white">
            {effective ? t.mk_category_other : t.mk_category_choose}
          </span>
          <ChevronRight size={18} className="text-black/35 dark:text-white/35" />
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
