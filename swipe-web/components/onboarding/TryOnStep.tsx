import { needsUnoptimized } from '@/lib/img';
import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { Sparkles } from 'lucide-react';
import type { ClosetItem } from '@/lib/closet-storage';
import type { SavedCanvasLayout } from '@/lib/closet-types';
import { createTryOnJob, watchTryOnUntilDone } from '@/lib/wardrobe-api';
import type { SseHandle } from '@/types';
import { captureCanvasSnapshot } from '@/lib/canvas-snapshot';
import { saveTryOnResult } from '@/lib/tryon-history';
import { useI18n } from '@/lib/i18n';
import { logAnalyticsEvent } from '@/lib/analytics';
import { Events, Params } from '@/lib/analytics-events';

type Phase = 'idle' | 'processing' | 'completed' | 'failed';

const PHASE_ENDS = [10, 25, 45, 60];

export default function TryOnStep({
  items,
  layout,
  title,
  body,
  onFinished,
}: {
  items: ClosetItem[];
  layout: SavedCanvasLayout | null;
  title: string;
  body: string;
  onFinished: () => void;
}) {
  const { t } = useI18n();
  const handleRef = useRef<SseHandle | null>(null);
  const cancelRef = useRef(false);
  const startedAt = useRef(0);

  const [phase, setPhase] = useState<Phase>('idle');
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [activeItemIdx, setActiveItemIdx] = useState(0);

  // Elapsed timer for progress bar
  useEffect(() => {
    if (phase !== 'processing') { setElapsed(0); return; }
    const id = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [phase]);

  // Full layout preview — mirrors the editor canvas and GenerateStep, honoring
  // each item's saved position AND scale so nothing renders oversized.
  const previewEntries = (layout ?? [])
    .map((e) => {
      const item = items.find((i) => i.id === e.id);
      return item ? { ...e, item } : null;
    })
    .filter(Boolean) as (SavedCanvasLayout[number] & { item: ClosetItem })[];

  // Cycle active scan item during processing — include EVERY item in the look
  // (top, bottom, shoes, accessories), ordered top→bottom, not just top+bottom.
  const GROUP_RANK: Record<string, number> = { upper: 0, lower: 1, shoes: 2, acc: 3 };
  const seenScan = new Set<string>();
  const scanImages = previewEntries
    .slice()
    .sort((a, b) => (GROUP_RANK[a.group] ?? 9) - (GROUP_RANK[b.group] ?? 9))
    .map((e) => e.item)
    .filter((it) => (seenScan.has(it.id) ? false : (seenScan.add(it.id), true)));
  useEffect(() => {
    if (phase !== 'processing' || scanImages.length < 2) return;
    const id = setInterval(() => setActiveItemIdx((i) => (i + 1) % scanImages.length), 1500);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const itemIds = (layout ?? [])
    .map((e) => e.id)
    .filter((id) => !id.startsWith('local_') && !id.startsWith('pending_'));

  function segmentFill(segIdx: number): number {
    if (phase === 'completed') return 100;
    const segStart = segIdx === 0 ? 0 : PHASE_ENDS[segIdx - 1];
    const segEnd = PHASE_ENDS[segIdx];
    if (elapsed >= segEnd) return 100;
    if (elapsed <= segStart) return 0;
    return Math.round(((elapsed - segStart) / (segEnd - segStart)) * 100);
  }

  const currentPhase = elapsed < 10 ? 0 : elapsed < 25 ? 1 : elapsed < 45 ? 2 : 3;

  function start() {
    if (itemIds.length === 0 || phase !== 'idle') return;
    cancelRef.current = false;
    logAnalyticsEvent(Events.TRYON_INITIATED, { [Params.OUTFIT_ITEM_COUNT]: itemIds.length, [Params.SOURCE]: 'onboarding' });
    setPhase('processing');

    (async () => {
      let snapshotBlob: Blob | undefined;
      if (layout && layout.length > 0) {
        try { snapshotBlob = await captureCanvasSnapshot(layout, items); } catch { /* ignore */ }
      }
      return createTryOnJob({ wardrobeItemIds: itemIds, snapshotBlob });
    })()
      .then((job) => {
        if (cancelRef.current) return;
        startedAt.current = Date.now();
        logAnalyticsEvent(Events.TRYON_PROCESSING_STARTED);
        handleRef.current = watchTryOnUntilDone(
          job.id,
          () => { /* elapsed timer drives progress */ },
          (result) => {
            handleRef.current = null;
            if (cancelRef.current) return;
            if (result.status === 'COMPLETED' && result.resultImageUrl) {
              logAnalyticsEvent(Events.TRYON_COMPLETED, { [Params.DURATION_MS]: startedAt.current ? Date.now() - startedAt.current : 0 });
              setResultUrl(result.resultImageUrl);
              setPhase('completed');
              saveTryOnResult(result.resultImageUrl);
            } else {
              logAnalyticsEvent(Events.TRYON_FAILED, { [Params.ERROR_CODE]: result.failureReason ?? 'unknown' });
              setPhase('failed');
            }
          },
          () => {
            handleRef.current = null;
            if (cancelRef.current) return;
            logAnalyticsEvent(Events.TRYON_FAILED, { [Params.ERROR_CODE]: 'sse_error' });
            setPhase('failed');
          },
        );
      })
      .catch((err) => {
        if (cancelRef.current) return;
        if (err?.response?.status === 402) { onFinished(); return; }
        setPhase('failed');
      });
  }

  return (
    <div className="flex-1 flex flex-col">
      <div className="px-6 pt-4 pb-2">
        <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white mb-2">{title}</h2>
        <p className="text-[16px] font-medium leading-relaxed text-gray-600 dark:text-gray-300 max-w-[34ch]">{body}</p>
      </div>

      {/* Canvas: white bg, items positioned naturally top→bottom */}
      <div className="flex-1 flex items-center justify-center px-8 min-h-0">
        <div
          className="relative w-full rounded-3xl overflow-hidden"
          style={{ aspectRatio: '3/4', maxHeight: '50vh', background: '#ffffff', boxShadow: '0 2px 24px rgba(0,0,0,0.08)' }}
        >
          {/* ── Idle / result ── */}
          {phase !== 'processing' && (
            <>
              {phase === 'completed' && resultUrl ? (
                <Image src={resultUrl} alt="Try-on result" fill className="object-cover" unoptimized={needsUnoptimized(resultUrl)} />
              ) : (
                <>
                  {previewEntries.length > 0 ? (
                    previewEntries.map((entry, idx) => (
                      <div
                        key={`${entry.item.id}-${idx}`}
                        className="absolute origin-center"
                        style={{ left: `${entry.x}%`, top: `${entry.y}%`, width: '35%', aspectRatio: '1', transform: `scale(${entry.scale})`, zIndex: entry.zIndex }}
                      >
                        <div className="relative w-full h-full">
                          <Image src={entry.item.imageData} alt={entry.item.category} fill className="object-contain" unoptimized={needsUnoptimized(entry.item.imageData)} />
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Sparkles size={48} color="#F370A7" strokeWidth={1} opacity={0.3} />
                    </div>
                  )}
                  {phase === 'failed' && (
                    <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.85)' }}>
                      <p className="text-[13px] text-gray-500 text-center px-8">{t.tryOnFailedGeneric}</p>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* ── Processing: scan strip + spinner + segmented progress ── */}
          {phase === 'processing' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6">
              {/* Scanning item strip */}
              {scanImages.length > 0 && (
                <div className="relative w-full flex justify-center">
                  <div
                    className="relative flex gap-2.5 items-center justify-center px-3 py-3 rounded-2xl overflow-hidden"
                    style={{ background: 'rgba(243,112,167,0.06)' }}
                  >
                    <div
                      className="pointer-events-none absolute inset-0 rounded-2xl"
                      style={{
                        background: 'linear-gradient(90deg, transparent 0%, rgba(243,112,167,0.22) 50%, transparent 100%)',
                        animation: 'tryOnScanBeam 2.4s ease-in-out infinite',
                      }}
                    />
                    {scanImages.map((item, i) => {
                      const isActive = i === activeItemIdx;
                      return (
                        <div
                          key={item.id}
                          className="relative shrink-0 overflow-hidden rounded-xl transition-all duration-500"
                          style={{
                            width: 60, height: 60,
                            transform: isActive ? 'scale(1.10)' : 'scale(1)',
                            boxShadow: isActive ? '0 0 0 2.5px #F370A7, 0 4px 16px rgba(243,112,167,0.45)' : '0 1px 4px rgba(0,0,0,0.10)',
                            background: '#f9fafb',
                          }}
                        >
                          <Image src={item.imageData} alt="outfit item" fill className="object-contain" unoptimized={needsUnoptimized(item.imageData)} />
                          {isActive && (
                            <div
                              className="absolute inset-0 rounded-xl pointer-events-none"
                              style={{
                                background: 'linear-gradient(120deg, transparent 30%, rgba(255,255,255,0.55) 50%, transparent 70%)',
                                animation: 'tryOnItemShimmer 1.2s ease-in-out infinite',
                              }}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Spinner */}
              <div className="relative">
                <div className="w-14 h-14 rounded-full border-[3px] border-gray-200 border-t-[#F370A7] animate-spin" />
                <Sparkles size={18} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[#F370A7]" />
              </div>

              {/* Phase label */}
              <p className="text-[13px] font-semibold text-gray-700 text-center">
                {currentPhase === 0 ? t.tryOnStarting : currentPhase === 1 ? t.tryOnPhase2 : currentPhase === 2 ? t.tryOnPhase3 : t.tryOnPhase4}
              </p>

              {/* Segmented progress bar */}
              <div className="w-full flex gap-1.5">
                {[0, 1, 2, 3].map((seg) => (
                  <div key={seg} className="flex-1 h-1.5 rounded-full bg-gray-200 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${segmentFill(seg)}%`,
                        background: '#F370A7',
                        transition: seg === currentPhase ? 'width 1s linear' : 'width 0.3s ease',
                      }}
                    />
                  </div>
                ))}
              </div>

              <p className="text-[11px] text-gray-400">
                {elapsed < 5 ? t.tryOnTimeEstimate : `~${Math.max(0, 60 - elapsed)}s`}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom actions */}
      <div className="flex-none px-6 pb-2 pt-3 flex flex-col gap-2">
        {phase === 'idle' && (
          <>
            <button
              onClick={start}
              className="w-full py-4 rounded-2xl text-white font-semibold text-[15px] flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, #F370A7, #e0409a)' }}
            >
              <Sparkles size={18} />
              {t.ob_tryon_cta}
            </button>
            <p className="text-center text-[11px] text-gray-300 leading-snug">{t.ob_tryon_quota_note}</p>
          </>
        )}

        {phase !== 'idle' && (
          <button
            onClick={onFinished}
            disabled={phase === 'processing'}
            className="w-full py-4 rounded-2xl text-white font-semibold text-[15px] disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
            style={{ background: '#F370A7' }}
          >
            {t.ob_tryon_continue}
          </button>
        )}
      </div>
    </div>
  );
}
