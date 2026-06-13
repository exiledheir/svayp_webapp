import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import { ArrowLeft, Camera, Image as ImageIcon } from 'lucide-react';
import ReactCrop, { type Crop, type PixelCrop } from 'react-image-crop';
import { addClosetItem, CLOSET_CATEGORIES } from '@/lib/closet-storage';
import type { ClosetCategory } from '@/lib/closet-storage';
import { logAnalyticsEvent } from '@/lib/analytics';
import { Events, Params } from '@/lib/analytics-events';
import { useTheme } from '@/lib/theme';

// Category groups — same as closet index
const GROUPS: Record<string, ClosetCategory[]> = {
  upper: ['tops', 'dresses', 'jackets', 'blouses', 'jumpsuits', 'tshirts'],
  lower: ['skirts', 'jeans', 'pants', 'shorts'],
  shoes: ['shoes'],
  acc: ['accessories', 'bags', 'shawl', 'jewelry', 'underwear'],
};

function getCroppedImage(
  imageSrc: string,
  crop: PixelCrop,
  displayWidth: number,
  displayHeight: number
): Promise<string> {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => {
      const scaleX = img.naturalWidth / displayWidth;
      const scaleY = img.naturalHeight / displayHeight;

      const canvas = document.createElement('canvas');
      canvas.width = Math.round(crop.width * scaleX);
      canvas.height = Math.round(crop.height * scaleY);
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(
        img,
        Math.round(crop.x * scaleX),
        Math.round(crop.y * scaleY),
        Math.round(crop.width * scaleX),
        Math.round(crop.height * scaleY),
        0,
        0,
        canvas.width,
        canvas.height
      );
      resolve(canvas.toDataURL('image/jpeg', 0.92));
    };
    img.src = imageSrc;
  });
}

export default function ClosetAddPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [rawImage, setRawImage] = useState('');
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [category, setCategory] = useState<ClosetCategory>('tops');
  const [saving, setSaving] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  // Determine which subcategories to show based on group query param
  const group = (router.query.group as string) ?? 'upper';
  const allowedCats = GROUPS[group] ?? CLOSET_CATEGORIES.map((c) => c.value);

  // Pre-select category from query param
  useEffect(() => {
    const q = router.query.category as string | undefined;
    if (q) {
      const match = CLOSET_CATEGORIES.find((c) => c.value === q);
      if (match) setCategory(match.value as ClosetCategory);
    }
  }, [router.query.category]);

  // Show picker sheet on mount
  useEffect(() => {
    if (router.isReady && !rawImage) {
      setShowPicker(true);
    }
  }, [router.isReady]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const data = ev.target?.result as string;
      setRawImage(data);
      // Pre-select full image so corner handles are visible immediately (crop is optional)
      setCrop({ unit: '%', x: 0, y: 0, width: 100, height: 100 });
      setCompletedCrop(undefined);
      logAnalyticsEvent(Events.ADD_ITEM_PHOTO_SELECTED);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  async function handleSave() {
    if (!rawImage) return;
    setSaving(true);

    let imageToSave = rawImage;
    if (completedCrop && imgRef.current) {
      const displayWidth = imgRef.current.width;
      const displayHeight = imgRef.current.height;
      imageToSave = await getCroppedImage(rawImage, completedCrop, displayWidth, displayHeight);
    }

    addClosetItem({ category, imageData: imageToSave });
    logAnalyticsEvent(Events.ADD_ITEM_SAVED, {
      [Params.CATEGORY]: category,
      [Params.HAS_BG_REMOVED]: false,
    });
    router.replace('/closet');
  }

  return (
    <div className="phone-container flex flex-col bg-white dark:bg-[#111111]" style={{ height: '100dvh' }}>
      {/* Header */}
      <header className="shrink-0 flex items-center gap-3 px-4 h-14">
        <button
          onClick={() => router.back()}
          className="w-8 h-8 rounded-full flex items-center justify-center"
          style={{
            backgroundColor: theme === 'dark' ? '#2a2a2a' : '#f3f4f6',
          }}
          aria-label="Back"
        >
          <ArrowLeft size={17} strokeWidth={2} style={{ color: theme === 'dark' ? '#999999' : '#374151' }} />
        </button>
        <h1 className="text-[15px] font-semibold" style={{ color: theme === 'dark' ? '#ffffff' : '#111111' }}>Add to Closet</h1>
      </header>

      <main className="flex-1 overflow-y-auto px-4 pb-8">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFileChange}
        />

        {rawImage ? (
          <div className="flex flex-col gap-5 pt-2">
            {/* Crop area + category on same screen */}
            <div className="rounded-2xl flex justify-center" style={{ padding: '14px 14px 10px', backgroundColor: theme === 'dark' ? '#1a1a1a' : '#f3f4f6' }}>
              <ReactCrop
                crop={crop}
                onChange={(c) => setCrop(c)}
                onComplete={(c) => setCompletedCrop(c)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  ref={imgRef}
                  src={rawImage}
                  alt="Crop"
                  style={{ maxHeight: '55vh', maxWidth: '100%', display: 'block', margin: '0 auto', borderRadius: 12 }}
                />
              </ReactCrop>
            </div>

            {/* Category */}
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider mb-2.5 block" style={{ color: theme === 'dark' ? '#666666' : '#9ca3af' }}>
                Category
              </label>
              <div className="flex flex-wrap gap-2">
                {allowedCats.map((cat) => {
                  const label = CLOSET_CATEGORIES.find((c) => c.value === cat)?.label ?? cat;
                  const isSelected = category === cat;
                  return (
                    <button
                      key={cat}
                      onClick={() => {
                        setCategory(cat);
                        logAnalyticsEvent(Events.ADD_ITEM_CATEGORY_SELECTED, {
                          [Params.CATEGORY]: cat,
                        });
                      }}
                      className="px-3.5 py-[6px] rounded-full text-[12px] transition-colors font-medium"
                      style={{
                        backgroundColor: isSelected 
                          ? (theme === 'dark' ? '#ffffff' : '#000000')
                          : (theme === 'dark' ? '#2a2a2a' : '#f3f4f6'),
                        color: isSelected
                          ? (theme === 'dark' ? '#000000' : '#ffffff')
                          : (theme === 'dark' ? '#999999' : '#888888'),
                        fontWeight: isSelected ? '600' : '500',
                      }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Save button */}
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full py-3.5 rounded-full text-[13px] font-semibold active:scale-[0.97] transition-transform disabled:opacity-30"
              style={{
                backgroundColor: theme === 'dark' ? '#000000' : '#000000',
                color: theme === 'dark' ? '#ffffff' : '#ffffff',
              }}
            >
              {saving ? 'Saving…' : 'Save to Closet'}
            </button>
          </div>
        ) : (
          /* Empty state - prompt to pick */
          <div className="flex flex-col items-center justify-center h-64 gap-4">
            <p className="text-[13px] font-medium" style={{ color: theme === 'dark' ? '#888888' : '#999999' }}>Choose a photo to add</p>
            <button
              onClick={() => setShowPicker(true)}
              className="px-6 py-2.5 rounded-full text-[12px] font-semibold"
              style={{
                backgroundColor: theme === 'dark' ? '#000000' : '#000000',
                color: theme === 'dark' ? '#ffffff' : '#ffffff',
              }}
            >
              Select Photo
            </button>
          </div>
        )}
      </main>

      {/* ── Photo Picker Sheet ── */}
      {showPicker && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/30 backdrop-blur-sm"
          onClick={() => { setShowPicker(false); if (!rawImage) router.back(); }}
        >
          <div
            className="w-full max-w-[430px] rounded-t-3xl bg-white dark:bg-[#1a1a1a]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-9 h-1 rounded-full bg-gray-200 dark:bg-gray-700" />
            </div>
            <div className="px-5 pb-8">
              <h3 className="text-[15px] font-bold mb-4" style={{ color: theme === 'dark' ? '#ffffff' : '#111111' }}>Add Photo</h3>
              <div className="flex flex-col gap-2.5">
                {/* Photo Library — primary action, opens native photo grid on mobile */}
                <button
                  onClick={() => { logAnalyticsEvent(Events.ADD_ITEM_STARTED, { [Params.SOURCE]: 'gallery' }); fileInputRef.current?.click(); setShowPicker(false); }}
                  className="w-full h-14 rounded-2xl flex items-center gap-3.5 px-4 active:scale-[0.98] transition-transform"
                  style={{
                    backgroundColor: theme === 'dark' ? '#2a2a2a' : '#f3f4f6',
                  }}
                >
                  <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #f093fb 0%, #F5576c 100%)' }}>
                    <ImageIcon size={19} strokeWidth={1.8} color="#fff" />
                  </div>
                  <div className="text-left">
                    <span className="text-[14px] font-semibold block" style={{ color: theme === 'dark' ? '#ffffff' : '#1f2937' }}>Photo Library</span>
                    <span className="text-[11px] text-gray-400">Choose from your photos</span>
                  </div>
                </button>
                {/* Camera */}
                <button
                  onClick={() => { logAnalyticsEvent(Events.ADD_ITEM_STARTED, { [Params.SOURCE]: 'camera' }); cameraInputRef.current?.click(); setShowPicker(false); }}
                  className="w-full h-14 rounded-2xl flex items-center gap-3.5 px-4 active:scale-[0.98] transition-transform"
                  style={{
                    backgroundColor: theme === 'dark' ? '#2a2a2a' : '#f3f4f6',
                  }}
                >
                  <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: '#FF9800' }}>
                    <Camera size={19} strokeWidth={1.8} color="#fff" />
                  </div>
                  <div className="text-left">
                    <span className="text-[14px] font-semibold block" style={{ color: theme === 'dark' ? '#ffffff' : '#1f2937' }}>Camera</span>
                    <span className="text-[11px] text-gray-400">Take a new photo</span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
