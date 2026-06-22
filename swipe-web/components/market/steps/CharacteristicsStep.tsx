import React, { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import {
  MARKET_CONDITIONS, MARKET_SEASONS, MARKET_LENGTHS, MARKET_BRANDS,
  MARKET_SIZES, MARKET_SHOE_SIZES, MARKET_COLORS,
  conditionLabel, seasonLabel, lengthLabel, colorLabel, attributesForCategory,
} from '@/lib/market-attributes';
import OptionSheet, { type OptionItem } from '@/components/market/OptionSheet';
import { useI18n } from '@/lib/i18n';
import StepScaffold from './StepScaffold';
import type { StepProps } from './types';
import type { MarketSeason, MarketLength } from '@/types/market';

type SheetKind = 'brand' | 'size' | 'color' | null;

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="px-4 py-2.5 rounded-full text-[14px] font-medium transition-colors"
      style={{
        background: active ? '#111' : 'rgba(128,128,128,0.12)',
        color: active ? '#fff' : undefined,
      }}
    >
      <span className={active ? 'text-white' : 'text-black dark:text-white'}>{children}</span>
    </button>
  );
}

function SelectRow({ label, value, placeholder, onClick }: { label: string; value?: string; placeholder: string; onClick: () => void }) {
  return (
    <div className="mb-1">
      <p className="text-[15px] font-bold text-black dark:text-white mb-2">{label}</p>
      <button
        onClick={onClick}
        className="w-full flex items-center justify-between px-4 h-14 rounded-2xl"
        style={{ background: 'rgba(128,128,128,0.10)' }}
      >
        <span className={`text-[15px] ${value ? 'font-semibold text-black dark:text-white' : 'text-black/40 dark:text-white/40'}`}>
          {value ?? placeholder}
        </span>
        <ChevronRight size={18} className="text-black/35 dark:text-white/35" />
      </button>
    </div>
  );
}

export default function CharacteristicsStep({ form, patch, onNext }: StepProps) {
  const { t } = useI18n();
  const [sheet, setSheet] = useState<SheetKind>(null);
  const flags = attributesForCategory(form.category);

  const brandOptions: OptionItem[] = MARKET_BRANDS.map((b) => ({ value: b, label: b }));
  const sizeOptions: OptionItem[] = (flags.shoeSizes ? MARKET_SHOE_SIZES : MARKET_SIZES).map((s) => ({ value: s, label: s }));
  const colorOptions: OptionItem[] = MARKET_COLORS.map((c) => ({ value: c.key, label: colorLabel(t, c.key), hex: c.hex }));

  return (
    <>
      <StepScaffold
        title={t.mk_char_title}
        ctaLabel={t.mk_continue}
        ctaDisabled={!form.condition}
        onCta={onNext}
      >
        {/* Condition */}
        {flags.showCondition && (
          <div className="mb-5">
            <p className="text-[15px] font-bold text-black dark:text-white mb-2">{t.mk_char_condition}</p>
            <div className="flex flex-wrap gap-2">
              {MARKET_CONDITIONS.map((c) => (
                <Chip key={c} active={form.condition === c} onClick={() => patch({ condition: c })}>
                  {conditionLabel(t, c)}
                </Chip>
              ))}
            </div>
          </div>
        )}

        {/* Brand */}
        {flags.showBrand && (
          <div className="mb-5">
            <SelectRow label={t.mk_char_brand} value={form.brand} placeholder={t.mk_char_select} onClick={() => setSheet('brand')} />
          </div>
        )}

        {/* Size */}
        {flags.showSize && (
          <div className="mb-5">
            <SelectRow label={t.mk_char_size} value={form.size} placeholder={t.mk_char_select} onClick={() => setSheet('size')} />
          </div>
        )}

        {/* Season */}
        {flags.showSeason && (
          <div className="mb-5">
            <p className="text-[15px] font-bold text-black dark:text-white mb-2">{t.mk_char_season}</p>
            <div className="flex flex-wrap gap-2">
              {MARKET_SEASONS.map((s) => (
                <Chip key={s} active={form.season === s} onClick={() => patch({ season: s as MarketSeason })}>
                  {seasonLabel(t, s)}
                </Chip>
              ))}
            </div>
          </div>
        )}

        {/* Length */}
        {flags.showLength && (
          <div className="mb-5">
            <p className="text-[15px] font-bold text-black dark:text-white mb-2">{t.mk_char_length}</p>
            <div className="flex flex-wrap gap-2">
              {MARKET_LENGTHS.map((l) => (
                <Chip key={l} active={form.length === l} onClick={() => patch({ length: l as MarketLength })}>
                  {lengthLabel(t, l)}
                </Chip>
              ))}
            </div>
          </div>
        )}

        {/* Color */}
        {flags.showColor && (
          <SelectRow
            label={t.mk_char_color}
            value={form.color ? colorLabel(t, form.color) : undefined}
            placeholder={t.mk_char_select}
            onClick={() => setSheet('color')}
          />
        )}
      </StepScaffold>

      <OptionSheet open={sheet === 'brand'} title={t.mk_char_brand} options={brandOptions} value={form.brand ?? null} onSelect={(v) => patch({ brand: v })} onClose={() => setSheet(null)} />
      <OptionSheet open={sheet === 'size'} title={t.mk_char_size} options={sizeOptions} value={form.size ?? null} onSelect={(v) => patch({ size: v })} onClose={() => setSheet(null)} />
      <OptionSheet open={sheet === 'color'} title={t.mk_char_color} options={colorOptions} value={form.color ?? null} onSelect={(v) => patch({ color: v })} onClose={() => setSheet(null)} />
    </>
  );
}
