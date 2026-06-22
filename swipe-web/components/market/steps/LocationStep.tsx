import React from 'react';
import { Search, Navigation, Building2, Truck } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import StepScaffold from './StepScaffold';
import type { StepProps } from './types';

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

export default function LocationStep({ form, patch, onNext }: StepProps) {
  const { t } = useI18n();
  const loc = form.location ?? {};

  function setLoc(p: Partial<typeof loc>) {
    patch({ location: { ...loc, ...p } });
  }

  // Mock "pick on map": drop a default Tashkent pin so the detail map renders.
  function pickOnMap() {
    setLoc({ latitude: 41.311081, longitude: 69.240562, address: loc.address || 'Ташкент' });
  }

  return (
    <StepScaffold
      title={t.mk_loc_title}
      ctaLabel={t.mk_continue}
      ctaDisabled={!loc.address?.trim()}
      onCta={onNext}
    >
      <div className="flex items-center gap-2 px-4 h-14 rounded-2xl mb-3" style={{ background: 'rgba(128,128,128,0.10)' }}>
        <Search size={18} className="text-black/40 dark:text-white/40 shrink-0" />
        <input
          value={loc.address ?? ''}
          onChange={(e) => setLoc({ address: e.target.value })}
          placeholder={t.mk_loc_search}
          className="flex-1 bg-transparent outline-none text-[15px] text-black dark:text-white"
        />
      </div>

      <button
        onClick={pickOnMap}
        className="w-full flex items-center justify-center gap-2 h-12 rounded-2xl mb-6 text-[15px] font-semibold"
        style={{ background: 'rgba(243,112,167,0.10)', color: '#F370A7' }}
      >
        <Navigation size={17} strokeWidth={2} />
        {t.mk_loc_map}
      </button>

      <p className="text-[15px] font-bold text-black dark:text-white mb-2">{t.mk_loc_landmark_label}</p>
      <div className="flex items-center gap-2 px-4 h-14 rounded-2xl mb-6" style={{ background: 'rgba(128,128,128,0.10)' }}>
        <Building2 size={18} className="text-black/40 dark:text-white/40 shrink-0" />
        <input
          value={loc.landmark ?? ''}
          onChange={(e) => setLoc({ landmark: e.target.value })}
          placeholder={t.mk_loc_landmark_ph}
          className="flex-1 bg-transparent outline-none text-[15px] text-black dark:text-white"
        />
      </div>

      <p className="text-[13px] text-black/45 dark:text-white/45 mb-2">{t.mk_loc_courier_note}</p>
      <div className="flex items-center gap-3 p-3.5 rounded-2xl" style={{ background: 'rgba(128,128,128,0.08)' }}>
        <span className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: '#3BA55D' }}>
          <Truck size={18} color="white" />
        </span>
        <span className="flex-1 text-[15px] font-medium text-black dark:text-white">{t.mk_loc_courier}</span>
        <Toggle on={!!loc.courier} onChange={(v) => setLoc({ courier: v })} />
      </div>
    </StepScaffold>
  );
}
