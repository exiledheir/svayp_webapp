import React, { useMemo, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import {
  MARKET_CONDITIONS, MARKET_SEASONS, MARKET_LENGTHS, MARKET_BRANDS,
  MARKET_SIZES, MARKET_SHOE_SIZES, MARKET_COLORS, MARKET_MATERIALS, FIT_TYPES,
  NO_BRAND, OTHER_BRAND, brandLabel, sizeLabel,
  conditionLabel, seasonLabel, lengthLabel, colorLabel, materialLabel,
  countryOptions, attributesForCategory,
} from '@/lib/market-attributes';
import { taxLabel } from '@/lib/wardrobe-taxonomy';
import OptionSheet, { type OptionItem } from '@/components/market/OptionSheet';
import { useI18n } from '@/lib/i18n';
import StepScaffold from './StepScaffold';
import type { StepProps } from './types';
import type { MarketSeason, MarketLength } from '@/types/market';

type SheetKind = 'brand' | 'size' | 'color' | 'material' | 'country' | null;

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
  const { t, locale } = useI18n();
  const [sheet, setSheet] = useState<SheetKind>(null);
  const flags = attributesForCategory(form.category);

  const brandOptions: OptionItem[] = [
    { value: NO_BRAND, label: t.mk_brand_none },
    ...MARKET_BRANDS.map((b) => ({ value: b, label: b })),
    { value: OTHER_BRAND, label: t.mk_brand_other },
  ];
  const sizeOptions: OptionItem[] = (flags.shoeSizes ? MARKET_SHOE_SIZES : MARKET_SIZES).map((s) => ({ value: s, label: sizeLabel(s, t) }));
  const colorOptions: OptionItem[] = MARKET_COLORS.map((c) => ({ value: c.key, label: colorLabel(t, c.key), hex: c.hex }));
  const materialOptions: OptionItem[] = MARKET_MATERIALS.map((m) => ({ value: m, label: materialLabel(m, locale) }));
  const countryOpts = useMemo<OptionItem[]>(() => countryOptions(locale), [locale]);

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
            <p className="text-[15px] font-bold text-black dark:text-white mb-2">
              {t.mk_char_condition}<span style={{ color: '#F370A7' }}> *</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {MARKET_CONDITIONS.map((c) => (
                <Chip key={c} active={form.condition === c} onClick={() => patch({ condition: c })}>
                  {conditionLabel(t, c)}
                </Chip>
              ))}
            </div>
          </div>
        )}

        {/* Modesty — «Подходит для покрытых» (optional Да/Нет) */}
        {flags.showModesty && (
          <div className="mb-5">
            <p className="text-[15px] font-bold text-black dark:text-white mb-2">{t.mk_char_modesty}</p>
            <div className="flex gap-2">
              <Chip active={form.hijabFriendly === true} onClick={() => patch({ hijabFriendly: form.hijabFriendly === true ? undefined : true })}>
                {t.mk_char_yes}
              </Chip>
              <Chip active={form.hijabFriendly === false} onClick={() => patch({ hijabFriendly: form.hijabFriendly === false ? undefined : false })}>
                {t.mk_char_no}
              </Chip>
            </div>
          </div>
        )}

        {/* Brand */}
        {flags.showBrand && (
          <div className="mb-5">
            <SelectRow
              label={t.mk_char_brand}
              value={form.brand === OTHER_BRAND
                ? (form.customBrand?.trim() || t.mk_brand_other)
                : (form.brand ? brandLabel(form.brand, t) : undefined)}
              placeholder="—"
              onClick={() => setSheet('brand')}
            />
            {/* "Other brand" → let the user type their own name. */}
            {form.brand === OTHER_BRAND && (
              <input
                value={form.customBrand ?? ''}
                onChange={(e) => patch({ customBrand: e.target.value })}
                placeholder={t.mk_brand_custom_ph}
                maxLength={40}
                className="w-full mt-2 px-4 h-14 rounded-2xl text-[15px] outline-none text-black dark:text-white"
                style={{ background: 'rgba(128,128,128,0.10)' }}
              />
            )}
          </div>
        )}

        {/* Size */}
        {flags.showSize && (
          <div className="mb-5">
            <SelectRow
              label={t.mk_char_size}
              value={form.sizes?.length ? form.sizes.map((s) => sizeLabel(s, t)).join(', ') : undefined}
              placeholder={t.mk_char_select}
              onClick={() => setSheet('size')}
            />
          </div>
        )}

        {/* Fit (optional) */}
        {flags.showFit && (
          <div className="mb-5">
            <p className="text-[15px] font-bold text-black dark:text-white mb-2">{t.mk_char_fit}</p>
            <div className="flex flex-wrap gap-2">
              {FIT_TYPES.map((f) => (
                <Chip key={f} active={form.fit === f} onClick={() => patch({ fit: form.fit === f ? undefined : f })}>
                  {taxLabel(f, locale)}
                </Chip>
              ))}
            </div>
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
          <div className="mb-5">
            <SelectRow
              label={t.mk_char_color}
              value={form.colors?.length ? form.colors.map((c) => colorLabel(t, c)).join(', ') : undefined}
              placeholder="—"
              onClick={() => setSheet('color')}
            />
          </div>
        )}

        {/* Material (optional) */}
        {flags.showMaterial && (
          <div className="mb-5">
            <SelectRow
              label={t.mk_char_material}
              value={form.material ? materialLabel(form.material, locale) : undefined}
              placeholder="—"
              onClick={() => setSheet('material')}
            />
          </div>
        )}

        {/* Country of origin (optional) */}
        {flags.showCountry && (
          <SelectRow
            label={t.mk_char_country}
            value={form.country ? countryOpts.find((o) => o.value === form.country)?.label : undefined}
            placeholder="—"
            onClick={() => setSheet('country')}
          />
        )}
      </StepScaffold>

      <OptionSheet open={sheet === 'brand'} title={t.mk_char_brand} options={brandOptions} value={form.brand ?? null} onSelect={(v) => patch(v === OTHER_BRAND ? { brand: v } : { brand: v, customBrand: undefined })} onClose={() => setSheet(null)} />
      <OptionSheet multi open={sheet === 'size'} title={t.mk_char_size} options={sizeOptions} values={form.sizes ?? []} onSelect={(v) => patch({ sizes: v })} onClose={() => setSheet(null)} />
      <OptionSheet multi open={sheet === 'color'} title={t.mk_char_color} options={colorOptions} values={form.colors ?? []} onSelect={(v) => patch({ colors: v })} onClose={() => setSheet(null)} />
      <OptionSheet open={sheet === 'material'} title={t.mk_char_material} options={materialOptions} value={form.material ?? null} onSelect={(v) => patch({ material: v })} onClose={() => setSheet(null)} />
      <OptionSheet open={sheet === 'country'} title={t.mk_char_country} options={countryOpts} value={form.country ?? null} onSelect={(v) => patch({ country: v })} onClose={() => setSheet(null)} />
    </>
  );
}
