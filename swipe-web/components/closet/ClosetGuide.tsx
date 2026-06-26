import React, { useEffect, useRef, useState } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useTheme } from '@/lib/theme';
import {
  getGuideSteps, getGuideStrings, GUIDE_VIDEO_URL, getYouTubeEmbedUrl,
  type GuideStep,
} from '@/lib/closet-guide';

interface Props {
  open: boolean;
  onClose: () => void;
}

/**
 * Full-screen "how to use the closet" guide: an optional video plus eight
 * illustrated steps. Content + chrome strings come from lib/closet-guide.ts and
 * are localized to the active locale.
 */
export default function ClosetGuide({ open, onClose }: Props) {
  const { locale } = useI18n();
  const { theme } = useTheme();
  const dark = theme === 'dark';
  const strings = getGuideStrings(locale);
  const steps = getGuideSteps(locale);
  const embedUrl = getYouTubeEmbedUrl(GUIDE_VIDEO_URL);

  // Steps are shown one at a time, navigated left↔right with the arrow buttons.
  const [current, setCurrent] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const lastStep = steps.length - 1;

  // Start from the first step each time the guide is opened.
  useEffect(() => {
    if (open) setCurrent(0);
  }, [open]);

  // Scroll back to the top whenever the step changes so the new step's title is
  // in view (the previous step's screenshot may have been scrolled down).
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [current]);

  if (!open) return null;

  const goPrev = () => setCurrent((c) => Math.max(0, c - 1));
  const goNext = () => setCurrent((c) => Math.min(lastStep, c + 1));

  // Horizontal swipe to move between steps (ignores mostly-vertical scrolls).
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStartRef.current = { x: t.clientX, y: t.clientY };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const start = touchStartRef.current;
    touchStartRef.current = null;
    if (!start) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (dx < 0) goNext(); else goPrev();
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-white dark:bg-[#111111]">
      {/* Header */}
      <header
        className="shrink-0 flex items-start justify-between gap-3 px-4 border-b border-black/5 dark:border-white/10"
        style={{ paddingTop: 'calc(12px + env(safe-area-inset-top, 0px))', paddingBottom: 12 }}
      >
        <div className="min-w-0">
          <h2 className="text-[19px] font-extrabold text-black dark:text-white leading-tight">{strings.guide}</h2>
          <p className="text-[12px] text-black/50 dark:text-white/50 mt-0.5 leading-snug">{strings.subtitle}</p>
        </div>
        <button
          onClick={onClose}
          aria-label={strings.closeLabel}
          className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center active:scale-[0.95] transition-transform"
          style={{ background: dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }}
        >
          <X size={18} className="text-black dark:text-white" />
        </button>
      </header>

      {/* Scrollable body — swipe left/right to change step */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 pb-4" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        {/* Video — plain YouTube player, present on every step. Kept as the
            first child so it isn't remounted (and doesn't restart) when the
            step changes. */}
        {embedUrl ? (
          <div className="mt-3 rounded-2xl overflow-hidden bg-black" style={{ position: 'relative', paddingTop: '56.25%' }}>
            <iframe
              src={`${embedUrl}?rel=0&playsinline=1`}
              title={strings.videoTitle}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }}
            />
          </div>
        ) : (
          <div className="mt-3 rounded-2xl p-4 text-center" style={{ background: dark ? '#1a1a1a' : '#f6f6f7' }}>
            <p className="text-[13px] text-black/45 dark:text-white/45">{strings.videoSoon}</p>
          </div>
        )}

        {/* Current step (navigated with the arrows below) */}
        <div className="mt-4">
          <GuideStepCard
            step={steps[current]}
            label={strings.stepLabel.replace('{n}', String(current + 1))}
            dark={dark}
          />
        </div>
      </div>

      {/* Pinned navigation: ← prev · progress dots · next → */}
      <div
        className="shrink-0 px-4 pt-3 border-t border-black/5 dark:border-white/10"
        style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 1rem))' }}
      >
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={goPrev}
            disabled={current === 0}
            aria-label={strings.prevLabel}
            className="shrink-0 w-11 h-11 rounded-full flex items-center justify-center active:scale-[0.92] transition-transform disabled:opacity-30"
            style={{ background: dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }}
          >
            <ChevronLeft size={22} className="text-black dark:text-white" />
          </button>

          {/* Progress dots */}
          <div className="flex items-center gap-1.5 flex-wrap justify-center">
            {steps.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                aria-label={strings.stepLabel.replace('{n}', String(i + 1))}
                className="rounded-full transition-all duration-300"
                style={{
                  width: i === current ? 20 : 8,
                  height: 8,
                  background: i === current ? '#F370A7' : (dark ? 'rgba(255,255,255,0.25)' : '#E5E7EB'),
                }}
              />
            ))}
          </div>

          {current < lastStep ? (
            <button
              onClick={goNext}
              aria-label={strings.nextLabel}
              className="shrink-0 w-11 h-11 rounded-full flex items-center justify-center active:scale-[0.92] transition-transform shadow-sm"
              style={{ background: 'linear-gradient(135deg, #F370A7 0%, #e0559a 100%)' }}
            >
              <ChevronRight size={22} color="#fff" />
            </button>
          ) : (
            <button
              onClick={onClose}
              className="shrink-0 px-4 h-11 rounded-full flex items-center justify-center text-white font-semibold text-[14px] active:scale-[0.96] transition-transform shadow-sm"
              style={{ background: 'linear-gradient(135deg, #F370A7 0%, #e0559a 100%)' }}
            >
              {strings.done}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/** One step: number badge, title, bullet lines, and its screenshot(s). */
function GuideStepCard({ step, label, dark }: { step: GuideStep; label: string; dark: boolean }) {
  const multi = step.images.length > 1;
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: dark ? '#1a1a1a' : '#f6f6f7' }}>
      <div className="p-4">
        <span
          className="inline-block text-[10px] font-extrabold tracking-wider px-2.5 py-1 rounded-full"
          style={{ background: 'rgba(243,112,167,0.12)', color: '#F370A7' }}
        >
          {label}
        </span>
        <h3 className="text-[16px] font-extrabold text-black dark:text-white mt-2.5">{step.title}</h3>
        <ul className="mt-2 flex flex-col gap-1.5">
          {step.bullets.map((b, j) => (
            <li key={j} className="flex gap-2 text-[13.5px] leading-relaxed text-black/65 dark:text-white/65">
              <span className="mt-[7px] w-1.5 h-1.5 rounded-full shrink-0" style={{ background: '#F370A7' }} />
              <span>{b}</span>
            </li>
          ))}
        </ul>
      </div>
      {step.images.length > 0 && (
        <div className={`px-4 pb-4 grid gap-2 justify-items-center ${multi ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {step.images.map((src, k) => (
            <GuideShot key={k} src={src} alt={step.title} maxHeight={multi ? '34vh' : '42vh'} />
          ))}
        </div>
      )}
    </div>
  );
}

/** A single screenshot that hides itself if the file can't be loaded. */
function GuideShot({ src, alt, maxHeight }: { src: string; alt: string; maxHeight: string }) {
  const [ok, setOk] = useState(true);
  if (!ok) return null;
  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={src}
      alt={alt}
      onError={() => setOk(false)}
      loading="lazy"
      className="rounded-xl"
      style={{ width: '100%', height: 'auto', maxHeight, objectFit: 'contain' }}
    />
  );
}
