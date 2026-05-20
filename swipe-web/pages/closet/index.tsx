import React, { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { Plus, X, Sparkles, Sun, CalendarDays, TreePine, Camera, Image as ImageIcon } from 'lucide-react';
import ReactCrop, { type Crop, type PixelCrop } from 'react-image-crop';
import { getClosetItems, deleteClosetItem, updateClosetItem, addClosetItem, CLOSET_CATEGORIES } from '@/lib/closet-storage';
import type { ClosetItem, ClosetCategory } from '@/lib/closet-storage';

const ADD_GROUPS: Record<string, ClosetCategory[]> = {
  upper: ['tops', 'dresses', 'jackets', 'blouses', 'jumpsuits', 'tshirts'],
  lower: ['skirts', 'jeans', 'pants', 'shorts'],
  shoes: ['shoes'],
  acc: ['accessories', 'bags', 'shawl', 'jewelry', 'underwear'],
};

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
      resolve(canvas.toDataURL('image/jpeg', 0.92));
    };
    img.src = imageSrc;
  });
}

// ─── Category groups ────────────────────────────────────────────────────────────
const UPPER_CATS: ClosetCategory[] = ['tops', 'dresses', 'jackets', 'blouses', 'jumpsuits', 'tshirts'];
const LOWER_CATS: ClosetCategory[] = ['skirts', 'jeans', 'pants', 'shorts'];
const SHOES_CATS: ClosetCategory[] = ['shoes'];
const ACC_CATS: ClosetCategory[] = ['accessories', 'bags', 'shawl', 'jewelry', 'underwear'];

function catLabel(cat: ClosetCategory): string {
  return CLOSET_CATEGORIES.find((c) => c.value === cat)?.label ?? cat;
}

// ─── Main Page ──────────────────────────────────────────────────────────────────
export default function ClosetPage() {
  const router = useRouter();
  const [items, setItems] = useState<ClosetItem[]>([]);
  const [upperFilter, setUpperFilter] = useState<ClosetCategory | null>(null);
  const [lowerFilter, setLowerFilter] = useState<ClosetCategory | null>(null);
  const [accFilter, setAccFilter] = useState<ClosetCategory | null>(null);
  const [viewAll, setViewAll] = useState<{ title: string; items: ClosetItem[] } | null>(null);
  const [outfitSheet, setOutfitSheet] = useState<{ title: string; days: Date[] } | null>(null);
  const [editItem, setEditItem] = useState<ClosetItem | null>(null);

  // ── Inline add flow ──────────────────────────────────────────────────────────
  const [addGroup, setAddGroup] = useState<string>('upper');
  const [addCategory, setAddCategory] = useState<ClosetCategory>('tops');
  const [showAddPicker, setShowAddPicker] = useState(false);
  const [addRawImage, setAddRawImage] = useState('');
  const [addCrop, setAddCrop] = useState<Crop>();
  const [addCompletedCrop, setAddCompletedCrop] = useState<PixelCrop>();
  const [addSaving, setAddSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const cropImgRef = useRef<HTMLImageElement>(null);

  function openAdd(group: string, category: ClosetCategory) {
    setAddGroup(group);
    setAddCategory(category);
    setAddRawImage('');
    setAddCrop(undefined);
    setAddCompletedCrop(undefined);
    setShowAddPicker(true);
  }

  function handleAddFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setAddRawImage(ev.target?.result as string);
      setAddCrop({ unit: '%', x: 0, y: 0, width: 100, height: 100 });
      setAddCompletedCrop(undefined);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  async function handleAddSave() {
    if (!addRawImage) return;
    setAddSaving(true);
    let imageToSave = addRawImage;
    if (addCompletedCrop && cropImgRef.current) {
      imageToSave = await getCroppedImage(addRawImage, addCompletedCrop, cropImgRef.current.width, cropImgRef.current.height);
    }
    addClosetItem({ category: addCategory, imageData: imageToSave });
    setAddRawImage('');
    setAddSaving(false);
    load();
  }

  const load = useCallback(() => { setItems(getClosetItems()); }, []);
  useEffect(() => { load(); }, [load]);

  function handleDelete(id: string) {
    deleteClosetItem(id);
    load();
  }

  function handleUpdateCategory(id: string, category: ClosetCategory) {
    updateClosetItem(id, { category });
    load();
  }

  function itemsFor(cats: ClosetCategory[], filter: ClosetCategory | null) {
    return items.filter((i) => cats.includes(i.category) && (filter === null || i.category === filter));
  }

  function openViewAll(title: string, cats: ClosetCategory[]) {
    setViewAll({ title, items: items.filter((i) => cats.includes(i.category)) });
  }

  function showOutfitsForPeriod(label: string) {
    const now = new Date();
    let days: Date[];
    let title: string;
    if (label === 'Today') {
      days = [now];
      title = 'Today';
    } else {
      days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(now); d.setDate(d.getDate() + i); return d;
      });
      title = 'Next 7 Days';
    }
    setOutfitSheet({ title, days });
  }

  return (
    <div className="phone-container flex flex-col bg-white" style={{ height: '100dvh' }}>
      {/* Simple header with styled title */}
      <header className="shrink-0 flex items-center px-5 pt-5 pb-0" style={{ minHeight: 56 }}>
        <h1 className="text-[22px] font-bold tracking-[0.12em]">LIBΛS</h1>
      </header>

      <main className="flex-1 overflow-y-auto pb-4" style={{ paddingTop: 0 }}>
        {/* ── Style Occasion Cards ──────────────────────────────── */}
        <StyleOccasionCards onTap={showOutfitsForPeriod} />

        {/* ── My Outfits ────────────────────────────────────────── */}
        <OutfitSection allItems={items} onViewItems={(outfitItems) => setViewAll({ title: 'Outfit Items', items: outfitItems })} />

        {/* ── Upper Body ────────────────────────────────────────── */}
        <ClothingSection
          title="Upper Body"
          cats={UPPER_CATS}
          filter={upperFilter}
          items={itemsFor(UPPER_CATS, upperFilter)}
          onFilterChange={setUpperFilter}
          onAdd={() => openAdd('upper', upperFilter ?? 'tops')}
          onTapItem={setEditItem}
          onViewAll={() => openViewAll('Upper Body', UPPER_CATS)}
        />

        {/* ── Lower Body ────────────────────────────────────────── */}
        <ClothingSection
          title="Lower Body"
          cats={LOWER_CATS}
          filter={lowerFilter}
          items={itemsFor(LOWER_CATS, lowerFilter)}
          onFilterChange={setLowerFilter}
          onAdd={() => openAdd('lower', lowerFilter ?? 'jeans')}
          onTapItem={setEditItem}
          onViewAll={() => openViewAll('Lower Body', LOWER_CATS)}
        />

        {/* ── Shoes ─────────────────────────────────────────────── */}
        <ClothingSection
          title="Shoes"
          cats={SHOES_CATS}
          filter={null}
          items={itemsFor(SHOES_CATS, null)}
          onFilterChange={() => {}}
          onAdd={() => openAdd('shoes', 'shoes')}
          onTapItem={setEditItem}
          onViewAll={() => openViewAll('Shoes', SHOES_CATS)}
        />

        {/* ── Accessories ───────────────────────────────────────── */}
        <ClothingSection
          title="Accessories"
          cats={ACC_CATS}
          filter={accFilter}
          items={itemsFor(ACC_CATS, accFilter)}
          onFilterChange={setAccFilter}
          onAdd={() => openAdd('acc', accFilter ?? 'accessories')}
          onTapItem={setEditItem}
          onViewAll={() => openViewAll('Accessories', ACC_CATS)}
        />

        <div className="h-12" />
      </main>

      {/* ── View All Modal ─────────────────────────────────────── */}
      {viewAll && (
        <ViewAllModal
          title={viewAll.title}
          items={viewAll.items}
          onClose={() => setViewAll(null)}
          showDelete={viewAll.title !== 'Outfit Items'}
          onDelete={(id) => {
            handleDelete(id);
            setViewAll((v) => v ? { ...v, items: v.items.filter((i) => i.id !== id) } : null);
          }}
        />
      )}

      {/* ── Outfit Days Sheet ──────────────────────────────── */}
      {outfitSheet && (
        <OutfitDaysSheet
          title={outfitSheet.title}
          days={outfitSheet.days}
          allItems={items}
          onClose={() => setOutfitSheet(null)}
        />
      )}

      {/* ── Item Edit Sheet ────────────────────────────────── */}
      {editItem && (
        <ItemEditSheet
          item={editItem}
          onClose={() => setEditItem(null)}
          onDelete={(id) => { handleDelete(id); setEditItem(null); }}
          onSave={(id, cat) => { handleUpdateCategory(id, cat); setEditItem(null); }}
        />
      )}

      {/* ── Hidden file inputs for add flow ── */}
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAddFileChange} />
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleAddFileChange} />

      {/* ── Photo Picker Sheet ── */}
      {showAddPicker && !addRawImage && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/30"
          onClick={() => setShowAddPicker(false)}
        >
          <div className="w-full max-w-[430px] rounded-t-3xl bg-white" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-9 h-1 rounded-full bg-gray-200" />
            </div>
            <div className="px-5 pb-8">
              <h3 className="text-[15px] font-bold text-gray-900 mb-4">Add Photo</h3>
              <div className="flex flex-col gap-2.5">
                <button
                  onClick={() => { fileInputRef.current?.click(); setShowAddPicker(false); }}
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
                <button
                  onClick={() => { cameraInputRef.current?.click(); setShowAddPicker(false); }}
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

      {/* ── Crop & Save Sheet ── */}
      {addRawImage && (
        <div className="fixed inset-0 z-[60] flex flex-col bg-white">
          <header className="shrink-0 flex items-center gap-3 px-4 h-14">
            <button
              onClick={() => setAddRawImage('')}
              className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center"
            >
              <X size={17} strokeWidth={2} className="text-gray-700" />
            </button>
            <span className="text-[15px] font-semibold text-gray-900">Add to Closet</span>
          </header>
          <div className="flex-1 overflow-y-auto px-4 pb-8 flex flex-col gap-5 pt-2">
            <div className="rounded-2xl overflow-hidden bg-gray-50 flex justify-center">
              <ReactCrop crop={addCrop} onChange={(c) => setAddCrop(c)} onComplete={(c) => setAddCompletedCrop(c)}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img ref={cropImgRef} src={addRawImage} alt="Crop" style={{ maxHeight: '45vh', maxWidth: '100%', display: 'block', margin: '0 auto' }} />
              </ReactCrop>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2.5 block">Category</label>
              <div className="flex flex-wrap gap-2">
                {(ADD_GROUPS[addGroup] ?? CLOSET_CATEGORIES.map((c) => c.value)).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setAddCategory(cat)}
                    className={`px-3.5 py-[6px] rounded-full text-[12px] transition-colors ${
                      addCategory === cat ? 'bg-black text-white font-semibold' : 'bg-gray-100 text-gray-500 font-medium'
                    }`}
                  >
                    {CLOSET_CATEGORIES.find((c) => c.value === cat)?.label ?? cat}
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={handleAddSave}
              disabled={addSaving}
              className="w-full py-3.5 rounded-full bg-black text-white text-[13px] font-semibold disabled:opacity-30 active:scale-[0.97] transition-transform"
            >
              {addSaving ? 'Saving…' : 'Save to Closet'}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

// ─── Style Occasion Cards ───────────────────────────────────────────────────────
const OCCASIONS = [
  { label: 'Today',   Icon: Sun,          bg: '#F5F5F5', iconBg: '#FFF3E0', iconColor: '#F57C00' },
  { label: 'Weekend', Icon: CalendarDays, bg: '#F5F5F5', iconBg: '#E8F5E9', iconColor: '#388E3C' },
];

function StyleOccasionCards({ onTap }: { onTap: (label: string) => void }) {
  return (
    <div className="pt-4 px-4">
      <div className="flex gap-2.5 overflow-x-auto hide-scrollbar py-2">
        {OCCASIONS.map((occ) => (
          <button
            key={occ.label}
            onClick={() => onTap(occ.label)}
            className="shrink-0 w-[116px] h-[100px] rounded-2xl p-3.5 flex flex-col justify-between items-start text-left
                       active:scale-[0.97] transition-transform"
            style={{ background: '#fff', boxShadow: '0 2px 12px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)' }}
          >
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: occ.iconBg }}>
              <occ.Icon size={17} strokeWidth={1.8} color={occ.iconColor} />
            </div>
            <span className="text-[13px] font-semibold text-gray-900 tracking-tight">
              {occ.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── My Outfits ─────────────────────────────────────────────────────────────────
function OutfitSection({ allItems, onViewItems }: { allItems: ClosetItem[]; onViewItems: (items: ClosetItem[]) => void }) {
  const upperAll = allItems.filter((i) => UPPER_CATS.includes(i.category));
  const lowerAll = allItems.filter((i) => LOWER_CATS.includes(i.category));
  const shoesAll = allItems.filter((i) => SHOES_CATS.includes(i.category));
  const accAll = allItems.filter((i) => ACC_CATS.includes(i.category));

  return (
    <div className="mt-4">
      <div className="flex items-baseline justify-between px-4 mb-3.5">
        <h2 className="text-[18px] font-bold text-gray-900 tracking-tight">My Outfits</h2>
      </div>
      <div className="flex gap-3 overflow-x-auto hide-scrollbar pl-4 py-2">
        {[0, 1].map((idx) => (
          <OutfitCard
            key={idx}
            outfitIndex={idx}
            upperAll={upperAll}
            lowerAll={lowerAll}
            shoesAll={shoesAll}
            accAll={accAll}
            isEmpty={allItems.length === 0}
            onViewItems={onViewItems}
          />
        ))}
        <div className="w-6 shrink-0" />
      </div>
    </div>
  );
}

function OutfitCard({
  outfitIndex,
  upperAll,
  lowerAll,
  shoesAll,
  accAll,
  isEmpty,
  onViewItems,
}: {
  outfitIndex: number;
  upperAll: ClosetItem[];
  lowerAll: ClosetItem[];
  shoesAll: ClosetItem[];
  accAll: ClosetItem[];
  isEmpty: boolean;
  onViewItems: (items: ClosetItem[]) => void;
}) {
  const upper = upperAll.length ? upperAll[outfitIndex % upperAll.length] : null;
  const lower = lowerAll.length ? lowerAll[outfitIndex % lowerAll.length] : null;
  const shoes = shoesAll.length ? shoesAll[outfitIndex % shoesAll.length] : null;
  const acc = accAll.length ? accAll[outfitIndex % accAll.length] : null;

  function handleViewItems() {
    const outfitItems = [upper, lower, shoes, acc].filter(Boolean) as ClosetItem[];
    onViewItems(outfitItems);
  }

  return (
    <div
      className="shrink-0 rounded-[28px] flex flex-col"
      style={{
        width: 'min(82vw, 340px)',
        height: 440,
        background: 'linear-gradient(180deg, #FAFAFA 0%, #FFFFFF 100%)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.03)',
      }}
    >
      {/* Flat-lay Canvas */}
      <div className="flex-1 relative min-h-0 px-5 pt-5 pb-3">
        {isEmpty ? (
          <div className="w-full h-full rounded-2xl flex flex-col items-center justify-center gap-3">
            <div className="w-14 h-14 rounded-full bg-gray-50 flex items-center justify-center">
              <Plus size={22} strokeWidth={1.5} className="text-gray-300" />
            </div>
            <p className="text-[12px] font-medium text-gray-400 text-center leading-relaxed tracking-wide">
              Add items to see<br />outfit suggestions
            </p>
          </div>
        ) : (
          <div className="w-full h-full relative">
            {/* TOP ZONE - Upper body */}
            <div
              className="absolute rounded-2xl overflow-hidden transition-all duration-500"
              style={{
                top: '0%',
                left: '15%',
                width: '55%',
                height: '42%',
                boxShadow: '0 6px 20px rgba(0,0,0,0.08)',
              }}
            >
              {upper ? (
                <div className="relative w-full h-full bg-gray-50">
                  <Image src={upper.imageData} alt={upper.category} fill className="object-cover" unoptimized />
                </div>
              ) : (
                <FlatLayPlaceholder label="Top" />
              )}
            </div>

            {/* MIDDLE ZONE - Lower body */}
            <div
              className="absolute rounded-2xl overflow-hidden transition-all duration-500"
              style={{
                top: '38%',
                left: '18%',
                width: '50%',
                height: '38%',
                boxShadow: '0 6px 20px rgba(0,0,0,0.08)',
              }}
            >
              {lower ? (
                <div className="relative w-full h-full bg-gray-50">
                  <Image src={lower.imageData} alt={lower.category} fill className="object-cover" unoptimized />
                </div>
              ) : (
                <FlatLayPlaceholder label="Bottom" />
              )}
            </div>

            {/* BOTTOM ZONE - Shoes */}
            <div
              className="absolute rounded-xl overflow-hidden transition-all duration-500"
              style={{
                bottom: '0%',
                left: '22%',
                width: '38%',
                height: '24%',
                boxShadow: '0 4px 16px rgba(0,0,0,0.07)',
              }}
            >
              {shoes ? (
                <div className="relative w-full h-full bg-gray-50">
                  <Image src={shoes.imageData} alt={shoes.category} fill className="object-cover" unoptimized />
                </div>
              ) : (
                <FlatLayPlaceholder label="Shoes" />
              )}
            </div>

            {/* SIDE ZONE - Accessories (or TOP overlay for shawls) */}
            {acc && acc.category === 'shawl' ? (
              <div
                className="absolute rounded-2xl overflow-hidden transition-all duration-500"
                style={{
                  top: '0%',
                  left: '10%',
                  width: '65%',
                  height: '30%',
                  zIndex: 10,
                  boxShadow: '0 6px 20px rgba(0,0,0,0.10)',
                }}
              >
                <div className="relative w-full h-full bg-gray-50">
                  <Image src={acc.imageData} alt={acc.category} fill className="object-cover" unoptimized />
                </div>
              </div>
            ) : acc ? (
              <div
                className="absolute rounded-xl overflow-hidden transition-all duration-500"
                style={{
                  top: '8%',
                  right: '2%',
                  width: '28%',
                  height: '22%',
                  boxShadow: '0 4px 14px rgba(0,0,0,0.06)',
                }}
              >
                <div className="relative w-full h-full bg-gray-50">
                  <Image src={acc.imageData} alt={acc.category} fill className="object-cover" unoptimized />
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* Bottom action bar */}
      <div className="flex gap-2.5 px-5 pb-5">
        <button
          onClick={handleViewItems}
          className="flex-1 h-[44px] rounded-full flex items-center justify-center text-[12px] font-semibold text-gray-700 tracking-wide"
          style={{ background: 'rgba(0,0,0,0.04)' }}
        >
          View items
        </button>
        <button
          className="flex-1 h-[44px] rounded-full flex items-center justify-center gap-1.5 text-[12px] font-semibold text-white tracking-wide"
          style={{ background: 'linear-gradient(135deg, #1a1a1a, #000)' }}
        >
          <Sparkles size={12} />
          Try it on
        </button>
      </div>
    </div>
  );
}

function FlatLayPlaceholder({ label }: { label: string }) {
  return (
    <div className="w-full h-full bg-gray-50 flex flex-col items-center justify-center gap-1.5">
      <div className="w-6 h-6 rounded-full bg-gray-100" />
      <span className="text-[9px] font-medium text-gray-300 uppercase tracking-widest">{label}</span>
    </div>
  );
}

// ─── Clothing Section ───────────────────────────────────────────────────────────
interface ClothingSectionProps {
  title: string;
  cats: ClosetCategory[];
  filter: ClosetCategory | null;
  items: ClosetItem[];
  onFilterChange: (cat: ClosetCategory | null) => void;
  onAdd: () => void;
  onTapItem: (item: ClosetItem) => void;
  onViewAll: () => void;
}

function ClothingSection({ title, cats, filter, items, onFilterChange, onAdd, onTapItem, onViewAll }: ClothingSectionProps) {
  return (
    <div className="mt-9">
      {/* Section header */}
      <div className="flex items-baseline justify-between px-4 mb-3">
        <h2 className="text-[17px] font-bold text-gray-900 tracking-tight">{title}</h2>
        <button onClick={onViewAll} className="text-[12px] text-gray-400 font-medium">
          View all
        </button>
      </div>

      {/* Filter chips */}
      {cats.length > 1 && (
        <div className="flex gap-2 overflow-x-auto hide-scrollbar px-4 mb-3.5">
          <FilterChip label="All" selected={filter === null} onClick={() => onFilterChange(null)} />
          {cats.map((cat) => (
            <FilterChip
              key={cat}
              label={catLabel(cat)}
              selected={filter === cat}
              onClick={() => onFilterChange(cat)}
            />
          ))}
        </div>
      )}

      {/* Horizontal scroll row */}
      <div className="flex gap-2.5 overflow-x-auto hide-scrollbar px-4">
        {/* Add card */}
        <button
          onClick={onAdd}
          className="shrink-0 w-[120px] h-[168px] rounded-2xl bg-gray-50 flex flex-col items-center justify-center gap-2.5
                     border border-dashed border-gray-200 active:scale-[0.97] transition-transform"
        >
          <div className="w-11 h-11 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,107,157,0.12)' }}>
            <Plus size={20} strokeWidth={2} color="#FF6B9D" />
          </div>
          <span className="text-[11px] font-medium text-gray-400">Add new</span>
        </button>

        {/* Item cards */}
        {items.map((item) => (
          <ClothingItemCard key={item.id} item={item} onTap={() => onTapItem(item)} />
        ))}
      </div>
    </div>
  );
}

function FilterChip({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 px-3.5 py-[6px] rounded-full text-[12px] transition-colors
        ${selected
          ? 'bg-black text-white font-semibold'
          : 'bg-gray-100 text-gray-500 font-medium'
        }`}
    >
      {label}
    </button>
  );
}

function ClothingItemCard({ item, onTap }: { item: ClosetItem; onTap: () => void }) {
  return (
    <div
      className="shrink-0 w-[120px] h-[168px] rounded-2xl overflow-hidden relative cursor-pointer bg-gray-100
                 active:scale-[0.97] transition-transform"
      onClick={onTap}
    >
      <div className="relative w-full h-full">
        <Image src={item.imageData} alt={item.category} fill className="object-cover" unoptimized />
      </div>
      {/* Category label */}
      <div className="absolute bottom-0 left-0 right-0 px-2.5 py-2"
           style={{ background: 'linear-gradient(transparent, rgba(0,0,0,0.4))' }}>
        <span className="text-[10px] font-medium text-white/90 uppercase tracking-wide">
          {catLabel(item.category)}
        </span>
      </div>
    </div>
  );
}

// ─── View All Modal ─────────────────────────────────────────────────────────────
function ViewAllModal({
  title,
  items,
  onClose,
  onDelete,
  showDelete = true,
}: {
  title: string;
  items: ClosetItem[];
  onClose: () => void;
  showDelete?: boolean;
  onDelete: (id: string) => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/30 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[430px] rounded-t-3xl bg-white flex flex-col"
        style={{ maxHeight: '85vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-9 h-1 rounded-full bg-gray-200" />
        </div>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3">
          <h3 className="text-[17px] font-bold text-gray-900">{title}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
            <X size={15} className="text-gray-500" />
          </button>
        </div>
        {/* Grid */}
        <div className="flex-1 overflow-y-auto px-4 pb-10">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 gap-2">
              <p className="text-[13px] text-gray-400 font-medium">No items yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2.5">
              {items.map((item) => (
                <div key={item.id} className="relative aspect-[3/4] rounded-xl overflow-hidden bg-gray-100">
                  <Image src={item.imageData} alt={item.category} fill className="object-cover" unoptimized />
                  {showDelete && (
                    <button
                      onClick={() => onDelete(item.id)}
                      className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white/85 flex items-center justify-center"
                      aria-label="Delete"
                    >
                      <X size={10} color="#E53E3E" strokeWidth={2.5} />
                    </button>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 px-2 py-1.5"
                       style={{ background: 'linear-gradient(transparent, rgba(0,0,0,0.35))' }}>
                    <span className="text-[9px] font-medium text-white/90 uppercase tracking-wide">
                      {catLabel(item.category)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Outfit Days Sheet ──────────────────────────────────────────────────────────
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function pickItem(items: ClosetItem[], day: Date): ClosetItem | null {
  if (!items.length) return null;
  const dayIndex = Math.floor(day.getTime() / 86400000);
  return items[dayIndex % items.length];
}

function OutfitDaysSheet({
  title,
  days,
  allItems,
  onClose,
}: {
  title: string;
  days: Date[];
  allItems: ClosetItem[];
  onClose: () => void;
}) {
  const upperItems = allItems.filter((i) => UPPER_CATS.includes(i.category));
  const lowerItems = allItems.filter((i) => LOWER_CATS.includes(i.category));
  const shoeItems = allItems.filter((i) => SHOES_CATS.includes(i.category));
  const accItems = allItems.filter((i) => ACC_CATS.includes(i.category));

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/30 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[430px] rounded-t-3xl bg-white flex flex-col"
        style={{ maxHeight: '90vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-9 h-1 rounded-full bg-gray-200" />
        </div>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3">
          <h3 className="text-[17px] font-bold text-gray-900">{title}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
            <X size={15} className="text-gray-500" />
          </button>
        </div>
        {/* Day list */}
        <div className="flex-1 overflow-y-auto px-4 pb-10">
          {allItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 gap-2">
              <p className="text-[13px] text-gray-400 font-medium">Add items to your closet first</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {days.map((day, i) => {
                const upper = pickItem(upperItems, day);
                const lower = pickItem(lowerItems, day);
                const shoe = pickItem(shoeItems, day);
                const accessory = pickItem(accItems, day);
                const isToday = i === 0 && new Date().toDateString() === day.toDateString();

                return (
                  <div key={i} className="rounded-2xl bg-gray-50 p-3.5">
                    {/* Date label */}
                    <div className="flex items-center gap-2 mb-2.5">
                      <span className="text-[13px] font-semibold text-gray-900">
                        {isToday ? 'Today' : `${DAY_NAMES[day.getDay()]}, ${MONTH_NAMES[day.getMonth()]} ${day.getDate()}`}
                      </span>
                    </div>
                    {/* Outfit items row */}
                    <div className="flex gap-2">
                      <DayOutfitTile item={upper} label="Top" />
                      <DayOutfitTile item={lower} label="Bottom" />
                      <DayOutfitTile item={shoe} label="Shoes" />
                      {accessory && <DayOutfitTile item={accessory} label="Acc" />}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DayOutfitTile({ item, label }: { item: ClosetItem | null; label: string }) {
  return (
    <div className="flex-1 aspect-[3/4] rounded-xl overflow-hidden bg-gray-100 relative">
      {item ? (
        <Image src={item.imageData} alt={item.category} fill className="object-cover" unoptimized />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <span className="text-[10px] text-gray-300 font-medium">{label}</span>
        </div>
      )}
    </div>
  );
}

// ─── Item Edit Sheet ────────────────────────────────────────────────────────────
function ItemEditSheet({
  item,
  onClose,
  onDelete,
  onSave,
}: {
  item: ClosetItem;
  onClose: () => void;
  onDelete: (id: string) => void;
  onSave: (id: string, category: ClosetCategory) => void;
}) {
  const [selectedCat, setSelectedCat] = useState<ClosetCategory>(item.category);

  // Determine which group this item belongs to
  const groupCats = UPPER_CATS.includes(item.category)
    ? UPPER_CATS
    : LOWER_CATS.includes(item.category)
    ? LOWER_CATS
    : SHOES_CATS.includes(item.category)
    ? SHOES_CATS
    : ACC_CATS;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/30 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[430px] rounded-t-3xl bg-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-9 h-1 rounded-full bg-gray-200" />
        </div>

        {/* Image + current category */}
        <div className="flex items-center gap-3.5 px-5 py-3">
          <div className="w-[60px] h-[60px] rounded-xl overflow-hidden bg-gray-100 relative shrink-0">
            <Image src={item.imageData} alt={item.category} fill className="object-cover" unoptimized />
          </div>
          <span className="text-[15px] font-semibold text-gray-900">{catLabel(selectedCat)}</span>
        </div>

        {/* Category chips */}
        <div className="px-5 py-3">
          <div className="flex flex-wrap gap-2">
            {groupCats.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCat(cat)}
                className={`px-3.5 py-[7px] rounded-full text-[12px] transition-colors border
                  ${selectedCat === cat
                    ? 'bg-black text-white font-semibold border-transparent'
                    : 'bg-transparent text-gray-700 font-medium border-gray-200'
                  }`}
              >
                {catLabel(cat)}
              </button>
            ))}
          </div>
        </div>

        {/* Delete + Save buttons */}
        <div className="flex gap-2.5 px-5 pt-3 pb-8">
          <button
            onClick={() => onDelete(item.id)}
            className="flex-1 h-12 rounded-full flex items-center justify-center text-[14px] font-semibold text-red-500"
            style={{ background: 'rgba(239,68,68,0.1)' }}
          >
            Delete
          </button>
          <button
            onClick={() => onSave(item.id, selectedCat)}
            className="flex-1 h-12 rounded-full bg-black text-white flex items-center justify-center text-[14px] font-semibold"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
