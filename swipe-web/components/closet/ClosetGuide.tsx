import React, { useEffect, useRef, useState } from 'react';
import { X, ChevronLeft, ChevronRight, Play, Check } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useTheme } from '@/lib/theme';
import { logAnalyticsEvent } from '@/lib/analytics';
import { Events } from '@/lib/analytics-events';
import GuideArt from '@/components/closet/GuideIllustrations';
import {
  getGuideSteps, getGuideStrings, GUIDE_VIDEO_URL, getYouTubeEmbedUrl,
  type GuideStep,
} from '@/lib/closet-guide';

interface Props {
  open: boolean;
  onClose: () => void;
}

/**
 * Full-screen "how to use the closet" guide: one illustrated step per screen,
 * swiped or paged left↔right, plus an optional video behind a header button.
 *
 * The video used to sit above every step and took half the screen — a 9:16 short
 * letterboxed into a 16:9 player, so mostly black bars — and the step itself was
 * squeezed under it. It now opens on demand in its own vertical player.
 *
 * Content + chrome strings come from lib/closet-guide.ts, localized to the active locale.
 */
export default function ClosetGuide({ open, onClose }: Props) {
  const { locale } = useI18n();
  const { theme } = useTheme();
  const dark = theme === 'dark';
  const strings = getGuideStrings(locale);
  const steps = getGuideSteps(locale);
  const embedUrl = getYouTubeEmbedUrl(GUIDE_VIDEO_URL);

  // Steps are shown one at a time, navigated left↔right. `dir` drives the
  // slide-in animation direction (+1 = forward, -1 = back).
  const [current, setCurrent] = useState(0);
  const [dir, setDir] = useState(1);
  const [videoOpen, setVideoOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastStep = steps.length - 1;

  const goPrev = () => { setDir(-1); setCurrent((c) => Math.max(0, c - 1)); };
  const goNext = () => { setDir(1); setCurrent((c) => Math.min(lastStep, c + 1)); };
  const goTo = (i: number) => { setDir(i >= current ? 1 : -1); setCurrent(i); };

  // Start from the first step each time the guide is opened.
  useEffect(() => {
    if (open) { setDir(1); setCurrent(0); setVideoOpen(false); }
  }, [open]);

  // Scroll back to the top whenever the step changes so the new step's
  // illustration is in view (the previous step may have been scrolled down).
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [current]);

  // Swipe handling. A non-passive touchmove listener lets us preventDefault once
  // a gesture is clearly horizontal, so the vertical scroll can't jiggle
  // ("earthquake") while swiping between steps.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !open) return;
    let startX = 0, startY = 0, axis: 'h' | 'v' | null = null, active = false;
    const onStart = (e: TouchEvent) => {
      const t = e.touches[0]; startX = t.clientX; startY = t.clientY; axis = null; active = true;
    };
    const onMove = (e: TouchEvent) => {
      if (!active) return;
      const t = e.touches[0];
      const dx = t.clientX - startX, dy = t.clientY - startY;
      if (axis === null && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
        axis = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v';
      }
      // Claim horizontal gestures so the page doesn't scroll/bounce under them.
      if (axis === 'h' && e.cancelable) e.preventDefault();
    };
    const onEnd = (e: TouchEvent) => {
      if (!active) return; active = false;
      const t = e.changedTouches[0];
      const dx = t.clientX - startX, dy = t.clientY - startY;
      if (axis === 'h' && Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.2) {
        if (dx < 0) { setDir(1); setCurrent((c) => Math.min(lastStep, c + 1)); }
        else { setDir(-1); setCurrent((c) => Math.max(0, c - 1)); }
      }
    };
    el.addEventListener('touchstart', onStart, { passive: true });
    el.addEventListener('touchmove', onMove, { passive: false });
    el.addEventListener('touchend', onEnd, { passive: true });
    return () => {
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchmove', onMove);
      el.removeEventListener('touchend', onEnd);
    };
  }, [open, lastStep]);

  if (!open) return null;

  const step = steps[current];
  const chipBg = dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)';

  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-white dark:bg-[#111111]">
      {/* Header: title + counter · video · close */}
      <header
        className="shrink-0 flex items-center justify-between gap-3 px-4"
        style={{ paddingTop: 'calc(12px + env(safe-area-inset-top, 0px))', paddingBottom: 10 }}
      >
        <div className="min-w-0 flex items-baseline gap-2">
          <h2 className="text-[19px] font-extrabold text-black dark:text-white leading-tight">{strings.guide}</h2>
          <span className="text-[12px] font-semibold text-black/40 dark:text-white/40" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {strings.stepCounter.replace('{n}', String(current + 1)).replace('{total}', String(steps.length))}
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {embedUrl && (
            <button
              onClick={() => {
                setVideoOpen(true);
                logAnalyticsEvent(Events.CLOSET_GUIDE_VIDEO_PLAYED);
              }}
              className="flex items-center gap-1 h-9 pl-2.5 pr-3 rounded-full text-[12px] font-bold active:scale-[0.95] transition-transform"
              style={{ background: chipBg, color: dark ? '#fff' : '#141118' }}
            >
              <Play size={13} fill="currentColor" />
              {strings.video}
            </button>
          )}
          <button
            onClick={onClose}
            aria-label={strings.closeLabel}
            className="w-9 h-9 rounded-full flex items-center justify-center active:scale-[0.95] transition-transform"
            style={{ background: chipBg }}
          >
            <X size={18} className="text-black dark:text-white" />
          </button>
        </div>
      </header>

      {/* Body — one step. Swipe left/right to change it (see the touch effect above). */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 pb-4 flex flex-col"
        style={{ touchAction: 'pan-y', overscrollBehavior: 'contain' }}
      >
        {/* Keyed by step so it re-animates (slide + fade) each time you move.
            `my-auto` centres the step when the screen is taller than the content
            (auto margins collapse to zero once it overflows, so nothing gets clipped
            the way justify-center would clip the top). The width cap keeps the step
            phone-shaped on a tablet or desktop instead of stretching edge to edge. */}
        <div key={current} className={`my-auto w-full max-w-[560px] mx-auto pt-1 ${dir >= 0 ? 'gd-next' : 'gd-prev'}`}>
          <GuideArt kind={step.illustration} dark={dark} />
          <StepText step={step} label={strings.stepLabel.replace('{n}', String(current + 1))} dark={dark} />
        </div>
        <style jsx>{`
          @keyframes gdNext { from { opacity: 0; transform: translateX(26px); } to { opacity: 1; transform: none; } }
          @keyframes gdPrev { from { opacity: 0; transform: translateX(-26px); } to { opacity: 1; transform: none; } }
          .gd-next { animation: gdNext 0.26s cubic-bezier(0.22, 0.61, 0.36, 1); }
          .gd-prev { animation: gdPrev 0.26s cubic-bezier(0.22, 0.61, 0.36, 1); }
        `}</style>
      </div>

      {/* Pinned navigation: ← prev · progress dots · next → / done */}
      <div
        className="shrink-0 px-4 pt-3 border-t border-black/5 dark:border-white/10"
        style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 1rem))' }}
      >
        <div className="flex items-center justify-between gap-3 max-w-[560px] mx-auto">
          <button
            onClick={goPrev}
            disabled={current === 0}
            aria-label={strings.prevLabel}
            className="shrink-0 w-11 h-11 rounded-full flex items-center justify-center active:scale-[0.92] transition-transform disabled:opacity-30"
            style={{ background: chipBg }}
          >
            <ChevronLeft size={22} className="text-black dark:text-white" />
          </button>

          <div className="flex items-center gap-1.5 flex-wrap justify-center">
            {steps.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
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

          {/* Next is a labelled pill, not a bare arrow: on the last step the same
              slot turns into «Got it», and the two shouldn't jump in width. */}
          <button
            onClick={current < lastStep ? goNext : onClose}
            aria-label={current < lastStep ? strings.nextLabel : strings.done}
            className="shrink-0 h-11 pl-4 pr-3 rounded-full flex items-center justify-center gap-1 text-white font-bold text-[14px] active:scale-[0.96] transition-transform shadow-sm"
            style={{ background: 'linear-gradient(135deg, #F370A7 0%, #e0559a 100%)', minWidth: 96 }}
          >
            {current < lastStep ? (
              <>{strings.nextLabel}<ChevronRight size={18} /></>
            ) : (
              <>{strings.done}<Check size={18} strokeWidth={2.6} /></>
            )}
          </button>
        </div>
      </div>

      {/* Video — a vertical short in a 9:16 player, only when asked for. */}
      {videoOpen && embedUrl && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.88)' }}
          onClick={() => setVideoOpen(false)}
        >
          <div
            className="relative rounded-2xl overflow-hidden bg-black"
            style={{ height: 'min(78vh, 720px)', aspectRatio: '9 / 16', maxWidth: '100%' }}
            onClick={(e) => e.stopPropagation()}
          >
            <iframe
              src={`${embedUrl}?rel=0&playsinline=1&autoplay=1`}
              title={strings.videoTitle}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }}
            />
          </div>
          <button
            onClick={() => setVideoOpen(false)}
            aria-label={strings.closeLabel}
            className="absolute w-10 h-10 rounded-full flex items-center justify-center bg-white/15 text-white active:scale-[0.95] transition-transform"
            style={{ top: 'calc(12px + env(safe-area-inset-top, 0px))', right: 12 }}
          >
            <X size={20} />
          </button>
        </div>
      )}
    </div>
  );
}

/** Step number + where it happens, the title, and the bullet lines. */
function StepText({ step, label, dark }: { step: GuideStep; label: string; dark: boolean }) {
  return (
    <div className="mt-4">
      <div className="flex items-center gap-2">
        <span
          className="inline-block text-[10px] font-extrabold tracking-wider px-2.5 py-1 rounded-full"
          style={{ background: 'rgba(243,112,167,0.12)', color: '#F370A7' }}
        >
          {label}
        </span>
        <span className="text-[12px] font-semibold text-black/45 dark:text-white/45">{step.eyebrow}</span>
      </div>
      <h3 className="text-[22px] font-extrabold leading-tight text-black dark:text-white mt-2">{step.title}</h3>
      <ul className="mt-3 flex flex-col gap-2.5">
        {step.bullets.map((b, j) => (
          <li key={j} className="flex gap-2.5 text-[14.5px] leading-relaxed text-black/70 dark:text-white/70">
            <span
              className="mt-[5px] w-4 h-4 rounded-full shrink-0 flex items-center justify-center"
              style={{ background: dark ? 'rgba(243,112,167,0.18)' : 'rgba(243,112,167,0.14)' }}
            >
              <Check size={10} strokeWidth={3.2} color="#F370A7" />
            </span>
            <span>{b}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
