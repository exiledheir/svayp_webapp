import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { X, Sparkles, Loader2, RefreshCw, User, Camera } from 'lucide-react';
import type { ClosetItem } from '@/lib/closet-storage';
import type { SavedCanvasLayout } from '@/lib/closet-types';
import { useI18n } from '@/lib/i18n';
import { logAnalyticsEvent } from '@/lib/analytics';
import { Events, Params } from '@/lib/analytics-events';
import { downloadWithWatermark } from '@/lib/canvas-snapshot';
import { uploadModelPhoto } from '@/lib/wardrobe-api';

/**
 * Maps a raw backend try-on failure reason to a friendly, localized message.
 *
 * The backend's `failureReason` can be a raw provider error (e.g. an
 * OpenAI/Azure content-safety rejection like
 * `Error code: 400 - {'error': {'message': 'Your request was rejected by the
 * safety system...'}}`). Those must never be shown to users verbatim, so we
 * bucket them into a few meaningful, translated messages.
 */
export function mapTryOnFailure(
  reason: string | undefined,
  msgs: { safety: string; timeout: string; generic: string },
): string {
  const r = (reason ?? '').toLowerCase();
  if (
    r.includes('safety') ||
    r.includes('content policy') ||
    r.includes('content_policy') ||
    r.includes('moderation') ||
    r.includes('policy') ||
    r.includes('rejected')
  ) {
    return msgs.safety;
  }
  if (r.includes('timed out') || r.includes('timeout')) {
    return msgs.timeout;
  }
  return msgs.generic;
}

export function TryOnConfirmModal({
  savedLayout,
  items,
  onConfirm,
  onCancel,
}: {
  savedLayout: SavedCanvasLayout | null;
  items: ClosetItem[];
  onConfirm: (opts: { personImageKey?: string }) => void;
  onCancel: () => void;
}) {
  const { t } = useI18n();

  // Куда примеряем: на манекен (по умолчанию) или на своё загруженное фото.
  const [target, setTarget] = useState<'mannequin' | 'self'>('mannequin');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [personKey, setPersonKey] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [photoError, setPhotoError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  async function handlePhotoPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-picking the same file
    if (!file) return;
    setPhotoError(false);
    setPersonKey(null);
    setPhotoPreview(URL.createObjectURL(file));
    setUploading(true);
    try {
      const key = await uploadModelPhoto(file);
      setPersonKey(key);
    } catch {
      setPhotoError(true);
      setPhotoPreview(null);
    } finally {
      setUploading(false);
    }
  }

  // "На своё фото" готово к запуску только когда фото загружено на сервер.
  const confirmDisabled = target === 'self' && (!personKey || uploading);

  function handleConfirm() {
    onConfirm({ personImageKey: target === 'self' ? personKey ?? undefined : undefined });
  }

  // Отказ на экране подтверждения — примерка брошена после tryon_initiated.
  function handleCancel() {
    logAnalyticsEvent(Events.TRYON_ABANDONED, { [Params.STEP]: 'confirm' });
    onCancel();
  }

  const displayEntries = React.useMemo(() => {
    if (!savedLayout || savedLayout.length === 0) return [];
    return savedLayout
      .map((entry) => {
        const item = items.find((i) => i.id === entry.id);
        if (!item) return null;
        return { item, x: entry.x, y: entry.y, scale: entry.scale, zIndex: entry.zIndex };
      })
      .filter(Boolean) as { item: ClosetItem; x: number; y: number; scale: number; zIndex: number }[];
  }, [savedLayout, items]);

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/60 backdrop-blur-sm"
      onClick={handleCancel}
    >
      <div
        className="w-full max-w-[430px] rounded-t-3xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-9 h-1 rounded-full bg-gray-200" />
        </div>

        {/* Outfit preview */}
        <div
          className="mx-5 rounded-2xl overflow-hidden bg-white flex items-center justify-center"
          style={{ height: 260, border: '1px solid #f3f4f6' }}
        >
          <div className="relative h-full" style={{ aspectRatio: '3 / 4', maxWidth: '100%' }}>
            {displayEntries.map((entry, idx) => (
              <div
                key={`${entry.item.id}-${idx}`}
                className="absolute origin-center"
                style={{
                  left: `${entry.x}%`,
                  top: `${entry.y}%`,
                  width: '35%',
                  aspectRatio: '1',
                  transform: `scale(${entry.scale})`,
                  zIndex: entry.zIndex,
                }}
              >
                <div className="relative w-full h-full">
                  <Image src={entry.item.imageData} alt={entry.item.category} fill className="object-contain" unoptimized />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Title */}
        <div className="px-5 pt-4 pb-2 text-center">
          <h3 className="text-[16px] font-bold text-gray-900">{t.tryOnConfirmTitle}</h3>
          <p className="text-[13px] text-gray-400 mt-1">{t.tryOnConfirmBody}</p>
        </div>

        {/* Target selector — mannequin vs your own photo */}
        <div className="px-5 pt-1 pb-1 flex flex-col gap-2">
          <button
            onClick={() => setTarget('mannequin')}
            className="w-full flex items-center gap-3 p-3 rounded-2xl border text-left transition-colors"
            style={{
              borderColor: target === 'mannequin' ? '#F370A7' : '#eee',
              background: target === 'mannequin' ? 'rgba(243,112,167,0.06)' : '#fff',
            }}
          >
            <span className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: 'rgba(243,112,167,0.10)' }}>
              <User size={18} className="text-[#F370A7]" />
            </span>
            <span className="flex-1">
              <span className="block text-[13px] font-semibold text-gray-900">{t.tryOnTargetMannequin}</span>
              <span className="block text-[11px] text-gray-400">{t.tryOnTargetMannequinHint}</span>
            </span>
            <span
              className="w-4 h-4 rounded-full border-2 shrink-0"
              style={{ borderColor: target === 'mannequin' ? '#F370A7' : '#d1d5db', background: target === 'mannequin' ? '#F370A7' : 'transparent' }}
            />
          </button>

          <button
            onClick={() => setTarget('self')}
            className="w-full flex items-center gap-3 p-3 rounded-2xl border text-left transition-colors"
            style={{
              borderColor: target === 'self' ? '#F370A7' : '#eee',
              background: target === 'self' ? 'rgba(243,112,167,0.06)' : '#fff',
            }}
          >
            <span className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center shrink-0" style={{ background: 'rgba(243,112,167,0.10)' }}>
              {photoPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photoPreview} alt="" className="w-full h-full object-cover" />
              ) : (
                <Camera size={18} className="text-[#F370A7]" />
              )}
            </span>
            <span className="flex-1">
              <span className="block text-[13px] font-semibold text-gray-900">{t.tryOnTargetSelf}</span>
              <span className="block text-[11px] text-gray-400">{t.tryOnTargetSelfHint}</span>
            </span>
            <span
              className="w-4 h-4 rounded-full border-2 shrink-0"
              style={{ borderColor: target === 'self' ? '#F370A7' : '#d1d5db', background: target === 'self' ? '#F370A7' : 'transparent' }}
            />
          </button>

          {/* Photo upload area — only in "self" mode */}
          {target === 'self' && (
            <div className="mt-0.5">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoPick}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-full h-11 rounded-2xl border border-dashed flex items-center justify-center gap-2 text-[13px] font-semibold text-gray-700 disabled:opacity-60"
                style={{ borderColor: '#F370A7' }}
              >
                {uploading ? (
                  <><Loader2 size={15} className="animate-spin" /> {t.tryOnUploading}</>
                ) : (
                  <><Camera size={15} className="text-[#F370A7]" /> {personKey ? t.tryOnChangePhoto : t.tryOnUploadPhoto}</>
                )}
              </button>
              <p className="text-[11px] text-center mt-1.5" style={{ color: photoError ? '#ef4444' : '#9ca3af' }}>
                {photoError ? t.tryOnPhotoFailed : t.tryOnPhotoHint}
              </p>
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="flex gap-3 px-5 pt-3 pb-8">
          <button
            onClick={handleCancel}
            className="flex-1 h-12 rounded-full bg-gray-100 text-gray-700 text-[13px] font-semibold"
          >
            {t.tryOnCancel}
          </button>
          <button
            onClick={handleConfirm}
            disabled={confirmDisabled}
            className="flex-1 h-12 rounded-full text-white text-[13px] font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50"
            style={{
              background: 'linear-gradient(135deg, #F370A7 0%, #e0409a 50%, #F370A7 100%)',
              backgroundSize: '200% auto',
              boxShadow: '0 4px 18px rgba(243,112,167,0.45)',
            }}
          >
            {uploading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
            {t.tryOnConfirm}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Try-On Modal ───────────────────────────────────────────────────────────────
export function TryOnModal({
  status,
  resultUrl,
  failureReason,
  previewImages,
  onClose,
  onRetry,
  onCancel,
}: {
  status: 'loading' | 'processing' | 'completed' | 'failed';
  resultUrl?: string;
  failureReason?: string;
  previewImages?: string[];
  onClose: () => void;
  onRetry: () => void;
  onCancel: () => void;
}) {
  const { t } = useI18n();
  const [isDownloading, setIsDownloading] = useState(false);
  const [tipIndex, setTipIndex] = useState(() => Math.floor(Math.random() * 49));
  const [tipFading, setTipFading] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [activeItemIdx, setActiveItemIdx] = useState(0);
  const [phaseFading, setPhaseFading] = useState(false);

  const isProcessing = status === 'loading' || status === 'processing';

  // Elapsed timer (drives progress bar + phase labels)
  useEffect(() => {
    if (!isProcessing) { setElapsed(0); return; }
    const id = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [isProcessing]);

  // Tip rotation
  useEffect(() => {
    if (!isProcessing) return;
    const interval = setInterval(() => {
      setTipFading(true);
      setTimeout(() => {
        setTipIndex((i) => (i + 1) % t.tryOnTips.length);
        setTipFading(false);
      }, 350);
    }, 6000);
    return () => clearInterval(interval);
  }, [isProcessing, t.tryOnTips.length]);

  // Active item cycling (for scanning animation)
  useEffect(() => {
    if (!isProcessing || !previewImages?.length) return;
    const id = setInterval(() => {
      setActiveItemIdx((i) => (i + 1) % (previewImages?.length ?? 1));
    }, 1500);
    return () => clearInterval(id);
  }, [isProcessing, previewImages?.length]);

  // Phase label + fade
  const prevPhaseRef = React.useRef(0);
  const currentPhase = elapsed < 10 ? 0 : elapsed < 25 ? 1 : elapsed < 45 ? 2 : 3;
  useEffect(() => {
    if (currentPhase !== prevPhaseRef.current) {
      prevPhaseRef.current = currentPhase;
      setPhaseFading(true);
      setTimeout(() => setPhaseFading(false), 350);
    }
  }, [currentPhase]);

  const phaseLabels = [t.tryOnStarting, t.tryOnPhase2, t.tryOnPhase3, t.tryOnPhase4];
  const tipHeaders = ['✦ ' + t.tryOnStyleTip, '✦ ' + t.tryOnProTip, '✦ ' + t.tryOnDidYouKnow];

  // 4 segments with durations: 10s, 15s, 20s, 15s = 60s total
  // Each segment fills fully when its phase is passed, partially when current
  const PHASE_ENDS = [10, 25, 45, 60];
  function segmentFill(segIdx: number): number {
    if (status === 'completed') return 100;
    const segStart = segIdx === 0 ? 0 : PHASE_ENDS[segIdx - 1];
    const segEnd = PHASE_ENDS[segIdx];
    if (elapsed >= segEnd) return 100;
    if (elapsed <= segStart) return 0;
    return Math.round(((elapsed - segStart) / (segEnd - segStart)) * 100);
  }
  const secondsLeft = Math.max(0, 60 - elapsed);
  const timeLabel = status === 'completed' ? null : elapsed < 5 ? t.tryOnTimeEstimate : `~${secondsLeft}s`;

  // Закрытие модалки во время обработки = брошенная примерка — фиксируем шаг,
  // иначе воронка не видит, где юзер вышел.
  function handleClose() {
    if (isProcessing) {
      logAnalyticsEvent(Events.TRYON_ABANDONED, { [Params.STEP]: 'processing' });
    }
    onClose();
  }

  async function downloadWithLogo() {
    if (!resultUrl || isDownloading) return;
    setIsDownloading(true);
    try {
      await downloadWithWatermark(resultUrl);
    } catch {
      window.open(resultUrl, '_blank');
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={handleClose}
    >
      <div
        className="w-[90%] max-w-[380px] rounded-3xl bg-white overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Result area */}
        <div className="relative w-full" style={{ minHeight: status === 'completed' ? 420 : 300 }}>
          {isProcessing && (
            <div className="w-full flex flex-col items-center justify-center gap-4 px-5 pt-8 pb-6">

              {/* ── AI Scanning item strip ── */}
              {previewImages && previewImages.length > 0 && (
                <div className="relative w-full flex justify-center">
                  <div
                    className="relative flex gap-2.5 items-center justify-center px-3 py-3 rounded-2xl overflow-hidden"
                    style={{ background: 'rgba(243,112,167,0.06)' }}
                  >
                    {/* Scan beam sweeps across the entire row */}
                    <div
                      className="pointer-events-none absolute inset-0 rounded-2xl"
                      style={{
                        background: 'linear-gradient(90deg, transparent 0%, rgba(243,112,167,0.22) 50%, transparent 100%)',
                        animation: 'tryOnScanBeam 2.4s ease-in-out infinite',
                      }}
                    />
                    {previewImages.map((src, i) => {
                      const isActive = i === activeItemIdx;
                      return (
                        <div
                          key={i}
                          className="relative shrink-0 overflow-hidden rounded-xl transition-all duration-500"
                          style={{
                            width: 60,
                            height: 60,
                            transform: isActive ? 'scale(1.10)' : 'scale(1)',
                            boxShadow: isActive
                              ? '0 0 0 2.5px #F370A7, 0 4px 16px rgba(243,112,167,0.45)'
                              : '0 1px 4px rgba(0,0,0,0.10)',
                            filter: isActive ? 'grayscale(0%)' : 'grayscale(20%)',
                            background: '#f9fafb',
                          }}
                        >
                          <Image src={src} alt="outfit item" fill className="object-contain" unoptimized />
                          {/* Shimmer overlay on active item */}
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

              {/* ── Spinner ── */}
              <div className="relative">
                <div className="w-14 h-14 rounded-full border-[3px] border-gray-200 border-t-[#F370A7] animate-spin" />
                <Sparkles size={18} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[#F370A7]" />
              </div>

              {/* ── Segmented progress bar + time estimate ── */}
              <div className="w-full">
                <div className="flex gap-1.5 mb-1.5">
                  {[0, 1, 2, 3].map((seg) => {
                    const fill = segmentFill(seg);
                    const isActive = seg === currentPhase && isProcessing;
                    return (
                      <div
                        key={seg}
                        className="flex-1 h-1.5 rounded-full overflow-hidden"
                        style={{ background: '#f0f0f0' }}
                      >
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${fill}%`,
                            background: isActive
                              ? 'linear-gradient(90deg, #F370A7, #e0409a)'
                              : fill === 100
                              ? '#F370A7'
                              : 'transparent',
                            transition: isActive ? 'width 1s ease-out' : 'none',
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
                {timeLabel && (
                  <p className="text-center text-[11px] text-gray-400 font-medium">
                    {timeLabel}
                  </p>
                )}
              </div>

              {/* ── Phase label ── */}
              <div className="text-center" style={{ minHeight: '1.4em' }}>
                <p
                  className="text-[14px] font-semibold text-gray-900"
                  style={{ opacity: phaseFading ? 0 : 1, transition: 'opacity 0.35s ease' }}
                >
                  {phaseLabels[currentPhase]}
                </p>
              </div>

              {/* ── Style tip card ── */}
              <div className="w-full">
                <div className="bg-gray-50 rounded-2xl px-4 py-3">
                  <p className="text-[10px] font-semibold text-[#F370A7] uppercase tracking-wider mb-1.5">
                    {tipHeaders[tipIndex % 3]}
                  </p>
                  <div style={{ opacity: tipFading ? 0 : 1, transition: 'opacity 0.35s ease', minHeight: '3.5em' }}>
                    <p className="text-[12px] text-gray-600 leading-relaxed">{t.tryOnTips[tipIndex]}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {status === 'completed' && resultUrl && (
            <div className="relative w-full h-[420px]">
              <Image src={resultUrl} alt="Try-on result" fill className="object-contain" unoptimized />
              {/* Logo watermark — visible on screenshots */}
              <div className="absolute top-7 left-3 z-10 pointer-events-none">
                <p className="text-[13px] font-bold tracking-[0.5px]" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.18)' }}>
                  <span className="text-black">LIB</span><span style={{ color: '#F370A7' }}>Λ</span><span className="text-black">S</span>
                </p>
              </div>
            </div>
          )}

          {status === 'failed' && (
            <div className="w-full h-[300px] flex flex-col items-center justify-center gap-4 px-8">
              <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center">
                <X size={24} className="text-red-500" />
              </div>
              <div className="text-center">
                <p className="text-[15px] font-semibold text-gray-900">{t.tryOnFailedTitle}</p>
                <p className="text-[12px] text-gray-400 mt-1">
                  {mapTryOnFailure(failureReason, {
                    safety: t.tryOnFailedSafety,
                    timeout: t.tryOnFailedTimeout,
                    generic: t.tryOnFailedGeneric,
                  })}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Bottom actions */}
        <div className="px-5 pb-6 pt-4 flex gap-3">
          {status === 'completed' && (
            <>
              <button
                onClick={() => {
                  logAnalyticsEvent(Events.TRYON_RESULT_DISMISSED);
                  onClose();
                }}
                className="flex-1 h-12 rounded-full bg-gray-100 text-gray-700 text-[13px] font-semibold"
              >
                {t.close}
              </button>
              <button
                onClick={() => {
                  logAnalyticsEvent(Events.TRYON_RESULT_SAVED);
                  downloadWithLogo();
                }}
                disabled={isDownloading}
                className="flex-1 h-12 rounded-full bg-black text-white text-[13px] font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {isDownloading ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                )}
                {t.save}
              </button>
            </>
          )}
          {status === 'failed' && (
            <>
              <button
                onClick={onClose}
                className="flex-1 h-12 rounded-full bg-gray-100 text-gray-700 text-[13px] font-semibold"
              >
                {t.close}
              </button>
              <button
                onClick={onRetry}
                className="flex-1 h-12 rounded-full bg-black text-white text-[13px] font-semibold flex items-center justify-center gap-1.5"
              >
                <RefreshCw size={13} />
                {t.retry}
              </button>
            </>
          )}
          {(status === 'loading' || status === 'processing') && (
            <button
              onClick={onCancel}
              className="flex-1 h-12 rounded-full bg-gray-100 text-gray-500 text-[13px] font-semibold"
            >
              {t.tryOnCancel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
