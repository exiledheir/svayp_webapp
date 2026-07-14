import React, { useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { SECTION_ORDER, taxLabel } from '@/lib/wardrobe-taxonomy';
import type { WardrobeSection } from '@/types';
import type { ClosetItem } from '@/lib/closet-storage';

/**
 * Closet v2 — post-upload "fix category" sheet (Acloset screen 5). Shown only for
 * items the AI couldn't confidently classify (aiSection === 'OTHER'). The user
 * assigns each one a section; the parent maps the section to its default
 * subcategory and persists via handleUpdateItem. "Fill in later" skips straight
 * to the review list where categories can still be edited.
 */
export default function CategoryFixSheet({
  items,
  dark,
  onDone,
  onLater,
}: {
  items: ClosetItem[];
  dark: boolean;
  onDone: (selections: Record<string, WardrobeSection>) => void;
  onLater: () => void;
}) {
  const { t, locale } = useI18n();
  const [picks, setPicks] = useState<Record<string, WardrobeSection>>({});

  const ink = dark ? '#fff' : '#141118';
  const sub = dark ? '#8e8e93' : '#9a8f98';
  const surface = dark ? '#1c1c1e' : '#fff';
  const line = dark ? '#2a2a2c' : '#ececed';
  const chipIdle = dark ? '#2c2c2e' : '#f4f2f5';

  const allPicked = items.every((it) => picks[it.id]);

  return (
    <div className="fixed inset-0 z-[63] flex items-end justify-center" style={{ background: 'rgba(15,8,14,0.42)' }} onClick={onLater}>
      <div className="w-full max-w-[460px] rounded-t-3xl flex flex-col" style={{ background: surface, maxHeight: '92%' }} onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-center pt-3 pb-1"><div className="w-9 h-1 rounded-full" style={{ background: dark ? '#3a3a3c' : '#e2dbe1' }} /></div>

        <div className="px-5 pt-2 pb-1">
          <h3 className="text-[19px] font-extrabold tracking-[-0.3px] leading-snug" style={{ color: ink }}>{t.cv_fix_title}</h3>
          <p className="text-[13.5px] mt-1.5 leading-snug" style={{ color: sub }}>{t.cv_fix_subtitle}</p>
        </div>

        <div className="px-5 py-3 overflow-y-auto flex-1">
          {items.map((item) => (
            <div key={item.id} className="flex gap-3 py-3" style={{ borderBottom: `1px solid ${line}` }}>
              <span className="w-[70px] h-[70px] rounded-2xl flex-none overflow-hidden flex items-center justify-center" style={{ background: dark ? '#2a2a2c' : '#f5f2f5' }}>
                {item.imageData ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.imageData} alt="" className="w-full h-full object-cover" />
                ) : null}
              </span>
              <div className="flex-1 min-w-0 flex flex-wrap items-start gap-2 content-start">
                {SECTION_ORDER.map((section) => {
                  const active = picks[item.id] === section;
                  return (
                    <button
                      key={section}
                      onClick={() => setPicks((p) => ({ ...p, [item.id]: section }))}
                      className="px-3.5 py-2 rounded-full text-[13px] font-semibold active:scale-[0.96] transition-transform"
                      style={active
                        ? { background: '#F370A7', color: '#fff' }
                        : { background: chipIdle, color: ink }}
                    >
                      {taxLabel(section, locale)}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-1.5 px-5 pt-3 pb-8" style={{ borderTop: `1px solid ${line}` }}>
          <button
            onClick={() => onDone(picks)}
            disabled={!allPicked}
            className="h-13 rounded-2xl text-white text-[15px] font-bold flex items-center justify-center active:scale-[0.98] transition-transform disabled:opacity-40"
            style={{ background: '#F370A7', height: 52 }}
          >
            {t.cv_fix_done}
          </button>
          <button onClick={onLater} className="h-11 rounded-2xl text-[14px] font-semibold" style={{ color: sub }}>
            {t.cv_fix_later}
          </button>
        </div>
      </div>
    </div>
  );
}
