import React, { useState } from 'react';
import { Sparkles, X, Check } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import Diamond from '@/components/closet/Diamond';

const DEMO_ORIGINAL = '/images/onboarding/beautify/original.png';
const DEMO_BEAUTIFIED = '/images/onboarding/beautify/beautifed.jpeg';
const BEAUTIFY_COST = 2;

/**
 * Closet v2 — "Introducing Beautify" educational popup. Shown the first time the
 * user taps Beautify / Add to Closet (before they've beautified anything). Plays
 * an animated before→after on a predefined example so they see what Beautify
 * does, then offers to run it on their own photo.
 */
export default function BeautifyIntroSheet({
  dark,
  from,
  onBeautify,
  onSkip,
  photos,
  picked,
  onTogglePhoto,
}: {
  dark: boolean;
  /** 'wardrobe' — тап ✨ на карточке гардероба; текст skip-кнопки как у 'beautify'. */
  from: 'beautify' | 'add' | 'wardrobe' | 'auto';
  onBeautify: () => void;
  onSkip: () => void;
  /** Превью фото батча — показываем, какие именно снимки будут улучшены. */
  photos?: { id: string; src: string }[];
  /** id отмеченных на улучшение (цена = 2 × размер набора). */
  picked?: Set<string>;
  /** Тап по превью — включить/выключить фото из улучшения. */
  onTogglePhoto?: (id: string) => void;
}) {
  const { t } = useI18n();
  const [never, setNever] = useState(false);
  const ink = dark ? '#fff' : '#141118';
  const sub = dark ? '#9a9aa0' : '#8a7f88';
  const surface = dark ? '#1c1c1e' : '#fff';
  const stageBg = dark ? '#141014' : '#f6f2f7';
  // Сколько фото улучшаем: при батче — отмеченные превью, иначе одно фото.
  const pickedCount = photos && photos.length > 1 ? (picked?.size ?? 0) : 1;
  const totalCost = BEAUTIFY_COST * pickedCount;

  // Persist "don't show again" before running the chosen action.
  function persistNever() {
    if (never) { try { localStorage.setItem('svayp_beautify_intro_never', '1'); } catch { /* private mode */ } }
  }
  const handleBeautify = () => { persistNever(); onBeautify(); };
  const handleSkip = () => { persistNever(); onSkip(); };

  return (
    <div className="fixed inset-0 z-[66] flex items-end justify-center" style={{ background: 'rgba(15,8,14,0.5)' }} onClick={handleSkip}>
      <div className="relative w-full max-w-[460px] rounded-t-3xl flex flex-col" style={{ background: surface, maxHeight: '95%' }} onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-center pt-3 pb-1"><div className="w-9 h-1 rounded-full" style={{ background: dark ? '#3a3a3c' : '#e2dbe1' }} /></div>
        <button onClick={handleSkip} aria-label={t.close} className="absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center" style={{ color: sub }}><X size={20} /></button>

        {/* Скроллируемая часть — на малых экранах кнопки и чекбокс всегда видны */}
        <div className="overflow-y-auto min-h-0">
        {/* Header */}
        <div className="px-8 pt-4 text-center">
          <p className="text-[12.5px] font-bold tracking-wide" style={{ color: '#F370A7' }}>{t.cv_bt_auto_kicker}</p>
          <h3 className="text-[22px] font-extrabold leading-tight mt-1" style={{ color: ink }}>{t.cv_bt_auto_headline}</h3>
        </div>

        {/* Animated before → after demo */}
        <div className="px-5 pt-4 pb-1">
          {/* Адаптивная высота: на низких экранах демо сжимается, чтобы кнопки
              и «Больше не показывать» не уезжали за нижний край. */}
          <div className="bt-stage relative w-full rounded-2xl overflow-hidden" style={{ height: 'clamp(180px, 30vh, 320px)', background: stageBg }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={DEMO_ORIGINAL} alt="" className="bt-orig absolute inset-0 w-full h-full object-contain" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={DEMO_BEAUTIFIED} alt="" className="bt-beaut absolute inset-0 w-full h-full object-contain" />

            {/* Magic sweep with sparkles (plays during the crossfade) */}
            <div className="bt-sweep absolute top-0 bottom-0 flex items-center justify-center" style={{ width: 90 }}>
              <div className="absolute inset-y-0" style={{ left: '50%', width: 3, transform: 'translateX(-50%)', background: 'linear-gradient(180deg,rgba(243,112,167,0),#F370A7,rgba(243,112,167,0))', filter: 'blur(0.5px)' }} />
              <Sparkles size={22} color="#fff" style={{ filter: 'drop-shadow(0 0 6px #F370A7)' }} />
            </div>

            {/* Labels */}
            <span className="bt-lbl-orig absolute top-3 left-3 text-[11px] font-extrabold px-2.5 py-1 rounded-full" style={{ background: 'rgba(255,255,255,0.92)', color: '#141118' }}>{t.cv_bt_original}</span>
            <span className="bt-lbl-beaut absolute top-3 right-3 text-[11px] font-extrabold px-2.5 py-1 rounded-full text-white" style={{ background: '#F370A7' }}>{t.cv_bt_beautified}</span>
          </div>
          <p className="text-[13px] leading-snug text-center mt-3 px-3" style={{ color: sub }}>{t.cv_bt_intro_caption}</p>
          {/* Cost */}
          <div className="flex items-center justify-center gap-1.5 mt-2.5">
            <Diamond size={16} glow />
            <span className="text-[13.5px] font-bold" style={{ color: ink }}>{BEAUTIFY_COST}</span>
            <span className="text-[13px]" style={{ color: sub }}>· {t.cv_bt_per_photo}</span>
          </div>
        </div>

        {/* Какие фото будут улучшены — только при батче из нескольких снимков.
            Тап по превью убирает фото из улучшения (цена на кнопке пересчитывается). */}
        {photos && photos.length > 1 && (
          <div className="px-5 pt-3">
            <p className="text-[12.5px] font-semibold mb-2" style={{ color: sub }}>
              {t.cv_bt_intro_which.replace('{n}', String(pickedCount))}
            </p>
            <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
              {photos.map((p) => {
                const on = !!picked?.has(p.id);
                return (
                  <button
                    key={p.id}
                    onClick={() => onTogglePhoto?.(p.id)}
                    className="relative w-16 h-20 rounded-2xl flex-none overflow-hidden active:scale-[0.96] transition-transform"
                    style={{
                      background: stageBg,
                      boxShadow: on ? 'inset 0 0 0 2px #F370A7' : `inset 0 0 0 1.5px ${dark ? '#3a3a3c' : '#e6e2e8'}`,
                      opacity: on ? 1 : 0.45,
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.src} alt="" className="w-full h-full object-cover" />
                    {on && (
                      <span className="absolute bottom-1 right-1 rounded-full flex items-center justify-center" style={{ width: 18, height: 18, background: '#F370A7' }}>
                        <Check size={11} strokeWidth={3} color="#fff" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        </div>{/* /скроллируемая часть */}

        {/* Actions — вне скролла, всегда видны вместе с чекбоксом */}
        <div className="flex flex-col gap-2 px-5 pt-3 pb-6 flex-none">
          <button
            onClick={handleBeautify}
            disabled={pickedCount === 0}
            className="h-14 rounded-2xl text-white text-[16px] font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-40 disabled:active:scale-100"
            style={{ background: '#F370A7' }}
          >
            {t.cv_bt_intro_do}
            <span className="flex items-center gap-0.5 pl-2 ml-0.5" style={{ borderLeft: '1px solid rgba(255,255,255,0.4)' }}>
              <Diamond size={15} />{totalCost}
            </span>
          </button>
          <button
            onClick={handleSkip}
            className="h-13 rounded-2xl text-[15px] font-bold active:scale-[0.98] transition-transform"
            style={{ height: 52, border: `1.5px solid ${dark ? '#3a3a3c' : '#e0dde2'}`, color: ink, background: 'transparent' }}
          >
            {from === 'add' ? t.cv_bt_intro_skip_add : t.cv_bt_intro_skip}
          </button>
          {/* «Больше не показывать» — по центру под кнопками, не мешает шапке */}
          <button onClick={() => setNever((v) => !v)} className="mt-1 h-9 flex items-center justify-center gap-2 active:opacity-70">
            <span className="w-5 h-5 rounded-md flex items-center justify-center flex-none" style={never ? { background: '#F370A7' } : { border: `1.6px solid ${dark ? '#48484a' : '#c9c7cd'}` }}>
              {never && <Check size={13} strokeWidth={3} color="#fff" />}
            </span>
            <span className="text-[13px] font-medium" style={{ color: sub }}>{t.cv_bt_never}</span>
          </button>
        </div>

        <style jsx>{`
          .bt-orig  { animation: btOrig 4.4s ease-in-out infinite; }
          .bt-beaut { animation: btBeaut 4.4s ease-in-out infinite; }
          .bt-sweep { animation: btSweep 4.4s ease-in-out infinite; }
          .bt-lbl-orig  { animation: btOrig 4.4s ease-in-out infinite; }
          .bt-lbl-beaut { animation: btBeaut 4.4s ease-in-out infinite; }
          @keyframes btOrig {
            0%, 28% { opacity: 1; }
            44%, 92% { opacity: 0; }
            100% { opacity: 1; }
          }
          @keyframes btBeaut {
            0%, 32% { opacity: 0; transform: scale(0.97); }
            48%, 90% { opacity: 1; transform: scale(1); }
            100% { opacity: 0; transform: scale(0.97); }
          }
          @keyframes btSweep {
            0%, 26% { opacity: 0; left: -12%; }
            34% { opacity: 1; }
            46% { opacity: 1; }
            52% { left: 100%; opacity: 0; }
            100% { opacity: 0; left: 100%; }
          }
          @media (prefers-reduced-motion: reduce) {
            .bt-orig, .bt-beaut, .bt-sweep, .bt-lbl-orig, .bt-lbl-beaut { animation: none; }
            .bt-orig, .bt-lbl-orig { opacity: 0; }
          }
        `}</style>
      </div>
    </div>
  );
}
