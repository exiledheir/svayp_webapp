import React, { useRef, useState } from 'react';
import Image from 'next/image';
import { Plus, X, Camera, ImageIcon, ArrowUpRight } from 'lucide-react';
import { compressImageForUpload } from '@/lib/image-utils';
import { MAX_STORED_PHOTOS } from '@/lib/market-storage';
import { useI18n } from '@/lib/i18n';
import StepScaffold from './StepScaffold';
import type { StepProps } from './types';

const MAX_PHOTOS = 10;
const MAX_BYTES = 10 * 1024 * 1024;
const MIN_DIM = 300;

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

function imageDims(file: File): Promise<{ w: number; h: number }> {
  return new Promise((resolve) => {
    const img = new window.Image();
    const url = URL.createObjectURL(file);
    img.onload = () => { URL.revokeObjectURL(url); resolve({ w: img.naturalWidth, h: img.naturalHeight }); };
    img.onerror = () => { URL.revokeObjectURL(url); resolve({ w: 0, h: 0 }); };
    img.src = url;
  });
}

export default function PhotosStep({ form, patch, onNext }: StepProps) {
  const { t } = useI18n();
  const images = form.images ?? [];
  const [error, setError] = useState('');
  const [showSheet, setShowSheet] = useState(false);
  const [busy, setBusy] = useState(false);
  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError('');
    setBusy(true);
    const next = [...images];
    for (const file of Array.from(files)) {
      if (next.length >= MAX_PHOTOS) { setError(t.mk_photos_max_error); break; }
      if (file.size > MAX_BYTES) { setError(t.mk_photos_size_error); continue; }
      const { w, h } = await imageDims(file);
      if (w < MIN_DIM || h < MIN_DIM) { setError(t.mk_photos_min_error); continue; }
      try {
        const compressed = await compressImageForUpload(file, 1000, 0.7);
        next.push(await fileToDataUrl(compressed));
      } catch { /* skip on failure */ }
    }
    patch({ images: next });
    setBusy(false);
  }

  function removeAt(i: number) {
    patch({ images: images.filter((_, idx) => idx !== i) });
  }

  const overCap = images.length > MAX_STORED_PHOTOS;

  return (
    <>
      <input ref={galleryRef} type="file" accept="image/*" multiple hidden onChange={(e) => { handleFiles(e.target.files); e.target.value = ''; }} />
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { handleFiles(e.target.files); e.target.value = ''; }} />

      <StepScaffold
        title={t.mk_photos_title}
        hint={t.mk_photos_hint}
        ctaLabel={t.mk_continue}
        ctaDisabled={images.length === 0 || busy}
        onCta={onNext}
      >
        {/* Tips card */}
        <div className="flex items-center justify-between p-3.5 rounded-2xl mb-4" style={{ background: 'rgba(243,112,167,0.08)' }}>
          <div>
            <p className="text-[14px] font-bold text-black dark:text-white leading-snug">{t.mk_photos_tips_title}</p>
            <span className="inline-flex items-center gap-1 mt-2 text-[12px] font-semibold px-3 py-1.5 rounded-full bg-white text-black">
              {t.mk_photos_tips_cta}
              <ArrowUpRight size={13} strokeWidth={2.5} className="text-[#F370A7]" />
            </span>
          </div>
          <Camera size={40} strokeWidth={1.4} className="text-black/30 dark:text-white/40 shrink-0" />
        </div>

        {/* Thumbnails grid */}
        <div className="grid grid-cols-3 gap-2.5">
          {images.map((src, i) => (
            <div key={i} className="relative rounded-2xl overflow-hidden" style={{ aspectRatio: '1', background: '#F7F7F8' }}>
              <Image src={src} alt={`photo ${i + 1}`} fill sizes="120px" className="object-cover" unoptimized />
              <button
                onClick={() => removeAt(i)}
                className="absolute top-1 right-1 w-6 h-6 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(0,0,0,0.55)' }}
                aria-label="Remove"
              >
                <X size={13} color="white" strokeWidth={2.5} />
              </button>
              {i === 0 && (
                <span className="absolute bottom-1 left-1 text-white text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'rgba(0,0,0,0.55)' }}>
                  1
                </span>
              )}
            </div>
          ))}
          {images.length < MAX_PHOTOS && (
            <button
              onClick={() => setShowSheet(true)}
              disabled={busy}
              className="rounded-2xl flex items-center justify-center disabled:opacity-50"
              style={{ aspectRatio: '1', background: 'rgba(128,128,128,0.10)' }}
              aria-label="Add photo"
            >
              {busy ? (
                <div className="w-6 h-6 rounded-full border-2 border-[#F370A7] border-t-transparent animate-spin" />
              ) : (
                <Plus size={30} strokeWidth={2} className="text-black/40 dark:text-white/50" />
              )}
            </button>
          )}
        </div>

        {error && <p className="text-[13px] text-[#F370A7] mt-3 font-medium">{error}</p>}
        {overCap && (
          <p className="text-[12px] text-black/45 dark:text-white/45 mt-3">
            {`Сохранится первых ${MAX_STORED_PHOTOS} фото (демо без бэкенда).`}
          </p>
        )}
      </StepScaffold>

      {/* Source sheet */}
      {showSheet && (
        <div className="absolute inset-0 z-[70] flex flex-col justify-end" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={() => setShowSheet(false)}>
          <div
            className="px-5 pt-4 pb-6 bg-white dark:bg-[#1c1c1e]"
            style={{ borderRadius: '24px 24px 0 0', paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom, 1.5rem))' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-9 h-1 rounded-full mx-auto mb-4" style={{ background: 'rgba(128,128,128,0.4)' }} />
            <button
              onClick={() => { setShowSheet(false); galleryRef.current?.click(); }}
              className="w-full flex items-center gap-3 py-3.5 text-[15px] font-semibold text-black dark:text-white"
            >
              <span className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: '#F370A7' }}>
                <ImageIcon size={18} color="white" />
              </span>
              {t.mk_photos_from_gallery}
            </button>
            <button
              onClick={() => { setShowSheet(false); cameraRef.current?.click(); }}
              className="w-full flex items-center gap-3 py-3.5 text-[15px] font-semibold text-black dark:text-white"
            >
              <span className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: '#111' }}>
                <Camera size={18} color="white" />
              </span>
              {t.mk_photos_from_camera}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
