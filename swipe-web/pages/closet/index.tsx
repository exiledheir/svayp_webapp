import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { Plus, X, Sparkles, Sun, Moon, CalendarDays, TreePine, Camera, Loader2, Crown, Lock, RefreshCw, User, Images, Trash2, ArrowUpRight, BookOpen } from 'lucide-react';
import { getUser, clearTokens } from '@/lib/auth';
import { useFeatureFlags } from '@/lib/feature-flags-context';
import { useRootBackGuard } from '@/lib/use-root-back-guard';
import ReactCrop, { type Crop, type PixelCrop } from 'react-image-crop';
import { fetchClosetItems, addClosetItemFromFile, removeClosetItem, updateClosetItemApi, getClosetItems, addClosetItem, deleteClosetItem, updateClosetItem } from '@/lib/closet-storage';
import type { ClosetItem, ClosetCategory } from '@/lib/closet-storage';
import type { WardrobeUploadStatus, PlanTier, PlanLimits, PlanUsage, TryOnJobResponse, WardrobeSection, WardrobeSubcategory } from '@/types';
import ItemOptionsPicker, { defaultSelectionForSection, isSelectionComplete, type ItemOptionsSelection } from '@/components/closet/ItemOptionsPicker';
import { subcategoryToLocal, sectionForSubcategory, subcategoriesForSection, SECTION_ORDER, localToSubcategory, taxLabel } from '@/lib/wardrobe-taxonomy';
import { getUserPlan, generateOutfitSuggestions, fetchAiCanvasSuggest, createTryOnJob, watchTryOnUntilDone, getOutfitCalendar, createOutfitCanvas, updateOutfitCanvas, deleteOutfitCanvas, getOutfitCanvases, getOutfitCanvas, listUploads, watchUploadUntilDone, getTryOnJob, getTryOnJobHistory, getUserProfile } from '@/lib/wardrobe-api';
import type { SseHandle } from '@/types';
import { useI18n } from '@/lib/i18n';
import type { Locale } from '@/lib/translations';
import { isOnboardingComplete, isCanvasHintSeen, setCanvasHintSeen } from '@/lib/onboarding-storage';
import { saveTryOnResult, saveActiveTryOnJob, getActiveTryOnJobWithCloud, clearActiveTryOnJob } from '@/lib/tryon-history';
import { logAnalyticsEvent } from '@/lib/analytics';
import { Events, Params } from '@/lib/analytics-events';
import { useTheme } from '@/lib/theme';
import { isInFlutterWebView } from '@/lib/flutter-bridge';
import { saveUploadPreview, getUploadPreview, clearUploadPreview } from '@/lib/upload-previews';
import { compressImageForUpload } from '@/lib/image-utils';
import {
  UPPER_CATS, FULL_BODY_CATS, LOWER_CATS, SHOES_CATS, ACC_CATS,
  type SavedCanvasEntry, type SavedCanvasLayout,
  generateRandomOutfit, buildLayoutFromIds,
} from '@/lib/closet-types';
import { captureCanvasSnapshot, downloadWithWatermark } from '@/lib/canvas-snapshot';
import InteractiveCanvas from '@/components/closet/InteractiveCanvas';
import { TryOnConfirmModal, TryOnModal } from '@/components/closet/TryOnFlow';
import WizardHeader from '@/components/market/WizardHeader';
import StepScaffold from '@/components/market/steps/StepScaffold';
import PhotoSourceSheet from '@/components/PhotoSourceSheet';
import PhotoTipsSheet from '@/components/PhotoTipsSheet';
import ClosetGuide from '@/components/closet/ClosetGuide';
import { getGuideStrings } from '@/lib/closet-guide';

// The precise taxonomy subcategory of an item — its stored subcategory when set
// (new items), otherwise derived from the legacy local category.
function effectiveSubcategory(item: ClosetItem): WardrobeSubcategory {
  return item.subcategory ?? localToSubcategory(item.category);
}

// Which of the six closet sections an item belongs to.
function itemSection(item: ClosetItem): WardrobeSection {
  return sectionForSubcategory(effectiveSubcategory(item)) ?? localCatToSection(item.category);
}

// Map a legacy local category to the new section so the add picker can land on
// the right section when opened from a section's "+" button.
function localCatToSection(cat: ClosetCategory): WardrobeSection {
  if (cat === 'dresses' || cat === 'jumpsuits') return 'DRESSES_SETS';
  if (cat === 'jackets') return 'OUTERWEAR';
  if (UPPER_CATS.includes(cat)) return 'TOPS';
  if (LOWER_CATS.includes(cat)) return 'BOTTOMS';
  if (SHOES_CATS.includes(cat)) return 'FOOTWEAR';
  return 'ACCESSORIES';
}

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

// ── Demo items shown to new users with empty wardrobes ───────────────────────
// IDs are the real backend UUIDs so that try-on and other API features work.
const DEMO_ITEM_IDS = new Set([
  '0d1b6b18-bd57-4a3e-a4c4-5aac9ca5fa5e',
  'd101c8a6-35fa-4cba-9a7c-e7288947f3b2',
  'da66eb48-1cd7-4087-8a1f-16a011bcae3e',
  'fb18130c-1192-4d32-aa84-0d5a837a3bcd',
]);

const DEMO_ITEMS: ClosetItem[] = [
  { id: '0d1b6b18-bd57-4a3e-a4c4-5aac9ca5fa5e', category: 'tops',   imageData: 'https://svaypimages2.blob.core.windows.net/product-images/wardrobe%2F07bbfdf7-504d-44f4-9880-6003831845cf%2F4f7dbf50-c725-418c-b9ca-4a7f14eef80a.thumb.png',  createdAt: '2024-01-01T00:00:00Z' },
  { id: 'd101c8a6-35fa-4cba-9a7c-e7288947f3b2', category: 'skirts', imageData: 'https://svaypimages2.blob.core.windows.net/product-images/wardrobe%2F07bbfdf7-504d-44f4-9880-6003831845cf%2Fd44bec44-ad12-41ad-a08c-ce90b863d0f3.thumb.png', createdAt: '2024-01-01T00:00:00Z' },
  { id: 'da66eb48-1cd7-4087-8a1f-16a011bcae3e', category: 'shoes',  imageData: 'https://svaypimages2.blob.core.windows.net/product-images/wardrobe%2F07bbfdf7-504d-44f4-9880-6003831845cf%2F8d912326-ee36-41bf-988f-0cde9bbedce3.thumb.png',  createdAt: '2024-01-01T00:00:00Z' },
  { id: 'fb18130c-1192-4d32-aa84-0d5a837a3bcd', category: 'bags',   imageData: 'https://svaypimages2.blob.core.windows.net/product-images/wardrobe%2F07bbfdf7-504d-44f4-9880-6003831845cf%2F32150c11-a5f4-4b32-98b1-49c8ed2a952a.thumb.png',  createdAt: '2024-01-01T00:00:00Z' },
];

const DEMO_CANVAS_LAYOUT: SavedCanvasLayout = [
  { id: '0d1b6b18-bd57-4a3e-a4c4-5aac9ca5fa5e', x: 32, y: 17, scale: 1,    zIndex: 1, group: 'upper' },
  { id: 'd101c8a6-35fa-4cba-9a7c-e7288947f3b2', x: 32, y: 39, scale: 1,    zIndex: 2, group: 'lower' },
  { id: 'da66eb48-1cd7-4087-8a1f-16a011bcae3e', x: 32, y: 58, scale: 0.72, zIndex: 3, group: 'shoes' },
  { id: 'fb18130c-1192-4d32-aa84-0d5a837a3bcd', x: 63, y: 17, scale: 0.6,  zIndex: 4, group: 'acc'   },
];


// ─── Plan system ────────────────────────────────────────────────────────────────
type UserPlan = PlanTier;

const PLAN_LIMITS_FALLBACK: Record<UserPlan, PlanLimits> = {
  free:    { wardrobeItems: 5,   outfitCanvases: 1, tryItOns: 2,  regenerations: 5,  calendarDays: 2 },
  pro:     { wardrobeItems: 40,  outfitCanvases: 3, tryItOns: 10, regenerations: 20, calendarDays: 7 },
  premium: { wardrobeItems: 100, outfitCanvases: 7, tryItOns: 30, regenerations: 50, calendarDays: 7 },
};

const PLAN_COLORS: Record<UserPlan, { bg: string; text: string; crownColor: string }> = {
  free:    { bg: '#F5F5F5', text: '#888', crownColor: '#aaa' },
  pro:     { bg: 'linear-gradient(135deg, #F370A7 0%, #e0559a 100%)', text: '#fff', crownColor: '#fbb6d0' },
  premium: { bg: 'linear-gradient(135deg, #B8860B 0%, #8B6914 100%)', text: '#fff', crownColor: '#FFD700' },
};

// Warm the browser image cache so gallery/wardrobe images aren't re-fetched
// every time a tab is reopened. Deduped via a module-level set that persists
// for the page's lifetime.
const warmedImageUrls = new Set<string>();
function warmImageCache(urls: (string | null | undefined)[]) {
  if (typeof window === 'undefined') return;
  for (const url of urls) {
    if (!url || warmedImageUrls.has(url)) continue;
    warmedImageUrls.add(url);
    const img = new window.Image();
    img.src = url;
  }
}

function usePlan() {
  const [plan, setPlan] = useState<UserPlan>('free');
  const [limits, setLimits] = useState<PlanLimits>(PLAN_LIMITS_FALLBACK.free);
  const [usage, setUsage] = useState<PlanUsage>({ wardrobeItemsUsed: 0, regenerationsUsed: 0, tryItOnsUsed: 0, itemCountByCategory: {} });

  const fetchPlan = useCallback(async () => {
    try {
      const data = await getUserPlan();
      // mapPlanResponse in wardrobe-api guarantees all fields are present,
      // but guard here too in case of unexpected nulls.
      setPlan(data.plan ?? 'free');
      setLimits({ ...PLAN_LIMITS_FALLBACK.free, ...data.limits });
      setUsage({ ...{ wardrobeItemsUsed: 0, regenerationsUsed: 0, tryItOnsUsed: 0, itemCountByCategory: {} }, ...data.usage });
    } catch {
      setPlan('free');
      setLimits(PLAN_LIMITS_FALLBACK.free);
    }
  }, []);

  useEffect(() => { fetchPlan(); }, [fetchPlan]);

  // Re-fetch plan whenever the user returns to this tab so that backend-side
  // resets (e.g. subscription or usage reset by admin) are reflected immediately.
  useEffect(() => {
    function handleVisibility() {
      if (!document.hidden) fetchPlan();
    }
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [fetchPlan]);

  // Prefer the backend's authoritative READY count; fall back to summing per-category usage.
  const totalItems = usage.wardrobeItemsUsed
    ?? Object.values(usage.itemCountByCategory ?? {}).reduce((s, n) => s + n, 0);

  return {
    plan,
    limits,
    usage,
    fetchPlan,
    canGenerate: usage.regenerationsUsed < limits.regenerations,
    canTryOn: usage.tryItOnsUsed < limits.tryItOns,
    canAddItem: totalItems < limits.wardrobeItems,
    calendarDays: limits.calendarDays,
    totalItems,
  };
}

// ─── Main Page ──────────────────────────────────────────────────────────────────
export default function ClosetPage() {
  const router = useRouter();
  const { t, locale, setLocale } = useI18n();
  const { theme, setTheme } = useTheme();
  const { plansEnabled, profileEnabled } = useFeatureFlags();

  // Root tab page — trap Back so it doesn't exit to a blank WebView screen.
  useRootBackGuard();
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [showItemTips, setShowItemTips] = useState(false);
  const [userInfo, setUserInfo] = useState<{ name?: string; phoneNumber?: string } | null>(null);
  // The native Flutter app has its own profile entry point, so hide the header
  // profile button when the closet is rendered inside the Flutter WebView. Keep
  // it in a plain browser and inside the Telegram Mini App. Resolved after mount
  // to avoid a hydration mismatch (server always renders the browser variant).
  const [isFlutterWebView, setIsFlutterWebView] = useState(false);
  useEffect(() => { setIsFlutterWebView(isInFlutterWebView()); }, []);

  // Redirect to onboarding on first-ever visit (before any other effects run)
  useEffect(() => {
    if (!isOnboardingComplete()) {
      router.replace('/onboarding');
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    // Immediately show whatever is in localStorage (prevents flicker)
    const u = getUser();
    if (u) {
      const name = (
        u.name ?? u.firstName ?? u.first_name ??
        u.username ?? u.fullName ?? u.full_name ?? u.displayName ?? u.display_name
      ) as string | undefined;
      const phoneNumber = (u.phoneNumber ?? u.phone_number ?? u.phone) as string | undefined;
      setUserInfo({ name: name || undefined, phoneNumber: phoneNumber || undefined });
    }
    // Then fetch fresh profile from the API
    getUserProfile()
      .then((profile) => {
        if (profile.name || profile.phoneNumber) {
          setUserInfo((prev) => ({
            name: profile.name ?? prev?.name,
            phoneNumber: profile.phoneNumber ?? prev?.phoneNumber,
          }));
        }
      })
      .catch(() => { /* silently ignore — we already have the localStorage fallback */ });
  }, []);
  const [items, setItems] = useState<ClosetItem[]>([]);
  // Selected "Type" chip per section (null = All).
  const [sectionFilter, setSectionFilter] = useState<Partial<Record<WardrobeSection, WardrobeSubcategory | null>>>({});
  const [viewAll, setViewAll] = useState<{ title: string; items: ClosetItem[] } | null>(null);
  const [canvasData, setCanvasData] = useState<{ upper: ClosetItem[]; lower: ClosetItem[]; shoes: ClosetItem[]; acc: ClosetItem[] } | null>(null);
  // Multi-canvas state: each board has a backend id + layout
  const [canvases, setCanvases] = useState<{ id: string | null; layout: SavedCanvasLayout }[]>([]);
  const [editingCanvasIdx, setEditingCanvasIdx] = useState<number | null>(null);
  const [canvasInitialLayout, setCanvasInitialLayout] = useState<SavedCanvasLayout | null>(null);
  // ── Closet top-section tabs: Boards / Outfits / Dress Me ─────────────────
  const [closetTab, setClosetTab] = useState<'boards' | 'outfits' | 'dressme' | 'calendar'>('boards');
  // Try-on history (Outfits tab) — loaded lazily on first visit, paginated.
  const [tryOnJobs, setTryOnJobs] = useState<TryOnJobResponse[]>([]);
  const [tryOnLoading, setTryOnLoading] = useState(false);
  const [tryOnError, setTryOnError] = useState(false);
  const [tryOnLoaded, setTryOnLoaded] = useState(false);
  const [tryOnHasMore, setTryOnHasMore] = useState(false);
  const tryOnPageRef = useRef(0);

  const loadTryOns = useCallback(async (page: number) => {
    setTryOnLoading(true);
    setTryOnError(false);
    try {
      const res = await getTryOnJobHistory({ page, size: 20, status: 'COMPLETED' });
      const fresh = res.content.filter((j) => j.resultImageUrl);
      setTryOnJobs((prev) => (page === 0 ? fresh : [...prev, ...fresh]));
      setTryOnHasMore(res.number + 1 < res.totalPages);
      tryOnPageRef.current = res.number;
      setTryOnLoaded(true);
    } catch {
      setTryOnError(true);
    } finally {
      setTryOnLoading(false);
    }
  }, []);

  // Lazy-load try-on history the first time the Outfits tab is opened.
  useEffect(() => {
    if (closetTab === 'outfits' && !tryOnLoaded && !tryOnLoading) {
      loadTryOns(0);
    }
  }, [closetTab, tryOnLoaded, tryOnLoading, loadTryOns]);
  // Warm the image cache for try-on results (Outfits tab) so re-opening the tab
  // doesn't refetch them.
  useEffect(() => {
    warmImageCache(tryOnJobs.map((j) => j.resultImageUrl));
  }, [tryOnJobs]);
  // Warm the image cache for wardrobe items (Dress Me + sections) so switching
  // tabs doesn't refetch each garment image.
  useEffect(() => {
    warmImageCache(items.map((i) => i.imageData));
  }, [items]);
  const [showPremiumGate, setShowPremiumGate] = useState<'generation' | 'items' | 'tryOn' | 'canvas' | null>(null);
  const { plan, limits, usage, fetchPlan, canGenerate, canTryOn, calendarDays } = usePlan();

  // ── 24h promo countdown timer ─────────────────────────────────────────────────
  const PROMO_DURATION_MS = 24 * 60 * 60 * 1000;
  const [promoSecondsLeft, setPromoSecondsLeft] = useState<number>(PROMO_DURATION_MS / 1000);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const userKey = userInfo?.phoneNumber ?? 'guest';
    const PROMO_TIMER_KEY = `promoTimerStart_${userKey}`;
    let stored = localStorage.getItem(PROMO_TIMER_KEY);
    if (!stored) {
      stored = String(Date.now());
      localStorage.setItem(PROMO_TIMER_KEY, stored);
    }
    const startMs = parseInt(stored, 10);
    const calc = () => {
      const remaining = Math.max(0, PROMO_DURATION_MS - (Date.now() - startMs));
      setPromoSecondsLeft(Math.floor(remaining / 1000));
    };
    calc();
    const interval = setInterval(calc, 1000);
    return () => clearInterval(interval);
  }, [userInfo?.phoneNumber]); // eslint-disable-line react-hooks/exhaustive-deps

  const promoHH = String(Math.floor(promoSecondsLeft / 3600)).padStart(2, '0');
  const promoMM = String(Math.floor((promoSecondsLeft % 3600) / 60)).padStart(2, '0');
  const promoSS = String(promoSecondsLeft % 60).padStart(2, '0');
  const promoTimeStr = `${promoHH}:${promoMM}:${promoSS}`;

  // Single overall wardrobe item limit (across all categories), not per category.
  // Demo items don't count toward the limit.
  // Pending (in-flight) uploads are included so rapid back-to-back submissions
  // can't bypass the cap before any upload completes.
  function canAddItem(): boolean {
    const completedCount = items.filter((i) => !DEMO_ITEM_IDS.has(i.id)).length;
    const pendingCount = pendingUploads.size;
    return completedCount + pendingCount < limits.wardrobeItems;
  }

  // ── Analytics: upgrade modal shown ──────────────────────────────────────
  const prevPremiumGate = useRef<string | null>(null);
  useEffect(() => {
    if (showPremiumGate && showPremiumGate !== prevPremiumGate.current) {
      logAnalyticsEvent(Events.UPGRADE_MODAL_SHOWN, {
        [Params.TRIGGER]: showPremiumGate,
        [Params.CURRENT_PLAN]: plan,
      });
    }
    prevPremiumGate.current = showPremiumGate;
  }, [showPremiumGate, plan]);

  // canvasesLoaded: true once the canvas fetch has settled (success or failure).
  // Used to prevent auto-generating an outfit on every page load/reload.
  const [canvasesLoaded, setCanvasesLoaded] = useState(false);

  // Load all canvases from backend
  useEffect(() => {
    getOutfitCanvases({ page: 0, size: 20, sort: 'updatedAt,desc' })
      .then((page) => {
        if (page.content.length > 0) {
          // Backend should already return sorted by updatedAt desc,
          // but sort client-side as a safety net.
          const sorted = [...page.content].sort(
            (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
          );
          const loaded = sorted.map((canvas) => ({
            id: canvas.id as string | null,
            layout: canvas.items.map((item) => ({
              id: item.wardrobeItemId,
              x: item.x,
              y: item.y,
              scale: item.scale,
              zIndex: item.zIndex,
              group: (item.itemGroup || 'upper') as SavedCanvasEntry['group'],
            })),
          }));
          setCanvases(loaded);
        } else {
          // Fallback to localStorage for the first canvas
          try {
            const s = localStorage.getItem('svayp_saved_layout');
            if (s) setCanvases([{ id: null, layout: JSON.parse(s) }]);
          } catch { /* ignore */ }
        }
        setCanvasesLoaded(true);
      })
      .catch(() => {
        try {
          const s = localStorage.getItem('svayp_saved_layout');
          if (s) setCanvases([{ id: null, layout: JSON.parse(s) }]);
        } catch { /* ignore */ }
        setCanvasesLoaded(true);
      });
  }, []);

  const canAddCanvas = canvases.length < limits.outfitCanvases;

  // Demo mode: true when ALL items in the wardrobe are the placeholder demo items
  const hasDemoItems = items.length > 0 && items.every((i) => DEMO_ITEM_IDS.has(i.id));
  // In demo mode always show the pre-built canvas — ignore any stale localStorage canvases
  const displayCanvases: typeof canvases = hasDemoItems
    ? [{ id: null, layout: DEMO_CANVAS_LAYOUT }]
    : canvases;

  const [editItem, setEditItem] = useState<ClosetItem | null>(null);
  const [tryOnState, setTryOnState] = useState<{ status: 'loading' | 'processing' | 'completed' | 'failed'; resultUrl?: string; failureReason?: string; previewImages?: string[] } | null>(null);
  const [showTryOnConfirm, setShowTryOnConfirm] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const [outfitToastMsg, setOutfitToastMsg] = useState<string | null>(null);
  const [outfitBlockedModal, setOutfitBlockedModal] = useState<{ title: string; body: string } | null>(null);
  const tryOnCancelRef = useRef(false);
  const activeTryOnHandleRef = useRef<SseHandle | null>(null);
  const loadSeqRef = useRef(0);
  const dismissedUploadJobsRef = useRef<Set<string>>((() => {
    try { return new Set(JSON.parse(localStorage.getItem('libas_dismissed_uploads') ?? '[]')); } catch { return new Set<string>(); }
  })());

  // Track demo items the user has explicitly deleted so they don't reappear on reload
  const DEMO_DISMISSED_KEY = 'svayp_dismissed_demo_ids';
  function getDismissedDemoIds(): Set<string> {
    try { return new Set(JSON.parse(localStorage.getItem(DEMO_DISMISSED_KEY) ?? '[]')); } catch { return new Set<string>(); }
  }
  function dismissDemoId(id: string) {
    const s = getDismissedDemoIds(); s.add(id);
    try { localStorage.setItem(DEMO_DISMISSED_KEY, JSON.stringify([...s])); } catch {}
  }

  // ── Inline add flow ──────────────────────────────────────────────────────────
  // The richer taxonomy selection (section → type → optional itemType/length/fit).
  const [addSelection, setAddSelection] = useState<ItemOptionsSelection>(() => defaultSelectionForSection('TOPS'));
  const [showAddPicker, setShowAddPicker] = useState(false);
  const [addRawImage, setAddRawImage] = useState('');
  const [addCrop, setAddCrop] = useState<Crop>();
  const [addCompletedCrop, setAddCompletedCrop] = useState<PixelCrop>();
  // Two-step add wizard (mirrors the market create flow): 'crop' → 'details'.
  const [addStep, setAddStep] = useState<'crop' | 'details'>('crop');
  // The cropped image is computed when leaving the crop step (the crop <img> is
  // unmounted on the details step, so we can't read its dimensions at save time).
  const [addCroppedPreview, setAddCroppedPreview] = useState<string | null>(null);
  const [addSaving, setAddSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingUploads, setPendingUploads] = useState<Map<string, { category: ClosetCategory; imageData: string; step: string; progress: number; startedAt: number }>>(new Map());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const cropImgRef = useRef<HTMLImageElement>(null);
  const addFileRef = useRef<File | null>(null);

  // ── Pull-to-refresh ─────────────────────────────────────────────────────────
  const mainScrollRef = useRef<HTMLElement>(null);
  const pullStartYRef = useRef<number | null>(null);
  const [pullDistance, setPullDistance] = useState(0);
  const [isPullRefreshing, setIsPullRefreshing] = useState(false);
  const PULL_THRESHOLD = 72;

  function handlePullTouchStart(e: React.TouchEvent<HTMLElement>) {
    if (mainScrollRef.current && mainScrollRef.current.scrollTop === 0) {
      pullStartYRef.current = e.touches[0].clientY;
    }
  }

  function handlePullTouchMove(e: React.TouchEvent<HTMLElement>) {
    if (pullStartYRef.current === null || isPullRefreshing) return;
    const dy = e.touches[0].clientY - pullStartYRef.current;
    if (dy > 0 && mainScrollRef.current && mainScrollRef.current.scrollTop === 0) {
      // Resist so it doesn't pull 1:1
      setPullDistance(Math.min(dy * 0.45, PULL_THRESHOLD + 20));
    } else {
      setPullDistance(0);
    }
  }

  async function handlePullTouchEnd() {
    if (pullDistance >= PULL_THRESHOLD && !isPullRefreshing) {
      setIsPullRefreshing(true);
      setPullDistance(0);
      await Promise.all([load(), fetchPlan()]);
      setIsPullRefreshing(false);
    } else {
      setPullDistance(0);
    }
    pullStartYRef.current = null;
  }

  // React's onTouchMove listener is passive, so it can't call preventDefault().
  // Inside the native WebView (iOS/Android) that means the OS overscroll/bounce
  // swallows the downward drag and the pull-to-refresh above never engages.
  // Attach a non-passive listener that claims the gesture while pulling at the
  // very top, so the JS pull-to-refresh works in-app, not just in the browser.
  useEffect(() => {
    const el = mainScrollRef.current;
    if (!el) return;
    const onMove = (e: TouchEvent) => {
      if (pullStartYRef.current === null || el.scrollTop > 0) return;
      const dy = e.touches[0].clientY - pullStartYRef.current;
      if (dy > 0) e.preventDefault();
    };
    el.addEventListener('touchmove', onMove, { passive: false });
    return () => el.removeEventListener('touchmove', onMove);
  }, []);

  function openAdd(section: WardrobeSection = 'TOPS') {
    if (plansEnabled && !canAddItem()) {
      setShowPremiumGate('items');
      return;
    }
    setAddSelection(defaultSelectionForSection(section));
    setAddRawImage('');
    setAddCrop(undefined);
    setAddCompletedCrop(undefined);
    setAddCroppedPreview(null);
    setAddStep('crop');
    setShowAddPicker(true);
  }

  // Continue from the crop step → details step. Apply the crop now (while the
  // crop <img> is still mounted) and stash the result for handleAddSave.
  async function goToDetailsStep() {
    if (addCompletedCrop && cropImgRef.current) {
      const cropped = await getCroppedImage(addRawImage, addCompletedCrop, cropImgRef.current.width, cropImgRef.current.height);
      setAddCroppedPreview(cropped);
    } else {
      setAddCroppedPreview(null);
    }
    setAddStep('details');
  }



  function handleAddFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    addFileRef.current = file;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setAddRawImage(ev.target?.result as string);
      // Pre-select full image so corner handles are visible immediately (crop is optional)
      setAddCrop({ unit: '%', x: 0, y: 0, width: 100, height: 100 });
      setAddCompletedCrop(undefined);
      logAnalyticsEvent(Events.ADD_ITEM_PHOTO_SELECTED);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  async function handleAddSave() {
    if (!addRawImage) return;
    // Re-check the overall item limit here — a pending upload may have completed
    // (or another tab added an item) after the initial openAdd gate was passed.
    if (plansEnabled && !canAddItem()) {
      setShowPremiumGate('items');
      return;
    }
    setAddSaving(true);

    // Prepare file + image before closing sheet. The crop (if any) was already
    // applied when leaving the crop step, so reuse that pre-cropped preview.
    let fileToUpload = addFileRef.current;
    let previewImage = addCroppedPreview ?? addRawImage;

    if (addCroppedPreview && fileToUpload) {
      const response = await fetch(addCroppedPreview);
      const blob = await response.blob();
      fileToUpload = new File([blob], fileToUpload.name, { type: 'image/jpeg' });
    }

    // Compress large gallery photos before upload to reduce blob transfer time
    // and help the backend AI pipeline process smaller inputs faster.
    if (fileToUpload) {
      fileToUpload = await compressImageForUpload(fileToUpload);
    }

    const pendingId = `pending_${Date.now()}`;
    const selection = addSelection;
    if (!selection.subcategory) { setAddSaving(false); return; }
    // Local category drives layout/grouping; the precise taxonomy goes to the API.
    const category = subcategoryToLocal(selection.subcategory);
    const extras = {
      section: selection.section,
      subcategory: selection.subcategory,
      itemType: selection.itemType,
      length: selection.length,
      fitType: selection.fitType,
    };
    const uploadStartedAt = Date.now();

    // Immediately close the add sheet and show placeholder in grid
    setPendingUploads((prev) => new Map(prev).set(pendingId, { category, imageData: previewImage, step: t.uploading, progress: 0, startedAt: uploadStartedAt }));
    setAddRawImage('');
    setShowAddPicker(false);
    addFileRef.current = null;
    setAddSaving(false);

    // Run upload in background
    if (fileToUpload) {
      let activeJobId: string | null = null;
      try {
        await addClosetItemFromFile(fileToUpload, category, extras, (status) => {
          setPendingUploads((prev) => {
            const next = new Map(prev);
            const existing = next.get(pendingId);
            if (existing) {
              next.set(pendingId, { ...existing, step: formatStep(status.currentStep), progress: status.progressPercent });
            }
            return next;
          });
          // Item is ready in the wardrobe as soon as bg removal is done —
          // show it immediately rather than waiting for EMBED/ANALYZE to finish.
          if (
            status.wardrobeItemId &&
            (status.status === 'EMBED' || status.status === 'ANALYZE')
          ) {
            load();
          }
        }, (jobId) => {
          activeJobId = jobId;
          // Persist thumbnail + category + start time so it survives page reload
          saveUploadPreview(jobId, previewImage, category, uploadStartedAt);
        });
        // Upload complete — remove pending, reload items
        if (activeJobId) clearUploadPreview(activeJobId);
        logAnalyticsEvent(Events.ADD_ITEM_SAVED, {
          [Params.CATEGORY]: category,
          [Params.HAS_BG_REMOVED]: true,
        });
        logAnalyticsEvent(Events.ADD_ITEM_BG_REMOVAL_COMPLETED);
        setPendingUploads((prev) => { const next = new Map(prev); next.delete(pendingId); return next; });
        await load();
        fetchPlan();
      } catch (err) {
        console.error('Failed to upload item:', err);
        logAnalyticsEvent(Events.ADD_ITEM_BG_REMOVAL_FAILED);
        if (activeJobId) {
          // Job reached the backend — processing continues there even though our
          // SSE/poll watcher timed out. Keep the card visible; auto-resume on next
          // page load will pick it up from listUploads once processing finishes.
          setPendingUploads((prev) => {
            const next = new Map(prev);
            const existing = next.get(pendingId);
            if (existing) next.set(pendingId, { ...existing, step: t.stepProcessing });
            return next;
          });
        } else {
          // Never reached backend — fall back to saving locally
          addClosetItem({ category, imageData: previewImage });
          logAnalyticsEvent(Events.ADD_ITEM_SAVED, {
            [Params.CATEGORY]: category,
            [Params.HAS_BG_REMOVED]: false,
          });
          setPendingUploads((prev) => { const next = new Map(prev); next.delete(pendingId); return next; });
          await load();
        }
      }
    } else {
      // No file — save locally
      addClosetItem({ category, imageData: previewImage });
      logAnalyticsEvent(Events.ADD_ITEM_SAVED, {
        [Params.CATEGORY]: category,
        [Params.HAS_BG_REMOVED]: false,
      });
      setPendingUploads((prev) => { const next = new Map(prev); next.delete(pendingId); return next; });
      await load();
    }
  }

  function formatStep(step: string): string {
    const STEP_LABELS: Record<string, string> = {
      UPLOADED: t.stepProcessing,
      downloaded: t.stepProcessing,
      NSFW_SCAN: t.stepChecking,
      nsfw_passed: t.stepChecking,
      UPSCALE: t.stepGenerating,
      enhancing: t.stepGenerating,
      product_shot_ready: t.stepGenerating,
      BG_REMOVE: t.stepRemovingBg,
      bg_removed: t.stepRemovingBg,
      thumbnail_built: t.stepRemovingBg,
      EMBED: t.stepAnalyzing,
      visual_embedded: t.stepAnalyzing,
      ANALYZE: t.stepAlmostDone,
      ready: t.stepAlmostDone,
      COMPLETED: 'Done!',
    };
    return STEP_LABELS[step] ?? t.stepProcessing;
  }

  const load = useCallback(async () => {
    const seq = ++loadSeqRef.current;
    setIsLoading(true);
    try {
      const apiItems = await fetchClosetItems();
      const localItems = getClosetItems().filter((li) => li.id.startsWith('local_'));
      const allFetched = [...apiItems, ...localItems];
      if (seq === loadSeqRef.current) {
        if (allFetched.length > 0) {
          setItems(allFetched);
        } else {
          const dismissed = getDismissedDemoIds();
          const demoToShow = DEMO_ITEMS.filter((i) => !dismissed.has(i.id));
          setItems(demoToShow.length > 0 ? demoToShow : []);
        }
      }
    } catch {
      const localItems = getClosetItems();
      if (seq === loadSeqRef.current) {
        if (localItems.length > 0) {
          setItems(localItems);
        } else {
          const dismissed = getDismissedDemoIds();
          const demoToShow = DEMO_ITEMS.filter((i) => !dismissed.has(i.id));
          setItems(demoToShow.length > 0 ? demoToShow : []);
        }
      }
    } finally {
      if (seq === loadSeqRef.current) setIsLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  // ── Analytics: track screen viewed once after initial load completes ──────
  const didTrackScreenView = useRef(false);
  const tryOnStartTimeRef = useRef<number | null>(null);
  useEffect(() => {
    if (!isLoading && !didTrackScreenView.current) {
      didTrackScreenView.current = true;
      logAnalyticsEvent(Events.CLOSET_SCREEN_VIEWED, {
        [Params.ITEM_COUNT]: items.length,
        [Params.OUTFIT_COUNT]: canvases.length,
        [Params.PLAN_TIER]: plan,
      });
    }
  }, [isLoading, items.length, canvases.length, plan]);

  // Resume watching any uploads that were in progress when the page was closed
  useEffect(() => {
    const handles: SseHandle[] = [];
    let unmounted = false;
    (async () => {
      try {
        const page = await listUploads(0, 20);
        const STALE_MS = 30 * 60 * 1000;
        const inProgress = page.content.filter(
          (u) => u.status !== 'COMPLETED' && u.status !== 'FAILED'
               && !dismissedUploadJobsRef.current.has(u.uploadJobId)
               && (Date.now() - new Date(u.updatedAt).getTime()) < STALE_MS
        );
        if (unmounted || inProgress.length === 0) return;
        for (const job of inProgress) {
          const pid = `resume_${job.uploadJobId}`;
          const jobId = job.uploadJobId;
          const stored = getUploadPreview(jobId);
          // Use persisted startedAt if available; otherwise estimate from updatedAt
          const resumedStartedAt = stored?.startedAt ?? (Date.now() - (Date.now() - new Date(job.updatedAt).getTime()));
          setPendingUploads((prev) => {
            if (prev.has(pid)) return prev;
            const next = new Map(prev);
            next.set(pid, {
              category: (stored?.category ?? 'tops') as ClosetCategory,
              imageData: stored?.preview ?? '',
              step: formatStep(job.currentStep),
              progress: job.progressPercent,
              startedAt: resumedStartedAt,
            });
            return next;
          });
          const handle = watchUploadUntilDone(
            jobId,
            (status) => {
              if (unmounted || dismissedUploadJobsRef.current.has(jobId)) return;
              setPendingUploads((prev) => {
                const next = new Map(prev);
                const existing = next.get(pid);
                if (existing) next.set(pid, { ...existing, step: formatStep(status.currentStep), progress: status.progressPercent });
                return next;
              });
              // Show the item as soon as bg removal is done — don't wait for EMBED/ANALYZE.
              if (status.wardrobeItemId && (status.status === 'EMBED' || status.status === 'ANALYZE')) {
                load();
              }
            },
            () => {
              clearUploadPreview(jobId);
              if (unmounted || dismissedUploadJobsRef.current.has(jobId)) return;
              setPendingUploads((prev) => { const next = new Map(prev); next.delete(pid); return next; });
              load();
              fetchPlan();
            },
            () => {
              // Watcher errored/timed out — backend may still be processing.
              // Keep the card visible so the user isn't confused; it will
              // resolve on the next page reload via auto-resume.
              if (unmounted || dismissedUploadJobsRef.current.has(jobId)) return;
              setPendingUploads((prev) => {
                const next = new Map(prev);
                const existing = next.get(pid);
                if (existing) next.set(pid, { ...existing, step: t.stepProcessing });
                return next;
              });
            },
          );
          handles.push(handle);
        }
      } catch { /* ignore — non-critical */ }
    })();
    return () => {
      unmounted = true;
      handles.forEach((h) => h.close());
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Resume try-on if there was an active job when the page was closed
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const savedJobId = await getActiveTryOnJobWithCloud();
      if (!savedJobId || cancelled) return;
      try {
        const job = await getTryOnJob(savedJobId);
        if (cancelled) return;
        if (job.status === 'COMPLETED' && job.resultImageUrl) {
          clearActiveTryOnJob();
          setTryOnState({ status: 'completed', resultUrl: job.resultImageUrl });
          saveTryOnResult(job.resultImageUrl);
          return;
        }
        if (job.status === 'FAILED') {
          clearActiveTryOnJob();
          setTryOnState({ status: 'failed', failureReason: job.failureReason ?? 'Try-on failed.' });
          return;
        }
        // Still processing — show modal and resume watching
        setTryOnState({ status: 'processing' });
        let resumeHandle: SseHandle | null = null;
        resumeHandle = watchTryOnUntilDone(
          savedJobId,
          (progress) => {
            if (!cancelled && progress.status === 'PROCESSING') setTryOnState({ status: 'processing' });
          },
          (result) => {
            clearActiveTryOnJob();
            if (cancelled) return;
            if (result.status === 'COMPLETED' && result.resultImageUrl) {
              setTryOnState({ status: 'completed', resultUrl: result.resultImageUrl });
              saveTryOnResult(result.resultImageUrl);
            } else {
              setTryOnState({ status: 'failed', failureReason: result.failureReason ?? 'Try-on failed.' });
            }
          },
          () => {
            if (!cancelled) { clearActiveTryOnJob(); setTryOnState(null); }
          },
        );
        activeTryOnHandleRef.current = resumeHandle;
      } catch {
        if (!cancelled) {
          clearActiveTryOnJob();
          setTryOnState(null);
        }
      }
    })();
    return () => {
      cancelled = true;
      activeTryOnHandleRef.current?.close();
      activeTryOnHandleRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleDelete(id: string) {
    if (DEMO_ITEM_IDS.has(id)) {
      // Demo items don't belong to the user's wardrobe — just hide them locally
      dismissDemoId(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
      return;
    }
    const deletedItem = items.find((i) => i.id === id);
    logAnalyticsEvent(Events.CLOSET_ITEM_DELETED, {
      [Params.CATEGORY]: deletedItem?.category ?? 'unknown',
    });
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
    if (DEMO_ITEM_IDS.has(id)) return;
    if (id.startsWith('local_')) {
      updateClosetItem(id, { category });
    } else {
      updateClosetItemApi(id, { category }).catch(() => {
        // Fallback to local update
        updateClosetItem(id, { category });
      });
    }
    load();
  }

  function handleUpdateItem(id: string, sel: ItemOptionsSelection) {
    if (DEMO_ITEM_IDS.has(id)) return;
    const subcategory = sel.subcategory;
    if (!subcategory) return;
    const localCat = subcategoryToLocal(subcategory);
    // Optimistically reflect the new taxonomy in the grid right away.
    setItems((prev) => prev.map((i) => i.id === id
      ? { ...i, category: localCat, subcategory, itemType: sel.itemType, length: sel.length, fitType: sel.fitType }
      : i));
    if (id.startsWith('local_')) {
      updateClosetItem(id, { category: localCat });
    } else {
      updateClosetItemApi(id, {
        section: sel.section,
        subcategory,
        itemType: sel.itemType,
        length: sel.length,
        fitType: sel.fitType,
      }).catch(() => {
        updateClosetItem(id, { category: localCat });
      });
    }
  }

  // Items in a section, optionally narrowed to a single "Type" chip.
  function itemsForSection(section: WardrobeSection, filter: WardrobeSubcategory | null) {
    return items.filter((i) => itemSection(i) === section && (filter === null || effectiveSubcategory(i) === filter));
  }

  function countForSection(section: WardrobeSection) {
    return items.filter((i) => itemSection(i) === section).length;
  }

  function pendingForSection(section: WardrobeSection) {
    return Array.from(pendingUploads.entries())
      .filter(([, p]) => localCatToSection(p.category) === section)
      .map(([id, p]) => ({ id, ...p }));
  }

  function removePendingUpload(id: string) {
    setPendingUploads((prev) => { const next = new Map(prev); next.delete(id); return next; });
    // Always persist dismissal regardless of id prefix so re-opening the app never brings it back
    const jobId = id.startsWith('resume_') ? id.slice('resume_'.length) : id;
    dismissedUploadJobsRef.current.add(jobId);
    try {
      localStorage.setItem('libas_dismissed_uploads', JSON.stringify([...dismissedUploadJobsRef.current]));
    } catch {}
  }

  function openViewAllSection(section: WardrobeSection) {
    setViewAll({ title: taxLabel(section, locale), items: items.filter((i) => itemSection(i) === section) });
  }

  const [aiSuggestingIdx, setAiSuggestingIdx] = useState<number | null>(null);

  async function handleNewOutfit(canvasIdx = 0) {
    if (hasDemoItems) {
      setOutfitBlockedModal({ title: t.demoAddTitle, body: t.demoAddBody });
      return;
    }
    const hasUpper = items.some((i) => UPPER_CATS.includes(i.category));
    const hasLower = items.some((i) => LOWER_CATS.includes(i.category));
    if (!hasUpper || !hasLower) {
      openAdd('TOPS');
      return;
    }
    if (!canGenerate) {
      if (plansEnabled) { setShowPremiumGate('generation'); return; }
    }

    logAnalyticsEvent(Events.OUTFIT_GENERATE_TAPPED, {
      [Params.ITEM_COUNT_IN_WARDROBE]: items.length,
    });

    setAiSuggestingIdx(canvasIdx);
    let layout: SavedCanvasLayout | null = null;
    try {
      // Pass items from ALL canvases so backend skips outfits already shown on any canvas
      const allCanvasIds = [...new Set(canvases.flatMap((c) => (c.layout ?? []).map((e) => e.id)))];
      logAnalyticsEvent(Events.OUTFIT_GENERATION_STARTED);
      const aiResult = await fetchAiCanvasSuggest(allCanvasIds);
      logAnalyticsEvent(Events.OUTFIT_GENERATION_COMPLETED, {
        [Params.OUTFIT_COUNT_RETURNED]: aiResult.itemIds.length,
      });
      layout = buildLayoutFromIds(aiResult.itemIds, items);
    } catch (err: unknown) {
      const errData = (err as { response?: { data?: { error?: { code?: string; message?: string }; code?: string } } })?.response?.data;
      const code = errData?.error?.code ?? errData?.code;
      if (code === 'NOT_ENOUGH_CLOTHES') {
        // API requires shoes but client only needs upper + lower — fall back to local random generation
        logAnalyticsEvent(Events.OUTFIT_GENERATION_FAILED, { [Params.ERROR_CODE]: code });
        layout = generateRandomOutfit(items);
      } else if (code === 'OUTFITS_EXHAUSTED') {
        logAnalyticsEvent(Events.OUTFIT_GENERATION_FAILED, { [Params.ERROR_CODE]: code });
        const apiMsg = errData?.error?.message;
        // If message mentions wardrobe variety → user has too few items for new combos
        const isTooFewItems = apiMsg && apiMsg.includes('мало одежды');
        setOutfitBlockedModal({
          title: isTooFewItems ? t.tooFewItemsTitle : t.outfitsExhaustedTitle,
          body: isTooFewItems
            ? t.tooFewItemsBody
            : t.outfitsExhaustedBody,
        });
        return;
      } else if (code === 'QUOTA_EXCEEDED') {
        logAnalyticsEvent(Events.OUTFIT_GENERATION_FAILED, { [Params.ERROR_CODE]: code });
        fetchPlan();
        if (plansEnabled) { setShowPremiumGate('generation'); return; }
        return;
      } else {
        logAnalyticsEvent(Events.OUTFIT_GENERATION_FAILED, { [Params.ERROR_CODE]: code ?? 'unknown' });
        layout = generateRandomOutfit(items);
      }
    } finally {
      setAiSuggestingIdx(null);
    }

    if (!layout) return;

    setCanvases((prev) => {
      const updated = [...prev];
      if (canvasIdx >= updated.length) updated.push({ id: null, layout: layout! });
      else updated[canvasIdx] = { ...updated[canvasIdx], layout: layout! };
      return updated;
    });
    try { localStorage.setItem('svayp_saved_layout', JSON.stringify(layout)); } catch { /* ignore */ }
    setCanvasInitialLayout(layout);
    saveCanvasToBackend(layout, canvasIdx);
    fetchPlan();
  }

  async function saveCanvasToBackend(layout: SavedCanvasLayout, canvasIdx: number) {
    // Only save items that are real backend items (not local_)
    const apiItems = layout
      .filter((e) => !e.id.startsWith('local_') && !e.id.startsWith('pending_'))
      .map((e) => ({
        wardrobeItemId: e.id,
        x: e.x,
        y: e.y,
        scale: e.scale,
        zIndex: e.zIndex,
        itemGroup: e.group,
      }));

    // Backend requires at least 2 items; defer save until user adds more
    if (apiItems.length < 2) return;

    const existingId = canvases[canvasIdx]?.id ?? null;

    const doCreate = async () => {
      const canvasName = `Outfit ${canvasIdx + 1}`;
      const canvas = await createOutfitCanvas({ name: canvasName, items: apiItems });
      logAnalyticsEvent(Events.OUTFIT_BOARD_SAVED, {
        [Params.ITEM_COUNT]: apiItems.length,
      });
      setCanvases((prev) => {
        const updated = [...prev];
        if (updated[canvasIdx]) updated[canvasIdx] = { ...updated[canvasIdx], id: canvas.id };
        return updated;
      });
    };

    try {
      if (existingId) {
        try {
          await updateOutfitCanvas(existingId, { items: apiItems });
        } catch (updateErr: unknown) {
          const status = (updateErr as { response?: { status?: number } })?.response?.status;
          if (status === 404) {
            // Canvas was deleted on backend — create a new one
            setCanvases((prev) => {
              const updated = [...prev];
              if (updated[canvasIdx]) updated[canvasIdx] = { ...updated[canvasIdx], id: null };
              return updated;
            });
            await doCreate();
          } else {
            throw updateErr;
          }
        }
      } else {
        await doCreate();
      }
    } catch (err) {
      const errCode = (err as { response?: { data?: { error?: { code?: string } } } })
        ?.response?.data?.error?.code;
      // Silently ignore composition errors — the outfit is shown to user but not persisted
      if (errCode === 'INVALID_OUTFIT_COMPOSITION') return;
      console.error('Failed to save canvas to backend:', err);
      setSaveFailed(true);
      setTimeout(() => setSaveFailed(false), 4000);
    }
  }

  const tryOnCanvasIdxRef = useRef(0);
  const tryOnOverrideRef = useRef<{ itemIds: string[]; layout: SavedCanvasLayout } | null>(null);

  function handleTryItOnFromItems(calItems: ClosetItem[]) {
    if (plansEnabled && !canTryOn) { setShowPremiumGate('tryOn'); return; }
    const itemIds = calItems.map((i) => i.id).filter((id) => !id.startsWith('local_') && !id.startsWith('pending_'));
    if (itemIds.length === 0) return;

    logAnalyticsEvent(Events.TRYON_INITIATED, {
      [Params.OUTFIT_ITEM_COUNT]: itemIds.length,
      [Params.SOURCE]: 'calendar',
    });

    const upperItem  = calItems.find((i) => UPPER_CATS.includes(i.category)) ?? null;
    const lowerItem  = calItems.find((i) => LOWER_CATS.includes(i.category)) ?? null;
    const shoeItem   = calItems.find((i) => SHOES_CATS.includes(i.category)) ?? null;
    const accAll     = calItems.filter((i) => ACC_CATS.includes(i.category));
    const shawlItem  = accAll.find((a) => a.category === 'shawl') ?? null;
    const sideAccItem = accAll.find((a) => a.category !== 'shawl') ?? null;
    const hasShawl = shawlItem !== null;

    const entries: SavedCanvasLayout = [];
    if (upperItem)   entries.push({ id: upperItem.id,   x: 32, y: 17,  scale: 1,    zIndex: 1,  group: 'upper' });
    if (lowerItem)   entries.push({ id: lowerItem.id,   x: 32, y: 39,  scale: 1,    zIndex: 2,  group: 'lower' });
    if (shoeItem)    entries.push({ id: shoeItem.id,    x: 32, y: 58,  scale: 0.72, zIndex: 3,  group: 'shoes' });
    if (shawlItem)   entries.push({ id: shawlItem.id,   x: 30, y: 5,   scale: 0.6,  zIndex: 10, group: 'acc' });
    if (sideAccItem) entries.push({ id: sideAccItem.id, x: 63, y: 17,  scale: 0.6,  zIndex: 4,  group: 'acc' });

    tryOnOverrideRef.current = { itemIds, layout: entries };
    setShowTryOnConfirm(true);
  }

  function startTryOn() {
    tryOnCancelRef.current = false;

    // Demo shortcut — show the pre-built result instantly, no API call needed
    if (hasDemoItems) {
      tryOnOverrideRef.current = null;
      const DEMO_TRYON_URL = 'https://svaypimages2.blob.core.windows.net/product-images/try-on%2F07bbfdf7-504d-44f4-9880-6003831845cf%2F1e088b17-ed7d-4e79-8daf-6cae0a3f979b.png';
      setTryOnState({ status: 'completed', resultUrl: DEMO_TRYON_URL });
      saveTryOnResult(DEMO_TRYON_URL);
      return;
    }

    const override = tryOnOverrideRef.current;
    let itemIds: string[];
    let canvasId: string | undefined;
    let snapshotLayout: SavedCanvasLayout | null;
    if (override) {
      itemIds = override.itemIds;
      snapshotLayout = override.layout;
      canvasId = undefined;
    } else {
      const targetCanvas = displayCanvases[tryOnCanvasIdxRef.current];
      itemIds = (targetCanvas?.layout ?? []).map((e) => e.id).filter((id) => !id.startsWith('local_') && !id.startsWith('pending_'));
      canvasId = targetCanvas?.id ?? undefined;
      snapshotLayout = targetCanvas?.layout ?? null;
    }
    tryOnOverrideRef.current = null;
    if (itemIds.length === 0) return;

    const previewImages = itemIds.slice(0, 4)
      .map((id) => items.find((i) => i.id === id)?.imageData)
      .filter(Boolean) as string[];

    setTryOnState({ status: 'loading', previewImages });

    const buildJob = async () => {
      let snapshotBlob: Blob | undefined;
      if (snapshotLayout && snapshotLayout.length > 0) {
        try {
          snapshotBlob = await captureCanvasSnapshot(snapshotLayout, items);
        } catch {
          // snapshot capture failed — fall back to classic mode
        }
      }
      return createTryOnJob({ wardrobeItemIds: itemIds, canvasId, snapshotBlob });
    };

    buildJob()
      .then((job) => {
        if (tryOnCancelRef.current) return;
        saveActiveTryOnJob(job.id);
        tryOnStartTimeRef.current = Date.now();
        logAnalyticsEvent(Events.TRYON_PROCESSING_STARTED);
        setTryOnState((prev) => ({ status: 'processing', previewImages: prev?.previewImages }));
        fetchPlan();
        activeTryOnHandleRef.current = watchTryOnUntilDone(
          job.id,
          (progress) => {
            if (!tryOnCancelRef.current && progress.status === 'PROCESSING') {
              setTryOnState((prev) => ({ status: 'processing', previewImages: prev?.previewImages }));
            }
          },
          (result) => {
            clearActiveTryOnJob();
            activeTryOnHandleRef.current = null;
            if (tryOnCancelRef.current) return;
            if (result.status === 'COMPLETED' && result.resultImageUrl) {
              const durationMs = tryOnStartTimeRef.current ? Date.now() - tryOnStartTimeRef.current : 0;
              logAnalyticsEvent(Events.TRYON_COMPLETED, { [Params.DURATION_MS]: durationMs });
              tryOnStartTimeRef.current = null;
              setTryOnState({ status: 'completed', resultUrl: result.resultImageUrl });
              saveTryOnResult(result.resultImageUrl);
            } else {
              logAnalyticsEvent(Events.TRYON_FAILED, { [Params.ERROR_CODE]: result.failureReason ?? 'unknown' });
              setTryOnState({ status: 'failed', failureReason: result.failureReason ?? 'Try-on failed. Please try again.' });
            }
          },
          (err) => {
            clearActiveTryOnJob();
            activeTryOnHandleRef.current = null;
            if (tryOnCancelRef.current) return;
            if ((err as { status?: number }).status === 402) {
              setTryOnState(null);
              setShowPremiumGate('generation');
            } else {
              logAnalyticsEvent(Events.TRYON_FAILED, { [Params.ERROR_CODE]: 'sse_error' });
              setTryOnState({ status: 'failed', failureReason: 'Something went wrong. Please try again.' });
            }
          },
        );
      })
      .catch((err) => {
        clearActiveTryOnJob();
        if (tryOnCancelRef.current) return;
        if (err?.response?.status === 402) {
          setTryOnState(null);
          setShowPremiumGate('generation');
        } else {
          setTryOnState({ status: 'failed', failureReason: 'Something went wrong. Please try again.' });
        }
      });
  }

  function handleTryItOn(canvasIdx = 0) {
    if (plansEnabled && !canTryOn) {
      setShowPremiumGate('tryOn');
      return;
    }
    const targetCanvas = displayCanvases[canvasIdx];
    const itemIds = (targetCanvas?.layout ?? []).map((e) => e.id).filter((id) => !id.startsWith('local_') && !id.startsWith('pending_'));
    if (itemIds.length === 0) return;
    logAnalyticsEvent(Events.TRYON_INITIATED, {
      [Params.OUTFIT_ITEM_COUNT]: itemIds.length,
      [Params.SOURCE]: 'outfit_board',
    });
    tryOnCanvasIdxRef.current = canvasIdx;
    setShowTryOnConfirm(true);
  }

  async function handleDeleteCanvas(canvasIdx: number) {
    const canvas = canvases[canvasIdx];
    if (!canvas) return;
    logAnalyticsEvent(Events.OUTFIT_BOARD_DELETED);
    // Delete from backend if it has an id
    if (canvas.id) {
      try { await deleteOutfitCanvas(canvas.id); } catch { /* ignore */ }
    }
    setCanvases((prev) => prev.filter((_, i) => i !== canvasIdx));
  }

  function handleCancelTryOn() {
    tryOnCancelRef.current = true;
    activeTryOnHandleRef.current?.close();
    activeTryOnHandleRef.current = null;
    clearActiveTryOnJob();
    setTryOnState(null);
  }

  return (
    <div className="phone-container flex flex-col bg-white dark:bg-[#111111]" style={{ height: '100dvh' }}>
      {/* Save-failed toast */}
      {saveFailed && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[999] px-4 py-2.5 rounded-full bg-red-500 text-white text-[13px] font-semibold shadow-lg">
          {t.saveFailed}
        </div>
      )}
      {/* Outfit generation toast */}
      {outfitToastMsg && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[999] px-4 py-2.5 rounded-full bg-gray-800 text-white text-[13px] font-semibold shadow-lg whitespace-nowrap">
          {outfitToastMsg}
        </div>
      )}
      {/* Header — flat style, matching the Market page (no glass border box) */}
      <header
        className="shrink-0 flex items-center justify-between px-4 pb-2 bg-white dark:bg-[#111111]"
        style={{ paddingTop: 'calc(12px + env(safe-area-inset-top, 0px))' }}
      >
        {/* Left: LIBΛS logo */}
        <h1 className="text-[24px] font-bold tracking-[0.12em] text-black dark:text-white shrink-0">LIB<span style={{ color: '#F370A7' }}>Λ</span>S</h1>

        {/* Right: action buttons + profile + guide */}
        <div className="flex items-center gap-1.5">
            {/* Calendar with text */}
            {/* Plan with text — hidden when plans are disabled */}
            {plansEnabled && (
              <button
                onClick={() => setShowPremiumGate('generation')}
                className="flex items-center gap-1 px-2.5 h-8 rounded-full text-[11px] font-bold active:scale-[0.95] transition-all"
                style={{
                  background: plan === 'free' ? (theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)') : PLAN_COLORS[plan].bg,
                  color: plan === 'free' ? (theme === 'dark' ? '#aaa' : '#888') : PLAN_COLORS[plan].text,
                }}
                aria-label="Plan"
              >
                <Crown size={11} strokeWidth={2} color={plan === 'free' ? '#aaa' : PLAN_COLORS[plan].crownColor} />
                <span>{plan === 'free' ? 'Free' : plan === 'pro' ? 'Plus' : 'Premium'}</span>
              </button>
            )}
            {/* Profile icon — hidden inside the Flutter app (it has its own) */}
            {profileEnabled && !isFlutterWebView && (
              <button
                onClick={() => setShowProfile(true)}
                className="relative flex items-center justify-center px-2 h-9 rounded-full active:scale-[0.95] transition-transform"
                style={{
                  background: theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                  minWidth: 38,
                }}
                aria-label="Profile"
              >
                <User size={14} strokeWidth={1.8} style={{ color: theme === 'dark' ? '#888' : '#666' }} />
                <span
                  className="absolute top-0.5 right-1 text-[9px] leading-none select-none"
                  aria-hidden="true"
                >
                  {locale === 'uz' ? '🇺🇿' : locale === 'ru' ? '🇷🇺' : '🇬🇧'}
                </span>
              </button>
            )}
            {/* Catchy guide entry point — last item on the right */}
            <button
              onClick={() => { setShowGuide(true); logAnalyticsEvent(Events.CLOSET_GUIDE_OPENED); }}
              className="relative shrink-0 flex items-center gap-1 pl-2 pr-2.5 h-8 rounded-full active:scale-[0.95] transition-transform shadow-sm"
              style={{ background: 'linear-gradient(135deg, #F370A7 0%, #e0559a 100%)' }}
              aria-label={getGuideStrings(locale).guide}
            >
              <BookOpen size={12} strokeWidth={2.4} color="#fff" />
              <span className="text-[11px] font-bold text-white whitespace-nowrap">{getGuideStrings(locale).guide}</span>
              {/* Pulsing dot to draw the eye on first visits */}
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: '#F370A7' }} />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 border-2 border-white" style={{ background: '#F370A7' }} />
              </span>
            </button>
          </div>
      </header>

      {/* ── Promo Banner: 20% sale ────────────────────────────────── */}
      {/* Temporarily disabled — banner hidden for now. Re-enable when needed.
      {plansEnabled && plan === 'free' && promoSecondsLeft > 0 && (
      <div
        onClick={() => setShowPremiumGate('generation')}
        className="shrink-0 mx-3 mb-2 rounded-2xl overflow-hidden cursor-pointer active:scale-[0.98] transition-transform select-none"
        style={{
          background: 'linear-gradient(135deg, #7b2ff7 0%, #f107a3 100%)',
          boxShadow: '0 4px 18px rgba(123,47,247,0.4)',
        }}
      >
        <div className="relative px-4 py-3 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-white font-extrabold text-[13px] leading-snug">
              {t.promoBannerTitle}
            </p>
            <p className="text-white/90 text-[10.5px] font-medium leading-snug mt-0.5 line-clamp-2">
              {t.promoBannerBody}
            </p>
            <p className="text-white/70 text-[9.5px] font-medium leading-snug mt-1">
              {t.promoBannerNote}
            </p>
          </div>
          <div className="shrink-0 flex flex-col items-center gap-1.5">
            <span className="text-white font-black text-[13px] tabular-nums leading-none tracking-tight">{promoTimeStr}</span>
            <button
              onClick={(e) => { e.stopPropagation(); setShowPremiumGate('generation'); }}
              className="px-3 py-1.5 rounded-full bg-white text-[11px] font-bold active:scale-[0.95] transition-transform whitespace-nowrap"
              style={{ color: '#7b2ff7' }}
            >
              {t.promoBannerCta}
            </button>
          </div>
        </div>
        <div
          className="h-[3px] w-full"
          style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.6) 50%, transparent 100%)', backgroundSize: '200% 100%', animation: 'shimmer 2s infinite linear' }}
        />
      </div>
      )}
      */}
      <style jsx>{`
        @keyframes shimmer {
          0%   { background-position: -200% 0; }
          100% { background-position:  200% 0; }
        }
        @keyframes hintSlideIn {
          from { opacity: 0; transform: translate(-50%, 12px); }
          to   { opacity: 1; transform: translate(-50%, 0); }
        }
        @keyframes tryOnPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(243,112,167,0.55); }
          50%       { box-shadow: 0 0 0 8px rgba(243,112,167,0); }
        }
        @keyframes tryOnShimmer {
          0%   { background-position: -200% center; }
          100% { background-position:  200% center; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>

      <main
        ref={mainScrollRef}
        className="flex-1 overflow-y-auto pb-4"
        style={{ paddingTop: 0, overscrollBehaviorY: 'contain' }}
        onTouchStart={handlePullTouchStart}
        onTouchMove={handlePullTouchMove}
        onTouchEnd={handlePullTouchEnd}
      >
        {/* ── Pull-to-refresh indicator ──────────────────────────── */}
        <div
          className="flex items-center justify-center overflow-hidden transition-all duration-200"
          style={{ height: isPullRefreshing ? 44 : pullDistance > 0 ? Math.min(pullDistance, 44) : 0 }}
        >
          <div
            className="w-7 h-7 rounded-full border-2 border-t-transparent"
            style={{
              borderColor: '#F370A7',
              borderTopColor: 'transparent',
              animation: isPullRefreshing ? 'spin 0.7s linear infinite' : 'none',
              transform: isPullRefreshing ? undefined : `rotate(${Math.min((pullDistance / PULL_THRESHOLD) * 270, 270)}deg)`,
              opacity: isPullRefreshing ? 1 : Math.min(pullDistance / PULL_THRESHOLD, 1),
            }}
          />
        </div>
        {/* ── My Outfits ────────────────────────────────────────── */}
        <OutfitSection
          activeTab={closetTab}
          onTabChange={setClosetTab}
          tryOnJobs={tryOnJobs}
          tryOnLoading={tryOnLoading}
          tryOnError={tryOnError}
          tryOnHasMore={tryOnHasMore}
          onRetryTryOns={() => loadTryOns(0)}
          onLoadMoreTryOns={() => loadTryOns(tryOnPageRef.current + 1)}
          calendarDays={calendarDays}
          canTryOn={canTryOn}
          onTryItOnItems={handleTryItOnFromItems}
          allItems={items}
          canvases={displayCanvases}
          plan={plan}
          canGenerate={canGenerate}
          genCount={usage.regenerationsUsed}
          limits={limits}
          tryOnCount={usage.tryItOnsUsed}
          aiSuggestingIdx={aiSuggestingIdx}
          allowAutoGenerate={!isLoading && canvasesLoaded}
          onViewItems={(idx) => {
            const layout = displayCanvases[idx]?.layout ?? null;
            setEditingCanvasIdx(idx);
            setCanvasInitialLayout(layout);
            // Eagerly preload canvas images
            if (layout) {
              layout.forEach((entry) => {
                const item = items.find((i) => i.id === entry.id);
                if (item?.imageData && !item.imageData.startsWith('data:')) {
                  const preload = new window.Image();
                  preload.src = item.imageData;
                }
              });
            }
            setCanvasData({
              upper: items.filter((i) => UPPER_CATS.includes(i.category)),
              lower: items.filter((i) => LOWER_CATS.includes(i.category)),
              shoes: items.filter((i) => SHOES_CATS.includes(i.category)),
              acc: items.filter((i) => ACC_CATS.includes(i.category)),
            });
          }}
          plansEnabled={plansEnabled}
          canAddCanvas={hasDemoItems ? false : canAddCanvas}
          onAddCanvas={() => {
            // Create a new empty canvas at the end of the list
            const newIdx = canvases.length;
            setCanvases((prev) => [...prev, { id: null, layout: [] }]);
            setEditingCanvasIdx(newIdx);
            setCanvasInitialLayout(null);
            // Pass empty arrays so the canvas starts blank
            setCanvasData({ upper: [], lower: [], shoes: [], acc: [] });
          }}
          onRegenerate={(idx) => handleNewOutfit(idx)}
          onShowPlans={() => setShowPremiumGate('generation')}
          onShowCanvasPlans={() => setShowPremiumGate('canvas')}
          onTryItOn={(idx) => handleTryItOn(idx)}
          onDeleteCanvas={handleDeleteCanvas}
          onAddItem={(cat) => openAdd(localCatToSection(cat))}
        />

        {/* ── Sections (new taxonomy: Tops · Bottoms · Dresses & Sets · Outerwear · Footwear · Accessories) ── */}
        {SECTION_ORDER.map((section) => {
          const filter = sectionFilter[section] ?? null;
          return (
            <ClothingSection
              key={section}
              title={taxLabel(section, locale)}
              cats={subcategoriesForSection(section)}
              filter={filter}
              items={itemsForSection(section, filter)}
              totalCount={countForSection(section)}
              pendingItems={pendingForSection(section)}
              onFilterChange={(c) => setSectionFilter((prev) => ({ ...prev, [section]: c }))}
              onTapItem={setEditItem}
              onViewAll={() => openViewAllSection(section)}
              onRemovePending={removePendingUpload}
              onAddItem={() => openAdd(section)}
            />
          );
        })}

        <div className="h-12" />
      </main>

      {/* ── View All Modal ─────────────────────────────────────── */}
      {viewAll && (
        <ViewAllModal
          title={viewAll.title}
          items={viewAll.items}
          onClose={() => setViewAll(null)}
          showDelete={false}
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
          onClose={() => {
            // If this was a brand-new canvas with no items saved yet, remove the empty entry
            if (editingCanvasIdx !== null) {
              const c = canvases[editingCanvasIdx];
              if (c && !c.id && c.layout.length === 0) {
                setCanvases((prev) => prev.filter((_, i) => i !== editingCanvasIdx));
              }
            }
            setEditingCanvasIdx(null);
            setCanvasData(null);
          }}
          onSave={(layout) => {
            if (editingCanvasIdx !== null) {
              setCanvases((prev) => {
                const updated = [...prev];
                const existing = updated[editingCanvasIdx] ?? { id: null, layout: [] };
                updated[editingCanvasIdx] = { ...existing, layout };
                return updated;
              });
              setCanvasInitialLayout(layout);
              setCanvasData(null);
              if (!hasDemoItems) {
                saveCanvasToBackend(layout, editingCanvasIdx);
              }
            } else {
              setCanvasData(null);
            }
            setEditingCanvasIdx(null);
            setTryOnState(null);
          }}
          onRegenerate={handleNewOutfit}
          onShowPlans={() => setShowPremiumGate('generation')}
          canRegenerate={canGenerate}
          plansEnabled={plansEnabled}
        />
      )}

      {/* ── Item Edit Sheet ────────────────────────────────── */}
      {editItem && (
        <ItemEditSheet
          item={editItem}
          onClose={() => setEditItem(null)}
          onDelete={(id) => { handleDelete(id); setEditItem(null); }}
          onSave={(id, sel) => { handleUpdateItem(id, sel); setEditItem(null); }}
        />
      )}

      {/* ── Premium Gate Sheet — only when plans feature is enabled ── */}
      {plansEnabled && showPremiumGate && (
        <PremiumGateSheet
          reason={showPremiumGate}
          currentPlan={plan}
          onClose={() => {
            logAnalyticsEvent(Events.UPGRADE_MODAL_DISMISSED, {
              [Params.TRIGGER]: showPremiumGate,
              [Params.CURRENT_PLAN]: plan,
            });
            setShowPremiumGate(null);
          }}
        />
      )}

      {/* ── Outfit Blocked Modal ── */}
      {outfitBlockedModal && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center" onClick={() => setOutfitBlockedModal(null)}>
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="relative w-full max-w-sm mx-auto bg-white rounded-t-3xl px-6 pt-6 pb-10 flex flex-col items-center gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1 rounded-full bg-gray-200 mb-1" />
            <div className="w-16 h-16 rounded-full bg-pink-50 flex items-center justify-center text-3xl">
              👗
            </div>
            <div className="text-center">
              <p className="text-[17px] font-bold text-gray-900 mb-1">{outfitBlockedModal.title}</p>
              <p className="text-[14px] text-gray-500 leading-snug">{outfitBlockedModal.body}</p>
            </div>
            {outfitBlockedModal.title === t.tooFewItemsTitle && (
              <button
                className="w-full py-3.5 rounded-2xl text-[15px] font-semibold text-white"
                style={{ background: 'linear-gradient(135deg, #F370A7 0%, #d946a8 100%)' }}
                onClick={() => { setOutfitBlockedModal(null); openAdd('TOPS'); }}
              >
                {t.addClothingBtn}
              </button>
            )}
            <button
              className="w-full py-3 rounded-2xl text-[15px] font-semibold text-gray-500 bg-gray-100"
              onClick={() => setOutfitBlockedModal(null)}
            >
              {t.close}
            </button>
          </div>
        </div>
      )}

      {/* ── Try-On Confirm Sheet ── */}
      {showTryOnConfirm && (
        <TryOnConfirmModal
          savedLayout={tryOnOverrideRef.current?.layout ?? displayCanvases[tryOnCanvasIdxRef.current]?.layout ?? null}
          items={items}
          onConfirm={() => { setShowTryOnConfirm(false); startTryOn(); }}
          onCancel={() => setShowTryOnConfirm(false)}
        />
      )}

      {/* ── Try-On Modal ── */}
      {tryOnState && (
        <TryOnModal
          status={tryOnState.status}
          resultUrl={tryOnState.resultUrl}
          failureReason={tryOnState.failureReason}
          previewImages={tryOnState.previewImages}
          onClose={() => setTryOnState(null)}
          onRetry={startTryOn}
          onCancel={handleCancelTryOn}
        />
      )}

      {/* ── Floating Add Button ── */}
      <div className="absolute right-6 z-50" style={{ bottom: '20px' }}>
        <button
          onClick={() => openAdd('TOPS')}
          className="relative w-14 h-14 rounded-full flex items-center justify-center shadow-xl active:scale-[0.95] transition-transform"
          style={{ backgroundColor: '#F370A7' }}
          aria-label="Add item"
        >
          <Plus size={24} strokeWidth={2.5} color="white" />
        </button>
      </div>

      {/* ── How-to-use guide ── */}
      <ClosetGuide open={showGuide} onClose={() => setShowGuide(false)} />

      {/* ── "Perfect photo" tips for adding an item ── */}
      <PhotoTipsSheet open={showItemTips} kind="item" position="fixed" onClose={() => setShowItemTips(false)} />

      {/* ── Hidden file inputs for add flow ── */}
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAddFileChange} />
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleAddFileChange} />

      {/* ── Photo Picker Sheet (shared with market/create) ── */}
      {showAddPicker && !addRawImage && (
        <PhotoSourceSheet
          position="fixed"
          onClose={() => setShowAddPicker(false)}
          onGallery={() => { logAnalyticsEvent(Events.ADD_ITEM_STARTED, { [Params.SOURCE]: 'gallery' }); fileInputRef.current?.click(); setShowAddPicker(false); }}
          onCamera={() => { logAnalyticsEvent(Events.ADD_ITEM_STARTED, { [Params.SOURCE]: 'camera' }); cameraInputRef.current?.click(); setShowAddPicker(false); }}
        />
      )}

      {/* ── Add Item Wizard (2 steps: crop → details, mirrors market create) ── */}
      {addRawImage && (
        <div className="fixed inset-0 z-[60] flex flex-col bg-white dark:bg-[#111111]">
          <WizardHeader
            step={addStep === 'crop' ? 0 : 1}
            totalSteps={2}
            onBack={() => {
              // Details → back to crop; crop → cancel the whole add flow.
              if (addStep === 'details') { setAddStep('crop'); return; }
              setAddRawImage('');
              setShowAddPicker(false);
            }}
          />

          {addStep === 'crop' ? (
            <StepScaffold
              title={t.closetCropTitle}
              hint={t.closetCropHint}
              ctaLabel={t.mk_continue}
              ctaDisabled={!addRawImage}
              onCta={goToDetailsStep}
            >
              {/* "How to take the perfect photo" tips card — opens the tips sheet. */}
              <button
                onClick={() => setShowItemTips(true)}
                className="w-full text-left flex items-center justify-between p-3.5 rounded-2xl mb-4 active:scale-[0.99] transition-transform"
                style={{ background: 'rgba(243,112,167,0.08)' }}
              >
                <div>
                  <p className="text-[14px] font-bold text-black dark:text-white leading-snug">{t.mk_photos_tips_title}</p>
                  <span className="inline-flex items-center gap-1 mt-2 text-[12px] font-semibold px-3 py-1.5 rounded-full bg-white text-black">
                    {t.mk_photos_tips_cta}
                    <ArrowUpRight size={13} strokeWidth={2.5} className="text-[#F370A7]" />
                  </span>
                </div>
                <Camera size={40} strokeWidth={1.4} className="text-black/30 dark:text-white/40 shrink-0" />
              </button>
              {/* Crop area — cropping is optional; full image is used otherwise. */}
              <div className="rounded-2xl flex justify-center" style={{ padding: '14px 14px 10px', backgroundColor: theme === 'dark' ? '#1a1a1a' : '#f3f4f6' }}>
                <ReactCrop crop={addCrop} onChange={(c) => setAddCrop(c)} onComplete={(c) => setAddCompletedCrop(c)}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img ref={cropImgRef} src={addRawImage} alt="Crop" style={{ maxHeight: '55vh', maxWidth: '100%', display: 'block', margin: '0 auto', borderRadius: 12 }} />
                </ReactCrop>
              </div>
            </StepScaffold>
          ) : (
            <StepScaffold
              title={t.closetDetailsTitle}
              hint={t.closetDetailsHint}
              ctaLabel={addSaving ? t.uploading : t.saveToCloset}
              ctaDisabled={addSaving || !isSelectionComplete(addSelection)}
              onCta={handleAddSave}
            >
              {/* Cropped preview so the user sees what they're describing. */}
              <div className="rounded-2xl flex justify-center mb-5" style={{ padding: 14, backgroundColor: theme === 'dark' ? '#1a1a1a' : '#f3f4f6' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={addCroppedPreview ?? addRawImage} alt="Item" style={{ maxHeight: '32vh', maxWidth: '100%', display: 'block', borderRadius: 12 }} />
              </div>
              <ItemOptionsPicker
                value={addSelection}
                onChange={(next) => {
                  if (next.subcategory && next.subcategory !== addSelection.subcategory) {
                    logAnalyticsEvent(Events.ADD_ITEM_CATEGORY_SELECTED, { [Params.CATEGORY]: subcategoryToLocal(next.subcategory) });
                  }
                  setAddSelection(next);
                }}
                dark={theme === 'dark'}
              />
            </StepScaffold>
          )}
        </div>
      )}

      {/* ── Profile Sheet ── */}
      {showProfile && (
        <div
          className="fixed inset-0 z-[70] flex items-end justify-center bg-black/30 backdrop-blur-sm"
          onClick={() => setShowProfile(false)}
        >
          <div className={`w-full max-w-[430px] rounded-t-3xl bg-white dark:bg-[#1a1a1a]`} onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-9 h-1 rounded-full bg-gray-200 dark:bg-gray-700" />
            </div>
            <div className="px-5 pb-10">
              {/* Avatar + name + phone */}
              <div className="flex items-center gap-4 mb-5">
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center text-white text-[22px] font-bold shrink-0"
                  style={{ background: 'linear-gradient(135deg, #F370A7 0%, #e0559a 100%)' }}
                >
                  {userInfo?.name ? userInfo.name.trim()[0].toUpperCase() : <User size={24} strokeWidth={2} color="white" />}
                </div>
                <div>
                  <div className="text-[17px] font-bold text-gray-900 dark:text-white">{userInfo?.name || '—'}</div>
                  <div className="text-[13px] mt-0.5 text-gray-400 dark:text-gray-400">{userInfo?.phoneNumber || t.phoneNumber}</div>
                </div>
              </div>
              {/* Plan badge */}
              <div
                className="flex items-center gap-2.5 px-4 h-13 rounded-2xl"
                style={{
                  background: plan === 'free' ? (theme === 'dark' ? '#2a2a2a' : '#F5F5F5') : PLAN_COLORS[plan].bg,
                  height: 52,
                }}
              >
                <Crown size={17} strokeWidth={2} color={plan === 'free' ? (theme === 'dark' ? '#666' : '#aaa') : PLAN_COLORS[plan].crownColor} />
                <span
                  className="text-[14px] font-semibold"
                  style={{ color: plan === 'free' ? (theme === 'dark' ? '#aaa' : '#888') : PLAN_COLORS[plan].text }}
                >
                  {plan === 'free' ? 'Free plan' : plan === 'pro' ? 'Plus' : 'Premium'}
                </span>
              </div>

              {/* Language & Theme selector */}
              <div className="mt-4">
                <p className="text-[12px] font-semibold text-gray-400 uppercase tracking-wider mb-2">{t.language}</p>
                <div className="flex gap-2">
                  {(['uz', 'ru', 'en'] as Locale[]).map((l) => (
                    <button
                      key={l}
                      onClick={() => setLocale(l)}
                      className={`flex-1 h-11 rounded-2xl flex items-center justify-center gap-1.5 transition-colors ${
                        locale === l
                          ? 'bg-black text-white dark:bg-white dark:text-black'
                          : 'bg-gray-50 text-gray-700 dark:bg-gray-700 dark:text-gray-200'
                      }`}
                    >
                      <span className="text-[18px] leading-none">{l === 'uz' ? '🇺🇿' : l === 'ru' ? '🇷🇺' : '🇬🇧'}</span>
                      <span className="text-[12px] font-semibold">{l === 'en' ? 'EN' : l === 'ru' ? 'RU' : 'UZ'}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Theme toggle */}
              <div className="mt-4">
                <p className="text-[12px] font-semibold text-gray-400 uppercase tracking-wider mb-2">{t.theme}</p>
                <div className="flex gap-2">
                  {(['light', 'dark'] as const).map((themeMode) => (
                    <button
                      key={themeMode}
                      onClick={() => setTheme(themeMode)}
                      className={`flex-1 h-11 rounded-2xl flex items-center justify-center gap-1.5 transition-colors ${
                        theme === themeMode
                          ? 'bg-black text-white dark:bg-white dark:text-black'
                          : 'bg-gray-50 text-gray-700 dark:bg-gray-700 dark:text-gray-200'
                      }`}
                    >
                      {themeMode === 'light' ? <Sun size={16} strokeWidth={2} /> : <Moon size={16} strokeWidth={2} />}
                      <span className="text-[12px] font-semibold">{themeMode === 'light' ? t.themeLight : t.themeDark}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Logout */}
              <button
                onClick={() => {
                  clearTokens();
                  router.replace('/');
                }}
                className="mt-2 w-full h-11 rounded-2xl flex items-center justify-center gap-2 text-[13px] font-semibold active:scale-[0.97] transition-colors"
                style={{
                  background: theme === 'dark' ? 'rgba(239,68,68,0.2)' : 'rgba(239,68,68,0.07)',
                  color: theme === 'dark' ? '#ff7a7a' : '#ef4444',
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
                {t.logout}
              </button>
            </div>
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
                    <div className="flex items-center gap-3">
                        <span className="text-[22px] leading-none">{l === 'uz' ? '🇺🇿' : l === 'ru' ? '🇷🇺' : '🇬🇧'}</span>
                        <span className="text-[14px] font-semibold">
                          {l === 'en' ? 'English' : l === 'ru' ? 'Русский' : "O'zbek"}
                        </span>
                      </div>
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
function OutfitSection({ activeTab, onTabChange, tryOnJobs, tryOnLoading, tryOnError, tryOnHasMore, onRetryTryOns, onLoadMoreTryOns, calendarDays, canTryOn, onTryItOnItems, allItems, canvases, plan, canGenerate, genCount, limits, tryOnCount, canAddCanvas, onViewItems, onRegenerate, onAddCanvas, onShowPlans, onShowCanvasPlans, onTryItOn, onDeleteCanvas, aiSuggestingIdx, onAddItem, allowAutoGenerate, plansEnabled }: {
  activeTab: 'boards' | 'outfits' | 'dressme' | 'calendar';
  onTabChange: (tab: 'boards' | 'outfits' | 'dressme' | 'calendar') => void;
  tryOnJobs: TryOnJobResponse[];
  tryOnLoading: boolean;
  tryOnError: boolean;
  tryOnHasMore: boolean;
  onRetryTryOns: () => void;
  onLoadMoreTryOns: () => void;
  calendarDays: number;
  canTryOn: boolean;
  onTryItOnItems: (items: ClosetItem[]) => void;
  allItems: ClosetItem[];
  canvases: { id: string | null; layout: SavedCanvasLayout }[];
  plan: UserPlan;
  canGenerate: boolean;
  genCount: number;
  limits: PlanLimits;
  tryOnCount: number;
  canAddCanvas: boolean;
  allowAutoGenerate: boolean;
  plansEnabled: boolean;
  onShowCanvasPlans: () => void;
  onViewItems: (idx: number) => void;
  onRegenerate: (idx: number) => void;
  onAddCanvas: () => void;
  onShowPlans: () => void;
  onTryItOn: (idx: number) => void;
  onDeleteCanvas: (idx: number) => void | Promise<void>;
  aiSuggestingIdx?: number | null;
  onAddItem: (cat: ClosetCategory) => void;
}) {
  const { t } = useI18n();
  const { theme } = useTheme();
  const isEmpty = allItems.length === 0;

  return (
    <div className="mt-4">
      {/* ── Tabs: Boards · Outfits · Dress Me ─────────────────────── */}
      <div className="px-4 mb-3.5 flex justify-center">
        <div className="inline-flex p-1 rounded-full gap-1" style={{ background: theme === 'dark' ? '#1f1f1f' : '#F1F1F3' }}>
          {([['boards', t.tabBoards], ['outfits', t.tabOutfits], ['dressme', t.tabDressMe], ['calendar', t.tabCalendar]] as const).map(([key, label]) => {
            const active = activeTab === key;
            return (
              <button
                key={key}
                onClick={() => onTabChange(key)}
                className="px-3 py-1.5 rounded-full text-[13px] font-semibold transition-all active:scale-95 whitespace-nowrap"
                style={{
                  background: active ? (theme === 'dark' ? '#2e2e2e' : '#FFFFFF') : 'transparent',
                  color: active ? '#F370A7' : (theme === 'dark' ? '#9ca3af' : '#6b7280'),
                  boxShadow: active ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {activeTab === 'boards' && (
      <div className={`flex gap-3 hide-scrollbar py-2 ${isEmpty ? 'justify-center px-4' : 'overflow-x-auto pl-4'}`}>
        {/* Render all canvas cards */}
        {canvases.length > 0 ? canvases.map((canvas, idx) => (
          <OutfitCard
            key={canvas.id ?? `canvas-${idx}`}
            allItems={allItems}
            isEmpty={isEmpty}
            savedLayout={canvas.layout.length > 0 ? canvas.layout : null}
            onViewItems={() => onViewItems(idx)}
            onRegenerate={() => onRegenerate(idx)}
            canRegenerate={canGenerate}
            isAiSuggesting={aiSuggestingIdx === idx}
            genCount={genCount}
            regenLimit={limits.regenerations}
            onTryItOn={() => onTryItOn(idx)}
            tryOnCount={tryOnCount}
            tryOnLimit={limits.tryItOns}
            onDelete={idx > 0 ? () => onDeleteCanvas(idx) : undefined}
            onAddItem={onAddItem}
            allowAutoGenerate={allowAutoGenerate}
            isLocked={plansEnabled && idx >= limits.outfitCanvases}
            onShowPlans={plansEnabled && idx >= limits.outfitCanvases ? onShowCanvasPlans : onShowPlans}
          />
        )) : (
          <OutfitCard
            allItems={allItems}
            isEmpty={isEmpty}
            savedLayout={null}
            onViewItems={() => onViewItems(0)}
            onRegenerate={() => onRegenerate(0)}
            canRegenerate={canGenerate}
            isAiSuggesting={aiSuggestingIdx === 0}
            genCount={genCount}
            regenLimit={limits.regenerations}
            onTryItOn={() => onTryItOn(0)}
            tryOnCount={tryOnCount}
            tryOnLimit={limits.tryItOns}
            onAddItem={onAddItem}
            allowAutoGenerate={allowAutoGenerate}
          />
        )}

        {/* New outfit card — add board if plan allows, otherwise upgrade prompt */}
        {!isEmpty && (
          canAddCanvas ? (
            <button
              onClick={onAddCanvas}
              className="shrink-0 rounded-[28px] flex flex-col items-center justify-center gap-3 border-2 border-dashed active:scale-[0.98] transition-transform"
              style={{
                width: 'min(82vw, 340px)',
                height: 440,
                borderColor: theme === 'dark' ? '#4a4a4a' : '#D1D5DB',
                background: theme === 'dark' ? 'rgba(42,42,42,0.6)' : 'rgba(249,250,251,0.8)',
              }}
            >
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{
                  background: theme === 'dark' ? '#2a2a2a' : '#F3F4F6',
                  boxShadow: theme === 'dark' ? '0 2px 8px rgba(0,0,0,0.4)' : '0 2px 8px rgba(0,0,0,0.08)',
                }}
              >
                <Plus size={26} strokeWidth={2} style={{ color: theme === 'dark' ? '#888' : '#9ca3af' }} />
              </div>
              <div className="text-center px-6">
                <p className="text-[14px] font-bold" style={{ color: theme === 'dark' ? '#f0f0f0' : '#1f2937' }}>{t.newOutfit}</p>
                <p className="text-[12px] mt-0.5" style={{ color: theme === 'dark' ? '#888' : '#9ca3af' }}>{limits.outfitCanvases - canvases.length} {t.moreAvailable}</p>
              </div>
            </button>
          ) : (
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
          )
        )}

        <div className="w-6 shrink-0" />
      </div>
      )}

      {activeTab === 'outfits' && (
        <TryOnGallery
          jobs={tryOnJobs}
          loading={tryOnLoading}
          error={tryOnError}
          hasMore={tryOnHasMore}
          onRetry={onRetryTryOns}
          onLoadMore={onLoadMoreTryOns}
        />
      )}

      {activeTab === 'dressme' && <DressMeReels allItems={allItems} />}

      {activeTab === 'calendar' && (
        <CalendarTab
          allItems={allItems}
          calendarDays={calendarDays}
          plansEnabled={plansEnabled}
          onShowPlans={onShowPlans}
          onTryItOn={onTryItOnItems}
          canTryOn={canTryOn}
          tryOnCount={tryOnCount}
          tryOnLimit={limits.tryItOns}
        />
      )}
    </div>
  );
}

// ── Outfits tab: gallery of completed virtual try-on results ────────────────────
function TryOnGallery({ jobs, loading, error, hasMore, onRetry, onLoadMore }: {
  jobs: TryOnJobResponse[];
  loading: boolean;
  error: boolean;
  hasMore: boolean;
  onRetry: () => void;
  onLoadMore: () => void;
}) {
  const { t } = useI18n();
  const { theme } = useTheme();
  const [viewingJob, setViewingJob] = useState<TryOnJobResponse | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  // Newest generated first (createdAt desc). ISO strings compare lexically.
  const sortedJobs = [...jobs].sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));

  async function handleDownload(url: string) {
    if (isDownloading) return;
    setIsDownloading(true);
    try {
      await downloadWithWatermark(url);
    } catch {
      window.open(url, '_blank');
    } finally {
      setIsDownloading(false);
    }
  }

  if (loading && jobs.length === 0) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={28} className="animate-spin" style={{ color: '#F370A7' }} />
      </div>
    );
  }

  if (error && jobs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
        <p className="text-[14px] mb-3" style={{ color: theme === 'dark' ? '#9ca3af' : '#6b7280' }}>{t.noTryOnsHint}</p>
        <button
          onClick={onRetry}
          className="px-5 py-2 rounded-full text-[14px] font-semibold active:scale-95 transition-transform"
          style={{ background: '#F370A7', color: '#fff' }}
        >
          {t.retry}
        </button>
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mb-3"
          style={{ background: theme === 'dark' ? '#1f1f1f' : '#F3F4F6' }}
        >
          <Images size={26} style={{ color: theme === 'dark' ? '#888' : '#9ca3af' }} />
        </div>
        <p className="text-[15px] font-bold mb-1" style={{ color: theme === 'dark' ? '#f0f0f0' : '#1f2937' }}>{t.noTryOnsYet}</p>
        <p className="text-[13px]" style={{ color: theme === 'dark' ? '#888' : '#9ca3af' }}>{t.noTryOnsHint}</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex gap-3 hide-scrollbar py-2 overflow-x-auto pl-4">
        {sortedJobs.map((job) => (
          <button
            key={job.id}
            onClick={() => setViewingJob(job)}
            className="relative shrink-0 overflow-hidden rounded-[28px] active:scale-[0.98] transition-transform"
            style={{
              width: 'min(82vw, 340px)',
              height: 440,
              background: theme === 'dark' ? '#1a1a1a' : '#F3F4F6',
              boxShadow: theme === 'dark' ? '0 2px 12px rgba(0,0,0,0.3)' : '0 2px 12px rgba(0,0,0,0.06)',
            }}
          >
            {job.resultImageUrl && (
              <Image src={job.resultImageUrl} alt="Try-on result" fill className="object-cover" unoptimized />
            )}
          </button>
        ))}
        {hasMore && (
          <button
            onClick={onLoadMore}
            disabled={loading}
            className="shrink-0 rounded-[28px] flex items-center justify-center text-[14px] font-semibold active:scale-95 transition-transform disabled:opacity-60"
            style={{
              width: 'min(40vw, 160px)',
              height: 440,
              background: theme === 'dark' ? '#2a2a2a' : '#FFFFFF',
              color: '#F370A7',
              boxShadow: theme === 'dark' ? '0 2px 8px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.08)',
            }}
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : t.loadMore}
          </button>
        )}
        <div className="w-6 shrink-0" />
      </div>

      {/* Full-screen viewer with download */}
      {viewingJob?.resultImageUrl && (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col">
          <div className="shrink-0 flex items-center justify-end px-4 h-14">
            <button
              onClick={() => setViewingJob(null)}
              className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center"
            >
              <X size={17} color="white" />
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center bg-black overflow-hidden">
            <div className="relative" style={{ display: 'inline-flex' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={viewingJob.resultImageUrl}
                alt="Try-on result"
                style={{ maxHeight: 'calc(100dvh - 168px)', maxWidth: '100vw', display: 'block' }}
              />
              <div className="absolute top-3 left-3 z-10 pointer-events-none">
                <p className="text-[13px] font-bold tracking-[0.5px]" style={{ textShadow: '0 0 5px rgba(255,255,255,0.85), 0 1px 4px rgba(0,0,0,0.3)' }}>
                  <span className="text-black">LIB</span><span style={{ color: '#F370A7' }}>Λ</span><span className="text-black">S</span>
                </p>
              </div>
            </div>
          </div>
          <div className="shrink-0 px-5 pb-10 pt-4">
            <button
              onClick={() => handleDownload(viewingJob.resultImageUrl!)}
              disabled={isDownloading}
              className="w-full h-12 rounded-full bg-white text-black text-[13px] font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isDownloading ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              )}
              {t.myLooksSaveLook}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// ── Dress Me tab: three stacked horizontal reels (tops · bottoms · footwear) ────
// Swipe each reel left/right to swap that garment and build a full head-to-toe look.
function DressMeReels({ allItems }: { allItems: ClosetItem[] }) {
  const { t } = useI18n();
  const { theme } = useTheme();

  const tops = allItems.filter((i) => UPPER_CATS.includes(i.category));
  const bottoms = allItems.filter((i) => LOWER_CATS.includes(i.category));
  const footwear = allItems.filter((i) => SHOES_CATS.includes(i.category));

  if (tops.length === 0 && bottoms.length === 0 && footwear.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mb-3"
          style={{ background: theme === 'dark' ? '#1f1f1f' : '#F3F4F6' }}
        >
          <Sparkles size={26} style={{ color: theme === 'dark' ? '#888' : '#9ca3af' }} />
        </div>
        <p className="text-[13px]" style={{ color: theme === 'dark' ? '#888' : '#9ca3af' }}>{t.dressMeNeedsItems}</p>
      </div>
    );
  }

  // Three rows total 440px to match the Boards / Outfits card height.
  return (
    <div className="py-2 flex flex-col gap-0">
      <DressMeReel items={tops} height={165} />
      <DressMeReel items={bottoms} height={165} />
      <DressMeReel items={footwear} height={110} />
    </div>
  );
}

function DressMeReel({ items, height }: {
  items: ClosetItem[];
  height: number;
}) {
  const { theme } = useTheme();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Land on a carousel-style offset: 1st item peeking at the left, 2nd centered.
  useEffect(() => {
    const el = scrollRef.current;
    if (el && items.length > 1) el.scrollLeft = el.clientWidth * 0.6;
  }, [items.length]);

  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <div
          className="rounded-[16px] border-2 border-dashed"
          style={{ width: '60%', height: height - 14, borderColor: theme === 'dark' ? '#333' : '#E5E7EB' }}
        />
      </div>
    );
  }

  // Peeking horizontal carousel — centered garment prominent, neighbors peek L/R.
  // Equal-width leading/trailing spacers (no padding) so every item snaps to the
  // exact same center, keeping the three rows perfectly stacked while scrolling.
  return (
    <div
      ref={scrollRef}
      className="flex items-center overflow-x-auto hide-scrollbar snap-x snap-mandatory"
      style={{ height }}
    >
      <div className="shrink-0" style={{ width: '20%' }} />
      {items.map((item) => (
        <div key={item.id} className="relative shrink-0 h-full snap-center" style={{ width: '60%' }}>
          <Image src={item.imageData} alt={item.category} fill className="object-contain" unoptimized />
        </div>
      ))}
      <div className="shrink-0" style={{ width: '20%' }} />
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
  isAiSuggesting,
  genCount,
  regenLimit,
  onTryItOn,
  tryOnCount,
  tryOnLimit,
  onDelete,
  onAddItem,
  allowAutoGenerate,
  isLocked,
  onShowPlans,
}: {
  allItems: ClosetItem[];
  isEmpty: boolean;
  savedLayout: SavedCanvasLayout | null;
  onViewItems: () => void;
  onRegenerate?: () => void;
  canRegenerate: boolean;
  isAiSuggesting?: boolean;
  genCount: number;
  regenLimit: number;
  onTryItOn?: () => void;
  tryOnCount: number;
  tryOnLimit: number;
  onDelete?: () => void | Promise<void>;
  onAddItem?: (cat: ClosetCategory) => void;
  allowAutoGenerate: boolean;
  isLocked?: boolean;
  onShowPlans?: () => void;
}) {
  const { t } = useI18n();
  const { theme } = useTheme();

  // Valid outfit requires: dress/jumpsuit OR (top + (lower OR shoes)). Uses module-level FULL_BODY_CATS.
  const hasTop = allItems.some((i) => UPPER_CATS.includes(i.category));
  const hasLower = allItems.some((i) => LOWER_CATS.includes(i.category));
  const hasDress = allItems.some((i) => FULL_BODY_CATS.includes(i.category));
  const hasShoes = allItems.some((i) => SHOES_CATS.includes(i.category));
  const canGenerateOutfit = hasDress || (hasTop && hasLower);

  // Build display entries: only from saved layout (set after tapping Regenerate).
  // Canvas stays empty until the user explicitly requests an outfit.
  // No restrictions on layout composition — users can save any combination they want.
  const displayEntries = React.useMemo(() => {
    if (!savedLayout || savedLayout.length === 0) return [];
    const resolved = savedLayout
      .map((entry) => {
        const item = allItems.find((i) => i.id === entry.id);
        if (!item) return null;
        return { item, x: entry.x, y: entry.y, scale: entry.scale, zIndex: entry.zIndex, group: entry.group };
      })
      .filter(Boolean) as { item: ClosetItem; x: number; y: number; scale: number; zIndex: number; group: string }[];
    return resolved;
  }, [savedLayout, allItems]);

  // Auto-trigger regen ONLY when canGenerateOutfit transitions false→true AFTER the
  // initial page load has settled (items + canvases both loaded). This prevents the
  // AI API from being called on every reload, which would burn through the user's quota.
  const prevCanGenerateOutfit = React.useRef(canGenerateOutfit);
  React.useEffect(() => {
    const justBecameReady = !prevCanGenerateOutfit.current && canGenerateOutfit;
    prevCanGenerateOutfit.current = canGenerateOutfit;

    // Only fire when: wardrobe *just* became outfit-ready in this session (user added an item),
    // the initial load has fully settled, and there's still nothing to display.
    if (!justBecameReady) return;
    if (!allowAutoGenerate) return;
    const isDemo = allItems.length > 0 && allItems.every((i) => DEMO_ITEM_IDS.has(i.id));
    if (
      !isDemo &&
      displayEntries.length === 0 &&
      !isAiSuggesting &&
      onRegenerate
    ) {
      onRegenerate();
    }
  }, [canGenerateOutfit, allowAutoGenerate]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      className="shrink-0 rounded-[28px] flex flex-col border border-gray-100 dark:border-gray-700 relative overflow-hidden"
      style={{
        width: 'min(82vw, 340px)',
        height: 440,
        background: theme === 'dark' ? '#1a1a1a' : '#FFFFFF',
        boxShadow: theme === 'dark' ? '0 2px 12px rgba(0,0,0,0.3)' : '0 2px 12px rgba(0,0,0,0.06)',
      }}
    >
      {/* Top-left delete button */}
      {onDelete && (
        <button
          onClick={onDelete}
          className="absolute top-3.5 left-3.5 z-10 w-9 h-9 rounded-full flex items-center justify-center active:scale-[0.95] transition-transform"
          style={{ background: theme === 'dark' ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.08)' }}
          title="Delete"
        >
          <Trash2 size={14} strokeWidth={2.2} className="text-red-400" />
        </button>
      )}

      {/* Top-right action buttons */}
      {(canGenerateOutfit || isEmpty) && (
        <div className="absolute top-3.5 right-3.5 flex flex-col items-center gap-1.5 z-10">
          {onRegenerate && (
            <div className="flex flex-col items-center gap-0.5">
              <button
                onClick={isAiSuggesting || isEmpty ? undefined : onRegenerate}
                disabled={isAiSuggesting || isEmpty}
                className="w-9 h-9 rounded-full flex items-center justify-center active:scale-[0.95] transition-transform disabled:opacity-40"
                style={{
                  background: isAiSuggesting ? 'rgba(99,102,241,0.08)' : (theme === 'dark' ? '#2a2a2a' : '#ffffff'),
                  boxShadow: isAiSuggesting ? 'none' : (theme === 'dark' ? '0 2px 8px rgba(0,0,0,0.4)' : '0 2px 8px rgba(0,0,0,0.14), 0 1px 3px rgba(0,0,0,0.08)'),
                }}
                title={isAiSuggesting ? t.aiThinking : t.regenerateWithAI}
              >
                {isAiSuggesting ? (
                  <Loader2 size={14} strokeWidth={2.2} className="text-indigo-500 animate-spin" />
                ) : (
                  <Sparkles size={18} style={{ color: 'rgb(243, 112, 167)' }} />
                )}
              </button>
              <span className="text-[9px] font-semibold leading-none" style={{ color: isAiSuggesting ? '#6366f1' : '#9ca3af' }}>
                {isAiSuggesting ? 'AI…' : `${genCount}/${regenLimit}`}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Flat-lay Canvas */}
      <div className="flex-1 relative min-h-0 px-5 pt-5 pb-3">
        {isEmpty ? (
          <div className="w-full h-full flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/closet/outfitcard_empty_state.png"
              alt="Empty outfit"
              className="w-full h-full object-contain opacity-80"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          </div>
        ) : isAiSuggesting && displayEntries.length === 0 ? (
          <div className="w-full h-full flex flex-col items-center justify-center gap-3">
            <Loader2 size={28} strokeWidth={1.8} className="text-indigo-400 animate-spin" />
            <p className="text-[13px] font-medium text-gray-400">{t.tryOnGenerating}</p>
          </div>
        ) : displayEntries.length === 0 ? (
          // Progress state — 2 required steps: upper + lower body
          (() => {
            const hasUpper = hasTop || hasDress;
            const hasBottom = hasDress || hasLower;
            const steps = [
              { label: t.upperBody, done: hasUpper, cat: 'tops' as ClosetCategory, emoji: '👕' },
              { label: t.lowerBody, done: hasBottom, cat: 'jeans' as ClosetCategory, emoji: '👖' },
            ];
            const doneCount = steps.filter((s) => s.done).length;
            const pct = Math.round((doneCount / 2) * 100);
            const readyToGenerate = canGenerateOutfit;
            const hintText = readyToGenerate
              ? t.tapRegeneratePrompt
              : !hasUpper
                ? t.addUpperFirst
                : t.addLowerOrShoes;

            return (
              <div className="w-full h-full flex flex-col items-center justify-center gap-4 px-6">
                {/* Icon row */}
                <div className="flex items-end justify-center gap-5">
                  {steps.map((step) => (
                    <div key={step.label} className="flex flex-col items-center gap-1.5">
                      <div
                        className="w-14 h-14 rounded-2xl flex items-center justify-center transition-all"
                        style={{
                          background: step.done
                            ? 'linear-gradient(135deg, rgba(243,112,167,0.15), rgba(243,112,167,0.06))'
                            : theme === 'dark' ? '#2a2a2a' : '#F9FAFB',
                          border: step.done ? '1.5px solid rgba(243,112,167,0.35)' : (theme === 'dark' ? '1.5px dashed #4a4a4a' : '1.5px dashed #E5E7EB'),
                        }}
                      >
                        {step.done ? (
                          <span className="text-[24px] leading-none">{step.emoji}</span>
                        ) : (
                          <button
                            onClick={() => onAddItem?.(step.cat)}
                            className="w-full h-full flex items-center justify-center active:scale-[0.95] transition-transform"
                          >
                            <Plus size={18} strokeWidth={2} style={{ color: theme === 'dark' ? '#666' : '#d1d5db' }} />
                          </button>
                        )}
                      </div>
                      <span
                        className="text-[10px] font-semibold text-center leading-tight"
                        style={{ color: step.done ? '#F370A7' : (theme === 'dark' ? '#666' : '#D1D5DB'), maxWidth: 64 }}
                      >
                        {step.label}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Progress bar */}
                <div className="w-full">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-[11px] font-semibold" style={{ color: theme === 'dark' ? '#888' : '#9ca3af' }}>{doneCount}/2</span>
                    <span className="text-[11px] font-semibold" style={{ color: readyToGenerate ? '#F370A7' : (theme === 'dark' ? '#666' : '#9CA3AF') }}>
                      {readyToGenerate ? t.readyLabel : t.moreNeeded.replace('{n}', String(2 - doneCount))}
                    </span>
                  </div>
                  <div className={`w-full h-2 rounded-full ${theme === 'dark' ? 'dark:bg-gray-700' : 'bg-gray-100'} overflow-hidden`}>
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${pct}%`,
                        background: 'linear-gradient(90deg, #F370A7, #e0409a)',
                      }}
                    />
                  </div>
                </div>

                {/* Hint */}
                <p className="text-[12px] text-center leading-snug -mt-1" style={{ color: theme === 'dark' ? '#888' : '#9ca3af' }}>{hintText}</p>
              </div>
            );
          })()
        ) : (
          <div className="w-full h-full flex items-center justify-center overflow-hidden isolate" style={{ containerType: 'size' }}>
            {/* Inner container matches InteractiveCanvas aspect ratio (3:4) so positions are identical */}
            <div className="relative" style={{ aspectRatio: '3 / 4', width: 'min(75cqh, 100cqw)' }}>
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
          </div>
        )}
      </div>

      {/* Bottom action bar — shown when there's a saved layout, outfit can be generated, or closet is empty */}
      {(displayEntries.length > 0 || canGenerateOutfit || isEmpty) && (
      <div className="flex gap-2.5 px-5 pb-5">
        <button
          onClick={onViewItems}
          className="flex-1 h-[44px] rounded-full flex items-center justify-center text-[12px] font-semibold tracking-wide"
          style={{
            background: theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
            color: theme === 'dark' ? '#aaa' : '#666'
          }}
        >
          {t.viewItems}
        </button>
        {onTryItOn && (displayEntries.length > 0 || canGenerateOutfit || isEmpty) && (
        <button
          onClick={isEmpty ? undefined : onTryItOn}
          disabled={isEmpty}
          className="flex-1 h-[44px] rounded-full flex items-center justify-center gap-1.5 text-[12px] font-bold text-white tracking-wide active:scale-[0.97] transition-transform"
          style={{
            background: 'linear-gradient(135deg, #F370A7 0%, #e0409a 50%, #F370A7 100%)',
            backgroundSize: '200% auto',
            animation: 'tryOnShimmer 2.4s linear infinite, tryOnPulse 2s ease-in-out infinite',
            boxShadow: '0 4px 18px rgba(243,112,167,0.5)',
          }}
        >
          <span>{t.tryItOn}</span>
          <span className="opacity-70 text-[10px] font-medium">{tryOnCount}/{tryOnLimit}</span>
        </button>
        )}
      </div>
      )}

      {/* Locked overlay — shown when plan no longer covers this canvas slot */}
      {isLocked && (
        <div
          className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 cursor-pointer active:scale-[0.98] transition-transform"
          style={{
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            background: theme === 'dark' ? 'rgba(0,0,0,0.40)' : 'rgba(255,255,255,0.30)',
          }}
          onClick={onShowPlans}
        >
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg"
            style={{ background: 'linear-gradient(135deg, #B8860B 0%, #8B6914 100%)' }}
          >
            <Crown size={22} strokeWidth={1.5} color="#FFD700" />
          </div>
          <p className="text-[13px] font-semibold text-gray-700">{t.upgradeToGetMore}</p>
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

// ─── Clothing Section ───────────────────────────────────────────────────────────
interface ClothingSectionProps {
  title: string;
  cats: WardrobeSubcategory[];
  filter: WardrobeSubcategory | null;
  items: ClosetItem[];
  totalCount: number;
  pendingItems?: { id: string; category: ClosetCategory; imageData: string; step: string; progress: number; startedAt: number }[];
  onFilterChange: (cat: WardrobeSubcategory | null) => void;
  onTapItem: (item: ClosetItem) => void;
  onViewAll: () => void;
  onRemovePending?: (id: string) => void;
  onAddItem?: () => void;
}

function ClothingSection({ title, cats, filter, items, totalCount, pendingItems = [], onFilterChange, onTapItem, onViewAll, onRemovePending, onAddItem }: ClothingSectionProps) {
  const { t, locale } = useI18n();
  const isEmpty = items.length === 0 && pendingItems.length === 0;
  return (
    <div className="mt-9">
      {/* Section header */}
      <div className="flex items-center justify-between px-4 mb-3">
        <div className="flex items-center gap-2">
          <h2 className="text-[17px] font-bold text-gray-900 tracking-tight">{title}</h2>
          <span className="px-1.5 py-0.5 rounded-full bg-gray-100 text-[11px] font-semibold text-gray-500">
            {totalCount}
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
              label={taxLabel(cat, locale)}
              selected={filter === cat}
              onClick={() => onFilterChange(cat)}
            />
          ))}
        </div>
      )}

      {/* Horizontal scroll row — or empty state */}
      {isEmpty ? (
        <div className="mx-4 rounded-2xl border border-dashed border-gray-200 flex flex-col items-center justify-center gap-2 py-7 px-4">
          <p className="text-[13px] font-medium text-gray-400">{t.noItemsInSection}</p>
          {onAddItem && (
            <button
              onClick={onAddItem}
              className="px-4 py-1.5 rounded-full text-[12px] font-semibold border active:scale-[0.97] transition-transform"
              style={{ color: '#F370A7', borderColor: 'rgba(243,112,167,0.4)', background: 'rgba(243,112,167,0.06)' }}
            >
              {t.tapPlusToAdd}
            </button>
          )}
        </div>
      ) : (
        <div className="flex gap-2.5 overflow-x-auto hide-scrollbar px-4">
          {pendingItems.map((p) => (
            <ClothingItemCard
              key={p.id}
              item={{ id: p.id, category: p.category, imageData: p.imageData, createdAt: '' }}
              onTap={() => {}}
              isProcessing
              processingStep={p.step}
              processingProgress={p.progress}
              startedAt={p.startedAt}
              onRemove={onRemovePending ? () => onRemovePending(p.id) : undefined}
            />
          ))}
          {items.map((item) => (
            <ClothingItemCard key={item.id} item={item} onTap={() => onTapItem(item)} />
          ))}
        </div>
      )}
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

function ClothingItemCard({ item, onTap, isProcessing, startedAt, onRemove }: { item: ClosetItem; onTap: () => void; isProcessing?: boolean; processingStep?: string; processingProgress?: number; startedAt?: number; onRemove?: () => void }) {
  const { t, locale } = useI18n();

  // Simulated progress — runs a local timer so the card always animates
  // smoothly regardless of whether SSE/polling events arrive.
  // Phases: 0–8s Uploading | 8–20s Checking | 20–40s Generating | 40–55s Removing bg | 55–60s Almost done
  // Progress is capped at 95% until the entry is removed (item done).
  // initialElapsed is computed from startedAt so reloads resume mid-animation.
  const PHASES: { until: number; label: () => string }[] = [
    { until: 8,  label: () => t.uploading },
    { until: 20, label: () => t.stepChecking },
    { until: 40, label: () => t.stepGenerating },
    { until: 55, label: () => t.stepRemovingBg },
    { until: 60, label: () => t.stepAlmostDone },
  ];
  const initialElapsed = startedAt ? Math.min(Math.floor((Date.now() - startedAt) / 1000), 60) : 0;
  const [elapsed, setElapsed] = useState(initialElapsed);
  useEffect(() => {
    if (!isProcessing) return;
    const id = setInterval(() => setElapsed((s) => Math.min(s + 1, 60)), 1000);
    return () => clearInterval(id);
  }, [isProcessing]);

  const currentPhase = PHASES.find((p) => elapsed < p.until) ?? PHASES[PHASES.length - 1];
  const simProgress = Math.min(Math.round((elapsed / 60) * 95), 95);

  return (
    <div
      className={`shrink-0 w-[120px] h-[168px] rounded-2xl overflow-hidden relative cursor-pointer
                 active:scale-[0.97] transition-transform`}
      onClick={isProcessing ? undefined : onTap}
    >
      <div className="relative w-full h-full">
        {item.imageData ? (
          <Image src={item.imageData} alt={item.category} fill className={`object-contain ${isProcessing ? 'opacity-50' : ''}`} unoptimized />
        ) : (
          <div className="w-full h-full bg-gray-200 animate-pulse" />
        )}
      </div>
      {/* Processing overlay */}
      {isProcessing && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/30 backdrop-blur-[2px]">
          {onRemove && (
            <button
              onClick={(e) => { e.stopPropagation(); onRemove(); }}
              className="absolute top-1.5 left-1.5 w-6 h-6 rounded-full bg-black/50 flex items-center justify-center active:bg-black/70 transition-colors"
            >
              <X size={13} className="text-white" />
            </button>
          )}
          <div className="w-8 h-8 mb-1.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
          <span className="text-[9px] font-medium text-white text-center px-2 leading-tight">{currentPhase.label()}</span>
          <div className="w-[70%] h-1 mt-1.5 rounded-full bg-white/20 overflow-hidden">
            <div className="h-full bg-green-400 rounded-full transition-all duration-1000" style={{ width: `${simProgress}%` }} />
          </div>
        </div>
      )}
      {/* Category label */}
      {!isProcessing && (
        <div className="absolute bottom-0 left-0 right-0 px-2.5 py-2"
             style={{ background: 'linear-gradient(transparent, rgba(0,0,0,0.4))' }}>
          <span className="text-[10px] font-medium text-white/90 uppercase tracking-wide">
            {taxLabel(effectiveSubcategory(item), locale)}
          </span>
        </div>
      )}
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
  const { t, locale } = useI18n();
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
                      {taxLabel(effectiveSubcategory(item), locale)}
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

function pickItem(items: ClosetItem[], day: Date): ClosetItem | null {
  if (!items.length) return null;
  const dayIndex = Math.floor(day.getTime() / 86400000);
  return items[dayIndex % items.length];
}

// ── Calendar tab: next-7-days outfit suggestions, window-sized cards ────────────
function CalendarTab({
  allItems,
  calendarDays,
  onShowPlans,
  plansEnabled,
  onTryItOn,
  tryOnCount,
  tryOnLimit,
}: {
  allItems: ClosetItem[];
  calendarDays: number;
  onShowPlans: () => void;
  plansEnabled: boolean;
  onTryItOn: (items: ClosetItem[]) => void;
  canTryOn: boolean;
  tryOnCount: number;
  tryOnLimit: number;
}) {
  const { t } = useI18n();
  const { theme } = useTheme();
  const [selectedDayIdx, setSelectedDayIdx] = useState(0);
  const days = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now); d.setDate(d.getDate() + i); return d;
    });
  }, []);
  const upperItems = allItems.filter((i) => UPPER_CATS.includes(i.category));
  const lowerItems = allItems.filter((i) => LOWER_CATS.includes(i.category));
  const shoeItems = allItems.filter((i) => SHOES_CATS.includes(i.category));
  const shawlItems = allItems.filter((i) => i.category === 'shawl');
  const sideAccItems = allItems.filter((i) => ACC_CATS.includes(i.category) && i.category !== 'shawl');
  const hasItems = allItems.length > 0;

  return (
    <div className="px-4 py-2">
      {!hasItems ? (
        <div className="flex flex-col items-center justify-center h-40 gap-2 text-center">
          <p className="text-[13px] font-medium" style={{ color: theme === 'dark' ? '#888' : '#9ca3af' }}>{t.addItemsFirst}</p>
        </div>
      ) : (() => {
        const selDay = days[selectedDayIdx];
        const upper = pickItem(upperItems, selDay);
        // A dress/jumpsuit is a complete outfit on its own — never pair it with a
        // separate bottom (hard rule H1: no "dress + skirt/pants").
        const upperIsFullBody = !!upper && FULL_BODY_CATS.includes(upper.category);
        const lower = upperIsFullBody ? null : pickItem(lowerItems, selDay);
        const shoe = pickItem(shoeItems, selDay);
        const shawl = pickItem(shawlItems, selDay);
        const sideAcc = pickItem(sideAccItems, selDay);
        const selIsToday = selectedDayIdx === 0 && new Date().toDateString() === selDay.toDateString();
        const selUnlocked = !plansEnabled || selectedDayIdx < calendarDays;
        const headerLabel = `${t.dayNames[selDay.getDay()]}, ${selDay.getDate()} ${t.monthNames[selDay.getMonth()]}`;
        return (
          <>
            {/* Week day selector — makes it read clearly as a calendar */}
            <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-3">
              {days.map((day, i) => {
                const isUnlocked = !plansEnabled || i < calendarDays;
                const isToday = i === 0 && new Date().toDateString() === day.toDateString();
                const selected = i === selectedDayIdx;
                return (
                  <button
                    key={i}
                    onClick={() => setSelectedDayIdx(i)}
                    className="shrink-0 flex flex-col items-center justify-center rounded-2xl active:scale-95 transition-transform"
                    style={{
                      width: 52,
                      height: 64,
                      background: selected
                        ? 'linear-gradient(135deg, #F370A7, #e0559a)'
                        : (theme === 'dark' ? '#1f1f1f' : '#f3f4f6'),
                      opacity: isUnlocked ? 1 : 0.55,
                    }}
                  >
                    <span
                      className="text-[10px] font-semibold leading-none mb-1"
                      style={{ color: selected ? 'rgba(255,255,255,0.85)' : (theme === 'dark' ? '#9ca3af' : '#6b7280') }}
                    >
                      {isToday ? t.today : t.dayNames[day.getDay()]}
                    </span>
                    <span
                      className="text-[17px] font-bold leading-none"
                      style={{ color: selected ? '#fff' : (theme === 'dark' ? '#e5e7eb' : '#1f2937') }}
                    >
                      {day.getDate()}
                    </span>
                    {!isUnlocked && <Crown size={9} strokeWidth={2} color={selected ? '#FFD700' : '#B8860B'} className="mt-0.5" />}
                  </button>
                );
              })}
            </div>

            {/* Selected day's outfit — same 440px footprint as Boards / Outfits */}
            <div
              className="relative rounded-[28px] overflow-hidden flex flex-col"
              style={{
                height: 440,
                background: theme === 'dark' ? '#1a1a1a' : '#FFFFFF',
                boxShadow: theme === 'dark' ? '0 2px 12px rgba(0,0,0,0.3)' : '0 2px 12px rgba(0,0,0,0.06)',
              }}
            >
              {/* Date header band */}
              <div
                className="flex items-center gap-2 px-4 py-3 shrink-0"
                style={{ background: selIsToday ? 'linear-gradient(135deg, #F370A7, #e0559a)' : (theme === 'dark' ? '#222222' : '#fafafa') }}
              >
                <CalendarDays size={18} strokeWidth={2} color={selIsToday ? '#fff' : '#F370A7'} />
                <span className="text-[14px] font-bold" style={{ color: selIsToday ? '#fff' : (theme === 'dark' ? '#e5e7eb' : '#1f2937') }}>
                  {selIsToday ? t.today : headerLabel}
                </span>
              </div>
              {/* Outfit stack */}
              <div className="relative flex-1 flex flex-col">
                <MiniOutfitSlot item={shawl} flex />
                <MiniOutfitSlot item={upper} flex />
                <MiniOutfitSlot item={lower} flex />
                <MiniOutfitSlot item={shoe} flex />
                <MiniOutfitSlot item={sideAcc} flex />

                {/* Blur overlay for locked days — only when plans feature is enabled */}
                {!selUnlocked && (
                  <div
                    className="absolute inset-0 flex items-center justify-center cursor-pointer active:scale-[0.99] transition-transform"
                    style={{
                      backdropFilter: 'blur(8px)',
                      WebkitBackdropFilter: 'blur(8px)',
                      background: 'rgba(255,255,255,0.25)',
                    }}
                    onClick={onShowPlans}
                  >
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg"
                      style={{ background: 'linear-gradient(135deg, #B8860B 0%, #8B6914 100%)' }}
                    >
                      <Crown size={22} strokeWidth={1.5} color="#FFD700" />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Try it on */}
            <button
              onClick={() => {
                if (!selUnlocked) { onShowPlans(); return; }
                const dayItems = [shawl, upper, lower, shoe, sideAcc].filter(Boolean) as ClosetItem[];
                onTryItOn(dayItems);
              }}
              className="w-full h-11 mt-3 rounded-full flex items-center justify-center gap-1.5 text-[13px] font-bold text-white active:scale-[0.97] transition-transform"
              style={{ background: 'linear-gradient(135deg, #F370A7 0%, #e0409a 50%, #F370A7 100%)', backgroundSize: '200% auto', animation: 'tryOnShimmer 2.4s linear infinite', boxShadow: '0 4px 18px rgba(243,112,167,0.45)' }}
            >
              <Sparkles size={13} />
              <span>{t.tryItOn}</span>
              <span className="opacity-60 text-[11px]">{tryOnCount}/{tryOnLimit}</span>
            </button>
          </>
        );
      })()}
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
function selectionFromItem(item: ClosetItem): ItemOptionsSelection {
  if (item.subcategory) {
    const section = sectionForSubcategory(item.subcategory) ?? localCatToSection(item.category);
    return {
      section,
      subcategory: item.subcategory,
      itemType: item.itemType ?? null,
      length: item.length ?? null,
      fitType: item.fitType ?? null,
    };
  }
  // Legacy item without a stored subcategory — land on the matching section.
  return defaultSelectionForSection(localCatToSection(item.category));
}

function ItemEditSheet({
  item,
  onClose,
  onDelete,
  onSave,
}: {
  item: ClosetItem;
  onClose: () => void;
  onDelete: (id: string) => void;
  onSave: (id: string, selection: ItemOptionsSelection) => void;
}) {
  const [selection, setSelection] = useState<ItemOptionsSelection>(() => selectionFromItem(item));
  const { t, locale } = useI18n();
  const { theme } = useTheme();
  const dark = theme === 'dark';

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/30 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[430px] rounded-t-3xl bg-white dark:bg-[#1a1a1a] flex flex-col"
        style={{ maxHeight: '88vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-2 shrink-0">
          <div className="w-9 h-1 rounded-full bg-gray-200 dark:bg-gray-700" />
        </div>

        <div className="overflow-y-auto px-5">
          {/* Image preview */}
          <div className="pt-1 pb-2">
            <div className="w-full rounded-2xl overflow-hidden relative bg-gray-50 dark:bg-[#222]" style={{ aspectRatio: '1/1' }}>
              <Image src={item.imageData} alt={item.category} fill className="object-contain" unoptimized />
            </div>
          </div>

          {/* Current type label */}
          <div className="pb-3">
            <span className="text-[15px] font-semibold text-gray-900 dark:text-white">
              {taxLabel(selection.subcategory, locale)}
            </span>
            <span className="text-[13px] text-gray-400"> · {taxLabel(selection.section, locale)}</span>
          </div>

          {/* Full taxonomy picker */}
          <div className="pb-3">
            <ItemOptionsPicker value={selection} onChange={setSelection} dark={dark} />
          </div>
        </div>

        {/* Delete + Save buttons */}
        <div className="flex gap-2.5 px-5 pt-3 pb-8 shrink-0">
          <button
            onClick={() => onDelete(item.id)}
            className="flex-1 h-12 rounded-full flex items-center justify-center text-[14px] font-semibold text-red-500"
            style={{ background: 'rgba(239,68,68,0.1)' }}
          >
            {t.delete}
          </button>
          <button
            onClick={() => onSave(item.id, selection)}
            disabled={!isSelectionComplete(selection)}
            className="flex-1 h-12 rounded-full bg-black dark:bg-white text-white dark:text-black flex items-center justify-center text-[14px] font-semibold disabled:opacity-30"
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
  reason: 'generation' | 'items' | 'tryOn' | 'canvas';
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
      key: 'free' as UserPlan,
      label: 'Free',
      monthlyPrice: 0,
      yearlyPrice: 0,
      yearlyOriginal: 0,
      color: '#6b7280',
      gradient: '#f3f4f6',
    },
    {
      key: 'pro' as UserPlan,
      label: 'Plus',
      monthlyPrice: 29_000,
      yearlyPrice: 278_400,
      yearlyOriginal: 348_000,
      color: '#F370A7',
      gradient: 'linear-gradient(135deg, #F370A7 0%, #e0559a 100%)',
    },
    {
      key: 'premium' as UserPlan,
      label: 'Premium',
      monthlyPrice: 79_000,
      yearlyPrice: 758_400,
      yearlyOriginal: 948_000,
      color: '#B8860B',
      gradient: 'linear-gradient(135deg, #B8860B 0%, #8B6914 100%)',
    },
  ];

  function handleUpgrade(_planKey: UserPlan) {
    logAnalyticsEvent(Events.UPGRADE_CTA_TAPPED, {
      [Params.TRIGGER]: reason,
      [Params.CURRENT_PLAN]: currentPlan,
      [Params.DESTINATION]: 'telegram_web',
    });
    window.open('https://t.me/libasai_admin', '_blank');
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
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-9 h-1 rounded-full bg-gray-200" />
        </div>

        <div className="px-5 pb-8">
          {/* Header */}
          <div className="flex justify-center mb-3 mt-3">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #F370A7 0%, #e0559a 100%)', boxShadow: '0 4px 20px rgba(243,112,167,0.35)' }}
            >
              <Crown size={26} color="#fff" strokeWidth={1.8} />
            </div>
          </div>

          <h2 className="text-[20px] font-extrabold text-gray-900 text-center mb-2">{t.choosePlan}</h2>
          <p className="text-[13px] text-gray-500 text-center mb-5 leading-snug px-2">
            {reason === 'generation'
              ? t.reachedRegenLimit.replace('{n}', String(PLAN_LIMITS_FALLBACK[currentPlan].regenerations))
              : reason === 'canvas'
              ? t.reachedCanvasLimit.replace('{n}', String(PLAN_LIMITS_FALLBACK[currentPlan].outfitCanvases))
              : reason === 'tryOn'
              ? t.reachedTryOnLimit.replace('{n}', String(PLAN_LIMITS_FALLBACK[currentPlan].tryItOns))
              : t.reachedItemLimit.replace('{n}', String(PLAN_LIMITS_FALLBACK[currentPlan].wardrobeItems))}
          </p>

          {/* Monthly / Yearly toggle */}
          <div className="flex items-center justify-center gap-2 mb-5">
            <button
              onClick={() => setYearly(false)}
              className={`px-4 py-1.5 rounded-full text-[12px] font-semibold transition-colors ${
                !yearly ? 'bg-black text-white' : 'bg-gray-100 text-gray-500'
              }`}
            >
              {t.monthly}
            </button>
            <button
              onClick={() => setYearly(true)}
              className={`px-4 py-1.5 rounded-full text-[12px] font-semibold transition-colors relative ${
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

          {/* Plan cards */}
          <div className="grid grid-cols-3 gap-2 mb-5">
            {plans.map((p) => {
              const isCurrent = currentPlan === p.key;
              const isPro = p.key === 'pro';
              const price = yearly ? p.yearlyPrice : p.monthlyPrice;
              const originalYearly = p.yearlyOriginal;
              const isFree = p.key === 'free';

              return (
                <div
                  key={p.key}
                  className="rounded-2xl flex flex-col relative overflow-visible"
                  style={{
                    border: isPro ? '2.5px solid #F370A7' : '1.5px solid #e5e7eb',
                    paddingTop: isPro ? '20px' : '12px',
                    paddingBottom: '12px',
                    paddingLeft: '10px',
                    paddingRight: '10px',
                    background: isPro ? 'linear-gradient(160deg, #fff5f9 0%, #fff 100%)' : '#fff',
                    boxShadow: isPro ? '0 4px 20px rgba(243,112,167,0.18)' : 'none',
                  }}
                >
                  {/* Most popular badge — Pro only */}
                  {isPro && (
                    <span
                      className="absolute -top-3 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full text-[9px] font-bold text-white whitespace-nowrap"
                      style={{ background: 'linear-gradient(135deg, #F370A7 0%, #e0559a 100%)', boxShadow: '0 2px 8px rgba(243,112,167,0.4)' }}
                    >
                      ⭐ {t.mostPopular}
                    </span>
                  )}

                  {/* Plan icon + name */}
                  <div className="flex flex-col items-center gap-1 mb-2">
                    <Crown size={isPro ? 18 : 15} strokeWidth={2} color={p.color} />
                    <span className="text-[13px] font-bold" style={{ color: p.color }}>{p.label}</span>
                  </div>

                  {/* Price */}
                  <div className="text-center mb-2">
                    {isFree ? (
                      <div className="flex flex-col items-center">
                        <span className="text-[16px] font-bold text-gray-900">0</span>
                        <span className="text-[9px] text-gray-400">{t.sumPerMo}</span>
                      </div>
                    ) : yearly ? (
                      <div className="flex flex-col items-center">
                        <span className="text-[10px] text-gray-400 line-through">{formatPrice(originalYearly)}</span>
                        <span className="text-[15px] font-bold text-gray-900">{formatPrice(price)}</span>
                        <span className="text-[9px] text-gray-400">{t.sumPerYear}</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <span className="text-[15px] font-bold text-gray-900">{formatPrice(price)}</span>
                        <span className="text-[9px] text-gray-400">{t.sumPerMo}</span>
                      </div>
                    )}
                  </div>

                  {/* Features */}
                  <div className="flex flex-col gap-1 mb-3 flex-1">
                    <span className="text-[9px] text-gray-500">{PLAN_LIMITS_FALLBACK[p.key].wardrobeItems} {t.items}</span>
                    <span className="text-[9px] text-gray-500">{PLAN_LIMITS_FALLBACK[p.key].outfitCanvases} {t.outfitCanvases}</span>
                    <span className="text-[9px] text-gray-500">
                      {PLAN_LIMITS_FALLBACK[p.key].regenerations > 0
                        ? `${PLAN_LIMITS_FALLBACK[p.key].regenerations} ${t.regens}`
                        : t.ruleBasedOutfits}
                    </span>
                    <span className="text-[9px] text-gray-500">{PLAN_LIMITS_FALLBACK[p.key].tryItOns} {t.tryOns}</span>
                    {PLAN_LIMITS_FALLBACK[p.key].calendarDays > 0 && (
                      <span className="text-[9px] text-gray-500">{PLAN_LIMITS_FALLBACK[p.key].calendarDays} {t.calDays}</span>
                    )}
                  </div>

                  {/* CTA */}
                  {isCurrent ? (
                    <div className="w-full py-2 rounded-xl text-center text-gray-400 font-medium text-[10px] bg-gray-50">
                      {t.currentPlan}
                    </div>
                  ) : !isFree ? (
                    <button
                      onClick={() => handleUpgrade(p.key)}
                      className="w-full py-2 rounded-xl text-white font-bold text-[10px] active:scale-[0.97] transition-transform"
                      style={{ background: p.gradient, boxShadow: isPro ? '0 2px 10px rgba(243,112,167,0.35)' : 'none' }}
                    >
                      {t.upgrade}
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>

        </div>
      </div>
    </div>
  );
}
