import { needsUnoptimized } from '@/lib/img';
import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { Sparkles, User, Camera, Check, Loader2, ZoomIn, X } from 'lucide-react';
import type { ClosetItem } from '@/lib/closet-storage';
import type { SavedCanvasLayout } from '@/lib/closet-types';
import { createTryOnJob, watchTryOnUntilDone, uploadModelPhoto } from '@/lib/wardrobe-api';
import { compressImageForUpload } from '@/lib/image-utils';
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
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [phase, setPhase] = useState<Phase>('idle');
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [activeItemIdx, setActiveItemIdx] = useState(0);

  // Куда примеряем: на своё загруженное фото (по умолчанию, как в основном
  // TryOnFlow в гардеробе) или на манекен.
  const [target, setTarget] = useState<'mannequin' | 'self'>('self');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [personKey, setPersonKey] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [photoError, setPhotoError] = useState(false);
  // Увеличенный просмотр примера-фото (лайтбокс).
  const [zoomSrc, setZoomSrc] = useState<string | null>(null);

  async function handlePhotoPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-picking the same file
    if (!file) return;
    setPhotoError(false);
    setPersonKey(null);
    setPhotoPreview(URL.createObjectURL(file));
    setUploading(true);
    try {
      // Re-encode to JPEG via canvas before upload — iPhone gallery photos
      // arrive as HEIC/oversized files the backend rejects.
      const normalized = await compressImageForUpload(file);
      const key = await uploadModelPhoto(normalized);
      setPersonKey(key);
    } catch {
      setPhotoError(true);
      setPhotoPreview(null);
    } finally {
      setUploading(false);
    }
  }

  // «На своё фото» готово к запуску только когда фото загружено на сервер.
  const startDisabled = target === 'self' && (!personKey || uploading);

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
    if (itemIds.length === 0 || phase !== 'idle' || startDisabled) return;
    cancelRef.current = false;
    logAnalyticsEvent(Events.TRYON_INITIATED, { [Params.OUTFIT_ITEM_COUNT]: itemIds.length, [Params.SOURCE]: 'onboarding' });
    setPhase('processing');

    (async () => {
      let snapshotBlob: Blob | undefined;
      if (layout && layout.length > 0) {
        try { snapshotBlob = await captureCanvasSnapshot(layout, items); } catch { /* ignore */ }
      }
      return createTryOnJob({
        wardrobeItemIds: itemIds,
        snapshotBlob,
        personImageKey: target === 'self' ? personKey ?? undefined : undefined,
      });
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
    <div className="flex-1 flex flex-col min-h-0">
      <div className="px-6 pt-4 pb-2 flex-none">
        <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white mb-2">{title}</h2>
        <p className="text-[16px] font-medium leading-relaxed text-gray-600 dark:text-gray-300 max-w-[34ch]">{body}</p>
      </div>

      {/* Scrollable region: canvas + (idle) target chooser & photo upload. Kept
          scrollable so the guidance/examples never push the pinned CTA off-screen
          on short devices. */}
      <div className="flex-1 min-h-0 overflow-y-auto px-6 flex flex-col">
      {/* Canvas — only during processing / result. Hidden while idle: the outfit
          was already previewed on the generate step, and squeezing it into the
          reduced idle space overlapped the items. Sized by height so the fixed
          3:4 box can never get squished by a height cap. */}
      {phase !== 'idle' && (
      <div className="flex-none flex items-center justify-center py-1">
        <div
          className="relative rounded-3xl overflow-hidden"
          style={{ aspectRatio: '3/4', height: '46vh', maxWidth: '100%', background: '#ffffff', boxShadow: '0 2px 24px rgba(0,0,0,0.08)' }}
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
      )}

        {/* Idle: target chooser + (self) guidance, examples & upload */}
        {phase === 'idle' && (
          <div className="flex-none pt-3 pb-1 flex flex-col gap-2">
            {/* Target selector — two option cards: mannequin vs your own photo */}
            <div className="grid grid-cols-2 gap-3 items-stretch">
              <button
                onClick={() => setTarget('mannequin')}
                className="relative flex flex-col items-center text-center gap-1.5 rounded-2xl border p-3 transition-all"
                style={{
                  borderColor: target === 'mannequin' ? '#F370A7' : '#eee',
                  borderWidth: target === 'mannequin' ? 2 : 1,
                  background: target === 'mannequin' ? 'rgba(243,112,167,0.06)' : '#fff',
                }}
              >
                <SelectBadge active={target === 'mannequin'} />
                <span className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'rgba(243,112,167,0.10)' }}>
                  <User size={20} className="text-[#F370A7]" />
                </span>
                <span className="block text-[13px] font-semibold text-gray-900 leading-tight">{t.tryOnTargetMannequin}</span>
                <span className="block text-[11px] text-gray-400 leading-snug">{t.tryOnTargetMannequinHint}</span>
              </button>

              <button
                onClick={() => setTarget('self')}
                className="relative flex flex-col items-center text-center gap-1.5 rounded-2xl border p-3 transition-all"
                style={{
                  borderColor: target === 'self' ? '#F370A7' : '#eee',
                  borderWidth: target === 'self' ? 2 : 1,
                  background: target === 'self' ? 'rgba(243,112,167,0.06)' : '#fff',
                }}
              >
                <SelectBadge active={target === 'self'} />
                <span className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center" style={{ background: 'rgba(243,112,167,0.10)' }}>
                  {photoPreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={photoPreview} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Camera size={20} className="text-[#F370A7]" />
                  )}
                </span>
                <span className="block text-[13px] font-semibold text-gray-900 leading-tight">{t.tryOnTargetSelf}</span>
                <span className="block text-[11px] text-gray-400 leading-snug">{t.tryOnTargetSelfHint}</span>
              </button>
            </div>

            {/* Photo guidance + examples + upload — only in "self" mode */}
            {target === 'self' && (
              <>
                {/* Guidance: what photo to upload */}
                <div className="rounded-2xl p-3 mt-1" style={{ background: 'rgba(243,112,167,0.05)' }}>
                  <p className="text-[13px] font-bold text-gray-900">{t.tryOnPhotoWhatTitle}</p>
                  <p className="text-[12px] text-gray-500 leading-relaxed mt-1">{t.tryOnPhotoWhatBody}</p>
                </div>

                {/* Example photos — tap to view larger */}
                <div className="grid grid-cols-3 gap-2">
                  {[
                    '/images/closet/tryon/example-1.webp',
                    '/images/closet/tryon/example-2.webp',
                    '/images/closet/tryon/example-3.webp',
                  ].map((src, i) => (
                    <ExamplePhoto key={src} src={src} alt={`${t.tryOnPhotoWhatTitle} ${i + 1}`} onZoom={() => setZoomSrc(src)} />
                  ))}
                </div>

                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoPick} />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="w-full h-11 rounded-2xl border flex items-center justify-center gap-2 text-[13px] font-semibold disabled:opacity-70"
                  style={{
                    borderColor: personKey ? '#e5e7eb' : 'transparent',
                    background: personKey ? '#fff' : 'rgba(243,112,167,0.10)',
                    color: personKey ? '#374151' : '#F370A7',
                  }}
                >
                  {uploading ? (
                    <><Loader2 size={16} className="animate-spin" /> {t.tryOnUploading}</>
                  ) : personKey ? (
                    <><Check size={15} className="text-[#16a34a]" /> {t.tryOnChangePhoto}</>
                  ) : (
                    <><Camera size={16} /> {t.tryOnUploadPhoto}</>
                  )}
                </button>
                {photoError && (
                  <p className="text-center text-[11px]" style={{ color: '#ef4444' }}>{t.tryOnPhotoFailed}</p>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Pinned bottom actions */}
      <div className="flex-none px-6 pb-2 pt-2 flex flex-col gap-2">
        {phase === 'idle' ? (
          <>
            <button
              onClick={start}
              disabled={startDisabled}
              className="w-full py-4 rounded-2xl text-white font-semibold text-[15px] flex items-center justify-center gap-2 disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #F370A7, #e0409a)' }}
            >
              <Sparkles size={18} />
              {t.ob_tryon_cta}
            </button>
            <p className="text-center text-[11px] text-gray-300 leading-snug">{t.ob_tryon_quota_note}</p>
          </>
        ) : (
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

      {/* Enlarged example-photo viewer (lightbox) */}
      {zoomSrc && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/85 p-6"
          onClick={() => setZoomSrc(null)}
        >
          <button
            onClick={() => setZoomSrc(null)}
            aria-label={t.close}
            className="absolute top-5 right-5 w-10 h-10 rounded-full bg-white/15 backdrop-blur flex items-center justify-center"
          >
            <X size={20} className="text-white" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={zoomSrc}
            alt=""
            onClick={(e) => e.stopPropagation()}
            className="max-w-full rounded-2xl shadow-2xl"
            style={{ maxHeight: '85vh', objectFit: 'contain' }}
          />
        </div>
      )}
    </div>
  );
}

/**
 * One example photo showing how to shoot for a good try-on result. Tapping it
 * opens the enlarged viewer. Falls back to a neutral silhouette placeholder if
 * the image file is missing, so the layout stays stable.
 */
function ExamplePhoto({ src, alt, onZoom }: { src: string; alt: string; onZoom: () => void }) {
  const [ok, setOk] = useState(true);
  return (
    <button
      type="button"
      onClick={ok ? onZoom : undefined}
      className="group relative rounded-xl overflow-hidden bg-gray-100 flex items-center justify-center"
      style={{ aspectRatio: '2 / 3', cursor: ok ? 'zoom-in' : 'default' }}
    >
      {ok ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          onError={() => setOk(false)}
          loading="lazy"
          className="w-full h-full object-cover"
        />
      ) : (
        <User size={26} className="text-gray-300" />
      )}
      {ok && (
        <span className="absolute bottom-1.5 right-1.5 w-6 h-6 rounded-full bg-black/45 backdrop-blur-sm flex items-center justify-center">
          <ZoomIn size={13} className="text-white" />
        </span>
      )}
    </button>
  );
}

/** Checkmark badge in the corner of a selected target card. */
function SelectBadge({ active }: { active: boolean }) {
  return (
    <span
      className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center border-2 transition-colors"
      style={{
        borderColor: active ? '#F370A7' : '#d1d5db',
        background: active ? '#F370A7' : 'transparent',
      }}
    >
      {active && <Check size={12} className="text-white" strokeWidth={3} />}
    </span>
  );
}
