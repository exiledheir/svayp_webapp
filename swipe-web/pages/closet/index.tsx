import React, { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { Plus, X, Sparkles, Sun, CalendarDays, TreePine, Camera, Image as ImageIcon, Loader2, Globe, Crown, Lock, RefreshCw } from 'lucide-react';
import ReactCrop, { type Crop, type PixelCrop } from 'react-image-crop';
import { fetchClosetItems, addClosetItemFromFile, removeClosetItem, getClosetItems, addClosetItem, deleteClosetItem, updateClosetItem, CLOSET_CATEGORIES } from '@/lib/closet-storage';
import type { ClosetItem, ClosetCategory } from '@/lib/closet-storage';
import type { WardrobeUploadStatus } from '@/types';
import { useI18n } from '@/lib/i18n';
import type { Locale } from '@/lib/translations';

const ADD_GROUPS: Record<string, ClosetCategory[]> = {
  upper: ['tops', 'dresses', 'jackets', 'blouses', 'jumpsuits', 'tshirts'],
  lower: ['skirts', 'jeans', 'pants', 'shorts'],
  shoes: ['shoes', 'sneakers', 'heels', 'boots', 'sandals', 'flats'],
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
      resolve(canvas.toDataURL('image/png'));
    };
    img.src = imageSrc;
  });
}

// ─── Category groups ────────────────────────────────────────────────────────────
const UPPER_CATS: ClosetCategory[] = ['tops', 'dresses', 'jackets', 'blouses', 'jumpsuits', 'tshirts'];
const LOWER_CATS: ClosetCategory[] = ['skirts', 'jeans', 'pants', 'shorts'];
const SHOES_CATS: ClosetCategory[] = ['shoes', 'sneakers', 'heels', 'boots', 'sandals', 'flats'];
const ACC_CATS: ClosetCategory[] = ['accessories', 'bags', 'shawl', 'jewelry', 'underwear'];

function catLabel(cat: ClosetCategory, cats?: Record<string, string>): string {
  return cats?.[cat] ?? CLOSET_CATEGORIES.find((c) => c.value === cat)?.label ?? cat;
}

// Saved canvas layout type
interface SavedCanvasEntry { id: string; x: number; y: number; scale: number; zIndex: number; group: 'upper' | 'lower' | 'shoes' | 'acc'; }
type SavedCanvasLayout = SavedCanvasEntry[];

const OCCASION_CONFIG = [
  { key: 'weekend' as const, Icon: CalendarDays, iconColor: '#388E3C' },
];

// ─── Plan system ────────────────────────────────────────────────────────────────
type UserPlan = 'free' | 'pro' | 'premium';

const PLAN_LIMITS: Record<UserPlan, { itemsPerCategory: number; outfitCanvases: number; tryItOns: number; regenerations: number; calendarDays: number }> = {
  free:    { itemsPerCategory: 2,  outfitCanvases: 1,  tryItOns: 2,  regenerations: 5,  calendarDays: 2 },
  pro:     { itemsPerCategory: 10, outfitCanvases: 3,  tryItOns: 10, regenerations: 15, calendarDays: 7 },
  premium: { itemsPerCategory: 20, outfitCanvases: 7,  tryItOns: 30, regenerations: 50, calendarDays: 7 },
};

const PLAN_COLORS: Record<UserPlan, { bg: string; text: string; crownColor: string }> = {
  free:    { bg: '#F5F5F5', text: '#888', crownColor: '#aaa' },
  pro:     { bg: 'linear-gradient(135deg, #F370A7 0%, #e0559a 100%)', text: '#fff', crownColor: '#fbb6d0' },
  premium: { bg: 'linear-gradient(135deg, #B8860B 0%, #8B6914 100%)', text: '#fff', crownColor: '#FFD700' },
};

function usePlan() {
  const [plan, setPlan] = useState<UserPlan>('free');
  const [genCount, setGenCount] = useState(0);
  const [tryOnCount, setTryOnCount] = useState(0);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('svayp_plan') as UserPlan | null;
      if (stored && (stored === 'free' || stored === 'pro' || stored === 'premium')) setPlan(stored);
      setGenCount(Number(localStorage.getItem('svayp_gen_count') ?? '0'));
      setTryOnCount(Number(localStorage.getItem('svayp_try_on_count') ?? '0'));
    } catch { /* ignore */ }
  }, []);

  function incrementGen() {
    const next = genCount + 1;
    setGenCount(next);
    try { localStorage.setItem('svayp_gen_count', String(next)); } catch { /* ignore */ }
  }

  function incrementTryOn() {
    const next = tryOnCount + 1;
    setTryOnCount(next);
    try { localStorage.setItem('svayp_try_on_count', String(next)); } catch { /* ignore */ }
  }

  const limits = PLAN_LIMITS[plan];

  return {
    plan,
    genCount,
    incrementGen,
    tryOnCount,
    incrementTryOn,
    limits,
    canGenerate: genCount < limits.regenerations,
    canTryOn: tryOnCount < limits.tryItOns,
    canAddItemInCategory: (categoryItemCount: number) => categoryItemCount < limits.itemsPerCategory,
    calendarDays: limits.calendarDays,
  };
}

// ─── Main Page ──────────────────────────────────────────────────────────────────
export default function ClosetPage() {
  const router = useRouter();
  const { t, locale, setLocale } = useI18n();
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [items, setItems] = useState<ClosetItem[]>([]);
  const [upperFilter, setUpperFilter] = useState<ClosetCategory | null>(null);
  const [lowerFilter, setLowerFilter] = useState<ClosetCategory | null>(null);
  const [accFilter, setAccFilter] = useState<ClosetCategory | null>(null);
  const [viewAll, setViewAll] = useState<{ title: string; items: ClosetItem[] } | null>(null);
  const [canvasData, setCanvasData] = useState<{ upper: ClosetItem[]; lower: ClosetItem[]; shoes: ClosetItem[]; acc: ClosetItem[] } | null>(null);
  const [savedLayout, setSavedLayout] = useState<SavedCanvasLayout | null>(null);
  const [canvasInitialLayout, setCanvasInitialLayout] = useState<SavedCanvasLayout | null>(null);
  const [showPremiumGate, setShowPremiumGate] = useState<'generation' | 'items' | null>(null);
  const { plan, genCount, incrementGen, canGenerate, canAddItemInCategory, limits, calendarDays, tryOnCount, incrementTryOn, canTryOn } = usePlan();

  // Load saved layout from localStorage on mount
  useEffect(() => {
    try {
      const s = localStorage.getItem('svayp_saved_layout');
      if (s) setSavedLayout(JSON.parse(s));
    } catch { /* ignore */ }
  }, []);

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
  const [uploadProgress, setUploadProgress] = useState<WardrobeUploadStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const cropImgRef = useRef<HTMLImageElement>(null);
  const addFileRef = useRef<File | null>(null);

  function openAdd(group: string, category: ClosetCategory) {
    const categoryCount = items.filter((i) => i.category === category).length;
    if (!canAddItemInCategory(categoryCount)) {
      setShowPremiumGate('items');
      return;
    }
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
    addFileRef.current = file;
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
    setUploadProgress(null);

    try {
      // If we have the original file, upload via API
      if (addFileRef.current) {
        let fileToUpload = addFileRef.current;

        // If cropped, convert crop to blob
        if (addCompletedCrop && cropImgRef.current) {
          const croppedDataUrl = await getCroppedImage(addRawImage, addCompletedCrop, cropImgRef.current.width, cropImgRef.current.height);
          const response = await fetch(croppedDataUrl);
          const blob = await response.blob();
          fileToUpload = new File([blob], addFileRef.current.name, { type: 'image/jpeg' });
        }

        await addClosetItemFromFile(fileToUpload, addCategory, (status) => {
          setUploadProgress(status);
        });
      } else {
        // Fallback: save locally if no file reference
        let imageToSave = addRawImage;
        if (addCompletedCrop && cropImgRef.current) {
          imageToSave = await getCroppedImage(addRawImage, addCompletedCrop, cropImgRef.current.width, cropImgRef.current.height);
        }
        addClosetItem({ category: addCategory, imageData: imageToSave });
      }

      setAddRawImage('');
      addFileRef.current = null;
      setUploadProgress(null);
      await load();
    } catch (err) {
      console.error('Failed to upload item:', err);
      // Fallback to local save on error
      let imageToSave = addRawImage;
      if (addCompletedCrop && cropImgRef.current) {
        imageToSave = await getCroppedImage(addRawImage, addCompletedCrop, cropImgRef.current.width, cropImgRef.current.height);
      }
      addClosetItem({ category: addCategory, imageData: imageToSave });
      setAddRawImage('');
      addFileRef.current = null;
      setUploadProgress(null);
      await load();
    } finally {
      setAddSaving(false);
    }
  }

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const apiItems = await fetchClosetItems();
      // Merge with any local-only items
      const localItems = getClosetItems().filter((li) => li.id.startsWith('local_'));
      setItems([...apiItems, ...localItems]);
    } catch {
      // Fallback to localStorage if API fails
      setItems(getClosetItems());
    } finally {
      setIsLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function handleDelete(id: string) {
    try {
      if (!id.startsWith('local_')) {
        await removeClosetItem(id);
      } else {
        deleteClosetItem(id);
      }
    } catch {
      deleteClosetItem(id);
    }
    await load();
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

  function generateRandomOutfit(): SavedCanvasLayout {
    const pick = <T,>(arr: T[]): T | null => arr.length ? arr[Math.floor(Math.random() * arr.length)] : null;
    const upperAll = items.filter((i) => UPPER_CATS.includes(i.category));
    const lowerAll = items.filter((i) => LOWER_CATS.includes(i.category));
    const shoesAll = items.filter((i) => SHOES_CATS.includes(i.category));
    const accAll   = items.filter((i) => ACC_CATS.includes(i.category));
    const shawlPool = accAll.filter((a) => a.category === 'shawl');
    const sidePool  = accAll.filter((a) => a.category !== 'shawl');
    const u = pick(upperAll);
    const l = pick(lowerAll);
    const s = pick(shoesAll);
    const shawlItem = pick(shawlPool);
    const sideAccItem = pick(sidePool);
    const hasShawl = shawlItem !== null;
    const itemScale = hasShawl ? 0.88 : 1;
    const layout: SavedCanvasLayout = [];
    if (u) layout.push({ id: u.id, x: 32, y: hasShawl ? 19 : 4, scale: itemScale, zIndex: 1, group: 'upper' });
    if (l) layout.push({ id: l.id, x: 32, y: hasShawl ? 48 : 37, scale: itemScale, zIndex: 2, group: 'lower' });
    if (s) layout.push({ id: s.id, x: 32, y: hasShawl ? 73 : 68, scale: hasShawl ? 0.65 : 0.72, zIndex: 3, group: 'shoes' });
    if (shawlItem) layout.push({ id: shawlItem.id, x: 32, y: -5, scale: 0.55, zIndex: 10, group: 'acc' });
    if (sideAccItem) layout.push({ id: sideAccItem.id, x: 63, y: hasShawl ? 20 : 5, scale: 0.6, zIndex: 4, group: 'acc' });
    return layout;
  }

  function handleNewOutfit() {
    const hasUpper = items.some((i) => UPPER_CATS.includes(i.category));
    const hasLowerOrShoes = items.some((i) => LOWER_CATS.includes(i.category) || SHOES_CATS.includes(i.category));
    if (!hasUpper || !hasLowerOrShoes) {
      openAdd('', 'tops');
      return;
    }
    if (!canGenerate) {
      setShowPremiumGate('generation');
      return;
    }
    incrementGen();
    const randomLayout = generateRandomOutfit();
    setSavedLayout(randomLayout);
    try { localStorage.setItem('svayp_saved_layout', JSON.stringify(randomLayout)); } catch { /* ignore */ }
    setCanvasInitialLayout(randomLayout);
    // Does NOT open the canvas — just updates the outfit card display
  }

  function handleTryItOn() {
    if (!canTryOn) {
      setShowPremiumGate('generation');
      return;
    }
    incrementTryOn();
  }

  function showOutfitsForPeriod(key: 'today' | 'weekend') {
    const now = new Date();
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now); d.setDate(d.getDate() + i); return d;
    });
    const title = key === 'today' ? t.today : t.nextSevenDays;
    setOutfitSheet({ title, days });
  }

  return (
    <div className="phone-container flex flex-col bg-white" style={{ height: '100dvh' }}>
      {/* Header with logo + occasion buttons */}
      <header className="shrink-0 flex items-center justify-between px-5 pt-5 pb-0" style={{ minHeight: 56 }}>
        <h1 className="text-[22px] font-bold tracking-[0.12em]">LIB<span style={{ color: '#F370A7' }}>Λ</span>S</h1>
        <div className="flex items-center gap-1.5">
          {OCCASION_CONFIG.map((occ) => (
            <button
              key={occ.key}
              onClick={() => showOutfitsForPeriod(occ.key)}
              className="flex items-center gap-1.5 px-3 h-8 rounded-full text-[12px] font-semibold text-gray-700 active:scale-[0.97] transition-transform"
              style={{ background: '#F5F5F5' }}
            >
              <occ.Icon size={13} strokeWidth={1.8} color={occ.iconColor} />
              {t.calendar}
            </button>
          ))}
          <button
            onClick={() => setShowPremiumGate('generation')}
            className="flex items-center gap-1 px-2.5 h-8 rounded-full text-[11px] font-bold active:scale-[0.97] transition-all"
            style={{
              background: PLAN_COLORS[plan].bg,
              color: PLAN_COLORS[plan].text,
            }}
            aria-label="User plan"
          >
            <Crown size={11} strokeWidth={2} color={PLAN_COLORS[plan].crownColor} />
            <span>{plan === 'free' ? 'Free' : plan === 'pro' ? 'Pro' : 'Premium'}</span>
          </button>
          <button
            onClick={() => setShowLangPicker(true)}
            className="w-8 h-8 rounded-full flex items-center justify-center active:scale-[0.97] transition-transform"
            style={{ background: '#F5F5F5' }}
            aria-label="Select language"
          >
            <Globe size={15} strokeWidth={1.8} className="text-gray-600" />
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-4" style={{ paddingTop: 0 }}>
        {/* ── My Outfits ────────────────────────────────────────── */}
        <OutfitSection
          allItems={items}
          savedLayout={savedLayout}
          plan={plan}
          canGenerate={canGenerate}
          genCount={genCount}
          limits={limits}
          tryOnCount={tryOnCount}
          onViewItems={() => {
            setCanvasInitialLayout(savedLayout);
            setCanvasData({
              upper: items.filter((i) => UPPER_CATS.includes(i.category)),
              lower: items.filter((i) => LOWER_CATS.includes(i.category)),
              shoes: items.filter((i) => SHOES_CATS.includes(i.category)),
              acc: items.filter((i) => ACC_CATS.includes(i.category)),
            });
          }}
          onRegenerate={handleNewOutfit}
          onShowPlans={() => setShowPremiumGate('generation')}
          onTryItOn={handleTryItOn}
        />

        {/* ── Upper Body ────────────────────────────────────────── */}
        <ClothingSection
          title={t.upperBody}
          cats={UPPER_CATS}
          filter={upperFilter}
          items={itemsFor(UPPER_CATS, upperFilter)}
          totalCount={items.filter((i) => UPPER_CATS.includes(i.category)).length}
          maxCount={limits.itemsPerCategory}
          onFilterChange={setUpperFilter}
          onTapItem={setEditItem}
          onViewAll={() => openViewAll(t.upperBody, UPPER_CATS)}
        />

        {/* ── Lower Body ────────────────────────────────────────── */}
        <ClothingSection
          title={t.lowerBody}
          cats={LOWER_CATS}
          filter={lowerFilter}
          items={itemsFor(LOWER_CATS, lowerFilter)}
          totalCount={items.filter((i) => LOWER_CATS.includes(i.category)).length}
          maxCount={limits.itemsPerCategory}
          onFilterChange={setLowerFilter}
          onTapItem={setEditItem}
          onViewAll={() => openViewAll(t.lowerBody, LOWER_CATS)}
        />

        {/* ── Shoes ─────────────────────────────────────────────── */}
        <ClothingSection
          title={t.shoes}
          cats={SHOES_CATS}
          filter={null}
          items={itemsFor(SHOES_CATS, null)}
          totalCount={items.filter((i) => SHOES_CATS.includes(i.category)).length}
          maxCount={limits.itemsPerCategory}
          onFilterChange={() => {}}
          onTapItem={setEditItem}
          onViewAll={() => openViewAll(t.shoes, SHOES_CATS)}
        />

        {/* ── Accessories ───────────────────────────────────────── */}
        <ClothingSection
          title={t.accessories}
          cats={ACC_CATS}
          filter={accFilter}
          items={itemsFor(ACC_CATS, accFilter)}
          totalCount={items.filter((i) => ACC_CATS.includes(i.category)).length}
          maxCount={limits.itemsPerCategory}
          onFilterChange={setAccFilter}
          onTapItem={setEditItem}
          onViewAll={() => openViewAll(t.accessories, ACC_CATS)}
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

      {/* ── Interactive Outfit Canvas ──────────────────────────── */}
      {canvasData && (
        <InteractiveCanvas
          upper={canvasData.upper}
          lower={canvasData.lower}
          shoes={canvasData.shoes}
          acc={canvasData.acc}
          initialLayout={canvasInitialLayout}
          allItems={items}
          onClose={() => setCanvasData(null)}
          onSave={(layout) => {
            setSavedLayout(layout);
            setCanvasInitialLayout(layout);
            localStorage.setItem('svayp_saved_layout', JSON.stringify(layout));
            setCanvasData(null);
          }}
          onRegenerate={handleNewOutfit}
          onShowPlans={() => setShowPremiumGate('generation')}
          canRegenerate={canGenerate}
        />
      )}

      {/* ── Outfit Days Sheet ──────────────────────────────── */}
      {outfitSheet && (
        <OutfitDaysSheet
          title={outfitSheet.title}
          days={outfitSheet.days}
          allItems={items}
          calendarDays={calendarDays}
          onClose={() => setOutfitSheet(null)}
          onShowPlans={() => setShowPremiumGate('generation')}
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

      {/* ── Premium Gate Sheet ── */}
      {showPremiumGate && (
        <PremiumGateSheet
          reason={showPremiumGate}
          currentPlan={plan}
          onClose={() => setShowPremiumGate(null)}
        />
      )}

      {/* ── Floating Add Button ── */}
      <div className="absolute right-6 z-50" style={{ bottom: 'calc(64px + env(safe-area-inset-bottom, 0px) + 16px)' }}>
        <span className="absolute inset-0 rounded-full animate-ping" style={{ backgroundColor: '#F370A7', opacity: 0.35 }} />
        <button
          onClick={() => openAdd('', 'tops')}
          className="relative w-14 h-14 rounded-full flex items-center justify-center shadow-xl active:scale-[0.95] transition-transform"
          style={{ backgroundColor: '#F370A7' }}
          aria-label="Add item"
        >
          <Plus size={24} strokeWidth={2.5} color="white" />
        </button>
      </div>

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
              <h3 className="text-[15px] font-bold text-gray-900 mb-4">{t.addPhoto}</h3>
              <div className="flex flex-col gap-2.5">
                <button
                  onClick={() => { fileInputRef.current?.click(); setShowAddPicker(false); }}
                  className="w-full h-14 rounded-2xl bg-gray-50 flex items-center gap-3.5 px-4 active:scale-[0.98] transition-transform"
                >
                  <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #f093fb 0%, #F5576c 100%)' }}>
                    <ImageIcon size={19} strokeWidth={1.8} color="#fff" />
                  </div>
                  <div className="text-left">
                    <span className="text-[14px] font-semibold text-gray-900 block">{t.photoLibrary}</span>
                    <span className="text-[11px] text-gray-400">{t.chooseFromYourPhotos}</span>
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
                    <span className="text-[14px] font-semibold text-gray-900 block">{t.camera}</span>
                    <span className="text-[11px] text-gray-400">{t.takeANewPhoto}</span>
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
            <span className="text-[15px] font-semibold text-gray-900">{t.addToCloset}</span>
          </header>
          <div className="flex-1 overflow-y-auto px-4 pb-8 flex flex-col gap-5 pt-2">
            <div className="rounded-2xl overflow-hidden bg-gray-50 flex justify-center">
              <ReactCrop crop={addCrop} onChange={(c) => setAddCrop(c)} onComplete={(c) => setAddCompletedCrop(c)}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img ref={cropImgRef} src={addRawImage} alt="Crop" style={{ maxHeight: '45vh', maxWidth: '100%', display: 'block', margin: '0 auto' }} />
              </ReactCrop>
            </div>
            <div className="flex flex-col gap-3">
              <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">{t.category}</label>
              {[
                { key: 'upper', label: t.upperBody, cats: ADD_GROUPS.upper },
                { key: 'lower', label: t.lowerBody, cats: ADD_GROUPS.lower },
                { key: 'shoes', label: t.shoes,     cats: ADD_GROUPS.shoes },
                { key: 'acc',   label: t.accessories, cats: ADD_GROUPS.acc },
              ].map((group) => (
                <div key={group.key}>
                  <p className="text-[11px] font-semibold text-gray-400 mb-1.5">{group.label}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {group.cats.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setAddCategory(cat)}
                        className={`px-3.5 py-[6px] rounded-full text-[12px] transition-colors ${
                          addCategory === cat ? 'bg-black text-white font-semibold' : 'bg-gray-100 text-gray-500 font-medium'
                        }`}
                      >
                        {catLabel(cat, t.cats)}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={handleAddSave}
              disabled={addSaving}
              className="w-full py-3.5 rounded-full bg-black text-white text-[13px] font-semibold disabled:opacity-30 active:scale-[0.97] transition-transform"
            >
              {addSaving
                ? uploadProgress
                  ? `${uploadProgress.currentStep} (${uploadProgress.progressPercent}%)`
                  : t.uploading
                : t.saveToCloset}
            </button>
          </div>
        </div>
      )}

      {/* ── Language Picker Sheet ── */}
      {showLangPicker && (
        <div
          className="fixed inset-0 z-[70] flex items-end justify-center bg-black/30 backdrop-blur-sm"
          onClick={() => setShowLangPicker(false)}
        >
          <div className="w-full max-w-[430px] rounded-t-3xl bg-white" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-9 h-1 rounded-full bg-gray-200" />
            </div>
            <div className="px-5 pb-10">
              <h3 className="text-[15px] font-bold text-gray-900 mb-4">{t.language}</h3>
              <div className="flex flex-col gap-2">
                {(['en', 'ru', 'uz'] as Locale[]).map((l) => (
                  <button
                    key={l}
                    onClick={() => { setLocale(l); setShowLangPicker(false); }}
                    className={`w-full h-14 rounded-2xl flex items-center justify-between px-5 transition-colors ${
                      locale === l ? 'bg-black text-white' : 'bg-gray-50 text-gray-800'
                    }`}
                  >
                    <span className="text-[14px] font-semibold">
                      {l === 'en' ? 'English' : l === 'ru' ? 'Русский' : "O'zbek"}
                    </span>
                    {locale === l && <span className="text-[12px] font-medium opacity-70">✓</span>}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// ─── My Outfits ─────────────────────────────────────────────────────────────────
function OutfitSection({ allItems, savedLayout, plan, canGenerate, genCount, limits, tryOnCount, onViewItems, onRegenerate, onShowPlans, onTryItOn }: {
  allItems: ClosetItem[];
  savedLayout: SavedCanvasLayout | null;
  plan: UserPlan;
  canGenerate: boolean;
  genCount: number;
  limits: typeof PLAN_LIMITS['free'];
  tryOnCount: number;
  onViewItems: () => void;
  onRegenerate: () => void;
  onShowPlans: () => void;
  onTryItOn: () => void;
}) {
  const { t } = useI18n();
  const isEmpty = allItems.length === 0;

  return (
    <div className="mt-4">
      <div className="flex items-baseline justify-between px-4 mb-3.5">
        <h2 className="text-[18px] font-bold text-gray-900 tracking-tight">{t.myOutfits}</h2>
      </div>
      <div className={`flex gap-3 hide-scrollbar py-2 ${isEmpty ? 'justify-center px-4' : 'overflow-x-auto pl-4'}`}>
        {/* Single auto-generated outfit card */}
        <OutfitCard
          allItems={allItems}
          isEmpty={isEmpty}
          savedLayout={savedLayout}
          onViewItems={onViewItems}
          onRegenerate={onRegenerate}
          canRegenerate={canGenerate}
          genCount={genCount}
          regenLimit={limits.regenerations}
          onTryItOn={onTryItOn}
          tryOnCount={tryOnCount}
          tryOnLimit={limits.tryItOns}
        />

        {/* New outfit card — always opens plans popup, premium gold style */}
        {!isEmpty && (
          <button
            onClick={onShowPlans}
            className="shrink-0 rounded-[28px] flex flex-col items-center justify-center gap-3 border-2 border-dashed active:scale-[0.98] transition-transform"
            style={{
              width: 'min(82vw, 340px)',
              height: 440,
              borderColor: '#B8860B',
              background: 'linear-gradient(160deg, rgba(184,134,11,0.04), rgba(139,105,20,0.08))',
            }}
          >
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, #FFF8DC, #FFD700)',
                boxShadow: '0 4px 20px rgba(184,134,11,0.25)',
              }}
            >
              <Plus size={26} strokeWidth={2} style={{ color: '#8B6914' }} />
            </div>
            <div className="text-center px-6">
              <p className="text-[14px] font-bold text-gray-700">{t.newOutfit}</p>
              <p className="text-[12px] font-semibold mt-0.5" style={{ color: '#8B6914' }}>{t.upgradeToGetMore}</p>
            </div>
          </button>
        )}

        <div className="w-6 shrink-0" />
      </div>
    </div>
  );
}

function OutfitCard({
  allItems,
  isEmpty,
  savedLayout,
  onViewItems,
  onRegenerate,
  canRegenerate,
  genCount,
  regenLimit,
  onTryItOn,
  tryOnCount,
  tryOnLimit,
}: {
  allItems: ClosetItem[];
  isEmpty: boolean;
  savedLayout: SavedCanvasLayout | null;
  onViewItems: () => void;
  onRegenerate: () => void;
  canRegenerate: boolean;
  genCount: number;
  regenLimit: number;
  onTryItOn: () => void;
  tryOnCount: number;
  tryOnLimit: number;
}) {
  const { t } = useI18n();

  // Check if we have minimum items for an outfit (1 top + 1 bottom or shoes)
  const hasUpper = allItems.some((i) => UPPER_CATS.includes(i.category));
  const hasLowerOrShoes = allItems.some((i) => LOWER_CATS.includes(i.category) || SHOES_CATS.includes(i.category));
  const canGenerateOutfit = hasUpper && hasLowerOrShoes;

  // Build display entries: saved layout or default auto-generated
  const displayEntries = React.useMemo(() => {
    if (!canGenerateOutfit) return [];
    if (savedLayout && savedLayout.length > 0) {
      const resolved = savedLayout
        .map((entry) => {
          const item = allItems.find((i) => i.id === entry.id);
          if (!item) return null;
          return { item, x: entry.x, y: entry.y, scale: entry.scale, zIndex: entry.zIndex, group: entry.group };
        })
        .filter(Boolean) as { item: ClosetItem; x: number; y: number; scale: number; zIndex: number; group: string }[];
      // Only use saved layout if at least one item resolved — otherwise fall through to defaults
      if (resolved.length > 0) return resolved;
    }
    // Default positions
    const upperAll = allItems.filter((i) => UPPER_CATS.includes(i.category));
    const lowerAll = allItems.filter((i) => LOWER_CATS.includes(i.category));
    const shoesAll = allItems.filter((i) => SHOES_CATS.includes(i.category));
    const accAll = allItems.filter((i) => ACC_CATS.includes(i.category));
    const shawlItem = accAll.find((a) => a.category === 'shawl') ?? null;
    const sideAccItem = accAll.find((a) => a.category !== 'shawl') ?? null;
    const hasShawl = shawlItem !== null;
    const entries: { item: ClosetItem; x: number; y: number; scale: number; zIndex: number; group: string }[] = [];
    const itemScale = hasShawl ? 0.88 : 1;
    if (upperAll.length) entries.push({ item: upperAll[0], x: 32, y: hasShawl ? 19 : 4, scale: itemScale, zIndex: 1, group: 'upper' });
    if (lowerAll.length) entries.push({ item: lowerAll[0], x: 32, y: hasShawl ? 48 : 37, scale: itemScale, zIndex: 2, group: 'lower' });
    if (shoesAll.length) entries.push({ item: shoesAll[0], x: 32, y: hasShawl ? 73 : 68, scale: hasShawl ? 0.65 : 0.72, zIndex: 3, group: 'shoes' });
    if (shawlItem) entries.push({ item: shawlItem, x: 32, y: -5, scale: 0.55, zIndex: 10, group: 'acc' });
    if (sideAccItem) entries.push({ item: sideAccItem, x: 63, y: hasShawl ? 20 : 5, scale: 0.6, zIndex: 4, group: 'acc' });
    return entries;
  }, [savedLayout, allItems, canGenerateOutfit]);

  return (
    <div
      className="shrink-0 rounded-[28px] flex flex-col border border-gray-100 relative"
      style={{
        width: 'min(82vw, 340px)',
        height: 440,
        background: '#FFFFFF',
        boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
      }}
    >
      {/* Top-right regenerate button + counter */}
      {canGenerateOutfit && (
        <div className="absolute top-3.5 right-3.5 flex flex-col items-center gap-0.5 z-10">
          <button
            onClick={onRegenerate}
            className="w-9 h-9 rounded-full flex items-center justify-center active:scale-[0.95] transition-transform"
            style={{ background: 'rgba(0,0,0,0.06)' }}
            title="Regenerate"
          >
            <RefreshCw
              size={14}
              strokeWidth={2.2}
              className={canRegenerate ? 'text-gray-600' : 'text-gray-300'}
            />
          </button>
          <span className="text-[9px] font-semibold text-gray-400 leading-none">{genCount}/{regenLimit}</span>
        </div>
      )}

      {/* Flat-lay Canvas */}
      <div className="flex-1 relative min-h-0 px-5 pt-5 pb-3">
        {isEmpty ? (
          <div className="w-full h-full rounded-2xl flex flex-col items-center justify-center gap-3">
            <div className="relative w-full flex-1 min-h-0 flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/closet/outfitcard_empty_state.png"
                alt="Empty outfit"
                className="w-full h-full object-contain opacity-80"
                onError={(e) => {
                  const t = e.currentTarget;
                  t.style.display = 'none';
                  const fb = t.nextElementSibling as HTMLElement | null;
                  if (fb) fb.style.display = 'flex';
                }}
              />
              <div className="hidden w-full h-full flex-col items-center justify-center gap-2 opacity-30">
                <svg width="96" height="96" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                  <path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.57a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.57a2 2 0 0 0-1.34-2.23z"/>
                </svg>
              </div>
            </div>
            <p className="text-[15px] font-bold text-gray-800 text-center leading-snug pb-2">
              {t.yourStyleStartsHere}<br />
              <span className="text-[13px] font-medium text-gray-400">{t.tapPlusToAddFirstPiece}</span>
            </p>
          </div>
        ) : !canGenerateOutfit ? (
          <div className="w-full h-full rounded-2xl flex flex-col items-center justify-center gap-3">
            <div className="relative w-full flex-1 min-h-0 flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/closet/outfitcard_empty_state.png"
                alt="Empty outfit"
                className="w-full h-full object-contain opacity-80"
                onError={(e) => {
                  const t = e.currentTarget;
                  t.style.display = 'none';
                  const fb = t.nextElementSibling as HTMLElement | null;
                  if (fb) fb.style.display = 'flex';
                }}
              />
              <div className="hidden w-full h-full flex-col items-center justify-center gap-2 opacity-30">
                <svg width="96" height="96" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                  <path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.57a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.57a2 2 0 0 0-1.34-2.23z"/>
                </svg>
              </div>
            </div>
            <p className="text-[14px] font-medium text-gray-500 text-center leading-relaxed px-4 pb-1">
              {t.addTopAndBottom}
            </p>
            <div className="flex gap-2 pb-2">
              {hasUpper ? (
                <span className="px-2.5 py-1 rounded-full bg-green-100 text-green-700 text-[11px] font-semibold">✓ {t.upperBody}</span>
              ) : (
                <span className="px-2.5 py-1 rounded-full bg-gray-100 text-gray-500 text-[11px] font-semibold">+ {t.upperBody}</span>
              )}
              {hasLowerOrShoes ? (
                <span className="px-2.5 py-1 rounded-full bg-green-100 text-green-700 text-[11px] font-semibold">✓ {t.lowerBody}/{t.shoes}</span>
              ) : (
                <span className="px-2.5 py-1 rounded-full bg-gray-100 text-gray-500 text-[11px] font-semibold">+ {t.lowerBody}/{t.shoes}</span>
              )}
            </div>
          </div>
        ) : (
          <div className="w-full h-full relative overflow-hidden isolate">
            {displayEntries.map((entry, idx) => (
              <div
                key={entry.item.id}
                className="absolute origin-center overflow-hidden transition-all duration-500 ease-in-out"
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
        )}
      </div>

      {/* Bottom action bar — only when outfit can be generated */}
      {canGenerateOutfit && (
      <div className="flex gap-2.5 px-5 pb-5">
        <button
          onClick={onViewItems}
          className="flex-1 h-[44px] rounded-full flex items-center justify-center text-[12px] font-semibold text-gray-700 tracking-wide"
          style={{ background: 'rgba(0,0,0,0.04)' }}
        >
          {t.viewItems}
        </button>
        <button
          onClick={onTryItOn}
          className="flex-1 h-[44px] rounded-full flex items-center justify-center gap-1.5 text-[12px] font-semibold text-white tracking-wide"
          style={{ background: 'linear-gradient(135deg, #1a1a1a, #000)' }}
        >
          <Sparkles size={12} />
          <span>{t.tryItOn}</span>
          <span className="opacity-60 text-[10px]">{tryOnCount}/{tryOnLimit}</span>
        </button>
      </div>
      )}
    </div>
  );
}

function FlatLayPlaceholder({ label }: { label: string }) {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-1.5">
      <div className="w-6 h-6 rounded-full border-2 border-dashed border-gray-200" />
      <span className="text-[9px] font-medium text-gray-300 uppercase tracking-widest">{label}</span>
    </div>
  );
}

// ─── Interactive Canvas ─────────────────────────────────────────────────────────
interface CanvasItem {
  item: ClosetItem;
  x: number;
  y: number;
  scale: number;
  zIndex: number;
  group: 'upper' | 'lower' | 'shoes' | 'acc';
}

function InteractiveCanvas({
  upper,
  lower,
  shoes,
  acc,
  initialLayout,
  allItems,
  onClose,
  onSave,
  onRegenerate,
  onShowPlans,
  canRegenerate,
}: {
  upper: ClosetItem[];
  lower: ClosetItem[];
  shoes: ClosetItem[];
  acc: ClosetItem[];
  initialLayout: SavedCanvasLayout | null;
  allItems: ClosetItem[];
  onClose: () => void;
  onSave: (layout: SavedCanvasLayout) => void;
  onRegenerate: () => void;
  onShowPlans: () => void;
  canRegenerate: boolean;
}) {
  const { t } = useI18n();
  const containerRef = useRef<HTMLDivElement>(null);
  const nextZ = useRef(10);

  // Build initial canvas items
  const buildInitialItems = useCallback((): CanvasItem[] => {
    // If we have a saved layout, restore from it (deduplicate by ID)
    if (initialLayout && initialLayout.length > 0) {
      const result: CanvasItem[] = [];
      const seen = new Set<string>();
      for (const entry of initialLayout) {
        if (seen.has(entry.id)) continue;
        seen.add(entry.id);
        const item = allItems.find((i) => i.id === entry.id);
        if (item) {
          result.push({ item, x: entry.x, y: entry.y, scale: entry.scale, zIndex: entry.zIndex, group: entry.group });
        }
      }
      if (result.length > 0) {
        nextZ.current = Math.max(...result.map((r) => r.zIndex)) + 5;
        return result;
      }
    }
    // Default positions
    const result: CanvasItem[] = [];
    const u = upper.length ? upper[0] : null;
    const l = lower.length ? lower[0] : null;
    const s = shoes.length ? shoes[0] : null;
    const shawlItem = acc.find((a) => a.category === 'shawl') ?? null;
    const sideAccItem = acc.find((a) => a.category !== 'shawl') ?? null;
    const hasShawl = shawlItem !== null;

    // When shawl present, reduce item scales and shift down so all fit without cropping
    const itemScale = hasShawl ? 0.88 : 1;
    if (u) result.push({ item: u, x: 32, y: hasShawl ? 19 : 4, scale: itemScale, zIndex: 1, group: 'upper' });
    if (l) result.push({ item: l, x: 32, y: hasShawl ? 48 : 37, scale: itemScale, zIndex: 2, group: 'lower' });
    if (s) result.push({ item: s, x: 32, y: hasShawl ? 73 : 68, scale: hasShawl ? 0.65 : 0.72, zIndex: 3, group: 'shoes' });
    // Scarf: small, sits at top with just a collar-area touch on the shirt
    if (shawlItem) result.push({ item: shawlItem, x: 32, y: -5, scale: 0.55, zIndex: 10, group: 'acc' });
    // Side accessory (bag, jewelry, etc.) sits to the right at shirt level
    if (sideAccItem) result.push({ item: sideAccItem, x: 63, y: hasShawl ? 20 : 5, scale: 0.6, zIndex: 4, group: 'acc' });
    nextZ.current = result.length + 5;
    return result;
  }, [upper, lower, shoes, acc, initialLayout, allItems]);

  const [canvasItems, setCanvasItems] = useState<CanvasItem[]>(buildInitialItems);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number; itemX: number; itemY: number }>({ x: 0, y: 0, itemX: 0, itemY: 0 });
  const [swapTarget, setSwapTarget] = useState<number | null>(null);
  const [addPicker, setAddPicker] = useState(false);
  // Pinch zoom state
  const pinchRef = useRef<{ initialDist: number; initialScale: number } | null>(null);

  function getGroupItems(group: 'upper' | 'lower' | 'shoes' | 'acc'): ClosetItem[] {
    switch (group) {
      case 'upper': return upper;
      case 'lower': return lower;
      case 'shoes': return shoes;
      case 'acc': return acc;
    }
  }

  function getAllItems(): ClosetItem[] {
    return [...upper, ...lower, ...shoes, ...acc];
  }

  function getGroupLabel(group: 'upper' | 'lower' | 'shoes' | 'acc'): string {
    switch (group) {
      case 'upper': return t.upperBody;
      case 'lower': return t.lowerBody;
      case 'shoes': return t.shoes;
      case 'acc': return t.accessories;
    }
  }

  function getItemGroup(item: ClosetItem): 'upper' | 'lower' | 'shoes' | 'acc' {
    if (UPPER_CATS.includes(item.category)) return 'upper';
    if (LOWER_CATS.includes(item.category)) return 'lower';
    if (SHOES_CATS.includes(item.category)) return 'shoes';
    return 'acc';
  }

  // Select item on tap
  function handleSelect(idx: number) {
    setSelectedIdx(idx);
  }

  // Drag start — only for single-finger (non-pinch)
  function handlePointerDown(e: React.PointerEvent, idx: number) {
    // Skip if pinch is active
    if (pinchRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    handleSelect(idx);
    const ci = canvasItems[idx];
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY, itemX: ci.x, itemY: ci.y });
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  }

  function handlePointerMove(e: React.PointerEvent) {
    // Skip drag if pinch is active
    if (!isDragging || pinchRef.current || selectedIdx === null || !containerRef.current) return;
    e.preventDefault();
    const rect = containerRef.current.getBoundingClientRect();
    const dx = ((e.clientX - dragStart.x) / rect.width) * 100;
    const dy = ((e.clientY - dragStart.y) / rect.height) * 100;
    setCanvasItems((prev) =>
      prev.map((ci, i) =>
        i === selectedIdx
          ? { ...ci, x: Math.max(-20, Math.min(80, dragStart.itemX + dx)), y: Math.max(-10, Math.min(85, dragStart.itemY + dy)) }
          : ci
      )
    );
  }

  function handlePointerUp() {
    setIsDragging(false);
  }

  // Pinch-to-zoom on touch
  function handleTouchStart(e: React.TouchEvent, idx: number) {
    if (e.touches.length === 2) {
      // Disable drag when pinch starts
      setIsDragging(false);
      handleSelect(idx);
      const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      pinchRef.current = { initialDist: dist, initialScale: canvasItems[idx].scale };
    }
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (e.touches.length === 2 && pinchRef.current && selectedIdx !== null) {
      const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      const ratio = dist / pinchRef.current.initialDist;
      const newScale = Math.max(0.3, Math.min(3, pinchRef.current.initialScale * ratio));
      setCanvasItems((prev) =>
        prev.map((ci, i) => (i === selectedIdx ? { ...ci, scale: newScale } : ci))
      );
    }
  }

  function handleTouchEnd() {
    pinchRef.current = null;
  }

  // Wheel to zoom (desktop) — only scale, no position change
  function handleWheel(e: React.WheelEvent, idx: number) {
    e.preventDefault();
    e.stopPropagation();
    if (selectedIdx !== idx) handleSelect(idx);
    const delta = e.deltaY > 0 ? -0.05 : 0.05;
    setCanvasItems((prev) =>
      prev.map((ci, i) => (i === idx ? { ...ci, scale: Math.max(0.3, Math.min(3, ci.scale + delta)) } : ci))
    );
  }

  // Actions
  function bringToFront() {
    if (selectedIdx === null) return;
    setCanvasItems((prev) =>
      prev.map((ci, i) => (i === selectedIdx ? { ...ci, zIndex: nextZ.current++ } : ci))
    );
  }

  function sendToBack() {
    if (selectedIdx === null) return;
    setCanvasItems((prev) =>
      prev.map((ci, i) => (i === selectedIdx ? { ...ci, zIndex: 0 } : ci))
    );
  }

  function deleteSelected() {
    if (selectedIdx === null) return;
    setCanvasItems((prev) => prev.filter((_, i) => i !== selectedIdx));
    setSelectedIdx(null);
  }

  function addItem(item: ClosetItem) {
    const group = getItemGroup(item);
    setCanvasItems((prev) => [...prev, { item, x: 30, y: 30, scale: 1, zIndex: nextZ.current++, group }]);
    setAddPicker(false);
  }

  // Swap item within same category
  function handleSwap(canvasIdx: number, newItem: ClosetItem) {
    setCanvasItems((prev) =>
      prev.map((ci, i) => (i === canvasIdx ? { ...ci, item: newItem } : ci))
    );
    setSwapTarget(null);
  }

  // Save — deduplicate by item ID (keep last occurrence = most recent position)
  function handleSave() {
    const seen = new Set<string>();
    const deduped: SavedCanvasLayout = [];
    // Iterate in reverse so the last (top) occurrence wins
    for (let i = canvasItems.length - 1; i >= 0; i--) {
      const ci = canvasItems[i];
      if (!seen.has(ci.item.id)) {
        seen.add(ci.item.id);
        deduped.unshift({ id: ci.item.id, x: ci.x, y: ci.y, scale: ci.scale, zIndex: ci.zIndex, group: ci.group });
      }
    }
    onSave(deduped);
  }

  // Deselect when tapping empty canvas
  function handleCanvasTap() {
    setSelectedIdx(null);
  }

  return (
    <div className="fixed inset-0 z-[65] flex flex-col bg-white">
      {/* Header */}
      <header className="shrink-0 flex items-center justify-between px-4 h-14 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
            <X size={17} strokeWidth={2} className="text-gray-700" />
          </button>
          <span className="text-[15px] font-semibold text-gray-900">{t.myOutfits}</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Plans button */}
          <button
            onClick={(e) => { e.stopPropagation(); onShowPlans(); }}
            className="w-9 h-9 rounded-full flex items-center justify-center active:scale-[0.95] transition-transform"
            style={{ background: 'linear-gradient(135deg, #B8860B, #8B6914)', boxShadow: '0 2px 8px rgba(184,134,11,0.25)' }}
            title="View plans"
          >
            <Crown size={14} strokeWidth={2} color="#FFD700" />
          </button>
          <button onClick={handleSave} className="px-4 py-2 rounded-full text-[13px] font-semibold text-white" style={{ backgroundColor: '#F370A7' }}>
            {t.save}
          </button>
        </div>
      </header>

      {/* Canvas area */}
      <div
        ref={containerRef}
        className="flex-1 relative overflow-hidden bg-white touch-none"
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onTouchMove={(e) => handleTouchMove(e)}
        onTouchEnd={handleTouchEnd}
        onClick={handleCanvasTap}
      >
        {canvasItems.map((ci, idx) => (
          <div
            key={`${ci.group}-${idx}-${ci.item.id}`}
            className={`absolute origin-center ${selectedIdx === idx ? 'ring-2 ring-[#F370A7] ring-offset-2 rounded-xl' : ''}`}
            style={{
              left: `${ci.x}%`,
              top: `${ci.y}%`,
              width: '35%',
              aspectRatio: '1',
              transform: `scale(${ci.scale})`,
              zIndex: ci.zIndex,
            }}
            onPointerDown={(e) => handlePointerDown(e, idx)}
            onTouchStart={(e) => handleTouchStart(e, idx)}
            onWheel={(e) => handleWheel(e, idx)}
            onClick={(e) => { e.stopPropagation(); handleSelect(idx); }}
          >
            <div className="relative w-full h-full rounded-xl overflow-hidden cursor-grab active:cursor-grabbing">
              <Image src={ci.item.imageData} alt={ci.item.category} fill className="object-contain" unoptimized />
            </div>
          </div>
        ))}

        {/* Action buttons - always visible on right side */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col gap-2 z-[9999]">
          {[
            {
              label: 'Swap',
              icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4"/></svg>,
              action: () => { if (selectedIdx !== null) setSwapTarget(selectedIdx); },
              needsSelection: true,
            },
            {
              label: 'Front',
              icon: (
                <svg width="16" height="16" viewBox="0 0 16 16">
                  {/* back rect – outline */}
                  <rect x="1" y="5" width="8" height="8" rx="1.2" stroke="currentColor" strokeWidth="1.4" fill="none"/>
                  {/* front rect – filled */}
                  <rect x="7" y="1" width="8" height="8" rx="1.2" fill="currentColor"/>
                </svg>
              ),
              action: bringToFront,
              needsSelection: true,
            },
            {
              label: 'Back',
              icon: (
                <svg width="16" height="16" viewBox="0 0 16 16">
                  {/* back rect – filled */}
                  <rect x="1" y="5" width="8" height="8" rx="1.2" fill="currentColor"/>
                  {/* front rect – outline with white fill so back shows through */}
                  <rect x="7" y="1" width="8" height="8" rx="1.2" stroke="currentColor" strokeWidth="1.4" fill="white"/>
                </svg>
              ),
              action: sendToBack,
              needsSelection: true,
            },
            {
              label: 'Delete',
              icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14"/></svg>,
              action: deleteSelected,
              needsSelection: true,
            },
            {
              label: 'Add',
              icon: <Plus size={16} />,
              action: () => setAddPicker(true),
              needsSelection: false,
            },
          ].map((btn) => {
            const disabled = btn.needsSelection && selectedIdx === null;
            return (
              <button
                key={btn.label}
                onClick={(e) => { e.stopPropagation(); if (!disabled) btn.action(); }}
                className={`w-10 h-10 rounded-full bg-white shadow-md border border-gray-200 flex items-center justify-center transition-all active:scale-95 ${
                  disabled ? 'opacity-30 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-50'
                }`}
                title={btn.label}
              >
                {btn.icon}
              </button>
            );
          })}
        </div>
      </div>

      {/* Swap bottom sheet */}
      {swapTarget !== null && (
        <div className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/30 backdrop-blur-sm" onClick={() => setSwapTarget(null)}>
          <div className="w-full max-w-[430px] rounded-t-3xl bg-white max-h-[50vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-center pt-3 pb-2"><div className="w-9 h-1 rounded-full bg-gray-200" /></div>
            <div className="px-5 pb-2">
              <h3 className="text-[14px] font-bold text-gray-900">{getGroupLabel(canvasItems[swapTarget].group)}</h3>
            </div>
            <div className="flex-1 overflow-y-auto px-5 pb-8">
              <div className="grid grid-cols-3 gap-2.5">
                {getGroupItems(canvasItems[swapTarget].group).map((item) => (
                  <button key={item.id} onClick={() => handleSwap(swapTarget, item)} className={`relative aspect-[3/4] rounded-xl overflow-hidden border-2 transition-colors ${canvasItems[swapTarget].item.id === item.id ? 'border-[#F370A7]' : 'border-transparent'}`}>
                    <Image src={item.imageData} alt={item.category} fill className="object-contain" unoptimized />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add item picker */}
      {addPicker && (
        <div className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/30 backdrop-blur-sm" onClick={() => setAddPicker(false)}>
          <div className="w-full max-w-[430px] rounded-t-3xl bg-white max-h-[60vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-center pt-3 pb-2"><div className="w-9 h-1 rounded-full bg-gray-200" /></div>
            <div className="px-5 pb-2">
              <h3 className="text-[14px] font-bold text-gray-900">{t.addToCloset}</h3>
            </div>
            <div className="flex-1 overflow-y-auto px-5 pb-8">
              <div className="grid grid-cols-3 gap-2.5">
                {getAllItems().map((item) => (
                  <button key={item.id} onClick={() => addItem(item)} className="relative aspect-[3/4] rounded-xl overflow-hidden border border-gray-100">
                    <Image src={item.imageData} alt={item.category} fill className="object-contain" unoptimized />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Clothing Section ───────────────────────────────────────────────────────────
interface ClothingSectionProps {
  title: string;
  cats: ClosetCategory[];
  filter: ClosetCategory | null;
  items: ClosetItem[];
  totalCount: number;
  maxCount: number;
  onFilterChange: (cat: ClosetCategory | null) => void;
  onTapItem: (item: ClosetItem) => void;
  onViewAll: () => void;
}

function ClothingSection({ title, cats, filter, items, totalCount, maxCount, onFilterChange, onTapItem, onViewAll }: ClothingSectionProps) {
  const { t } = useI18n();
  return (
    <div className="mt-9">
      {/* Section header */}
      <div className="flex items-center justify-between px-4 mb-3">
        <div className="flex items-center gap-2">
          <h2 className="text-[17px] font-bold text-gray-900 tracking-tight">{title}</h2>
          <span className="px-1.5 py-0.5 rounded-full bg-gray-100 text-[11px] font-semibold text-gray-500">
            {totalCount}/{maxCount}
          </span>
        </div>
        <button onClick={onViewAll} className="text-[12px] text-gray-400 font-medium">
          {t.viewAll}
        </button>
      </div>

      {/* Filter chips */}
      {cats.length > 1 && (
        <div className="flex gap-2 overflow-x-auto hide-scrollbar px-4 mb-3.5">
          <FilterChip label={t.all} selected={filter === null} onClick={() => onFilterChange(null)} />
          {cats.map((cat) => (
            <FilterChip
              key={cat}
              label={catLabel(cat, t.cats)}
              selected={filter === cat}
              onClick={() => onFilterChange(cat)}
            />
          ))}
        </div>
      )}

      {/* Horizontal scroll row */}
      <div className="flex gap-2.5 overflow-x-auto hide-scrollbar px-4">
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
  const { t } = useI18n();
  return (
    <div
      className="shrink-0 w-[120px] h-[168px] rounded-2xl overflow-hidden relative cursor-pointer
                 active:scale-[0.97] transition-transform"
      onClick={onTap}
    >
      <div className="relative w-full h-full">
        <Image src={item.imageData} alt={item.category} fill className="object-contain" unoptimized />
      </div>
      {/* Category label */}
      <div className="absolute bottom-0 left-0 right-0 px-2.5 py-2"
           style={{ background: 'linear-gradient(transparent, rgba(0,0,0,0.4))' }}>
        <span className="text-[10px] font-medium text-white/90 uppercase tracking-wide">
          {catLabel(item.category, t.cats)}
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
  const { t } = useI18n();
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
              <p className="text-[13px] text-gray-400 font-medium">{t.noItemsYet}</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2.5">
              {items.map((item) => (
                <div key={item.id} className="relative aspect-[3/4] rounded-xl overflow-hidden">
                  <Image src={item.imageData} alt={item.category} fill className="object-contain" unoptimized />
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
                      {catLabel(item.category, t.cats)}
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
  calendarDays,
  onClose,
  onShowPlans,
}: {
  title: string;
  days: Date[];
  allItems: ClosetItem[];
  calendarDays: number;
  onClose: () => void;
  onShowPlans: () => void;
}) {
  const { t } = useI18n();
  const [selectedDayIdx, setSelectedDayIdx] = useState<number | null>(null);
  const upperItems = allItems.filter((i) => UPPER_CATS.includes(i.category));
  const lowerItems = allItems.filter((i) => LOWER_CATS.includes(i.category));
  const shoeItems = allItems.filter((i) => SHOES_CATS.includes(i.category));
  const accItems = allItems.filter((i) => ACC_CATS.includes(i.category));
  const hasItems = allItems.length > 0;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/30 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[430px] rounded-t-3xl bg-white flex flex-col relative"
        style={{ maxHeight: '90vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-9 h-1 rounded-full bg-gray-200" />
        </div>
        {/* Header — no X button */}
        <div className="flex items-center justify-center px-5 py-3">
          <h3 className="text-[17px] font-bold text-gray-900">{title}</h3>
        </div>

        {/* Horizontal scroll of day cards */}
        <div className="overflow-x-auto hide-scrollbar pb-8" style={{ paddingTop: 4 }}>
          {!hasItems ? (
            <div className="flex flex-col items-center justify-center h-40 gap-2 px-4">
              <p className="text-[13px] text-gray-400 font-medium">{t.addItemsFirst}</p>
            </div>
          ) : (
            <div className="flex gap-3 px-4" style={{ width: 'max-content' }}>
              {days.map((day, i) => {
                const isUnlocked = i < calendarDays;
                const isToday = i === 0 && new Date().toDateString() === day.toDateString();
                const upper = pickItem(upperItems, day);
                const lower = pickItem(lowerItems, day);
                const shoe = pickItem(shoeItems, day);
                const acc = pickItem(accItems, day);
                const dayLabel = isToday
                  ? t.today
                  : `${DAY_NAMES[day.getDay()]}, ${day.getDate()} ${MONTH_NAMES[day.getMonth()]}`;

                return (
                  <div
                    key={i}
                    className={`flex flex-col gap-2 ${isUnlocked ? 'cursor-pointer active:scale-[0.97] transition-transform' : ''}`}
                    style={{ width: 120 }}
                    onClick={() => { if (isUnlocked) setSelectedDayIdx(i); }}
                  >
                    {/* Date chip */}
                    <div
                      className="text-center py-1.5 px-2 rounded-full"
                      style={{
                        background: isToday
                          ? 'linear-gradient(135deg, #F370A7, #e0559a)'
                          : isUnlocked ? '#f3f4f6' : '#f9fafb',
                      }}
                    >
                      <span
                        className="text-[10px] font-semibold leading-none"
                        style={{ color: isToday ? '#fff' : isUnlocked ? '#374151' : '#9ca3af' }}
                      >
                        {dayLabel}
                      </span>
                    </div>

                    {/* Outfit card */}
                    <div
                      className="relative rounded-2xl overflow-hidden border border-gray-100 bg-white flex flex-col"
                      style={{ height: 220, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
                    >
                      {/* Outfit items stacked */}
                      <MiniOutfitSlot item={upper} flex />
                      <MiniOutfitSlot item={lower} flex />
                      <MiniOutfitSlot item={shoe} flex />
                      {acc && <MiniOutfitSlot item={acc} />}

                      {/* Blur overlay for locked days */}
                      {!isUnlocked && (
                        <div
                          className="absolute inset-0 flex items-center justify-center cursor-pointer active:scale-[0.97] transition-transform"
                          style={{
                            backdropFilter: 'blur(8px)',
                            WebkitBackdropFilter: 'blur(8px)',
                            background: 'rgba(255,255,255,0.25)',
                          }}
                          onClick={(e) => { e.stopPropagation(); onShowPlans(); }}
                        >
                          <div
                            className="w-10 h-10 rounded-full flex items-center justify-center shadow-lg"
                            style={{ background: 'linear-gradient(135deg, #B8860B 0%, #8B6914 100%)' }}
                          >
                            <Crown size={18} strokeWidth={1.5} color="#FFD700" />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Expanded outfit lightbox — full-screen fixed overlay */}
        {selectedDayIdx !== null && (() => {
          const selDay = days[selectedDayIdx];
          const selUpper = pickItem(upperItems, selDay);
          const selLower = pickItem(lowerItems, selDay);
          const selShoe = pickItem(shoeItems, selDay);
          const selAcc = pickItem(accItems, selDay);
          const selIsToday = selectedDayIdx === 0 && new Date().toDateString() === selDay.toDateString();
          const selLabel = selIsToday
            ? t.today
            : `${DAY_NAMES[selDay.getDay()]}, ${selDay.getDate()} ${MONTH_NAMES[selDay.getMonth()]}`;
          return (
            <div
              className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center"
              onClick={() => setSelectedDayIdx(null)}
            >
              <div
                className="bg-white rounded-3xl flex flex-col items-center shadow-2xl overflow-hidden"
                style={{ width: 'min(88vw, 340px)', maxHeight: '88vh' }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="w-full flex items-center justify-between px-5 pt-4 pb-2">
                  <div
                    className="py-1.5 px-4 rounded-full"
                    style={{ background: selIsToday ? 'linear-gradient(135deg, #F370A7, #e0559a)' : '#f3f4f6' }}
                  >
                    <span className="text-[13px] font-semibold" style={{ color: selIsToday ? '#fff' : '#374151' }}>
                      {selLabel}
                    </span>
                  </div>
                  <button
                    onClick={() => setSelectedDayIdx(null)}
                    className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center"
                  >
                    <X size={15} className="text-gray-500" />
                  </button>
                </div>
                {/* Outfit */}
                <div
                  className="relative w-full flex flex-col"
                  style={{ height: 'min(72vh, 480px)' }}
                >
                  <MiniOutfitSlot item={selUpper} flex />
                  <MiniOutfitSlot item={selLower} flex />
                  <MiniOutfitSlot item={selShoe} flex />
                  {selAcc && <MiniOutfitSlot item={selAcc} />}
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}

function MiniOutfitSlot({ item, flex }: { item: ClosetItem | null; flex?: boolean }) {
  if (!item) return flex ? <div className="flex-1 bg-gray-50" /> : null;
  return (
    <div className={`relative w-full overflow-hidden bg-gray-50 ${flex ? 'flex-1' : 'h-10 shrink-0'}`}>
      <Image src={item.imageData} alt={item.category} fill className="object-contain" unoptimized />
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
  const { t } = useI18n();

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
          <div className="w-[60px] h-[60px] rounded-xl overflow-hidden relative shrink-0">
            <Image src={item.imageData} alt={item.category} fill className="object-contain" unoptimized />
          </div>
          <span className="text-[15px] font-semibold text-gray-900">{catLabel(selectedCat, t.cats)}</span>
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
                {catLabel(cat, t.cats)}
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
            {t.delete}
          </button>
          <button
            onClick={() => onSave(item.id, selectedCat)}
            className="flex-1 h-12 rounded-full bg-black text-white flex items-center justify-center text-[14px] font-semibold"
          >
            {t.save}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Premium Gate Sheet ─────────────────────────────────────────────────────────
function PremiumGateSheet({
  reason,
  currentPlan,
  onClose,
}: {
  reason: 'generation' | 'items';
  currentPlan: UserPlan;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const [yearly, setYearly] = useState(false);

  const plans: {
    key: UserPlan;
    label: string;
    monthlyPrice: number;
    yearlyPrice: number;
    yearlyOriginal: number;
    color: string;
    gradient: string;
  }[] = [
    {
      key: 'free',
      label: 'Free',
      monthlyPrice: 0,
      yearlyPrice: 0,
      yearlyOriginal: 0,
      color: '#6b7280',
      gradient: '#f3f4f6',
    },
    {
      key: 'pro',
      label: 'Pro',
      monthlyPrice: 19_000,
      yearlyPrice: 182_400,
      yearlyOriginal: 228_000,
      color: '#F370A7',
      gradient: 'linear-gradient(135deg, #F370A7 0%, #e0559a 100%)',
    },
    {
      key: 'premium',
      label: 'Premium',
      monthlyPrice: 39_000,
      yearlyPrice: 374_400,
      yearlyOriginal: 468_000,
      color: '#B8860B',
      gradient: 'linear-gradient(135deg, #B8860B 0%, #8B6914 100%)',
    },
  ];

  function handleUpgrade(planKey: UserPlan) {
    const period = yearly ? 'yearly' : 'monthly';
    const msg = encodeURIComponent(`Hi! I want to upgrade to ${planKey} plan (${period}). My username: `);
    window.open(`https://t.me/erkinov19?text=${msg}`, '_blank');
  }

  function formatPrice(price: number) {
    return price.toLocaleString('uz-UZ');
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[430px] rounded-t-3xl bg-white overflow-y-auto"
        style={{ maxHeight: '92vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-9 h-1 rounded-full bg-gray-200" />
        </div>

        <div className="px-4 pb-8">
          {/* Header */}
          <div className="flex justify-center mb-3 mt-1">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #B8860B 0%, #8B6914 100%)', boxShadow: '0 4px 16px rgba(184,134,11,0.3)' }}
            >
              <Crown size={26} color="#FFD700" strokeWidth={1.5} />
            </div>
          </div>

          <h2 className="text-[18px] font-bold text-gray-900 text-center mb-1">{t.choosePlan}</h2>
          <p className="text-[11px] text-gray-500 text-center mb-4 leading-relaxed">
            {reason === 'generation'
              ? t.reachedRegenLimit.replace('{n}', String(PLAN_LIMITS[currentPlan].regenerations))
              : t.reachedItemLimit.replace('{n}', String(PLAN_LIMITS[currentPlan].itemsPerCategory))}
          </p>

          {/* Monthly / Yearly toggle */}
          <div className="flex items-center justify-center gap-2 mb-4">
            <button
              onClick={() => setYearly(false)}
              className={`px-3.5 py-1.5 rounded-full text-[11px] font-semibold transition-colors ${
                !yearly ? 'bg-black text-white' : 'bg-gray-100 text-gray-500'
              }`}
            >
              {t.monthly}
            </button>
            <button
              onClick={() => setYearly(true)}
              className={`px-3.5 py-1.5 rounded-full text-[11px] font-semibold transition-colors relative ${
                yearly ? 'bg-black text-white' : 'bg-gray-100 text-gray-500'
              }`}
            >
              {t.yearly}
              <span
                className="absolute -top-2 -right-2 px-1.5 py-0.5 rounded-full text-[8px] font-bold text-white"
                style={{ background: '#ef4444' }}
              >
                -20%
              </span>
            </button>
          </div>

          {/* Plan cards in a ROW */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            {plans.map((p) => {
              const isCurrent = currentPlan === p.key;
              const price = yearly ? p.yearlyPrice : p.monthlyPrice;
              const originalYearly = p.yearlyOriginal;
              const isFree = p.key === 'free';

              return (
                <div
                  key={p.key}
                  className="rounded-2xl border-2 p-3 flex flex-col relative"
                  style={{ borderColor: isCurrent ? p.color : '#e5e7eb' }}
                >
                  {isCurrent && (
                    <span
                      className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[8px] font-bold text-white whitespace-nowrap"
                      style={{ background: p.color }}
                    >
                      {t.currentPlan}
                    </span>
                  )}

                  {/* Plan icon + name */}
                  <div className="flex flex-col items-center gap-1 mb-2 mt-1">
                    <Crown size={16} strokeWidth={2} color={p.color} />
                    <span className="text-[13px] font-bold" style={{ color: p.color }}>{p.label}</span>
                  </div>

                  {/* Price */}
                  <div className="text-center mb-2">
                    {isFree ? (
                      <div className="flex flex-col items-center">
                        <span className="text-[16px] font-bold text-gray-900">0</span>
                        <span className="text-[9px] text-gray-500">{t.sumPerMo}</span>
                      </div>
                    ) : yearly ? (
                      <div className="flex flex-col items-center">
                        <span className="text-[10px] text-gray-400 line-through">{formatPrice(originalYearly)}</span>
                        <span className="text-[15px] font-bold text-gray-900">{formatPrice(price)}</span>
                        <span className="text-[9px] text-gray-500">{t.sumPerYear}</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <span className="text-[15px] font-bold text-gray-900">{formatPrice(price)}</span>
                        <span className="text-[9px] text-gray-500">{t.sumPerMo}</span>
                      </div>
                    )}
                  </div>

                  {/* Features */}
                  <div className="flex flex-col gap-1 mb-3 flex-1">
                    <span className="text-[9px] text-gray-600">{PLAN_LIMITS[p.key].itemsPerCategory} {t.itemsPerCat}</span>
                    <span className="text-[9px] text-gray-600">{PLAN_LIMITS[p.key].outfitCanvases} {t.outfitCanvases}</span>
                    <span className="text-[9px] text-gray-600">{PLAN_LIMITS[p.key].regenerations} {t.regens}</span>
                    <span className="text-[9px] text-gray-600">{PLAN_LIMITS[p.key].tryItOns} {t.tryOns}</span>
                    <span className="text-[9px] text-gray-600">{PLAN_LIMITS[p.key].calendarDays} {t.calDays}</span>
                  </div>

                  {/* CTA */}
                  {!isCurrent && !isFree && (
                    <button
                      onClick={() => handleUpgrade(p.key)}
                      className="w-full py-2 rounded-lg text-white font-bold text-[10px] active:scale-[0.97] transition-transform"
                      style={{ background: p.gradient }}
                    >
                      {t.upgrade}
                    </button>
                  )}
                  {isFree && !isCurrent && (
                    <div className="w-full py-2 rounded-lg text-center text-gray-400 font-medium text-[10px] bg-gray-50">
                      {t.currentPlan}
                    </div>
                  )}
                </div>
              );
            })}
          </div>


        </div>
      </div>
    </div>
  );
}
