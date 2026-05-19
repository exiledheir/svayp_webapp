import React, { useState, useRef } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { Upload } from 'lucide-react';
import Layout from '@/components/Layout';
import { addClosetItem, CLOSET_CATEGORIES } from '@/lib/closet-storage';
import type { ClosetCategory } from '@/lib/closet-storage';

export default function ClosetAddPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageData, setImageData] = useState('');
  const [category, setCategory] = useState<ClosetCategory>('tops');
  const [brand, setBrand] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setImageData(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  function handleSave() {
    if (!imageData) return;
    setSaving(true);
    addClosetItem({ category, imageData, brand: brand || undefined, notes: notes || undefined });
    router.replace('/closet');
  }

  return (
    <Layout title="Add to Closet" showBack>
      <div className="px-4 py-6 flex flex-col gap-5">

        {/* Image picker */}
        <div
          className="w-full aspect-square rounded-2xl border-2 border-dashed border-gray-200 overflow-hidden cursor-pointer flex items-center justify-center bg-gray-50"
          onClick={() => fileInputRef.current?.click()}
        >
          {imageData ? (
            <div className="relative w-full h-full">
              <Image src={imageData} alt="Preview" fill className="object-contain" unoptimized />
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 text-gray-400">
              <Upload size={28} />
              <p className="text-sm">Tap to choose a photo</p>
            </div>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />

        {/* Category */}
        <div>
          <label className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-2 block">
            Category
          </label>
          <div className="flex flex-wrap gap-2">
            {CLOSET_CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setCategory(cat.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors
                  ${category === cat.value ? 'bg-black text-white border-black' : 'bg-white text-gray-600 border-gray-200'}`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Brand */}
        <div>
          <label className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-2 block">
            Brand (optional)
          </label>
          <input
            type="text"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            placeholder="e.g. Zara, H&M"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-black transition-colors"
          />
        </div>

        {/* Notes */}
        <div>
          <label className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-2 block">
            Notes (optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any notes…"
            rows={3}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-black transition-colors resize-none"
          />
        </div>

        <button
          onClick={handleSave}
          disabled={!imageData || saving}
          className="w-full py-3.5 rounded-xl bg-black text-white text-sm font-semibold
                     disabled:opacity-40 active:scale-[0.98] transition-transform"
        >
          {saving ? 'Saving…' : 'Save to Closet'}
        </button>
      </div>
    </Layout>
  );
}
