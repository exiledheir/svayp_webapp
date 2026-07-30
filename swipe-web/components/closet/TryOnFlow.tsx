import { needsUnoptimized } from '@/lib/img';
import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { X, Sparkles, Loader2, RefreshCw, User, Camera, Check, ZoomIn, Share2, Star } from 'lucide-react';
import type { ClosetItem } from '@/lib/closet-storage';
import type { SavedCanvasLayout } from '@/lib/closet-types';
import { useI18n } from '@/lib/i18n';
import { logAnalyticsEvent } from '@/lib/analytics';
import { Events, Params } from '@/lib/analytics-events';
import { downloadWithWatermark, shareWatermarked } from '@/lib/canvas-snapshot';
import ShareSheet from '@/components/ShareSheet';
import { uploadModelPhoto, submitTryOnFeedback } from '@/lib/wardrobe-api';
import { compressImageForUpload } from '@/lib/image-utils';

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
  msgs: { safety: string; timeout: string; busy: string; generic: string },
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
  // Движок перегружен / rate-limit (Azure 429 EngineOverloaded и т.п.) — просим подождать.
  if (
    r.includes('busy') ||
    r.includes('overloaded') ||
    r.includes('429') ||
    r.includes('too many') ||
    r.includes('rate') ||
    r.includes('quota') ||
    r.includes('currently servicing')
  ) {
    return msgs.busy;
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

  // Куда примеряем: на своё загруженное фото (по умолчанию) или на манекен.
  const [target, setTarget] = useState<'mannequin' | 'self'>('self');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [personKey, setPersonKey] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [photoError, setPhotoError] = useState(false);
  // Увеличенный просмотр примера-фото (лайтбокс).
  const [zoomSrc, setZoomSrc] = useState<string | null>(null);
  // Свайп вниз закрывает шторку (за «ручку» мышью, или потянув контент вниз,
  // когда он прокручен до самого верха).
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [entered, setEntered] = useState(false); // анимация появления
  const [closing, setClosing] = useState(false); // анимация закрытия
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const closeTimerRef = useRef<number | null>(null);
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
      // Re-encode to JPEG via canvas before upload — same as every other upload
      // path (closet, market, onboarding). iPhone gallery photos arrive as HEIC
      // or very large files that the backend rejects; the canvas round-trip
      // normalizes them to a JPEG the backend accepts.
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

  // "На своё фото" готово к запуску только когда фото загружено на сервер.
  const confirmDisabled = target === 'self' && (!personKey || uploading);

  function handleConfirm() {
    onConfirm({ personImageKey: target === 'self' ? personKey ?? undefined : undefined });
  }

  // Закрытие с анимацией: доводим шторку вниз и гасим фон, затем размонтируем.
  // (примерка брошена после tryon_initiated — логируем один раз в начале ухода).
  const CLOSE_MS = 260;
  function requestClose() {
    if (closing) return;
    setClosing(true);
    setDragging(false);
    logAnalyticsEvent(Events.TRYON_ABANDONED, { [Params.STEP]: 'confirm' });
    closeTimerRef.current = window.setTimeout(onCancel, CLOSE_MS);
  }

  // Порог закрытия свайпом.
  const DISMISS_THRESHOLD = 110;

  // Мышь/стилус: тянем вниз от «ручки» или от контента, прокрученного до самого
  // верха (тач обрабатывается отдельным эффектом, чтобы не ломать нативный скролл).
  function handleSheetPointerDown(e: React.PointerEvent) {
    if (e.pointerType === 'touch' || closing) return;
    if ((sheetRef.current?.scrollTop ?? 0) > 0) return; // тянем только от верха
    const startY = e.clientY;
    let curD = 0;
    const onMove = (ev: PointerEvent) => {
      const d = ev.clientY - startY;
      if (d > 4) { curD = d; setDragging(true); setDragY(d); }
      else if (curD !== 0) { curD = 0; setDragging(false); setDragY(0); }
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      if (curD > DISMISS_THRESHOLD) requestClose();
      else { setDragging(false); setDragY(0); }
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }

  // Всегда актуальная ссылка на закрытие — чтобы тач-эффект можно было завесить один раз.
  const cancelRef = useRef(requestClose);
  cancelRef.current = requestClose;

  // Плавное появление шторки + очистка таймера закрытия при размонтировании.
  useEffect(() => {
    const id = requestAnimationFrame(() => setEntered(true));
    return () => {
      cancelAnimationFrame(id);
      if (closeTimerRef.current != null) clearTimeout(closeTimerRef.current);
    };
  }, []);

  // Тач-жест: скроллим контент как обычно, но у самого верха «оттягивание» вниз
  // тянет всю шторку и за порогом закрывает её.
  useEffect(() => {
    const el = sheetRef.current;
    if (!el) return;
    let startY = 0;
    let active = false; // жест перешёл в перетаскивание шторки
    let dy = 0;

    function onStart(e: TouchEvent) {
      if (e.touches.length !== 1) return;
      startY = e.touches[0].clientY;
      active = false;
      dy = 0;
    }
    function onMove(e: TouchEvent) {
      const y = e.touches[0].clientY;
      if (!active) {
        // Перехватываем только когда прокручены до верха и тянем вниз.
        if (el!.scrollTop <= 0 && y - startY > 4) {
          active = true;
          setDragging(true);
          startY = y; // сдвиг считаем от точки захвата, чтобы не было рывка
          return; // перевод применяем со следующего кадра
        }
        return; // обычный скролл
      }
      const delta = y - startY;
      if (delta <= 0) {
        // Вернулись выше точки захвата — отпускаем, отдаём скроллу.
        active = false;
        dy = 0;
        setDragging(false);
        setDragY(0);
        startY = y;
        return;
      }
      e.preventDefault(); // гасим нативный скролл/оверскролл, пока тянем
      dy = delta;
      setDragY(delta);
    }
    function onEnd() {
      if (!active) return;
      const shouldClose = dy > DISMISS_THRESHOLD;
      active = false;
      setDragging(false);
      if (shouldClose) cancelRef.current();
      else setDragY(0);
    }

    el.addEventListener('touchstart', onStart, { passive: true });
    el.addEventListener('touchmove', onMove, { passive: false });
    el.addEventListener('touchend', onEnd);
    el.addEventListener('touchcancel', onEnd);
    return () => {
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchmove', onMove);
      el.removeEventListener('touchend', onEnd);
      el.removeEventListener('touchcancel', onEnd);
    };
  }, []);

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

  // Позиция шторки: закрытие/до-появления — уводим вниз; иначе следуем за пальцем.
  const sheetTransform =
    closing || !entered
      ? 'translateY(100%)'
      : dragY
      ? `translateY(${dragY}px)`
      : 'translateY(0)';

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center"
      onClick={requestClose}
    >
      {/* Затемнение — отдельным слоем, чтобы гаснуть независимо от съезжающей шторки */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        style={{ opacity: closing || !entered ? 0 : 1, transition: `opacity ${CLOSE_MS}ms ease` }}
      />
      <div
        ref={sheetRef}
        className="relative w-full max-w-[430px] rounded-t-3xl bg-white shadow-2xl max-h-[94vh] overflow-y-auto overscroll-contain"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={handleSheetPointerDown}
        style={{
          transform: sheetTransform,
          transition: dragging && !closing ? 'none' : `transform ${CLOSE_MS}ms ease`,
          userSelect: dragging ? 'none' : undefined,
        }}
      >
        {/* Drag handle — drag down (from here or the top of the content) to dismiss */}
        <div className="flex justify-center pt-3 pb-2.5 cursor-grab active:cursor-grabbing touch-none">
          <div className="w-9 h-1 rounded-full bg-gray-300" />
        </div>

        {/* Outfit preview */}
        <div
          className="mx-5 rounded-2xl overflow-hidden bg-white flex items-center justify-center"
          style={{ height: 168, border: '1px solid #f3f4f6' }}
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
                  <Image src={entry.item.imageData} alt={entry.item.category} fill className="object-contain" unoptimized={needsUnoptimized(entry.item.imageData)} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Title */}
        <div className="px-5 pt-3.5 pb-1 text-center">
          <h3 className="text-[17px] font-bold text-gray-900">{t.tryOnConfirmTitle}</h3>
        </div>

        {/* Target selector. A two-state choice does not need two description
            cards — a segmented control says the same thing in one line. */}
        <div className="mx-5 mt-3 flex gap-1.5 rounded-full p-1" style={{ background: '#F4F4F7' }}>
          {(['mannequin', 'self'] as const).map((opt) => {
            const on = target === opt;
            return (
              <button
                key={opt}
                onClick={() => setTarget(opt)}
                className="flex-1 h-10 rounded-full flex items-center justify-center gap-1.5 text-[13.5px] font-bold transition-colors"
                style={{
                  background: on ? '#fff' : 'transparent',
                  color: on ? '#101014' : '#6E6E78',
                  boxShadow: on ? '0 1px 3px rgba(0,0,0,0.1)' : undefined,
                  whiteSpace: 'nowrap',
                }}
              >
                {opt === 'mannequin' ? <User size={15} /> : <Camera size={15} />}
                {opt === 'mannequin' ? t.tryOnTargetMannequin : t.tryOnTargetSelf}
              </button>
            );
          })}
        </div>

        {/* Photo picker — only in "self" mode. One example thumbnail carries the
            guidance that used to take a paragraph and a three-photo grid. */}
        {target === 'self' && (
          <div className="px-5 pt-3.5">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoPick}
            />
            <div className="flex items-center gap-3">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="relative flex-none rounded-2xl overflow-hidden flex items-center justify-center"
                style={{
                  width: 74, height: 96,
                  border: `1.5px ${photoPreview ? 'solid' : 'dashed'} ${photoPreview ? '#F370A7' : '#E7E7EC'}`,
                  background: photoPreview ? '#fff' : '#FAFAFC',
                }}
                aria-label={t.tryOnUploadPhoto}
              >
                {photoPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photoPreview} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Camera size={22} className="text-[#F370A7]" />
                )}
                {uploading && (
                  <span className="absolute inset-0 flex items-center justify-center bg-white/70">
                    <Loader2 size={18} className="animate-spin text-[#F370A7]" />
                  </span>
                )}
                {personKey && !uploading && (
                  <span className="absolute bottom-1 right-1 w-5 h-5 rounded-full bg-[#16a34a] flex items-center justify-center">
                    <Check size={12} className="text-white" strokeWidth={3} />
                  </span>
                )}
              </button>

              <div className="flex-1 min-w-0">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="text-left text-[14px] font-bold text-gray-900"
                >
                  {personKey && !uploading ? t.tryOnChangePhoto : t.tryOnUploadPhoto}
                </button>
                <p className="text-[12px] text-gray-400 leading-snug mt-1">{t.tryOnPhotoHint}</p>
                {photoError && (
                  <p className="text-[11.5px] mt-1" style={{ color: '#ef4444' }}>{t.tryOnPhotoFailed}</p>
                )}
              </div>

              <ExamplePhoto
                src="/images/closet/tryon/example-1.webp"
                alt={t.tryOnPhotoHint}
                onZoom={() => setZoomSrc('/images/closet/tryon/example-1.webp')}
              />
            </div>
          </div>
        )}

        {/* Buttons */}
        <div className="px-5 pt-4 pb-7">
          <button
            onClick={handleConfirm}
            disabled={confirmDisabled}
            className="w-full h-13 rounded-full text-white text-[15.5px] font-bold flex items-center justify-center gap-2 disabled:opacity-50"
            style={{
              height: 52,
              background: 'linear-gradient(135deg, #F370A7 0%, #e0409a 50%, #F370A7 100%)',
              backgroundSize: '200% auto',
              boxShadow: '0 6px 20px rgba(243,112,167,0.42)',
            }}
          >
            {uploading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            {t.tryOnConfirm}
          </button>
          <button
            onClick={requestClose}
            className="w-full text-center text-[13.5px] font-semibold text-gray-400"
            style={{ minHeight: 44, marginTop: 4 }}
          >
            {t.tryOnCancel}
          </button>
        </div>
      </div>

      {/* Enlarged example-photo viewer (lightbox) */}
      {zoomSrc && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/85 p-6"
          onClick={(e) => { e.stopPropagation(); setZoomSrc(null); }}
        >
          <button
            onClick={(e) => { e.stopPropagation(); setZoomSrc(null); }}
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
  if (!ok) return null; // Nothing to teach without the image — don't hold space.
  return (
    <button
      type="button"
      onClick={ok ? onZoom : undefined}
      className="group relative flex-none rounded-xl overflow-hidden bg-gray-100 flex items-center justify-center"
      style={{ width: 60, height: 90, cursor: ok ? 'zoom-in' : 'default' }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        onError={() => setOk(false)}
        loading="lazy"
        className="w-full h-full object-cover"
      />
      <span className="absolute bottom-1 right-1 w-5 h-5 rounded-full bg-black/45 backdrop-blur-sm flex items-center justify-center">
        <ZoomIn size={11} className="text-white" />
      </span>
    </button>
  );
}

// ─── Try-On Feedback Strip ───────────────────────────────────────────────────────
// Встроенная полоска оценки результата примерки: 1..5 звёзд + опциональный
// комментарий. Показывается только для завершённой примерки с реальным jobId.
function TryOnFeedbackStrip({ jobId }: { jobId: string }) {
  const { t } = useI18n();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(false);

  function pick(value: number) {
    if (submitting || submitted) return;
    setRating(value);
    setError(false);
    logAnalyticsEvent(Events.TRYON_FEEDBACK_RATED, { [Params.RATING]: value });
  }

  async function submit() {
    if (rating < 1 || submitting) return;
    setSubmitting(true);
    setError(false);
    try {
      await submitTryOnFeedback(jobId, { rating, note });
      logAnalyticsEvent(Events.TRYON_FEEDBACK_SUBMITTED, {
        [Params.RATING]: rating,
        [Params.HAS_COMMENT]: note.trim().length > 0,
      });
      setSubmitted(true);
    } catch {
      setError(true);
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="px-5 pt-4 border-t border-gray-100 flex items-center justify-center gap-2">
        <span className="w-6 h-6 rounded-full bg-[#F370A7]/12 flex items-center justify-center">
          <Check size={14} className="text-[#F370A7]" />
        </span>
        <p className="text-[13px] font-semibold text-gray-900">{t.tryOnRateThanks}</p>
      </div>
    );
  }

  const active = hover || rating;

  return (
    <div className="px-5 pt-4 border-t border-gray-100">
      <p className="text-center text-[13px] font-semibold text-gray-900 mb-2.5">
        {t.tryOnRateTitle}
      </p>
      <div className="flex items-center justify-center gap-1.5" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((v) => {
          const filled = v <= active;
          return (
            <button
              key={v}
              type="button"
              onClick={() => pick(v)}
              onMouseEnter={() => setHover(v)}
              disabled={submitting}
              aria-label={`${v}`}
              className="p-1 transition-transform active:scale-90"
            >
              <Star
                size={28}
                className="transition-colors"
                style={{
                  fill: filled ? '#F370A7' : 'transparent',
                  color: filled ? '#F370A7' : '#d1d5db',
                }}
              />
            </button>
          );
        })}
      </div>

      {rating > 0 && (
        <div className="mt-3">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t.tryOnRateCommentPlaceholder}
            rows={2}
            maxLength={2000}
            disabled={submitting}
            className="w-full resize-none rounded-2xl bg-gray-50 border border-gray-200 px-3.5 py-2.5 text-[13px] text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-[#F370A7]"
          />
          {error && (
            <p className="text-[11px] text-red-500 mt-1.5 text-center">{t.tryOnRateError}</p>
          )}
          <button
            onClick={submit}
            disabled={submitting}
            className="mt-2 w-full h-11 rounded-full bg-[#F370A7] text-white text-[13px] font-semibold flex items-center justify-center gap-1.5 disabled:opacity-60"
          >
            {submitting ? <Loader2 size={15} className="animate-spin" /> : t.tryOnRateSubmit}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Try-On Modal ───────────────────────────────────────────────────────────────
export function TryOnModal({
  status,
  resultUrl,
  jobId,
  failureReason,
  previewImages,
  onClose,
  onRetry,
  onCancel,
}: {
  status: 'loading' | 'processing' | 'completed' | 'failed';
  resultUrl?: string;
  jobId?: string;
  failureReason?: string;
  previewImages?: string[];
  onClose: () => void;
  onRetry: () => void;
  onCancel: () => void;
}) {
  const { t } = useI18n();
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [showShareSheet, setShowShareSheet] = useState(false);
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

  async function shareResult() {
    if (!resultUrl || isSharing) return;
    setIsSharing(true);
    try {
      await shareWatermarked(resultUrl);
    } catch {
      /* share cancelled or unavailable — no-op */
    } finally {
      setIsSharing(false);
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
                          <Image src={src} alt="outfit item" fill className="object-contain" unoptimized={needsUnoptimized(src)} />
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
              <Image src={resultUrl} alt="Try-on result" fill className="object-contain" unoptimized={needsUnoptimized(resultUrl)} />
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
                    busy: t.tryOnFailedBusy,
                    generic: t.tryOnFailedGeneric,
                  })}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Rate & comment strip — только для реального завершённого результата */}
        {status === 'completed' && resultUrl && jobId && (
          <TryOnFeedbackStrip jobId={jobId} />
        )}

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
                onClick={() => setShowShareSheet(true)}
                disabled={isSharing}
                aria-label={t.share}
                title={t.share}
                className="shrink-0 w-12 h-12 rounded-full bg-gray-100 text-gray-700 flex items-center justify-center disabled:opacity-50"
              >
                {isSharing ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Share2 size={16} />
                )}
              </button>
              {showShareSheet && (
                <ShareSheet onClose={() => setShowShareSheet(false)} onExternal={shareResult} />
              )}
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
