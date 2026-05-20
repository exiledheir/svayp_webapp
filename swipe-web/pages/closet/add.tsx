import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import { ArrowLeft, Camera, Image as ImageIcon } from 'lucide-react';
import ReactCrop, { type Crop, type PixelCrop } from 'react-image-crop';
import { addClosetItem, CLOSET_CATEGORIES } from '@/lib/closet-storage';
import type { ClosetCategory } from '@/lib/closet-storage';

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
      // Set initial crop to full image — user can optionally crop
      setCrop({ unit: '%', x: 0, y: 0, width: 100, height: 100 });
      setCompletedCrop(undefined);
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
    router.replace('/closet');
  }

  return (
    <div className="phone-container flex flex-col bg-white" style={{ height: '100dvh' }}>
      {/* Header */}
      <header className="shrink-0 flex items-center gap-3 px-4 h-14">
        <button
          onClick={() => router.back()}
          className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center"
          aria-label="Back"
        >
          <ArrowLeft size={17} strokeWidth={2} className="text-gray-700" />
        </button>
        <h1 className="text-[15px] font-semibold text-gray-900">Add to Closet</h1>
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
            <div className="rounded-2xl overflow-hidden bg-gray-50 flex justify-center">
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
                  style={{ maxHeight: '45vh', maxWidth: '100%', display: 'block', margin: '0 auto' }}
                />
              </ReactCrop>
            </div>

            {/* Category */}
            <div>
              <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2.5 block">
                Category
              </label>
              <div className="flex flex-wrap gap-2">
                {allowedCats.map((cat) => {
                  const label = CLOSET_CATEGORIES.find((c) => c.value === cat)?.label ?? cat;
                  return (
                    <button
                      key={cat}
                      onClick={() => setCategory(cat)}
                      className={`px-3.5 py-[6px] rounded-full text-[12px] transition-colors
                        ${category === cat
                          ? 'bg-black text-white font-semibold'
                          : 'bg-gray-100 text-gray-500 font-medium'
                        }`}
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
              className="w-full py-3.5 rounded-full bg-black text-white text-[13px] font-semibold
                         disabled:opacity-30 active:scale-[0.97] transition-transform"
            >
              {saving ? 'Saving…' : 'Save to Closet'}
            </button>
          </div>
        ) : (
          /* Empty state - prompt to pick */
          <div className="flex flex-col items-center justify-center h-64 gap-4">
            <p className="text-[13px] font-medium text-gray-400">Choose a photo to add</p>
            <button
              onClick={() => setShowPicker(true)}
              className="px-6 py-2.5 rounded-full bg-black text-white text-[12px] font-semibold"
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
            className="w-full max-w-[430px] rounded-t-3xl bg-white"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-9 h-1 rounded-full bg-gray-200" />
            </div>
            <div className="px-5 pb-8">
              <h3 className="text-[15px] font-bold text-gray-900 mb-4">Add Photo</h3>
              <div className="flex flex-col gap-2.5">
                {/* Photo Library — primary action, opens native photo grid on mobile */}
                <button
                  onClick={() => { setShowPicker(false); fileInputRef.current?.click(); }}
                  className="w-full h-14 rounded-2xl bg-gray-50 flex items-center gap-3.5 px-4 active:scale-[0.98] transition-transform"
                >
                  <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #f093fb 0%, #F5576c 100%)' }}>
                    <ImageIcon size={19} strokeWidth={1.8} color="#fff" />
                  </div>
                  <div className="text-left">
                    <span className="text-[14px] font-semibold text-gray-900 block">Photo Library</span>
                    <span className="text-[11px] text-gray-400">Choose from your photos</span>
                  </div>
                </button>
                {/* Camera */}
                <button
                  onClick={() => { setShowPicker(false); cameraInputRef.current?.click(); }}
                  className="w-full h-14 rounded-2xl bg-gray-50 flex items-center gap-3.5 px-4 active:scale-[0.98] transition-transform"
                >
                  <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: '#FF9800' }}>
                    <Camera size={19} strokeWidth={1.8} color="#fff" />
                  </div>
                  <div className="text-left">
                    <span className="text-[14px] font-semibold text-gray-900 block">Camera</span>
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
