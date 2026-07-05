import { needsUnoptimized } from '@/lib/img';
import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { X, Sparkles, Loader2, RefreshCw, User, Camera, Check, ZoomIn, Share2 } from 'lucide-react';
import type { ClosetItem } from '@/lib/closet-storage';
import type { SavedCanvasLayout } from '@/lib/closet-types';
import { useI18n } from '@/lib/i18n';
import { logAnalyticsEvent } from '@/lib/analytics';
import { Events, Params } from '@/lib/analytics-events';
import { downloadWithWatermark, shareWatermarked } from '@/lib/canvas-snapshot';
import ShareSheet from '@/components/ShareSheet';
import { uploadModelPhoto } from '@/lib/wardrobe-api';
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

  // На открытии прокручиваем шторку вниз, чтобы сразу была видна кнопка загрузки.
  useEffect(() => {
    const el = sheetRef.current;
    if (!el) return;
    const id = requestAnimationFrame(() => {
      el.scrollTo({ top: el.scrollHeight });
    });
    return () => cancelAnimationFrame(id);
    // Пересчитываем при переключении режима (в «self» контент выше).
  }, [target]);

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
          style={{ height: 220, border: '1px solid #f3f4f6' }}
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
        <div className="px-5 pt-4 pb-2 text-center">
          <h3 className="text-[16px] font-bold text-gray-900">{t.tryOnConfirmTitle}</h3>
          <p className="text-[13px] text-gray-400 mt-1">{t.tryOnConfirmBody}</p>
        </div>

        {/* Target selector — two option cards: mannequin vs your own photo */}
        <div className="px-5 pt-1 pb-1 grid grid-cols-2 gap-3 items-stretch">
          {/* Card: on a mannequin */}
          <button
            onClick={() => setTarget('mannequin')}
            className="relative flex flex-col items-center text-center gap-2 rounded-2xl border p-3.5 transition-all"
            style={{
              borderColor: target === 'mannequin' ? '#F370A7' : '#eee',
              borderWidth: target === 'mannequin' ? 2 : 1,
              background: target === 'mannequin' ? 'rgba(243,112,167,0.06)' : '#fff',
              boxShadow: target === 'mannequin' ? '0 4px 16px rgba(243,112,167,0.14)' : 'none',
            }}
          >
            <SelectBadge active={target === 'mannequin'} />
            <span className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'rgba(243,112,167,0.10)' }}>
              <User size={22} className="text-[#F370A7]" />
            </span>
            <span className="block text-[13px] font-semibold text-gray-900 leading-tight">{t.tryOnTargetMannequin}</span>
            <span className="block text-[11px] text-gray-400 leading-snug">{t.tryOnTargetMannequinHint}</span>
          </button>

          {/* Card: on my photo */}
          <button
            onClick={() => setTarget('self')}
            className="relative flex flex-col items-center text-center gap-2 rounded-2xl border p-3.5 transition-all"
            style={{
              borderColor: target === 'self' ? '#F370A7' : '#eee',
              borderWidth: target === 'self' ? 2 : 1,
              background: target === 'self' ? 'rgba(243,112,167,0.06)' : '#fff',
              boxShadow: target === 'self' ? '0 4px 16px rgba(243,112,167,0.14)' : 'none',
            }}
          >
            <SelectBadge active={target === 'self'} />
            <span className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center" style={{ background: 'rgba(243,112,167,0.10)' }}>
              {photoPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photoPreview} alt="" className="w-full h-full object-cover" />
              ) : (
                <Camera size={22} className="text-[#F370A7]" />
              )}
            </span>
            <span className="block text-[13px] font-semibold text-gray-900 leading-tight">{t.tryOnTargetSelf}</span>
            <span className="block text-[11px] text-gray-400 leading-snug">{t.tryOnTargetSelfHint}</span>
          </button>
        </div>

        {/* Photo upload area + example photos — only in "self" mode */}
        {target === 'self' && (
          <div className="px-5 pt-3">
            {/* Guidance: what photo to upload */}
            <div className="rounded-2xl p-3.5 mb-3" style={{ background: 'rgba(243,112,167,0.05)' }}>
              <p className="text-[13px] font-bold text-gray-900">{t.tryOnPhotoWhatTitle}</p>
              <p className="text-[12px] text-gray-500 leading-relaxed mt-1">{t.tryOnPhotoWhatBody}</p>
            </div>

            {/* Example photos — tap to view larger */}
            <div className="grid grid-cols-3 gap-2 mb-3">
              {[
                '/images/closet/tryon/example-1.webp',
                '/images/closet/tryon/example-2.webp',
                '/images/closet/tryon/example-3.webp',
              ].map((src, i) => (
                <ExamplePhoto key={src} src={src} alt={`${t.tryOnPhotoWhatTitle} ${i + 1}`} onZoom={() => setZoomSrc(src)} />
              ))}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoPick}
            />
            {personKey && !uploading ? (
              // Фото уже выбрано — кнопка становится тихой второстепенной.
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-11 rounded-2xl border flex items-center justify-center gap-2 text-[13px] font-semibold text-gray-700"
                style={{ borderColor: '#e5e7eb', background: '#fff' }}
              >
                <Check size={15} className="text-[#16a34a]" /> {t.tryOnChangePhoto}
              </button>
            ) : (
              // Ещё нет фото — это главный следующий шаг, выделяем его.
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-full h-12 rounded-2xl flex items-center justify-center gap-2 text-[14px] font-bold text-white disabled:opacity-80"
                style={{
                  background: 'linear-gradient(135deg, #F370A7 0%, #e0409a 50%, #F370A7 100%)',
                  backgroundSize: '200% auto',
                  boxShadow: '0 6px 22px rgba(243,112,167,0.5)',
                }}
              >
                {uploading ? (
                  <><Loader2 size={16} className="animate-spin" /> {t.tryOnUploading}</>
                ) : (
                  <><Camera size={17} /> {t.tryOnUploadPhoto}</>
                )}
              </button>
            )}
            {photoError && (
              <p className="text-[11px] text-center mt-1.5" style={{ color: '#ef4444' }}>
                {t.tryOnPhotoFailed}
              </p>
            )}
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-3 px-5 pt-3 pb-8">
          <button
            onClick={requestClose}
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

/** Top-right selection indicator for an option card — filled check when active. */
function SelectBadge({ active }: { active: boolean }) {
  return (
    <span
      className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full flex items-center justify-center border-2 transition-colors"
      style={{
        borderColor: active ? '#F370A7' : '#d1d5db',
        background: active ? '#F370A7' : 'transparent',
      }}
    >
      {active && <Check size={12} className="text-white" strokeWidth={3} />}
    </span>
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
