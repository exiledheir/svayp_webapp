import React, { useRef, useState } from 'react';
import Image from 'next/image';
import { Camera, Image as ImageIcon, Check, Plus } from 'lucide-react';
import ReactCrop, { type Crop, type PixelCrop } from 'react-image-crop';
import { addClosetItemFromFile, CLOSET_CATEGORIES, type ClosetCategory } from '@/lib/closet-storage';
import { compressImageForUpload } from '@/lib/image-utils';
import { UPPER_CATS, LOWER_CATS, SHOES_CATS, FULL_BODY_CATS } from '@/lib/closet-types';
import { useI18n } from '@/lib/i18n';
import { logAnalyticsEvent } from '@/lib/analytics';
import { Events, Params } from '@/lib/analytics-events';

function getCroppedImage(imageSrc: string, crop: PixelCrop, displayWidth: number, displayHeight: number): Promise<string> {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => {
      const scaleX = img.naturalWidth / displayWidth;
      const scaleY = img.naturalHeight / displayHeight;
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(crop.width * scaleX);
      canvas.height = Math.round(crop.height * scaleY);
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, Math.round(crop.x * scaleX), Math.round(crop.y * scaleY), Math.round(crop.width * scaleX), Math.round(crop.height * scaleY), 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/png'));
    };
    img.src = imageSrc;
  });
}

export default function AddItemStep({
  group,
  title,
  body,
  onItemAdded,
}: {
  group: 'upper' | 'lower' | 'shoes';
  title: string;
  body: string;
  /** Called immediately when the user confirms — upload continues in background. */
  onItemAdded: (category: ClosetCategory, uploadPromise: Promise<unknown>) => void;
}) {
  const { t } = useI18n();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const fileRef = useRef<File | null>(null);

  const cats = group === 'upper' ? UPPER_CATS : group === 'lower' ? LOWER_CATS : SHOES_CATS;
  // For upper group: put full-body categories (dresses, jumpsuits) last so
  // they're not accidentally tapped by users adding a regular top.
  const chipCats = group === 'upper'
    ? [...cats.filter((c) => !FULL_BODY_CATS.includes(c)), ...cats.filter((c) => FULL_BODY_CATS.includes(c))]
    : cats;

  const [rawImage, setRawImage] = useState('');
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  // Default to the first non-full-body category for upper, first category for lower.
  const [category, setCategory] = useState<ClosetCategory>(chipCats[0]);
  const [showPicker, setShowPicker] = useState(false);

  const heroSrc = group === 'upper'
    ? '/images/closet/add_top_onboarding.webp'
    : group === 'lower'
      ? '/images/closet/add_bottom_onboarding.webp'
      : '/images/closet/add_shoes_onboarding.webp';

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    fileRef.current = file;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setRawImage(ev.target?.result as string);
      setCrop({ unit: '%', x: 0, y: 0, width: 100, height: 100 });
      setCompletedCrop(undefined);
      logAnalyticsEvent(Events.ADD_ITEM_PHOTO_SELECTED);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  function handleSave() {
    if (!rawImage) return;
    const currentFile = fileRef.current;
    if (!currentFile) return;

    // Capture all values NOW before the component unmounts after navigation.
    const snap = {
      rawImage,
      crop: completedCrop,
      w: imgRef.current?.width ?? 0,
      h: imgRef.current?.height ?? 0,
    };
    const cat = category;

    const uploadPromise = (async () => {
      let f = currentFile;
      if (snap.crop && snap.w > 0 && snap.h > 0) {
        const dataUrl = await getCroppedImage(snap.rawImage, snap.crop, snap.w, snap.h);
        const blob = await (await fetch(dataUrl)).blob();
        f = new File([blob], f.name, { type: 'image/png' });
      }
      f = await compressImageForUpload(f);
      await addClosetItemFromFile(f, cat, () => {});
      logAnalyticsEvent(Events.ADD_ITEM_SAVED, { [Params.CATEGORY]: cat, [Params.HAS_BG_REMOVED]: true });
    })().catch(() => {
      logAnalyticsEvent(Events.ADD_ITEM_BG_REMOVAL_FAILED);
    });

    // Advance immediately — upload runs in the background.
    onItemAdded(cat, uploadPromise);
  }

  // ── Crop + category selection ────────────────────────────────────────────────
  if (rawImage) {
    return (
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex-1 min-h-0 flex items-center justify-center bg-gray-50 dark:bg-[#1a1a1a] px-4 py-3">
          <ReactCrop crop={crop} onChange={(c) => setCrop(c)} onComplete={(c) => setCompletedCrop(c)}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img ref={imgRef} src={rawImage} alt="to crop" style={{ maxHeight: '42vh', objectFit: 'contain' }} />
          </ReactCrop>
        </div>
        <div className="flex-none px-5 pt-4 pb-2">
          <p className="text-[14px] font-semibold text-gray-500 mb-2">{t.ob_add_choose_category}</p>
          <div className="flex flex-wrap gap-2 mb-4">
            {chipCats.map((c) => {
              const label = t.categoryLabels?.[c] ?? CLOSET_CATEGORIES.find((x) => x.value === c)?.label ?? c;
              const active = category === c;
              return (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className="px-3.5 py-2 rounded-full text-[13px] font-medium transition-colors"
                  style={{ background: active ? '#F370A7' : 'rgba(0,0,0,0.05)', color: active ? '#fff' : '#555' }}
                >
                  {label}
                </button>
              );
            })}
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => { setRawImage(''); fileRef.current = null; }}
              className="px-5 h-12 rounded-full bg-gray-100 text-gray-600 text-[13px] font-semibold"
            >
              {t.ob_add_change_photo}
            </button>
            <button
              onClick={handleSave}
              className="flex-1 h-12 rounded-full text-white text-[15px] font-semibold flex items-center justify-center gap-2"
              style={{ background: '#F370A7' }}
            >
              <Check size={17} />
              {t.ob_add_save}
            </button>
          </div>
        </div>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
        <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} />
      </div>
    );
  }

  // ── Source picker (initial) ────────────────────────────────────────────────
  return (
    <div className="flex-1 flex flex-col relative">
      <div className="px-6 pt-4 pb-2">
        <h2 className="text-[28px] font-black tracking-tight text-gray-900 dark:text-white mb-2 leading-tight">{title}</h2>
        <p className="text-[16px] text-gray-500 leading-relaxed">{body}</p>
      </div>

      {/* Clothing hero image */}
      <div className="flex-1 flex items-center justify-center px-8 pb-20">
        <div className="relative w-52 h-64">
          <Image
            src={heroSrc}
            alt={group === 'upper' ? 'top garment' : group === 'lower' ? 'bottom garment' : 'shoes'}
            fill
            className="object-contain"
            unoptimized
          />
        </div>
      </div>

      {/* Pulsing FAB */}
      <div className="absolute right-6" style={{ bottom: 'max(1.5rem, env(safe-area-inset-bottom, 1.5rem))' }}>
        <span
          className="absolute inset-0 rounded-full animate-ping"
          style={{ backgroundColor: '#F370A7', opacity: 0.35 }}
        />
        <button
          onClick={() => setShowPicker(true)}
          className="relative w-16 h-16 rounded-full flex items-center justify-center shadow-xl active:scale-[0.95] transition-transform"
          style={{ backgroundColor: '#F370A7' }}
          aria-label="Add photo"
        >
          <Plus size={28} strokeWidth={2.5} color="white" />
        </button>
      </div>

      {/* Bottom sheet */}
      {showPicker && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center"
          style={{ background: 'rgba(0,0,0,0.3)' }}
          onClick={() => setShowPicker(false)}
        >
          <div
            className="w-full max-w-[430px] rounded-t-3xl bg-white dark:bg-[#1c1c1e]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-9 h-1 rounded-full bg-gray-200 dark:bg-gray-700" />
            </div>
            <div className="px-5 pb-8">
              <h3 className="text-[16px] font-bold text-gray-900 dark:text-white mb-4">{t.addPhoto}</h3>
              <div className="flex flex-col gap-2.5">
                <button
                  onClick={() => {
                    logAnalyticsEvent(Events.ADD_ITEM_STARTED, { [Params.SOURCE]: 'gallery' });
                    fileInputRef.current?.click();
                    setShowPicker(false);
                  }}
                  className="w-full h-14 rounded-2xl bg-gray-50 dark:bg-[#2c2c2e] flex items-center gap-3.5 px-4 active:scale-[0.98] transition-transform"
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg, #f093fb 0%, #F5576c 100%)' }}
                  >
                    <ImageIcon size={19} strokeWidth={1.8} color="#fff" />
                  </div>
                  <div className="text-left">
                    <span className="text-[14px] font-semibold text-gray-900 dark:text-white block">{t.photoLibrary}</span>
                    <span className="text-[12px] text-gray-400">{t.chooseFromYourPhotos}</span>
                  </div>
                </button>
                <button
                  onClick={() => {
                    logAnalyticsEvent(Events.ADD_ITEM_STARTED, { [Params.SOURCE]: 'camera' });
                    cameraInputRef.current?.click();
                    setShowPicker(false);
                  }}
                  className="w-full h-14 rounded-2xl bg-gray-50 dark:bg-[#2c2c2e] flex items-center gap-3.5 px-4 active:scale-[0.98] transition-transform"
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: '#FF9800' }}
                  >
                    <Camera size={19} strokeWidth={1.8} color="#fff" />
                  </div>
                  <div className="text-left">
                    <span className="text-[14px] font-semibold text-gray-900 dark:text-white block">{t.camera}</span>
                    <span className="text-[12px] text-gray-400">{t.takeANewPhoto}</span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} />
    </div>
  );
}
