import React, { useEffect, useRef, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { logAnalyticsEvent } from '@/lib/analytics';
import { Events } from '@/lib/analytics-events';

/**
 * "We cleaned up your photo automatically" — a quick delight interstitial shown
 * once in the guided onboarding, right after the user has added their second
 * item. It replays the FIRST item's original → background-removed cutout.
 *
 * Non-blocking by design: it races `afterPromise` (the processed cutout URL)
 * against `timeoutMs` and calls `onDone()` immediately if the cutout isn't ready
 * or background removal failed — the guided flow must never stall here.
 */
export default function BeautifyReveal({
  before,
  afterPromise,
  onDone,
  timeoutMs = 6000,
}: {
  /** Original photo (the user's cropped dataURL) — still has its background. */
  before: string;
  /** Resolves to the background-removed cutout URL, or null on failure/timeout. */
  afterPromise: Promise<string | null>;
  /** Continue to the next step (GENERATE). Fires exactly once. */
  onDone: () => void;
  timeoutMs?: number;
}) {
  const { t } = useI18n();
  const [afterUrl, setAfterUrl] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const doneRef = useRef(false);

  const finish = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    onDone();
  };

  // Resolve the cutout (or bail). Preloads the image so the reveal doesn't flash.
  useEffect(() => {
    logAnalyticsEvent(Events.BEAUTIFY_REVEAL_VIEWED);
    let cancelled = false;
    const timer = setTimeout(() => { if (!cancelled) finish(); }, timeoutMs);
    afterPromise
      .then((url) => {
        if (cancelled) return;
        if (!url) { clearTimeout(timer); finish(); return; }
        const img = new window.Image();
        img.onload = () => { if (!cancelled) { clearTimeout(timer); setAfterUrl(url); } };
        img.onerror = () => { if (!cancelled) { clearTimeout(timer); finish(); } };
        img.src = url;
      })
      .catch(() => { if (!cancelled) { clearTimeout(timer); finish(); } });
    return () => { cancelled = true; clearTimeout(timer); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Once the cutout is loaded: play the reveal, then auto-advance.
  useEffect(() => {
    if (!afterUrl) return;
    const revealTimer = setTimeout(() => setRevealed(true), 450);
    const advanceTimer = setTimeout(() => finish(), 3600);
    return () => { clearTimeout(revealTimer); clearTimeout(advanceTimer); };
  }, [afterUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      className="phone-container flex flex-col bg-white dark:bg-[#111111] overflow-hidden"
      style={{ height: '100dvh' }}
    >
      <div className="flex-1 flex flex-col items-center justify-center px-8 gap-7">
        {/* Reveal stage: before crossfades into the background-removed cutout */}
        <div
          className="relative w-64 h-80 rounded-[28px] overflow-hidden bg-gray-50 dark:bg-[#1a1a1a] shadow-[0_10px_40px_-12px_rgba(243,112,167,0.45)]"
          style={{ animation: 'beautifyPop 0.5s ease-out both' }}
        >
          {/* Before (original, with background) */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={before}
            alt=""
            className={`absolute inset-0 w-full h-full object-contain transition-opacity duration-700 ${revealed ? 'opacity-0' : 'opacity-100'}`}
          />
          {/* After (background removed) */}
          {afterUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={afterUrl}
              alt=""
              className={`absolute inset-0 w-full h-full object-contain transition-opacity duration-700 ${revealed ? 'opacity-100' : 'opacity-0'}`}
            />
          )}
          {/* Pink shine sweep during the transition */}
          {afterUrl && !revealed && (
            <div
              className="pointer-events-none absolute inset-y-0 left-0 w-1/2"
              style={{
                background: 'linear-gradient(105deg, transparent, rgba(243,112,167,0.55), transparent)',
                animation: 'beautifyShine 1.1s ease-in-out',
              }}
            />
          )}
          {/* Before / After chip */}
          <div
            className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[11px] font-bold text-white shadow"
            style={{ background: revealed ? '#F370A7' : 'rgba(17,17,17,0.6)' }}
          >
            {revealed ? t.ob_beautify_after : t.ob_beautify_before}
          </div>
          {/* Sparkle badge on reveal */}
          {revealed && (
            <div
              className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center shadow-lg"
              style={{ background: '#F370A7', animation: 'beautifyPop 0.4s ease-out both' }}
            >
              <Sparkles size={16} color="#fff" />
            </div>
          )}
        </div>

        {/* Copy */}
        <div className="text-center">
          <h2 className="text-[22px] font-bold tracking-tight text-gray-900 dark:text-white mb-2">
            {t.ob_beautify_title}
          </h2>
          <p className="text-[15px] font-medium leading-relaxed text-gray-600 dark:text-gray-300 max-w-[32ch]">
            {t.ob_beautify_subtitle}
          </p>
        </div>
      </div>

      {/* CTA */}
      <div
        className="flex-none px-6 pb-2"
        style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom, 1.5rem))' }}
      >
        <button
          onClick={finish}
          className="w-full py-4 rounded-2xl text-white font-semibold text-base active:opacity-80"
          style={{ background: '#F370A7' }}
        >
          {t.ob_beautify_cta}
        </button>
      </div>
    </div>
  );
}
