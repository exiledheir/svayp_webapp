import React, { useMemo, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { MARKET_REGIONS, regionLabel } from '@/lib/market-attributes';
import { getDistrictOptions } from '@/lib/market-districts';
import OptionSheet, { type OptionItem } from '@/components/market/OptionSheet';
import StepScaffold from './StepScaffold';
import type { StepProps } from './types';

type Sheet = 'region' | 'district' | null;

function SelectRow({ label, value, placeholder, disabled, onClick }: {
  label: string; value?: string; placeholder: string; disabled?: boolean; onClick: () => void;
}) {
  return (
    <div className="mb-4">
      <p className="text-[15px] font-bold text-black dark:text-white mb-2">{label}</p>
      <button
        onClick={onClick}
        disabled={disabled}
        className="w-full flex items-center justify-between px-4 h-14 rounded-2xl disabled:opacity-50"
        style={{ background: 'rgba(128,128,128,0.10)' }}
      >
        <span className={`text-[15px] ${value ? 'font-semibold text-black dark:text-white' : 'text-black/40 dark:text-white/40'}`}>
          {value || placeholder}
        </span>
        <ChevronRight size={18} className="text-black/35 dark:text-white/35" />
      </button>
    </div>
  );
}

export default function LocationStep({ form, patch, onNext }: StepProps) {
  const { t, locale } = useI18n();
  const loc = form.location ?? {};
  const [sheet, setSheet] = useState<Sheet>(null);

  function setLoc(p: Partial<typeof loc>) {
    patch({ location: { ...loc, ...p } });
  }

  const regionOptions: OptionItem[] = MARKET_REGIONS.map((key) => ({ value: key, label: regionLabel(key, locale) }));
  const districtOptions = useMemo(() => getDistrictOptions(loc.region, locale), [loc.region, locale]);

  return (
    <StepScaffold
      title={t.mk_loc_title}
      ctaLabel={t.mk_continue}
      ctaDisabled={!loc.region || !loc.district}
      onCta={onNext}
    >
      <SelectRow
        label={t.mk_loc_region_label}
        value={loc.region ? regionLabel(loc.region, locale) : undefined}
        placeholder={t.mk_loc_region_label}
        onClick={() => setSheet('region')}
      />

      <SelectRow
        label={t.mk_loc_district_label}
        value={loc.district ? districtOptions.find((o) => o.value === loc.district)?.label : undefined}
        placeholder={t.mk_loc_district_ph}
        disabled={!loc.region}
        onClick={() => setSheet('district')}
      />

      <OptionSheet
        open={sheet === 'region'}
        title={t.mk_loc_region_label}
        options={regionOptions}
        value={loc.region ?? null}
        onSelect={(v) => setLoc({ region: v, district: undefined })}
        onClose={() => setSheet(null)}
        searchable
      />
      <OptionSheet
        open={sheet === 'district'}
        title={t.mk_loc_district_label}
        options={districtOptions}
        value={loc.district ?? null}
        onSelect={(v) => setLoc({ district: v })}
        onClose={() => setSheet(null)}
        searchable
      />
    </StepScaffold>
  );
}
