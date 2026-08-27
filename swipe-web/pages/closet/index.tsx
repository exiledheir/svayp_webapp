import { needsUnoptimized } from '@/lib/img';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { Plus, X, Sparkles, Sun, Moon, CalendarDays, TreePine, Camera, Loader2, Crown, Lock, RefreshCw, User, Images, Trash2, ArrowUpRight, BookOpen, Share2, Check, ChevronDown, Send, Pencil } from 'lucide-react';
import { getUser, clearTokens } from '@/lib/auth';
import { useFeatureFlags } from '@/lib/feature-flags-context';
import { FEATURES } from '@/lib/feature-flags';
import { useRootBackGuard } from '@/lib/use-root-back-guard';
import { useOverlayBackClose } from '@/lib/use-overlay-back-close';
import ReactCrop, { type Crop, type PixelCrop } from 'react-image-crop';
import { fetchClosetItems, addClosetItemFromFile, addClosetItemAutoDetect, removeClosetItem, updateClosetItemApi, getClosetItems, addClosetItem, deleteClosetItem, updateClosetItem, getClosetItemById, mapApiItemToClosetItem } from '@/lib/closet-storage';
import type { ClosetItem, ClosetCategory } from '@/lib/closet-storage';
import type { WardrobeUploadStatus, PlanTier, PlanLimits, PlanUsage, TryOnJobResponse, WardrobeSection, WardrobeSubcategory, Product } from '@/types';
import ItemOptionsPicker, { defaultSelectionForSection, isSelectionComplete, type ItemOptionsSelection } from '@/components/closet/ItemOptionsPicker';
import { subcategoryToLocal, sectionForSubcategory, subcategoriesForSection, SECTION_ORDER, localToSubcategory, taxLabel } from '@/lib/wardrobe-taxonomy';
import { getUserPlan, generateOutfitSuggestions, fetchAiCanvasSuggest, createTryOnJob, watchTryOnUntilDone, getOutfitCalendar, createOutfitCanvas, updateOutfitCanvas, deleteOutfitCanvas, getOutfitCanvases, getOutfitCanvas, listUploads, watchUploadUntilDone, getTryOnJob, getTryOnJobHistory, deleteTryOnJob, getUserProfile, addWardrobeItemFromCatalog, createBeautifyJob, watchBeautifyUntilDone, commitBeautify } from '@/lib/wardrobe-api';
import type { SseHandle } from '@/types';
import { useI18n } from '@/lib/i18n';
import type { Locale } from '@/lib/translations';
import { isCanvasHintSeen, setCanvasHintSeen, isGetStartedDone, setGetStartedDone } from '@/lib/onboarding-storage';
import { saveTryOnResult, saveActiveTryOnJob, getActiveTryOnJobWithCloud, clearActiveTryOnJob } from '@/lib/tryon-history';
import { logAnalyticsEvent, clearAnalyticsUser } from '@/lib/analytics';
import { fetchStylistAccess } from '@/lib/stylist';
import { reportPurchaseFunnel } from '@/lib/purchase-funnel';
import { Events, Params } from '@/lib/analytics-events';
import { useTheme } from '@/lib/theme';
import { isInFlutterWebView } from '@/lib/flutter-bridge';
import { shareImageBlob, fetchImageBlob } from '@/lib/share-image';
import ShareSheet from '@/components/ShareSheet';
import GetStartedCard from '@/components/closet/GetStartedCard';
import AddItemSheet from '@/components/closet/AddItemSheet';
import UploadReviewSheet, { type ReviewBeautifyState } from '@/components/closet/UploadReviewSheet';
import BeautifyCompareSheet from '@/components/closet/BeautifyCompareSheet';
import BeautifyIntroSheet from '@/components/closet/BeautifyIntroSheet';
import { DEMO_ITEM_IDS, DEMO_ITEMS, DEMO_CANVAS_LAYOUT } from '@/lib/closet-demo';
import { isSetupDone, isSetupSatisfied, wasSetupEntered } from '@/lib/closet-setup';
import CoinsSheet from '@/components/closet/CoinsSheet';
import PlansSheet from '@/components/closet/PlansSheet';
import { fetchEntitlements, type Entitlements } from '@/lib/entitlements';
import Diamond from '@/components/closet/Diamond';
import { ACTION_COST, actionCosts, fetchCoinBalance, fetchCoinPricing, type CoinPricing } from '@/lib/coins';
import { fetchPaymentOptions, type PaymentOptions } from '@/lib/payments';
import { isInsufficientCoins, describeApiError } from '@/lib/api';
import ItemDetailSheet from '@/components/closet/ItemDetailSheet';
import ClosetSectionTabs from '@/components/ClosetSectionTabs';
import { getMyPosts } from '@/lib/feed-api';
import { saveUploadPreview, getUploadPreview, clearUploadPreview } from '@/lib/upload-previews';
import { compressImageForUpload } from '@/lib/image-utils';
import {
  UPPER_CATS, FULL_BODY_CATS, LOWER_CATS, SHOES_CATS, ACC_CATS,
  type SavedCanvasEntry, type SavedCanvasLayout,
  generateRandomOutfit, buildLayoutFromIds,
} from '@/lib/closet-types';
import { captureCanvasSnapshot, downloadWithWatermark, shareWatermarked } from '@/lib/canvas-snapshot';
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

// One item in the optimistic batch review: the user's original preview plus the
// taxonomy selection they build in the review (persisted to the backend row on
// "Add to Closet"). `previewImage` is a data URL held only for the review.
type BatchReviewItem = { localId: string; previewImage: string; selection: ItemOptionsSelection };

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

// Item target for the "Add N items to unlock" get-started card (= free-plan limit).
const GET_STARTED_TARGET = 5;


// ─── Plan system ────────────────────────────────────────────────────────────────
type UserPlan = PlanTier;

const PLAN_LIMITS_FALLBACK: Record<UserPlan, PlanLimits> = {
  free:    { wardrobeItems: 10,  outfitCanvases: 1, tryItOns: 2,  regenerations: 5,  calendarDays: 2 },
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

  const lastPlanFetchRef = useRef(0);

  const fetchPlan = useCallback(async () => {
    lastPlanFetchRef.current = Date.now();
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

  // Re-fetch plan when the user returns to this tab so that backend-side
  // resets (e.g. subscription or usage reset by admin) are reflected.
  // Throttled to once per minute: every app switch fired a fresh GET /me/plan,
  // while mutation paths (upload/try-on) still refresh it immediately.
  useEffect(() => {
    function handleVisibility() {
      if (!document.hidden && Date.now() - lastPlanFetchRef.current > 60_000) {
        fetchPlan();
      }
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
    totalItems,
  };
}

// ─── Main Page ──────────────────────────────────────────────────────────────────
export default function ClosetPage() {
  const router = useRouter();
  const { t, locale, setLocale } = useI18n();
  const { theme, setTheme } = useTheme();
  const { plansEnabled, profileEnabled } = useFeatureFlags();
  const { closetV2 } = FEATURES;

  // Root tab page — trap Back so it doesn't exit to a blank WebView screen.
  useRootBackGuard();
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  // Доступ к AI-стилисту решает сервер (флаги feature.stylist.* + вайтлист беты).
  // По умолчанию false: до ответа кнопку не рисуем, чтобы она не мигала у тех, кому не положена.
  const [stylistAvailable, setStylistAvailable] = useState(false);
  const [showItemTips, setShowItemTips] = useState(false);
  const [userInfo, setUserInfo] = useState<{ name?: string; phoneNumber?: string } | null>(null);
  // The native Flutter app has its own profile entry point, so hide the header
  // profile button when the closet is rendered inside the Flutter WebView. Keep
  // it in a plain browser and inside the Telegram Mini App. Resolved after mount
  // to avoid a hydration mismatch (server always renders the browser variant).
  const [isFlutterWebView, setIsFlutterWebView] = useState(false);
  useEffect(() => { setIsFlutterWebView(isInFlutterWebView()); }, []);

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
  // ── "Add N items to unlock" get-started card ──────────────────────────────
  const realItemCount = useMemo(
    () => items.filter((i) => !DEMO_ITEM_IDS.has(i.id)).length,
    [items],
  );
  // Resolved after mount (localStorage) to avoid a hydration mismatch.
  const [gsHidden, setGsHidden] = useState(true);
  useEffect(() => { setGsHidden(isGetStartedDone()); }, []);
  // Auto-complete once the item target is reached.
  useEffect(() => {
    if (!gsHidden && realItemCount >= GET_STARTED_TARGET && !isGetStartedDone()) {
      setGetStartedDone();
      setGsHidden(true);
      logAnalyticsEvent(Events.GET_STARTED_CARD_COMPLETED, { [Params.ITEM_COUNT]: realItemCount });
    }
  }, [gsHidden, realItemCount]);
  const showGetStarted = !gsHidden && realItemCount < GET_STARTED_TARGET;
  // ── First-run setup gate ──────────────────────────────────────────────────
  // Getting the first two garments in is the job of the dedicated /closet/setup
  // screen — the old in-page gate (education carousel + docked progress loader)
  // is gone, because users read the carousel as something to swipe and never
  // found the add action underneath it.
  //
  // `firstLoadDone` gates the redirect so existing users never bounce before
  // their items arrive.
  const realItems = useMemo(() => items.filter((i) => !DEMO_ITEM_IDS.has(i.id)), [items]);
  const [firstLoadDone, setFirstLoadDone] = useState(false);
  useEffect(() => {
    if (!firstLoadDone || isSetupSatisfied(realItems) || isSetupDone()) return;
    // An empty closet is always a first run. One item + the "setup started"
    // marker means they were killed mid-setup and should resume; one item
    // WITHOUT it is a legacy account, which we never drag into setup.
    if (realItems.length === 0 || wasSetupEntered()) router.replace('/closet/setup');
  }, [firstLoadDone, realItems, router]);
  // ── Гардероб = ОДНА сетка на 3 колонки с фильтрами ──────────────────────
  // Раньше это были шесть горизонтальных лент по разделам: вещи было видно
  // только «по три штуки в окошко», и до нижних разделов приходилось листать
  // весь экран. Теперь всё в одном гриде, а раздел/тип — фильтры над ним.
  const [gridSection, setGridSection] = useState<WardrobeSection | 'ALL'>('ALL');
  const [gridType, setGridType] = useState<WardrobeSubcategory | null>(null);
  const [gridSort, setGridSort] = useState<'recent' | 'oldest'>('recent');
  const [sortMenu, setSortMenu] = useState(false);
  const [canvasData, setCanvasData] = useState<{ upper: ClosetItem[]; lower: ClosetItem[]; shoes: ClosetItem[]; acc: ClosetItem[] } | null>(null);
  // Multi-canvas state: each board has a backend id + layout
  const [canvases, setCanvases] = useState<{ id: string | null; layout: SavedCanvasLayout }[]>([]);
  const [editingCanvasIdx, setEditingCanvasIdx] = useState<number | null>(null);
  const [canvasInitialLayout, setCanvasInitialLayout] = useState<SavedCanvasLayout | null>(null);
  // ── First-outfit auto-generation guard ────────────────────────────────────
  // User-scoped (falls back to a device key before the profile has loaded) so a
  // re-registration or second account on the SAME device still gets its first
  // outfit auto-built. The old flag was device-wide and never cleared, so anyone
  // who had already run the flow once — re-registration, shared/test device —
  // was left staring at an empty canvas. Written only AFTER a generation
  // actually succeeds (see handleNewOutfit), so a failed first attempt retries
  // on the next visit instead of sticking forever.
  const firstOutfitKey = useMemo(() => {
    const u = getUser();
    const uid = (u?.id ?? u?.userId ?? u?.user_id) as string | number | undefined;
    return `libas_first_outfit_autogen:${uid ?? 'device'}`;
  }, []);
  // Default `true` (assume done) until the client-side read settles, so we never
  // fire before knowing the guard's real value (localStorage is unavailable in SSR).
  const [autoGenDone, setAutoGenDone] = useState(true);
  useEffect(() => {
    try { setAutoGenDone(localStorage.getItem(firstOutfitKey) === '1'); }
    catch { setAutoGenDone(false); }
  }, [firstOutfitKey]);
  const markFirstOutfitDone = useCallback(() => {
    setAutoGenDone(true);
    try { localStorage.setItem(firstOutfitKey, '1'); } catch { /* private mode */ }
  }, [firstOutfitKey]);
  // ── Closet top-section tabs: Boards / Outfits / Dress Me ─────────────────
  const [closetTab, setClosetTab] = useState<'boards' | 'outfits' | 'dressme' | 'calendar'>('boards');
  // Honour ?tab=… so tapping Boards/Outfits/Calendar from the Feed page (which
  // renders the same tab strip) returns here on the chosen tab.
  useEffect(() => {
    const q = router.query.tab;
    if (q === 'boards' || q === 'outfits' || q === 'calendar') setClosetTab(q);
  }, [router.query.tab]);
  // Arriving from first-run setup via "Generate my first outfit": re-arm the
  // auto-generation guard so Boards shows a real board instead of an empty tab,
  // then strip the flag so a reload doesn't generate again.
  const forcedFirstOutfitRef = useRef(false);
  // `?tryOn=1` (setup's "Try it on"): open the try-on once that first board
  // actually exists — setup can't run the flow itself, it needs the outfit.
  const pendingSetupTryOnRef = useRef(false);
  useEffect(() => {
    if (router.query.firstOutfit !== '1' || forcedFirstOutfitRef.current) return;
    forcedFirstOutfitRef.current = true;
    pendingSetupTryOnRef.current = router.query.tryOn === '1';
    setAutoGenDone(false);
    setClosetTab('boards');
    router.replace('/closet?tab=boards', undefined, { shallow: true });
  }, [router.query.firstOutfit]); // eslint-disable-line react-hooks/exhaustive-deps
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

  // Календарь живёт вкладкой внутри /closet, поэтому по смене роута его не видно —
  // без этого события его использование не попадает в аналитику вообще.
  useEffect(() => {
    if (closetTab === 'calendar') {
      logAnalyticsEvent(Events.CLOSET_CALENDAR_VIEWED);
    }
  }, [closetTab]);
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
  // 'browse' = opened from the header diamond chip (no "not enough" prompt).
  const [showPremiumGate, setShowPremiumGate] = useState<'generation' | 'items' | 'tryOn' | 'canvas' | 'browse' | 'beautify' | null>(null);
  const { plan, limits, usage, fetchPlan, canGenerate, canTryOn } = usePlan();
  // Diamond/coin balance — реальный баланс с бэка (/me/coins). Рефетчим после
  // каждого платного действия (см. refreshCoins) и при открытии CoinsSheet.
  const [coins, setCoinsState] = useState(0);
  const [coinPricing, setCoinPricing] = useState<CoinPricing | null>(null);
  // Способы оплаты приходят персонально: пока идёт тестовый период, онлайн-оплату видит
  // только вайтлист, остальные покупают по-прежнему через Telegram.
  const [paymentOptions, setPaymentOptions] = useState<PaymentOptions | null>(null);
  const refreshCoins = useCallback(() => {
    return fetchCoinBalance().then((b) => setCoinsState(b.balance)).catch(() => { /* offline — keep last known */ });
  }, []);

  // Тарифы и текущие права. Экран подписки открывается ТОЛЬКО когда сервер разрешил
  // (flags.paywallEnabled) и в каталоге есть что показать: пустая шторка хуже её отсутствия.
  const [entitlements, setEntitlements] = useState<Entitlements | null>(null);
  const [showPlans, setShowPlans] = useState<string | null>(null);
  const refreshEntitlements = useCallback(() => {
    return fetchEntitlements()
      .then(setEntitlements)
      .catch(() => { /* старый бэк или офлайн — экран тарифов просто не показываем */ });
  }, []);
  const plansAvailable = !!entitlements?.flags.paywallEnabled && (entitlements?.plans.length ?? 0) > 0;

  // Купленный тариф в шапке. Тир берём из entitlements — сервер уже учёл истечение срока
  // и глобальный kill-switch, поэтому вчерашний премиум сам собой станет обычной короной.
  // Цвета сохранены от прежнего экрана тарифов: Plus розовый, Премиум золотой.
  const activeTier = entitlements?.tier ?? 'FREE';
  const isPaidTier = activeTier !== 'FREE';
  const tierLabel = activeTier === 'PRO' ? 'Plus' : t.pl_title;
  const tierColor = activeTier === 'PRO' ? '#F370A7' : '#B8860B';

  // Промокод применяется в НАТИВНОМ экране профиля Flutter, а этот таб сидит в IndexedStack
  // и не перемонтируется — сам он о начислении не узнает. Нативная оболочка дёргает эту
  // функцию после активации бонусного кода (см. WebViewBridge.requestCoinsRefresh).
  // Тот же приём, что у __setNativeTheme / __setNativeLocale.
  useEffect(() => {
    (window as unknown as { __svaypRefreshCoins?: () => void }).__svaypRefreshCoins = () => {
      void refreshCoins();
    };
    return () => {
      delete (window as unknown as { __svaypRefreshCoins?: () => void }).__svaypRefreshCoins;
    };
  }, [refreshCoins]);
  useEffect(() => {
    refreshCoins();
    fetchCoinPricing().then(setCoinPricing).catch(() => { /* fallback to local constants */ });
    fetchPaymentOptions().then(setPaymentOptions).catch(() => { /* нет ответа → Telegram-флоу */ });
    void refreshEntitlements();
  }, [refreshCoins, refreshEntitlements]);

  // Монеты реально списываются только когда включён enforcement И юзер на FREE
  // (у pro/premium — старые безлимитные квоты, монеты не тратятся — зеркалит
  // CoinGateService на бэке). В этом режиме платные действия гейтим по БАЛАНСУ
  // МОНЕТ, а не по старой подписочной квоте (иначе исчерпанная квота FREE ложно
  // открывала CoinsSheet «недостаточно», хотя монет полно).
  const coinsApply = !!coinPricing?.enforcementEnabled && plan === 'free';
  const coinCosts = actionCosts(coinPricing);

  // Single overall wardrobe item limit (across all categories), not per category.
  // Demo items don't count toward the limit.
  // Pending (in-flight) uploads are included so rapid back-to-back submissions
  // can't bypass the cap before any upload completes.
  function canAddItem(): boolean {
    // Под монетами «Добавить одежду — Бесплатно» и без подписочного лимита вещей.
    if (coinsApply) return true;
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
      reportPurchaseFunnel('PAYWALL_SHOWN', showPremiumGate);
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
          // Бэк вернул НОЛЬ досок. Восстанавливаем «залипшую» пустую канву:
          let restored = false;
          try {
            const s = localStorage.getItem('svayp_saved_layout');
            if (s) {
              const layout = JSON.parse(s) as SavedCanvasLayout;
              if (Array.isArray(layout) && layout.length > 0) {
                setCanvases([{ id: null, layout }]);
                // До-сохраняем на бэк: прежние версии могли показать доску только
                // локально и молча не сохранить — теперь она переживёт перезаход.
                saveCanvasToBackend(layout, 0);
                restored = true;
              }
            }
          } catch { /* ignore */ }
          // Нет локального layout, но авто-ген уже помечен «сделано» (прошлая
          // генерация не сохранилась под старым багом) → разово сбрасываем флаг,
          // чтобы авто-ген смог собрать первый образ заново.
          if (!restored) {
            try {
              const recoveryKey = `${firstOutfitKey}:recovered`;
              if (localStorage.getItem(firstOutfitKey) === '1' && localStorage.getItem(recoveryKey) !== '1') {
                localStorage.removeItem(firstOutfitKey);
                localStorage.setItem(recoveryKey, '1');
                setAutoGenDone(false);
              }
            } catch { /* ignore */ }
          }
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

  // Доски образов бесплатны и не лимитируются планом (решение продукта, июль 2026).
  // Платной остаётся AI-генерация образа (💎, гейт `canGenerate` ниже).
  const canAddCanvas = true;

  // Demo mode: true when ALL items in the wardrobe are the placeholder demo items
  const hasDemoItems = items.length > 0 && items.every((i) => DEMO_ITEM_IDS.has(i.id));
  // In demo mode always show the pre-built canvas — ignore any stale localStorage canvases
  const displayCanvases: typeof canvases = hasDemoItems
    ? [{ id: null, layout: DEMO_CANVAS_LAYOUT }]
    : canvases;

  const [editItem, setEditItem] = useState<ClosetItem | null>(null);
  const [tryOnState, setTryOnState] = useState<{ status: 'loading' | 'processing' | 'completed' | 'failed'; resultUrl?: string; jobId?: string; failureReason?: string; previewImages?: string[]; personImage?: string } | null>(null);

  // Close the canvas overlay (X button AND hardware Back). Removes a brand-new
  // empty canvas entry so cancelling creation doesn't leave a blank board.
  const closeCanvas = () => {
    if (editingCanvasIdx !== null) {
      const c = canvases[editingCanvasIdx];
      if (c && !c.id && c.layout.length === 0) {
        setCanvases((prev) => prev.filter((_, i) => i !== editingCanvasIdx));
      }
    }
    setEditingCanvasIdx(null);
    setCanvasData(null);
  };

  // Hardware/gesture Back closes full-screen overlays (canvas, try-on, item
  // editor) instead of navigating the WebView away to another tab.
  useOverlayBackClose(canvasData !== null, closeCanvas);
  useOverlayBackClose(tryOnState !== null, () => setTryOnState(null));
  useOverlayBackClose(editItem !== null, () => setEditItem(null));
  const [showTryOnConfirm, setShowTryOnConfirm] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  /** Canvas ids already re-created after a 404 — one attempt each. */
  const recreatedCanvasIdsRef = useRef<Set<string>>(new Set());
  /** A 5xx recreate is allowed ONCE per session: a backend that fails every PUT
   *  hands back a fresh id each time, so a per-id budget would quietly turn
   *  every autosave into another duplicate board. */
  const recreatedAfterServerErrorRef = useRef(false);
  const [tryOnDeleteFailed, setTryOnDeleteFailed] = useState(false);
  const [outfitToastMsg, setOutfitToastMsg] = useState<string | null>(null);
  // Closet v2: shop-catalog instant-add progress (per product id)
  const [addingProductIds, setAddingProductIds] = useState<Set<string>>(new Set());
  const [addedProductIds, setAddedProductIds] = useState<Set<string>>(new Set());
  // Closet v2: ids awaiting the post-upload detect & review sheet
  const [reviewIds, setReviewIds] = useState<string[]>([]);
  // Closet v2: item currently open in the Beautify compare sheet
  const [beautifyItem, setBeautifyItem] = useState<ClosetItem | null>(null);
  // Beautify в фоне: тап → закрываем модалку, показываем loader на вещи в гардеробе,
  // enhance крутится в фоне; по готовности открываем сравнение с готовым результатом.
  const [beautifyingIds, setBeautifyingIds] = useState<Set<string>>(new Set());
  const [beautifyPreset, setBeautifyPreset] = useState<{ url: string; jobId: string } | null>(null);

  async function startBeautifyBackground(item: ClosetItem) {
    if (beautifyingIds.has(item.id)) return;
    setBeautifyItem(null); // не держим модалку — уходим в гардероб
    setBeautifyingIds((prev) => new Set(prev).add(item.id));
    const clear = () => setBeautifyingIds((prev) => { const n = new Set(prev); n.delete(item.id); return n; });

    // Вещи из магазина сюда не попадают: они приходят СРАЗУ улучшенными
    // (клон с PROCESSED) и кнопки ✨ на них нет.
    try {
      const job = await createBeautifyJob(item.id);
      const done = await watchBeautifyUntilDone(item.id, job.beautifyJobId);
      if (done.status === 'COMPLETED' && done.beautifiedUrl) {
        // Без окна сравнения — сразу применяем улучшенный вариант.
        try { await commitBeautify(item.id, job.beautifyJobId, 'BEAUTIFIED'); } catch { /* best-effort */ }
        const url = done.beautifiedUrl;
        // Держим loader, пока НОВАЯ картинка не докачается (иначе после снятия
        // loader'а пару секунд видна старая) → переключение мгновенное.
        await new Promise<void>((resolve) => {
          const im = new window.Image();
          const finish = () => resolve();
          im.onload = finish; im.onerror = finish;
          setTimeout(finish, 7000); // страховка от вечного ожидания
          im.src = url;
        });
        setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, imageData: url, fullImage: url, beautified: true } : i)));
        clear();
        try { localStorage.setItem('svayp_has_beautified', '1'); } catch { /* private mode */ }
        setOutfitToastMsg(t.cv_bt_beautified);
        setTimeout(() => setOutfitToastMsg(null), 2000);
        refreshCoins(); // Beautify платный — обновляем баланс
        load();
      } else {
        clear();
        setOutfitToastMsg(t.cv_bt_failed);
        setTimeout(() => setOutfitToastMsg(null), 2500);
      }
    } catch (err) {
      clear();
      if (isInsufficientCoins(err)) { setShowPremiumGate('beautify'); return; }
      setOutfitToastMsg(t.cv_bt_failed);
      setTimeout(() => setOutfitToastMsg(null), 2500);
    }
  }
  // Closet v2: "Introducing Beautify" educational popup (predefined before/after
  // demo). Всплывает САМ, как только фото обработались (фон убран + категория
  // определена) — см. эффект авто-показа в batch-секции ниже.
  // localIds — строки ревью, itemId — вещь из гардероба (тап ✨ на карточке).
  const [beautifyIntroFor, setBeautifyIntroFor] = useState<{
    from: 'beautify' | 'add' | 'wardrobe' | 'auto';
    localIds?: string[];
    itemId?: string;
  } | null>(null);
  // Какие фото отмечены в попапе (при батче их можно снимать — цена пересчитывается).
  const [introPicked, setIntroPicked] = useState<Set<string>>(new Set());
  // Closet v2: Beautify requested in the add step → auto-open compare once the
  // item finishes uploading; plus the first-run explainer.
  const [addBeautifyRequested, setAddBeautifyRequested] = useState(false);
  const [showBeautifyIntro, setShowBeautifyIntro] = useState(false);
  const [pendingBeautifyId, setPendingBeautifyId] = useState<string | null>(null);
  useEffect(() => {
    if (!pendingBeautifyId) return;
    const it = items.find((i) => i.id === pendingBeautifyId);
    if (it) { setPendingBeautifyId(null); startBeautifyBackground(it); }
  }, [pendingBeautifyId, items]);
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
  // After an item is added (from the library/catalog or a photo), scroll the
  // closet down to that item's section so the user actually sees it appear /
  // process — landing back at the top hid where the item went.
  const [scrollTargetSection, setScrollTargetSection] = useState<WardrobeSection | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const cropImgRef = useRef<HTMLImageElement>(null);
  const addFileRef = useRef<File | null>(null);
  // ── Closet v2 — Acloset-style batch add (optimistic) ─────────────────────
  // Промежуточного экрана обработки НЕТ: после выбора фото сразу открывается
  // ревью, а строки сами показывают «Определяем категорию…», пока идёт фоновый
  // аплоад. Отдельный full-screen «Готовим вещь» дублировал ровно тот же текст
  // и ощущался лишним шагом.
  // Local review items; edited in memory until finalize.
  const [batchReview, setBatchReview] = useState<BatchReviewItem[]>([]);
  // localIds whose AI category detection (ANALYZE) is still in flight — the row
  // shows a "determining…" state until it resolves, then AI pre-fills the category.
  const [batchDetecting, setBatchDetecting] = useState<Set<string>>(new Set());
  const [batchReviewOpen, setBatchReviewOpen] = useState(false);
  const [finalizingBatch, setFinalizingBatch] = useState(false);
  // localId → background upload result (real wardrobe id once done).
  const uploadTrackerRef = useRef<Map<string, { promise: Promise<void>; realId: string | null; failed: boolean }>>(new Map());
  // localIds the USER explicitly edited in the review sheet (via editBatchCategory).
  // finalizeBatch only PATCHes these — the AI-detected selection for everything else
  // is already persisted server-side by ANALYZE, so re-sending it is redundant AND
  // unsafe: ANALYZE's raw length/fitType strings (e.g. GPT output like "mid") aren't
  // guaranteed to match the Length/FitType enum constants (MIDI, REGULAR, …), so
  // round-tripping them through this PATCH can 400. User edits always come from the
  // picker UI, which only emits valid canonical enum values.
  const userEditedLocalIdsRef = useRef<Set<string>>(new Set());

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
      // Refresh the diamond balance too — it was going stale on pull-to-refresh.
      await Promise.all([load(), fetchPlan(), refreshCoins()]);
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

  // Показать только что добавленную вещь: сбрасываем фильтры (иначе новая
  // карточка может не подходить под активный раздел/тип и «пропадёт») и
  // прокручиваем к началу сетки, где она стоит первой.
  useEffect(() => {
    if (!scrollTargetSection) return;
    // На «Образах» и «Календаре» гардероба на странице нет — сначала возвращаемся
    // к доскам (эффект повторится, когда сетка смонтируется), иначе вещь молча
    // «уедет» в скрытый блок.
    if (closetTab === 'outfits' || closetTab === 'calendar') { setClosetTab('boards'); return; }
    setGridSection('ALL');
    setGridType(null);
    setGridSort('recent');
    const container = mainScrollRef.current;
    const el = document.getElementById('closet-grid');
    if (container && el) {
      const top = container.scrollTop + (el.getBoundingClientRect().top - container.getBoundingClientRect().top) - 8;
      container.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
    }
    setScrollTargetSection(null);
  }, [scrollTargetSection, pendingUploads, items, closetTab]);

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
    setAddBeautifyRequested(false);
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



  // Майлстоун гардероба: шлём текущее число реальных вещей (без демо) после
  // каждого сохранения — воронка на бэке матчит item_count >= N.
  function logWardrobeMilestone() {
    const realCount = items.filter((i) => !DEMO_ITEM_IDS.has(i.id)).length + 1;
    logAnalyticsEvent(Events.WARDROBE_MILESTONE, { [Params.ITEM_COUNT]: realCount });
  }

  function handleAddFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (files.length === 0) return;
    logAnalyticsEvent(Events.ADD_ITEM_PHOTO_SELECTED, { [Params.FLOW]: 'closet' });
    // Closet v2 — go straight to the Acloset-style batch flow (no crop, no manual
    // category; the AI detects everything). The legacy crop→details wizard is only
    // used in the non-v2 path.
    if (closetV2) { handleBatchFiles(files); return; }
    const file = files[0];
    addFileRef.current = file;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setAddRawImage(ev.target?.result as string);
      // Pre-select full image so corner handles are visible immediately (crop is optional)
      setAddCrop({ unit: '%', x: 0, y: 0, width: 100, height: 100 });
      setAddCompletedCrop(undefined);
    };
    reader.readAsDataURL(file);
  }

  // ── Closet v2 — Acloset-style batch add ────────────────────────────────────
  // Upload every selected photo with no category hint (the ANALYZE step detects
  // it), showing a live processing screen. When all finish we route items the AI
  // couldn't classify to the "fix category" sheet, then everything to the review
  // list (per-item beautify + edit + "Add to Closet").
  async function handleBatchFiles(files: File[]) {
    if (plansEnabled && !canAddItem()) { setShowPremiumGate('items'); return; }
    setShowAddPicker(false);

    const jobs = files.map((_, i) => ({ localId: `batch_${Date.now()}_${i}` }));
    // Все строки стартуют в состоянии "AI определяет категорию"; снимается по мере
    // готовности ANALYZE в фоновом аплоаде ниже.
    setBatchDetecting(new Set(jobs.map((j) => j.localId)));

    // Read data-URL previews (shown in the review rows until the cutout arrives).
    const previews: Record<string, string> = {};
    await Promise.all(files.map((f, i) => new Promise<void>((resolve) => {
      const reader = new FileReader();
      reader.onload = (ev) => { previews[jobs[i].localId] = (ev.target?.result as string) ?? ''; resolve(); };
      reader.onerror = () => resolve();
      reader.readAsDataURL(f);
    })));

    // Ревью открывается СРАЗУ — до и независимо от бэкенда. Категории приедут в
    // строки по мере готовности ANALYZE (batchDetecting).
    setReviewBeautify(new Map());
    reviewBeautifyRunRef.current = new Set();
    setBatchReview(jobs.map((j) => ({
      localId: j.localId,
      previewImage: previews[j.localId] ?? '',
      selection: defaultSelectionForSection('TOPS'),
    })));
    setBatchReviewOpen(true);

    // Start the real uploads in the BACKGROUND (concurrency-capped) and track each
    // item's promise + resulting wardrobe id.
    const tracker = new Map<string, { promise: Promise<void>; realId: string | null; failed: boolean }>();
    let active = 0;
    const waiters: (() => void)[] = [];
    const acquire = () => (active < 3 ? (active++, Promise.resolve()) : new Promise<void>((r) => waiters.push(() => { active++; r(); })));
    const release = () => { active--; const w = waiters.shift(); if (w) w(); };
    jobs.forEach((j, i) => {
      const rec = { promise: Promise.resolve(), realId: null as string | null, failed: false };
      rec.promise = (async () => {
        await acquire();
        try {
          const file = await compressImageForUpload(files[i]);
          // Пре-заполняем строку ревью, как только у вещи ЕСТЬ категория+вырезка.
          // ML шлёт ANALYZE-колбэк сразу по готовности gpt (раньше конца пайплайна),
          // поэтому не ждём COMPLETED — категория появляется на ~10с раньше.
          let prefilled = false;
          const prefill = async (realId: string, done: boolean) => {
            if (prefilled) return;
            try {
              const detected = await getClosetItemById(realId);
              if (!detected.subcategory && !done) return; // категория ещё не записана
              prefilled = true;
              const localId = j.localId;
              const cutout = detected.imageData || detected.thumbnailUrl;
              setBatchReview((prev) => prev.map((ri) =>
                ri.localId === localId
                  ? { ...ri, selection: selectionFromItem(detected), previewImage: cutout || ri.previewImage }
                  : ri));
              setBatchDetecting((prev) => { const n = new Set(prev); n.delete(localId); return n; });
            } catch (e) { if (done) console.error('detect fetch failed:', e); }
          };
          const status = await addClosetItemAutoDetect(file, (s) => {
            if (s.wardrobeItemId && (s.status === 'ANALYZE' || s.status === 'EMBED')) {
              rec.realId = s.wardrobeItemId;
              prefill(s.wardrobeItemId, false);
            }
          });
          rec.realId = status.wardrobeItemId ?? rec.realId;
          if (rec.realId) await prefill(rec.realId, true);
        } catch (err) { console.error('Batch upload failed:', err); rec.failed = true; }
        finally {
          setBatchDetecting((prev) => { const n = new Set(prev); n.delete(j.localId); return n; });
          release();
        }
      })();
      tracker.set(j.localId, rec);
    });
    uploadTrackerRef.current = tracker;
  }

  // Review edits (in-memory until finalize).
  function editBatchCategory(localId: string, sel: ItemOptionsSelection) {
    userEditedLocalIdsRef.current.add(localId);
    setBatchReview((prev) => prev.map((ri) => (ri.localId === localId ? { ...ri, selection: sel } : ri)));
  }
  function deleteBatchItem(localId: string) {
    setBatchReview((prev) => prev.filter((ri) => ri.localId !== localId));
    // The background upload keeps running; the orphaned item is harmless (never
    // gets a category and won't block finalize — we only persist listed items).
    uploadTrackerRef.current.delete(localId);
  }

  // Add to Closet — wait for the background uploads, persist each chosen category.
  async function finalizeBatch(selectedIds: string[]) {
    setFinalizingBatch(true);
    const tracker = uploadTrackerRef.current;
    const keep = new Set(selectedIds);
    try {
      await Promise.all([...tracker.values()].map((r) => r.promise));
      // В гардероб попадают ТОЛЬКО выбранные: невыбранные строки удаляем с бэка
      // (вещь уже создана аплоадом — иначе осиротеет и всплывёт в гардеробе).
      for (const ri of batchReview) {
        if (keep.has(ri.localId)) continue;
        const rec = tracker.get(ri.localId);
        if (rec?.realId) {
          try { await removeClosetItem(rec.realId); } catch (e) { console.error('Remove unselected failed:', e); }
        }
      }
      for (const ri of batchReview) {
        if (!keep.has(ri.localId)) continue;
        const rec = tracker.get(ri.localId);
        // Only persist rows the user actually edited — the AI-detected selection
        // is already saved server-side by ANALYZE. Re-sending it is redundant and
        // unsafe: ANALYZE's raw length/fitType strings aren't guaranteed to match
        // the Length/FitType enum constants, so round-tripping them here can 400.
        if (rec?.realId && ri.selection.subcategory && userEditedLocalIdsRef.current.has(ri.localId)) {
          try {
            await updateClosetItemApi(rec.realId, {
              section: ri.selection.section,
              subcategory: ri.selection.subcategory ?? undefined,
              itemType: ri.selection.itemType,
              length: ri.selection.length,
              fitType: ri.selection.fitType,
            });
          } catch (e) { console.error('Persist category failed:', e); }
        }
      }
      logAnalyticsEvent(Events.ADD_ITEM_SAVED, { [Params.HAS_BG_REMOVED]: false, [Params.FLOW]: 'closet' });
      logWardrobeMilestone();
      // Beautify здесь НЕ запускаем: он стартует сразу в окне ревью и доживает в
      // фоне после закрытия — лоадер «Улучшаем…» переезжает на карточку гардероба.
      await load();
      fetchPlan();
    } finally {
      setFinalizingBatch(false);
      setBatchReviewOpen(false);
      setBatchReview([]);
      // reviewBeautify/reviewBeautifyRunRef НЕ чистим: джобы могут ещё крутиться,
      // сброс — при старте следующего батча (handleBatchFiles).
      userEditedLocalIdsRef.current = new Set();
      uploadTrackerRef.current = new Map();
    }
  }

  // ── Beautify прямо в окне ревью ─────────────────────────────────────────────
  // Улучшение стартует СРАЗУ (по тапу пилюли или из авто-попапа) и крутится в том
  // же окне: строка показывает прогресс. «Добавить в гардероб» доступна всё это
  // время — если её нажать (или закрыть ревью), джоба доживает в фоне, а лоадер
  // переезжает на карточку в гардеробе (beautifyingIds).
  const [reviewBeautify, setReviewBeautify] = useState<Map<string, ReviewBeautifyState>>(new Map());
  // Гард от повторного старта, независимый от рендера (state обновляется асинхронно).
  const reviewBeautifyRunRef = useRef<Set<string>>(new Set());
  function setReviewBeautifyPhase(localId: string, patch: ReviewBeautifyState) {
    setReviewBeautify((prev) => new Map(prev).set(localId, patch));
  }

  async function startReviewBeautify(localId: string) {
    if (reviewBeautifyRunRef.current.has(localId)) return;
    reviewBeautifyRunRef.current.add(localId);
    const unguard = () => reviewBeautifyRunRef.current.delete(localId);
    setReviewBeautifyPhase(localId, { phase: 'working', progress: 0 });

    const rec = uploadTrackerRef.current.get(localId);
    if (!rec) { setReviewBeautifyPhase(localId, { phase: 'failed', progress: 0 }); unguard(); return; }
    // Ждём аплоад, если реального id ещё нет: бэкенд улучшает s3KeyProcessed
    // (вырезку), а без неё взял бы исходник С ФОНОМ — WardrobeEnhanceService.create.
    if (!rec.realId) { try { await rec.promise; } catch { /* обработано ниже */ } }
    const realId = rec.realId;
    if (!realId) { setReviewBeautifyPhase(localId, { phase: 'failed', progress: 0 }); unguard(); return; }

    setBeautifyingIds((prev) => new Set(prev).add(realId));
    const clearBusy = () => setBeautifyingIds((prev) => { const n = new Set(prev); n.delete(realId); return n; });
    try {
      logAnalyticsEvent(Events.BEAUTIFY_STARTED, { [Params.FLOW]: 'review' });
      const job = await createBeautifyJob(realId);
      const done = await watchBeautifyUntilDone(realId, job.beautifyJobId, (j) => {
        setReviewBeautifyPhase(localId, { phase: 'working', progress: j.progressPercent ?? 0 });
      });
      if (done.status === 'COMPLETED' && done.beautifiedUrl) {
        // Без окна сравнения — сразу применяем улучшенный вариант.
        try { await commitBeautify(realId, job.beautifyJobId, 'BEAUTIFIED'); } catch { /* best-effort */ }
        const url = done.beautifiedUrl;
        // Держим прогресс, пока НОВАЯ картинка не докачается → свап мгновенный.
        await new Promise<void>((resolve) => {
          const im = new window.Image();
          const finish = () => resolve();
          im.onload = finish; im.onerror = finish;
          setTimeout(finish, 7000); // страховка от вечного ожидания
          im.src = url;
        });
        setBatchReview((prev) => prev.map((ri) => (ri.localId === localId ? { ...ri, previewImage: url } : ri)));
        setItems((prev) => prev.map((i) => (i.id === realId ? { ...i, imageData: url, fullImage: url, beautified: true } : i)));
        setReviewBeautifyPhase(localId, { phase: 'done', progress: 100 });
        clearBusy();
        try { localStorage.setItem('svayp_has_beautified', '1'); } catch { /* private mode */ }
        logAnalyticsEvent(Events.BEAUTIFY_COMPLETED, { [Params.FLOW]: 'review' });
        refreshCoins(); // Beautify платный — обновляем баланс
        load();
      } else {
        clearBusy();
        setReviewBeautifyPhase(localId, { phase: 'failed', progress: 0 });
        unguard(); // даём перезапустить тапом по пилюле
        logAnalyticsEvent(Events.BEAUTIFY_FAILED, { [Params.FLOW]: 'review' });
        setOutfitToastMsg(t.cv_bt_failed);
        setTimeout(() => setOutfitToastMsg(null), 2500);
      }
    } catch (err) {
      clearBusy();
      setReviewBeautifyPhase(localId, { phase: 'failed', progress: 0 });
      unguard();
      if (isInsufficientCoins(err)) {
        // Ключ error_code — общий для всех событий отказа; своё имя ломает единый разбор причин.
        logAnalyticsEvent(Events.BEAUTIFY_FAILED, { [Params.ERROR_CODE]: 'INSUFFICIENT_COINS' });
        setShowPremiumGate('beautify');
        return;
      }
      logAnalyticsEvent(Events.BEAUTIFY_FAILED, { [Params.FLOW]: 'review' });
      setOutfitToastMsg(t.cv_bt_failed);
      setTimeout(() => setOutfitToastMsg(null), 2500);
    }
  }

  function beautifyIntroNever(): boolean {
    try { return localStorage.getItem('svayp_beautify_intro_never') === '1'; } catch { return false; }
  }
  // Тап Beautify в ревью — СРАЗУ старт, без обучающего попапа: витрина над
  // списком уже показывает «до/после» и цену, а попап поверх неё просто
  // повторял то же самое ещё раз и уводил со экрана.
  function handleReviewBeautify(item: ClosetItem) {
    if (reviewBeautifyRunRef.current.has(item.id)) return;
    startReviewBeautify(item.id);
  }
  // Тап ✨ на карточке гардероба: тот же intro-гейт, затем фоновый beautify.
  function handleWardrobeBeautify(item: ClosetItem) {
    if (beautifyIntroNever()) { startBeautifyBackground(item); return; }
    setIntroPicked(new Set());
    setBeautifyIntroFor({ from: 'wardrobe', itemId: item.id });
  }
  // Beautify intro popup actions.
  function openBeautifyFromIntro() {
    const intro = beautifyIntroFor;
    const picked = introPicked;
    setBeautifyIntroFor(null);
    if (!intro) return;
    if (intro.from === 'wardrobe') {
      const it = items.find((i) => i.id === intro.itemId);
      if (it) startBeautifyBackground(it);
      return;
    }
    // Ревью: запускаем улучшение немедленно для всех отмеченных фото.
    const targets = intro.localIds ?? [];
    targets.filter((id) => picked.has(id)).forEach((id) => startReviewBeautify(id));
  }
  function skipBeautifyIntro() { setBeautifyIntroFor(null); }
  function toggleIntroPicked(localId: string) {
    setIntroPicked((prev) => { const n = new Set(prev); if (n.has(localId)) n.delete(localId); else n.add(localId); return n; });
  }

  // Local review items adapted to ClosetItem shape for the review sheet.
  const batchReviewItems: ClosetItem[] = batchReview.map((ri) => ({
    id: ri.localId,
    imageData: ri.previewImage,
    category: ri.selection.subcategory ? subcategoryToLocal(ri.selection.subcategory) : 'tops',
    subcategory: ri.selection.subcategory ?? undefined,
    itemType: ri.selection.itemType,
    length: ri.selection.length,
    fitType: ri.selection.fitType,
    createdAt: '',
  }));

  // Что реально можно улучшить прямо сейчас: фото доехало до бэка (аплоад мог
  // упасть), категория определена и улучшение ещё не запускалось. Это и есть
  // набор для витрины Beautify в окне ревью.
  const beautifyReadyIds = !closetV2 || !FEATURES.beautifyEnabled || !batchReviewOpen || batchDetecting.size > 0
    ? []
    : batchReview
        .map((ri) => ri.localId)
        .filter((id) => uploadTrackerRef.current.get(id)?.realId
          && !reviewBeautifyRunRef.current.has(id)
          && reviewBeautify.get(id)?.phase !== 'done');

  // Beautify НЕ запускается сам: он платный, и списывать алмазы без спроса
  // нельзя. Витрина над списком — и есть объяснение и подтверждение: тап по её
  // кнопке сразу стартует улучшение (прогресс идёт в строках), сама витрина при
  // этом исчезает, потому что улучшать больше нечего.
  function handleBeautifyAll() {
    beautifyReadyIds.forEach((id) => startReviewBeautify(id));
  }

  // Closet v2 — Beautify tap in the add step. First time shows the explainer,
  // then requesting it auto-opens the compare sheet after the item uploads.
  function handleBeautifyTapInAdd() {
    let seen = false;
    try { seen = localStorage.getItem('svayp_bt_intro') === 'true'; } catch { /* private mode */ }
    if (!seen) { setShowBeautifyIntro(true); return; }
    setAddBeautifyRequested((v) => !v);
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
    // Whether the user asked to Beautify this item in the add step.
    const wantBeautify = closetV2 && FEATURES.beautifyEnabled && addBeautifyRequested;

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
    setScrollTargetSection(localCatToSection(category)); // reveal the processing card
    setAddRawImage('');
    setShowAddPicker(false);
    setAddBeautifyRequested(false);
    addFileRef.current = null;
    setAddSaving(false);

    // Run upload in background
    if (fileToUpload) {
      let activeJobId: string | null = null;
      let capturedItemId: string | null = null;
      try {
        await addClosetItemFromFile(fileToUpload, category, extras, (status) => {
          if (status.wardrobeItemId) capturedItemId = status.wardrobeItemId;
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
        logAnalyticsEvent(Events.ADD_ITEM_BG_REMOVAL_COMPLETED);
        logAnalyticsEvent(Events.ADD_ITEM_SAVED, {
          [Params.CATEGORY]: category,
          [Params.HAS_BG_REMOVED]: true,
          [Params.FLOW]: 'closet',
        });
        logWardrobeMilestone();
        setPendingUploads((prev) => { const next = new Map(prev); next.delete(pendingId); return next; });
        await load();
        fetchPlan();
        // Closet v2 — if the user tapped Beautify in the add step, auto-open the
        // compare sheet; otherwise open the detect & review sheet so they can
        // confirm/correct the AI's name & category.
        if (closetV2 && capturedItemId) {
          if (wantBeautify) setPendingBeautifyId(capturedItemId);
          else setReviewIds((prev) => [...new Set([...prev, capturedItemId!])]);
        }
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
            [Params.FLOW]: 'closet',
          });
          logWardrobeMilestone();
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
        [Params.FLOW]: 'closet',
      });
      logWardrobeMilestone();
      setPendingUploads((prev) => { const next = new Map(prev); next.delete(pendingId); return next; });
      await load();
    }
  }

  // Closet v2 — instant add from the shop catalog. Fast path: /wardrobe/items/
  // from-catalog clones the product's pre-processed canonical item (no ML) — the
  // item appears instantly. If the product isn't backfilled yet (422
  // CATALOG_ITEM_NOT_READY), falls back to the normal upload pipeline.
  // Заглушка «загружается» держится минимум столько же, сколько идёт обычная
  // загрузка, чтобы добавление из магазина ощущалось так же (from-catalog по факту
  // мгновенный).
  const CATALOG_PLACEHOLDER_MS = 5000;

  // loadingCard=true (гардероб): показываем заглушку ~5с как у обычной загрузки.
  // loadingCard=false (канва): без заглушки/таймаута — from-catalog мгновенный,
  // сразу load() → авто-размещение обработанной вещи на канве.
  async function addCatalogItem(product: Product, opts?: { loadingCard?: boolean }): Promise<ClosetItem | null> {
    const loadingCard = opts?.loadingCard !== false;
    if (plansEnabled && !canAddItem()) { setShowPremiumGate('items'); return null; }
    const clearAdding = () => setAddingProductIds((prev) => { const n = new Set(prev); n.delete(product.id); return n; });
    setAddingProductIds((prev) => new Set(prev).add(product.id));

    // Pending-карточка с прогрессом — как у обычной загрузки вещи. Секцию берём
    // по РЕАЛЬНОЙ подкатегории вернувшейся вещи (from-catalog отдаёт её сразу),
    // чтобы заглушка появлялась в правильном разделе (платок → Аксессуары, а не Верх).
    const pendingId = `catalog_${product.id}_${Date.now()}`;
    const imgUrl = product.images?.[0] ?? '';
    const startedAt = Date.now();
    const steps = [t.stepProcessing, t.stepRemovingBg, t.stepAnalyzing, t.stepAlmostDone];
    let timer: ReturnType<typeof setInterval> | null = null;
    const showPlaceholder = (cat: ClosetCategory) => {
      if (!loadingCard) return;
      setPendingUploads((prev) => new Map(prev).set(pendingId, { category: cat, imageData: imgUrl, step: steps[0], progress: 8, startedAt }));
      let tick = 0;
      timer = setInterval(() => {
        tick += 1;
        setPendingUploads((prev) => {
          const next = new Map(prev); const ex = next.get(pendingId);
          if (ex) next.set(pendingId, { ...ex, progress: Math.min(95, 8 + tick * 20), step: steps[Math.min(steps.length - 1, tick)] });
          return next;
        });
      }, 1000);
    };
    const clearPlaceholder = () => {
      if (timer) clearInterval(timer);
      setPendingUploads((prev) => { const n = new Map(prev); n.delete(pendingId); return n; });
    };

    try {
      const created = await addWardrobeItemFromCatalog(product.id);
      const placedCat = created.subcategory ? subcategoryToLocal(created.subcategory) : 'accessories';
      showPlaceholder(placedCat);
      // Bring the section into view so the user sees the item added / processing
      // (only for the wardrobe flow — the canvas picker passes loadingCard:false).
      if (loadingCard) setScrollTargetSection(localCatToSection(placedCat));
      // Гардероб: держим заглушку ~5с для паритета с загрузкой. Канва: сразу
      // размещаем обработанную вещь без таймаута.
      if (loadingCard) {
        await new Promise((r) => setTimeout(r, Math.max(0, CATALOG_PLACEHOLDER_MS - (Date.now() - startedAt))));
      }
      logAnalyticsEvent(Events.LIBRARY_ITEM_ADDED, { [Params.PRODUCT_ID]: product.id, [Params.FLOW]: 'closet' });
      logWardrobeMilestone();
      clearPlaceholder();
      setAddedProductIds((prev) => new Set(prev).add(product.id));
      setOutfitToastMsg(t.cv_shop_added);
      setTimeout(() => setOutfitToastMsg(null), 2000);
      await load();
      fetchPlan();
      clearAdding();
      return mapApiItemToClosetItem(created);
    } catch (err) {
      clearPlaceholder();
      const code = (err as { response?: { data?: { error?: { code?: string }; code?: string } } })?.response?.data;
      const errCode = code?.error?.code ?? code?.code;
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (isInsufficientCoins(err) || status === 402) { setShowPremiumGate('items'); clearAdding(); return null; }
      // Товар ещё не предобработан бэкфиллом → фолбэк на обычную загрузку.
      if (errCode !== 'CATALOG_ITEM_NOT_READY' && status !== 422) {
        console.error('from-catalog failed, falling back to upload:', err);
      }
    }
    // addCatalogItemViaUpload заново выставит/снимет addingProductIds в своём finally
    // и покажет собственную pending-карточку (реальная загрузка). Товар ещё не
    // готов бэкфиллом — на канву сразу класть нечего (вернём null).
    await addCatalogItemViaUpload(product);
    return null;
  }

  // Fallback: fetch the product image and run it through the normal upload
  // pipeline (bg-removal + ANALYZE fills the real category/attributes).
  async function addCatalogItemViaUpload(product: Product) {
    const imgUrl = product.images?.[0];
    if (!imgUrl) { setAddingProductIds((prev) => { const n = new Set(prev); n.delete(product.id); return n; }); return; }
    setAddingProductIds((prev) => new Set(prev).add(product.id));
    const pendingId = `pending_${Date.now()}`;
    const category: ClosetCategory = 'tops'; // neutral hint; ANALYZE re-detects
    const uploadStartedAt = Date.now();
    let activeJobId: string | null = null;
    try {
      const blob = await fetchImageBlob(imgUrl);
      let file = new File([blob], `catalog-${product.id}.jpg`, { type: blob.type || 'image/jpeg' });
      setPendingUploads((prev) => new Map(prev).set(pendingId, { category, imageData: imgUrl, step: t.uploading, progress: 0, startedAt: uploadStartedAt }));
      file = await compressImageForUpload(file);
      await addClosetItemFromFile(file, category, undefined, (status) => {
        setPendingUploads((prev) => {
          const next = new Map(prev);
          const ex = next.get(pendingId);
          if (ex) next.set(pendingId, { ...ex, step: formatStep(status.currentStep), progress: status.progressPercent });
          return next;
        });
        if (status.wardrobeItemId && (status.status === 'EMBED' || status.status === 'ANALYZE')) load();
      }, (jobId) => { activeJobId = jobId; saveUploadPreview(jobId, imgUrl, category, uploadStartedAt); });
      if (activeJobId) clearUploadPreview(activeJobId);
      logAnalyticsEvent(Events.LIBRARY_ITEM_ADDED, { [Params.PRODUCT_ID]: product.id, [Params.FLOW]: 'closet' });
      logWardrobeMilestone();
      setPendingUploads((prev) => { const next = new Map(prev); next.delete(pendingId); return next; });
      setAddedProductIds((prev) => new Set(prev).add(product.id));
      setOutfitToastMsg(t.cv_shop_added);
      setTimeout(() => setOutfitToastMsg(null), 2000);
      await load();
      fetchPlan();
    } catch (err) {
      console.error('Failed to add catalog item:', err);
      setPendingUploads((prev) => { const next = new Map(prev); next.delete(pendingId); return next; });
    } finally {
      setAddingProductIds((prev) => { const n = new Set(prev); n.delete(product.id); return n; });
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
        // «Добавлено» в каталоге магазина выводим из РЕАЛЬНОГО состава гардероба
        // (по sourceProductId), а не из накопителя — тогда удаление вещи из
        // гардероба само снимает зелёную галку у товара.
        setAddedProductIds(new Set(
          allFetched.map((i) => i.sourceProductId).filter(Boolean) as string[]));
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
      if (seq === loadSeqRef.current) { setIsLoading(false); setFirstLoadDone(true); }
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

  // ── AI-стилист: спрашиваем сервер, положена ли кнопка ─────────────────────
  // Ошибка запроса трактуется как «недоступно» внутри fetchStylistAccess, поэтому
  // сбой сети просто не покажет кнопку и не сломает гардероб.
  useEffect(() => {
    let cancelled = false;
    fetchStylistAccess().then((a) => {
      if (cancelled || !a.available) return;
      setStylistAvailable(true);
      // Показ логируем отдельно от нажатия: иначе конверсия входа в чат считалась бы
      // от всей аудитории, а кнопку видит только бета.
      logAnalyticsEvent(Events.STYLIST_ENTRY_SHOWN, { [Params.SOURCE]: 'closet_fab' });
    });
    return () => { cancelled = true; };
  }, []);

  // Resume watching any uploads that were in progress when the page was closed
  useEffect(() => {
    const handles: SseHandle[] = [];
    let unmounted = false;
    (async () => {
      try {
        const page = await listUploads(0, 20);
        // Пайплайн живёт максимум ~10 мин (ML hard-timeout 600с) — всё старше
        // 15 мин мертво (обычно прерванный рестартом ML прогон), не resume-им.
        // INITIATED = init без загруженного файла — не завершится никогда.
        const STALE_MS = 15 * 60 * 1000;
        const inProgress = page.content.filter(
          (u) => u.status !== 'COMPLETED' && u.status !== 'FAILED' && (u.status as string) !== 'INITIATED'
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
          setTryOnState({ status: 'completed', resultUrl: job.resultImageUrl, jobId: job.id });
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
              setTryOnState({ status: 'completed', resultUrl: result.resultImageUrl, jobId: result.id });
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

  // Closet v2 — rename an item (review sheet / detail sheet). Persists to the
  // user label; the display name falls back to it until the backend adds a
  // dedicated displayName field.
  function handleRenameItem(id: string, name: string) {
    if (DEMO_ITEM_IDS.has(id) || id.startsWith('local_')) return;
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, displayName: name } : i)));
    updateClosetItemApi(id, { userLabel: name }).catch(() => {});
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

  function countForSection(section: WardrobeSection) {
    return items.filter((i) => itemSection(i) === section).length;
  }

  // ── Сетка гардероба: разделы-чипы, типы-чипы и отсортированный список ─────
  // Чипы строим только по НЕПУСТЫМ разделам: пустая вкладка «Обувь» у человека
  // без обуви — это шум, а не навигация.
  const gridSections = SECTION_ORDER.filter((s) => countForSection(s) > 0);
  const gridTypes = gridSection === 'ALL'
    ? []
    : subcategoriesForSection(gridSection)
        .filter((sub) => items.some((i) => itemSection(i) === gridSection && effectiveSubcategory(i) === sub));

  const gridItems = items
    .filter((i) => (gridSection === 'ALL' || itemSection(i) === gridSection)
      && (gridType === null || effectiveSubcategory(i) === gridType))
    .slice()
    .sort((a, b) => {
      const ta = Date.parse(a.createdAt || '') || 0;
      const tb = Date.parse(b.createdAt || '') || 0;
      return gridSort === 'recent' ? tb - ta : ta - tb;
    });

  // Загружающиеся вещи всегда сверху сетки — их ещё не на что фильтровать по
  // типу, но раздел уже известен по подсказке категории.
  const gridPending = Array.from(pendingUploads.entries())
    .filter(([, p]) => gridSection === 'ALL' || localCatToSection(p.category) === gridSection)
    .map(([id, p]) => ({ id, ...p }));

  function removePendingUpload(id: string) {
    setPendingUploads((prev) => { const next = new Map(prev); next.delete(id); return next; });
    // Always persist dismissal regardless of id prefix so re-opening the app never brings it back
    const jobId = id.startsWith('resume_') ? id.slice('resume_'.length) : id;
    dismissedUploadJobsRef.current.add(jobId);
    try {
      localStorage.setItem('libas_dismissed_uploads', JSON.stringify([...dismissedUploadJobsRef.current]));
    } catch {}
  }

  const [aiSuggestingIdx, setAiSuggestingIdx] = useState<number | null>(null);

  async function handleNewOutfit(canvasIdx = 0, opts?: { auto?: boolean }) {
    if (hasDemoItems) {
      if (opts?.auto) return; // never block/interrupt on the silent first auto-gen
      setOutfitBlockedModal({ title: t.demoAddTitle, body: t.demoAddBody });
      return;
    }
    const hasUpper = items.some((i) => UPPER_CATS.includes(i.category));
    const hasLower = items.some((i) => LOWER_CATS.includes(i.category));
    const hasDress = items.some((i) => FULL_BODY_CATS.includes(i.category));
    // A dress/jumpsuit is a complete outfit on its own, so it doesn't need a
    // bottom — mirror OutfitCard's canGenerateOutfit so the 1-dress+1-shoes
    // onboarding path generates instead of bouncing to the "add a top" sheet.
    const canBuildOutfit = hasDress || (hasUpper && hasLower);
    if (!canBuildOutfit) {
      if (opts?.auto) return; // silent auto-gen never pops the add sheet
      openAdd('TOPS');
      return;
    }
    // The silent first auto-gen never puts up a paywall — if the user can't
    // afford the AI call the backend rejects it and we fall back to a local
    // placement below, so the canvas still fills.
    if (!opts?.auto) {
      if (coinsApply) {
        if (coins < coinCosts.createOutfit) { setShowPremiumGate('generation'); return; }
      } else if (!canGenerate) {
        // Квота регенераций исчерпана. Премиум/про доплачивают монетами — пускаем
        // запрос (сервер спишет), гейт только если монет не хватает.
        const canFallbackToCoins = plan !== 'free' && coins >= coinCosts.createOutfit;
        if (plansEnabled && !canFallbackToCoins) { setShowPremiumGate('generation'); return; }
      }
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
      refreshCoins(); // AI-генерация образа платная — обновляем баланс
    } catch (err: unknown) {
      if (opts?.auto) {
        // Тихая авто-генерация первого образа: НИКОГДА не показываем ошибку и не
        // оставляем канву пустой. Вещи могли ещё эмбеддиться на бэке (ai-suggest
        // кидает NOT_ENOUGH_CLOTHES) — кладём локальный top+bottom. ВАЖНО: не
        // проваливаемся в разбор кодов ошибок ниже — их early-return выбрасывал бы
        // этот запасной layout, и доска не появлялась вовсе (это и есть баг).
        logAnalyticsEvent(Events.OUTFIT_GENERATION_FAILED, { [Params.ERROR_CODE]: 'AUTO_FALLBACK' });
        layout = generateRandomOutfit(items);
      } else if (isInsufficientCoins(err)) {
        logAnalyticsEvent(Events.OUTFIT_GENERATION_FAILED, { [Params.ERROR_CODE]: 'INSUFFICIENT_COINS' });
        setShowPremiumGate('generation');
        return;
      } else {
        const errData = (err as { response?: { data?: { error?: { code?: string; message?: string }; code?: string } } })?.response?.data;
        const code = errData?.error?.code ?? errData?.code;
        if (code === 'NOT_ENOUGH_CLOTHES') {
          // The backend can't build a valid outfit (e.g. bottoms still processing
          // through the AI pipeline, or genuinely missing). Show the specific
          // backend message instead of silently faking a random outfit — the
          // silent fallback hid real problems from users.
          logAnalyticsEvent(Events.OUTFIT_GENERATION_FAILED, { [Params.ERROR_CODE]: code });
          const apiMsg = errData?.error?.message;
          setOutfitBlockedModal({
            title: t.tooFewItemsTitle,
            body: apiMsg && apiMsg.trim() ? apiMsg : t.tooFewItemsBody,
          });
          return;
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
          // Unknown failure (backend down / 401 / 500 …): still show a local random
          // outfit so the button isn't dead, but SURFACE the failure — silently
          // faking success made real outages look like "AI generates randomly and
          // the counter never grows".
          console.error('ai-suggest failed', err);
          logAnalyticsEvent(Events.OUTFIT_GENERATION_FAILED, { [Params.ERROR_CODE]: code ?? 'unknown' });
          setOutfitToastMsg(`${t.aiSuggestFailed}${code ? ` (${code})` : ''}`);
          setTimeout(() => setOutfitToastMsg(null), 4000);
          layout = generateRandomOutfit(items);
        }
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

    // Помечаем «первый образ сделан» (и выключаем авто-ген) ТОЛЬКО после того, как
    // доска реально сохранилась на бэке. Раньше флаг ставился безусловно: если
    // сохранение молча падало/пропускалось, авто-ген выключался навсегда, а доска
    // оставалась пустой — тот самый баг «канва не появляется в гардеробе».
    const persisted = await saveCanvasToBackend(layout, canvasIdx);
    if (persisted) markFirstOutfitDone();
    fetchPlan();

    // Setup asked for a try-on: the board exists now, so hand over. Uses the
    // layout we just built rather than `displayCanvases`, which is still the
    // pre-generation value inside this closure.
    if (pendingSetupTryOnRef.current) {
      pendingSetupTryOnRef.current = false;
      const itemIds = layout.map((e) => e.id).filter((id) => !id.startsWith('local_') && !id.startsWith('pending_'));
      if (itemIds.length > 0) {
        if (tryOnGateBlocked()) { setShowPremiumGate('tryOn'); return; }
        logAnalyticsEvent(Events.TRYON_INITIATED, {
          [Params.OUTFIT_ITEM_COUNT]: itemIds.length,
          [Params.SOURCE]: 'first_run_setup',
        });
        tryOnCanvasIdxRef.current = canvasIdx;
        tryOnOverrideRef.current = { itemIds, layout };
        setShowTryOnConfirm(true);
      }
    }
  }

  // Возвращает true, если доска реально создана/обновлена на бэке. Вызывающий
  // (handleNewOutfit) по этому флагу решает, помечать ли «первый образ сделан».
  async function saveCanvasToBackend(layout: SavedCanvasLayout, canvasIdx: number): Promise<boolean> {
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

    // Бэку достаточно ОДНОЙ clothing-вещи (upper/lower/shoes) — см.
    // OutfitCanvasService.validateMinimumGroups. Прежний порог >= 2 молча не
    // сохранял валидные образы (напр. одно платье, или пока грузится вторая вещь).
    if (apiItems.length < 1) return false;

    const existingId = canvases[canvasIdx]?.id ?? null;
    const canvasName = `Outfit ${canvasIdx + 1}`;

    const doCreate = async () => {
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
          await updateOutfitCanvas(existingId, { name: canvasName, items: apiItems });
        } catch (updateErr: unknown) {
          const status = (updateErr as { response?: { status?: number } })?.response?.status;
          // 404: deleted on the backend — recreate, once per id. 5xx: that row
          // can't be written to; the board is real and the user expects it
          // saved, so recreate that too — but only once per session (see the
          // ref), or a permanently failing PUT becomes a duplicate-board loop.
          const serverError = status !== undefined && status >= 500;
          const canRecreate = status === 404
            ? !recreatedCanvasIdsRef.current.has(existingId)
            : serverError && !recreatedAfterServerErrorRef.current;
          if (canRecreate) {
            if (serverError) recreatedAfterServerErrorRef.current = true;
            recreatedCanvasIdsRef.current.add(existingId);
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
      return true;
    } catch (err) {
      // Больше НЕ глотаем ошибки молча (в т.ч. INVALID_OUTFIT_COMPOSITION):
      // раньше доска показывалась локально, но молча не сохранялась и пропадала
      // после перезахода. Показываем пользователю, что сохранить не удалось.
      //
      // console.warn, а НЕ console.error: dev-оверлей Next.js поднимает всё,
      // залогированное через console.error, в полноэкранную runtime-ошибку —
      // хотя сбой автосохранения уже обработан и показан баннером.
      console.warn('Failed to save canvas to backend:', describeApiError(err));
      setSaveFailed(true);
      setTimeout(() => setSaveFailed(false), 4000);
      return false;
    }
  }

  const tryOnCanvasIdxRef = useRef(0);
  const tryOnOverrideRef = useRef<{ itemIds: string[]; layout: SavedCanvasLayout } | null>(null);
  // Blob key of the user's own uploaded photo when примерка идёт "на своё фото".
  // Persisted in a ref so a Retry re-runs the same mode.
  const tryOnPersonKeyRef = useRef<string | undefined>(undefined);
  // Превью выбранного фото — показываем его в модалке ожидания.
  const tryOnPersonPreviewRef = useRef<string | undefined>(undefined);

  // Премиум/про с исчерпанной квотой доплачивают монетами (фолбэк, зеркалит
  // CoinGateService). Не блокируем такой запрос — сервер спишет монеты; гейт
  // показываем только когда монет реально не хватает.
  function tryOnGateBlocked(): boolean {
    if (coinsApply) return coins < coinCosts.tryOn;
    if (!plansEnabled || canTryOn) return false;
    const canFallbackToCoins = plan !== 'free' && coins >= coinCosts.tryOn;
    return !canFallbackToCoins;
  }

  function handleTryItOnFromItems(calItems: ClosetItem[]) {
    if (tryOnGateBlocked()) { setShowPremiumGate('tryOn'); return; }
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

    // Demo shortcut — show the pre-built result instantly, no API call needed.
    // Skipped for "на своё фото": a real person photo must go through the ML pipeline.
    if (hasDemoItems && !tryOnPersonKeyRef.current) {
      tryOnOverrideRef.current = null;
      const DEMO_TRYON_URL = 'https://libasimages.blob.core.windows.net/product-images/try-on%2F07bbfdf7-504d-44f4-9880-6003831845cf%2F1e088b17-ed7d-4e79-8daf-6cae0a3f979b.png';
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

    setTryOnState({ status: 'loading', previewImages, personImage: tryOnPersonPreviewRef.current });

    const buildJob = async () => {
      let snapshotBlob: Blob | undefined;
      if (snapshotLayout && snapshotLayout.length > 0) {
        try {
          snapshotBlob = await captureCanvasSnapshot(snapshotLayout, items);
        } catch {
          // snapshot capture failed — fall back to classic mode
        }
      }
      return createTryOnJob({ wardrobeItemIds: itemIds, canvasId, snapshotBlob, personImageKey: tryOnPersonKeyRef.current });
    };

    buildJob()
      .then((job) => {
        if (tryOnCancelRef.current) return;
        saveActiveTryOnJob(job.id);
        tryOnStartTimeRef.current = Date.now();
        logAnalyticsEvent(Events.TRYON_PROCESSING_STARTED);
        setTryOnState((prev) => ({ status: 'processing', previewImages: prev?.previewImages, personImage: prev?.personImage }));
        fetchPlan();
        activeTryOnHandleRef.current = watchTryOnUntilDone(
          job.id,
          (progress) => {
            if (!tryOnCancelRef.current && progress.status === 'PROCESSING') {
              setTryOnState((prev) => ({ status: 'processing', previewImages: prev?.previewImages, personImage: prev?.personImage }));
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
              setTryOnState({ status: 'completed', resultUrl: result.resultImageUrl, jobId: result.id });
              saveTryOnResult(result.resultImageUrl);
              refreshCoins(); // примерка платная — обновляем баланс (возврат при FAILED учтён на бэке)
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
    if (tryOnGateBlocked()) { setShowPremiumGate('tryOn'); return; }
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

  async function handleDeleteTryOn(id: string) {
    logAnalyticsEvent(Events.TRYON_RESULT_DISMISSED);
    const removed = tryOnJobs.find((j) => j.id === id);
    // Optimistically remove from the gallery; the backend is the source of truth.
    setTryOnJobs((prev) => prev.filter((j) => j.id !== id));
    try {
      await deleteTryOnJob(id);
    } catch {
      // Delete failed on the backend — restore the look and surface a toast so
      // the user knows it wasn't removed.
      if (removed) setTryOnJobs((prev) => (prev.some((j) => j.id === id) ? prev : [removed, ...prev]));
      setTryOnDeleteFailed(true);
      setTimeout(() => setTryOnDeleteFailed(false), 4000);
    }
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
      {/* Try-on delete-failed toast */}
      {tryOnDeleteFailed && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[999] px-4 py-2.5 rounded-full bg-red-500 text-white text-[13px] font-semibold shadow-lg">
          {t.tryOnDeleteFailed}
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
        {/* Left: section name */}
        <h1 className="text-[26px] font-bold tracking-[-0.5px] text-black dark:text-white shrink-0">{t.closetTitle}</h1>

        {/* Right: action buttons + profile + guide */}
        <div className="flex items-center gap-1.5">
            {/* Diamond balance (subscription badge) — opens the buy-diamonds
                sheet. Gated by the `feature.subscription_badge.enabled` flag so it
                can be hidden for the App/Play review account. */}
            {plansEnabled && (
            <button
              onClick={() => setShowPremiumGate('browse')}
              className="flex items-center gap-1.5 pl-2 pr-3 h-8 rounded-full text-[13px] font-extrabold active:scale-[0.95] transition-all"
              style={{
                background: theme === 'dark' ? 'rgba(243,112,167,0.16)' : '#fdeef6',
                border: `1px solid ${theme === 'dark' ? 'rgba(243,112,167,0.32)' : '#F8D3E4'}`,
                color: theme === 'dark' ? '#F5EAF0' : '#B03A72',
              }}
              aria-label={t.cn_title}
            >
              <Diamond size={16} />
              <span style={{ fontVariantNumeric: 'tabular-nums' }}>{coins}</span>
            </button>
            )}
            {/* Вход в тарифы появляется, когда сервер разрешил пейволл и каталог не пуст:
                кнопка, ведущая в пустую шторку, хуже отсутствующей. Но у того, кто уже
                платит, бейдж тарифа показываем всегда — выключенный пейволл не повод
                прятать от человека, что у него куплено. */}
            {(plansAvailable || isPaidTier) && (
              <button
                onClick={() => setShowPlans('header')}
                // У бесплатного тира — только корона: в шапке уже стоят чип алмазов и
                // «Руководство», и подпись выдавливала последнюю кнопку за край экрана.
                // У платящих название тарифа важнее компактности — показываем бейдж.
                // Подпись тарифа убрана: с ней шапка не влезала на узких экранах и
                // «Руководство» обрезалось краем. Корона одинаково понятна и на платном.
                className="flex items-center justify-center w-8 h-8 rounded-full active:scale-[0.95] transition-all"
                style={{
                  background: isPaidTier
                    ? (theme === 'dark' ? `${tierColor}28` : `${tierColor}1F`)
                    : theme === 'dark' ? 'rgba(243,112,167,0.16)' : '#fdeef6',
                  border: `1px solid ${isPaidTier ? `${tierColor}66` : theme === 'dark' ? 'rgba(243,112,167,0.32)' : '#F8D3E4'}`,
                  color: isPaidTier ? tierColor : theme === 'dark' ? '#F5EAF0' : '#B03A72',
                }}
                aria-label={isPaidTier ? tierLabel : t.pl_title}
                title={isPaidTier ? tierLabel : t.pl_title}
              >
                <Crown size={16} />
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
              // Розовый в гардеробе оставлен только за «добавить вещь» и Beautify —
              // остальные действия чёрные, иначе розовым подсвечено всё сразу.
              style={{ background: '#141014' }}
              aria-label={getGuideStrings(locale).guide}
            >
              <BookOpen size={12} strokeWidth={2.4} color="#fff" />
              <span className="text-[11px] font-bold text-white whitespace-nowrap">{getGuideStrings(locale).guide}</span>
              {/* Pulsing dot to draw the eye on first visits */}
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: '#141014' }} />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 border-2 border-white" style={{ background: '#141014' }} />
              </span>
            </button>
          </div>
      </header>

      <style jsx>{`
        @keyframes hintSlideIn {
          from { opacity: 0; transform: translate(-50%, 12px); }
          to   { opacity: 1; transform: translate(-50%, 0); }
        }
        @keyframes tryOnPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(20,16,20,0.42); }
          50%       { box-shadow: 0 0 0 8px rgba(20,16,20,0); }
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
        {/* ── Get-started nudge (legacy top card; v2 docks it at the bottom) ── */}
        {showGetStarted && !closetV2 && (
          <GetStartedCard
            count={realItemCount}
            target={GET_STARTED_TARGET}
            onAdd={() => {
              logAnalyticsEvent(Events.GET_STARTED_CARD_ADD_TAPPED, { [Params.ITEM_COUNT]: realItemCount });
              openAdd('TOPS');
            }}
            onDismiss={() => {
              setGetStartedDone();
              setGsHidden(true);
              logAnalyticsEvent(Events.GET_STARTED_CARD_DISMISSED, { [Params.ITEM_COUNT]: realItemCount });
            }}
          />
        )}
        {/* ── My Outfits ── */}
        <OutfitSection
          activeTab={closetTab}
          onTabChange={setClosetTab}
          tryOnJobs={tryOnJobs}
          tryOnLoading={tryOnLoading}
          tryOnError={tryOnError}
          tryOnHasMore={tryOnHasMore}
          onRetryTryOns={() => loadTryOns(0)}
          onLoadMoreTryOns={() => loadTryOns(tryOnPageRef.current + 1)}
          onDeleteTryOn={handleDeleteTryOn}
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
          autoGenDone={autoGenDone}
          onAutoGenerate={() => handleNewOutfit(0, { auto: true })}
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
          onTryItOn={(idx) => handleTryItOn(idx)}
          onDeleteCanvas={handleDeleteCanvas}
          onAddItem={(cat) => openAdd(localCatToSection(cat))}
        />

        {/* ── Гардероб: одна сетка 3×N + фильтры (раздел · тип · сортировка) ──
             На «Образах» и «Календаре» гардероб скрыт: там витрина собранных
             образов, а список вещей только уводил бы от неё. */}
        {closetTab !== 'outfits' && closetTab !== 'calendar' && (
        <div id="closet-grid" className="mt-8" style={{ scrollMarginTop: 8 }}>
          {/* Счётчик + сортировка */}
          <div className="flex items-center justify-between px-4 mb-2.5">
            <h2 className="text-[17px] font-bold text-gray-900 dark:text-white tracking-tight">
              {t.cl_items_n.replace('{n}', String(gridItems.length + gridPending.length))}
            </h2>
            <div className="relative">
              <button
                onClick={() => setSortMenu((v) => !v)}
                className="flex items-center gap-1 h-8 pl-3 pr-2.5 rounded-full text-[12px] font-semibold text-gray-600 dark:text-white/70 bg-gray-100 dark:bg-white/10 active:scale-[0.96] transition-transform"
              >
                {gridSort === 'recent' ? t.cl_sort_recent : t.cl_sort_oldest}
                <ChevronDown size={14} strokeWidth={2.4} />
              </button>
              {sortMenu && (
                <>
                  <div className="fixed inset-0 z-[19]" onClick={() => setSortMenu(false)} />
                  <div className="absolute right-0 top-9 z-20 w-[168px] rounded-2xl bg-white dark:bg-[#1c1c1e] py-1.5 shadow-lg border border-gray-100 dark:border-white/10">
                    {(['recent', 'oldest'] as const).map((s) => (
                      <button
                        key={s}
                        onClick={() => { setGridSort(s); setSortMenu(false); }}
                        className="w-full flex items-center justify-between px-3.5 py-2 text-[13px] font-semibold text-gray-800 dark:text-white active:bg-gray-50 dark:active:bg-white/5"
                      >
                        {s === 'recent' ? t.cl_sort_recent : t.cl_sort_oldest}
                        {gridSort === s && <Check size={15} strokeWidth={3} className="text-gray-900 dark:text-white" />}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Разделы */}
          <div className="flex gap-2 overflow-x-auto hide-scrollbar px-4 pb-1">
            <FilterChip label={t.all} count={items.length} selected={gridSection === 'ALL'}
              onClick={() => { setGridSection('ALL'); setGridType(null); }} />
            {gridSections.map((s) => (
              <FilterChip
                key={s}
                label={taxLabel(s, locale)}
                count={countForSection(s)}
                selected={gridSection === s}
                onClick={() => { setGridSection(s); setGridType(null); }}
              />
            ))}
          </div>

          {/* Типы внутри выбранного раздела */}
          {gridTypes.length > 1 && (
            <div className="flex gap-2 overflow-x-auto hide-scrollbar px-4 mt-2">
              <FilterChip label={t.all} selected={gridType === null} onClick={() => setGridType(null)} subtle />
              {gridTypes.map((sub) => (
                <FilterChip key={sub} label={taxLabel(sub, locale)} selected={gridType === sub}
                  onClick={() => setGridType(sub)} subtle />
              ))}
            </div>
          )}

          {/* Сетка */}
          {gridItems.length === 0 && gridPending.length === 0 ? (
            <div className="mx-4 mt-4 rounded-2xl border border-dashed border-gray-200 dark:border-white/15 flex flex-col items-center justify-center gap-2 py-10 px-4">
              <p className="text-[13px] font-medium text-gray-400">{t.noItemsInSection}</p>
              <button
                onClick={() => openAdd(gridSection === 'ALL' ? 'TOPS' : gridSection)}
                className="px-4 py-1.5 rounded-full text-[12px] font-semibold border active:scale-[0.97] transition-transform"
                style={{ color: '#F370A7', borderColor: 'rgba(243,112,167,0.4)', background: 'rgba(243,112,167,0.06)' }}
              >
                {t.tapPlusToAdd}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-x-2.5 gap-y-4 px-4 mt-3.5">
              {gridPending.map((p) => (
                <ClothingItemCard
                  key={p.id}
                  item={{ id: p.id, category: p.category, imageData: p.imageData, createdAt: '' }}
                  onTap={() => {}}
                  isProcessing
                  processingStep={p.step}
                  processingProgress={p.progress}
                  startedAt={p.startedAt}
                  onRemove={() => removePendingUpload(p.id)}
                />
              ))}
              {gridItems.map((item) => (
                <ClothingItemCard key={item.id} item={item} onTap={() => setEditItem(item)}
                  isProcessing={beautifyingIds?.has(item.id)} beautifying
                  onBeautify={FEATURES.beautifyEnabled && !item.beautified && !item.sourceProductId ? () => handleWardrobeBeautify(item) : undefined} />
              ))}
            </div>
          )}
        </div>
        )}

        {/* Плавающая кнопка «Добавить вещь» перекрывает низ: на «Образах» под
            ней стоит «В ленту», на «Календаре» — «Примерить», запас больше. */}
        <div className={closetTab === 'outfits' || closetTab === 'calendar' ? 'h-24' : 'h-12'} />
      </main>

      {/* ── Interactive Outfit Canvas ──────────────────────────── */}
      {canvasData && (
        <InteractiveCanvas
          upper={canvasData.upper}
          lower={canvasData.lower}
          shoes={canvasData.shoes}
          acc={canvasData.acc}
          initialLayout={canvasInitialLayout}
          allItems={items}
          onClose={closeCanvas}
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
          onAddProduct={(p) => addCatalogItem(p, { loadingCard: false })}
          canRegenerate={canGenerate}
          plansEnabled={plansEnabled}
        />
      )}

      {/* ── Item Detail / Edit Sheet ───────────────────────── */}
      {editItem && (
        closetV2 ? (
          <ItemDetailSheet
            item={editItem}
            readOnly={DEMO_ITEM_IDS.has(editItem.id)}
            beautifyEnabled={FEATURES.beautifyEnabled}
            dark={theme === 'dark'}
            onClose={() => setEditItem(null)}
            onDelete={(id) => { handleDelete(id); setEditItem(null); }}
            onRename={handleRenameItem}
            onEditCategory={(id, sel) => handleUpdateItem(id, sel)}
            onBeautify={(item) => startBeautifyBackground(item)}
            onTryOn={(item) => { setEditItem(null); handleTryItOnFromItems([item]); }}
            onChanged={() => load()}
          />
        ) : (
          <ItemEditSheet
            item={editItem}
            onClose={() => setEditItem(null)}
            onDelete={(id) => { handleDelete(id); setEditItem(null); }}
            onSave={(id, sel) => { handleUpdateItem(id, sel); setEditItem(null); }}
          />
        )
      )}

      {/* ── Review window (closet v2 — optimistic local items) ── */}
      {closetV2 && batchReviewOpen && batchReviewItems.length > 0 && (
        <UploadReviewSheet
          items={batchReviewItems}
          dark={theme === 'dark'}
          beautifyEnabled={FEATURES.beautifyEnabled}
          requireComplete
          detectingIds={batchDetecting}
          finalizing={finalizingBatch}
          onClose={() => {
            if (finalizingBatch) return;
            setBatchReviewOpen(false);
            setBatchReview([]);
            // Улучшение продолжается в фоне — подтягиваем гардероб, чтобы лоадер
            // «Улучшаем…» был виден на карточках этих вещей.
            if ([...reviewBeautify.values()].some((s) => s.phase === 'working')) load();
          }}
          onConfirm={finalizeBatch}
          onTryOn={() => { /* try-on happens after the item is in the closet */ }}
          onBeautify={handleReviewBeautify}
          onBeautifyAll={handleBeautifyAll}
          beautifyReadyIds={beautifyReadyIds}
          beautifyState={reviewBeautify}
          onRename={() => { /* naming is not part of the taxonomy review */ }}
          onEditCategory={editBatchCategory}
          onDelete={deleteBatchItem}
        />
      )}

      {/* ── Beautify Compare Sheet (closet v2) ─────────────── */}
      {closetV2 && beautifyItem && (
        <BeautifyCompareSheet
          item={beautifyItem}
          dark={theme === 'dark'}
          presetBeautifiedUrl={beautifyPreset?.url ?? null}
          presetJobId={beautifyPreset?.jobId ?? null}
          onClose={() => { setBeautifyItem(null); setBeautifyPreset(null); }}
          onNeedCoins={() => setShowPremiumGate('beautify')}
          onCommitted={(id, choice, imageUrl) => {
            setBeautifyPreset(null);
            // Mark that the user has now beautified — the intro won't show again.
            try { localStorage.setItem('svayp_has_beautified', '1'); } catch { /* private mode */ }
            if (choice === 'BEAUTIFIED' && imageUrl) {
              setItems((prev) => prev.map((i) => (i.id === id ? { ...i, imageData: imageUrl } : i)));
              setBatchReview((prev) => prev.map((ri) => (uploadTrackerRef.current.get(ri.localId)?.realId === id ? { ...ri, previewImage: imageUrl } : ri)));
            }
            refreshCoins(); // Beautify платный — обновляем баланс
            load();
          }}
        />
      )}

      {/* ── "Introducing Beautify" educational popup (closet v2) ── */}
      {closetV2 && beautifyIntroFor && (
        <BeautifyIntroSheet
          dark={theme === 'dark'}
          from={beautifyIntroFor.from}
          onBeautify={openBeautifyFromIntro}
          onSkip={skipBeautifyIntro}
          // Показываем, какие именно фото улучшим (ряд превью с галочками).
          photos={(beautifyIntroFor.localIds ?? []).map((id) => ({
            id,
            src: batchReview.find((ri) => ri.localId === id)?.previewImage ?? '',
          }))}
          picked={introPicked}
          onTogglePhoto={toggleIntroPicked}
        />
      )}

      {/* ── Beautify first-run explainer (add step) ── */}
      {showBeautifyIntro && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center px-8" style={{ background: 'rgba(15,8,14,0.55)' }} onClick={() => setShowBeautifyIntro(false)}>
          <div className="w-full max-w-sm rounded-3xl p-6 text-center" style={{ background: theme === 'dark' ? '#1c1c1e' : '#fff' }} onClick={(e) => e.stopPropagation()}>
            <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#F9A9CB,#F370A7)' }}>
              <Sparkles size={30} color="#fff" />
            </div>
            <h3 className="text-[19px] font-extrabold mb-2" style={{ color: theme === 'dark' ? '#fff' : '#141118' }}>{t.cv_bt_intro_title}</h3>
            <p className="text-[14px] leading-relaxed mb-5" style={{ color: theme === 'dark' ? '#c9bcc6' : '#5b4f57' }}>{t.cv_bt_intro_body}</p>
            <button
              onClick={() => { setShowBeautifyIntro(false); try { localStorage.setItem('svayp_bt_intro', 'true'); } catch { /* private mode */ } setAddBeautifyRequested(true); }}
              className="w-full h-12 rounded-full text-white text-[15px] font-bold"
              style={{ background: '#F370A7' }}
            >
              {t.cv_bt_intro_cta}
            </button>
          </div>
        </div>
      )}

      {/* ── Buy-diamonds sheet (from the header chip or a "not enough" gate) ── */}
      {showPremiumGate && (
        <CoinsSheet
          balance={coins}
          pricing={coinPricing}
          paymentOptions={paymentOptions}
          onOpenPlans={
            plansAvailable
              ? () => {
                  // Из шторки алмазов сразу в тарифы: закрываем текущую, чтобы не копить
                  // два оверлея друг на друге.
                  setShowPremiumGate(null);
                  setShowPlans('coins_sheet');
                }
              : undefined
          }
          needMore={showPremiumGate !== 'browse'}
          dark={theme === 'dark'}
          onClose={() => {
            logAnalyticsEvent(Events.UPGRADE_MODAL_DISMISSED, {
              [Params.TRIGGER]: showPremiumGate,
              [Params.CURRENT_PLAN]: plan,
            });
            reportPurchaseFunnel('PAYWALL_DISMISSED', showPremiumGate ?? undefined);
            setShowPremiumGate(null);
            refreshCoins(); // баланс мог измениться (покупка/возврат)
          }}
        />
      )}

      {/* ── Шторка тарифов ── */}
      {showPlans && entitlements && (
        <PlansSheet
          entitlements={entitlements}
          dark={theme === 'dark'}
          paymentOptions={paymentOptions}
          trigger={showPlans}
          onPromoApplied={() => {
            // Цену со скидкой считает сервер — перечитываем каталог, иначе на карточке
            // останется прежняя сумма, а чекаут выставит другую.
            void refreshEntitlements();
            void refreshCoins();
          }}
          onClose={() => {
            setShowPlans(null);
            void refreshEntitlements();
            void refreshCoins();
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
          onConfirm={(opts) => { setShowTryOnConfirm(false); tryOnPersonKeyRef.current = opts.personImageKey; tryOnPersonPreviewRef.current = opts.personPreview; startTryOn(); }}
          onCancel={() => setShowTryOnConfirm(false)}
        />
      )}

      {/* ── Try-On Modal ── */}
      {tryOnState && (
        <TryOnModal
          status={tryOnState.status}
          resultUrl={tryOnState.resultUrl}
          jobId={tryOnState.jobId}
          failureReason={tryOnState.failureReason}
          previewImages={tryOnState.previewImages}
          personImage={tryOnState.personImage}
          onClose={() => setTryOnState(null)}
          onRetry={startTryOn}
          onCancel={handleCancelTryOn}
        />
      )}

      {/* ── Floating Add Button ── */}
      <div className="absolute right-5 z-50 flex flex-col items-end gap-3" style={{ bottom: '20px' }}>
        {/* AI-стилист Nur. Виден только тем, кому его открыл сервер (флаги feature.stylist.*
            + вайтлист беты) — состава беты на клиенте нет.

            Стоит здесь, а не в шапке: шапка уже переполнена — алмазы, тариф и «Руководство»
            не влезают на узких экранах, и «Руководство» обрезается краем. Ещё одна кнопка
            там сделала бы хуже. Внизу справа есть место, и для флагманской фичи заметная
            кнопка честнее иконки, зажатой в углу. */}
        {stylistAvailable && (
          <button
            onClick={() => {
              logAnalyticsEvent(Events.STYLIST_ENTRY_TAPPED, { [Params.SOURCE]: 'closet_fab' });
              router.push('/stylist');
            }}
            className="flex items-center gap-2 pl-4 pr-5 rounded-full text-[15px] font-bold shadow-xl active:scale-[0.96] transition-transform"
            style={{ background: '#141014', color: '#fff', height: 48 }}
            aria-label="Nur — AI-стилист"
          >
            <Sparkles size={18} strokeWidth={2.4} color="#C8A882" />
            Спросить Nur
          </button>
        )}

        {closetV2 ? (
          <button
            onClick={() => openAdd('TOPS')}
            className="flex items-center gap-2 pl-4 pr-5 rounded-full text-white text-[15px] font-bold shadow-xl active:scale-[0.96] transition-transform"
            style={{ background: '#F370A7', height: 52 }}
            aria-label={t.cv_add_item}
          >
            <Plus size={20} strokeWidth={2.6} color="white" />
            {t.cv_add_item}
          </button>
        ) : (
          <button
            onClick={() => openAdd('TOPS')}
            className="relative w-14 h-14 rounded-full flex items-center justify-center shadow-xl active:scale-[0.95] transition-transform"
            style={{ backgroundColor: '#F370A7' }}
            aria-label="Add item"
          >
            <Plus size={24} strokeWidth={2.5} color="white" />
          </button>
        )}
      </div>

      {/* ── How-to-use guide ── */}
      <ClosetGuide open={showGuide} onClose={() => setShowGuide(false)} />

      {/* ── "Perfect photo" tips for adding an item ── */}
      <PhotoTipsSheet open={showItemTips} kind="item" position="fixed" onClose={() => setShowItemTips(false)} />

      {/* ── Hidden file inputs for add flow ── */}
      <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleAddFileChange} />
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleAddFileChange} />

      {/* ── Photo Picker Sheet (shared with market/create) ── */}
      {showAddPicker && !addRawImage && (
        closetV2 ? (
          <AddItemSheet
            dark={theme === 'dark'}
            showShop={closetV2}
            addingProductIds={addingProductIds}
            addedProductIds={addedProductIds}
            onClose={() => setShowAddPicker(false)}
            onGallery={() => { logAnalyticsEvent(Events.ADD_ITEM_STARTED, { [Params.SOURCE]: 'gallery', [Params.FLOW]: 'closet' }); fileInputRef.current?.click(); setShowAddPicker(false); }}
            onCamera={() => { logAnalyticsEvent(Events.ADD_ITEM_STARTED, { [Params.SOURCE]: 'camera', [Params.FLOW]: 'closet' }); cameraInputRef.current?.click(); setShowAddPicker(false); }}
            onAddProduct={(p) => { logAnalyticsEvent(Events.ADD_ITEM_STARTED, { [Params.SOURCE]: 'library', [Params.FLOW]: 'closet' }); addCatalogItem(p); }}
          />
        ) : (
          <PhotoSourceSheet
            position="fixed"
            onClose={() => setShowAddPicker(false)}
            onGallery={() => { logAnalyticsEvent(Events.ADD_ITEM_STARTED, { [Params.SOURCE]: 'gallery', [Params.FLOW]: 'closet' }); fileInputRef.current?.click(); setShowAddPicker(false); }}
            onCamera={() => { logAnalyticsEvent(Events.ADD_ITEM_STARTED, { [Params.SOURCE]: 'camera', [Params.FLOW]: 'closet' }); cameraInputRef.current?.click(); setShowAddPicker(false); }}
          />
        )
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
              {closetV2 && FEATURES.beautifyEnabled && (
                <button
                  type="button"
                  onClick={handleBeautifyTapInAdd}
                  className="w-full mb-5 h-12 rounded-2xl flex items-center justify-center gap-2 text-[14px] font-bold active:scale-[0.98] transition-transform"
                  style={addBeautifyRequested
                    ? { background: '#F370A7', color: '#fff' }
                    : { background: theme === 'dark' ? 'rgba(243,112,167,0.16)' : '#fdeaf3', color: '#F370A7' }}
                >
                  <Sparkles size={16} />
                  {t.cv_bt_button}
                  {addBeautifyRequested && <Check size={15} strokeWidth={3} />}
                </button>
              )}
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
                  // Отвязываем аналитику от юзера, иначе события после логаута
                  // продолжают писаться под старым userId.
                  clearAnalyticsUser();
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
function OutfitSection({ activeTab, onTabChange, tryOnJobs, tryOnLoading, tryOnError, tryOnHasMore, onRetryTryOns, onLoadMoreTryOns, onDeleteTryOn, onTryItOnItems, allItems, canvases, plan, canGenerate, genCount, limits, tryOnCount, canAddCanvas, onViewItems, onRegenerate, onAddCanvas, onShowPlans, onTryItOn, onDeleteCanvas, aiSuggestingIdx, onAddItem, allowAutoGenerate, autoGenDone, onAutoGenerate, plansEnabled }: {
  activeTab: 'boards' | 'outfits' | 'dressme' | 'calendar';
  onTabChange: (tab: 'boards' | 'outfits' | 'dressme' | 'calendar') => void;
  tryOnJobs: TryOnJobResponse[];
  tryOnLoading: boolean;
  tryOnError: boolean;
  tryOnHasMore: boolean;
  onRetryTryOns: () => void;
  onLoadMoreTryOns: () => void;
  onDeleteTryOn: (id: string) => void;
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
  autoGenDone: boolean;
  onAutoGenerate: () => void;
  plansEnabled: boolean;
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

  // Публикация доски: ?seed=board:<canvasId> открывает подпись с этой доской.
  // Несохранённой канвы (id === null) в композере нет — делиться нечем.
  // Выбор «в ленту / во внешние приложения» — общая шторка, как у примерок.
  const [shareBoard, setShareBoard] = useState<{ id: string; layout: SavedCanvasLayout } | null>(null);

  async function shareBoardExternally(layout: SavedCanvasLayout) {
    try {
      const blob = await captureCanvasSnapshot(layout, allItems);
      await shareImageBlob(blob, 'libas-outfit.png');
    } catch {
      /* отмена шаринга или сбой рендера — молча выходим */
    }
  }

  return (
    <div className="mt-4">
      {/* ── Tabs: Boards · Outfits · Calendar · Feed ───────────────── */}
      {/* Dress Me tab retired (июль 2026) — DressMeReels kept below, just
          no longer surfaced in the strip; "Feed" opens the full /feed page,
          which renders this same strip so the other tabs stay reachable. */}
      <ClosetSectionTabs active={activeTab} onLocalSelect={onTabChange} />

      {activeTab === 'boards' && (
      <div
        className={`flex gap-3 hide-scrollbar py-2 ${isEmpty ? 'justify-center px-4' : 'overflow-x-auto pl-4'}`}
        style={{ overscrollBehaviorX: 'contain', contain: 'layout paint' }}
      >
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
            onShare={canvas.id ? () => setShareBoard({ id: canvas.id as string, layout: canvas.layout }) : undefined}
            onAddItem={onAddItem}
            allowAutoGenerate={allowAutoGenerate}
            autoGenDone={autoGenDone}
            onAutoGenerate={onAutoGenerate}
            isLocked={false} /* доски не лимитируются планом (июль 2026) */
            onShowPlans={onShowPlans}
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
            autoGenDone={autoGenDone}
            onAutoGenerate={onAutoGenerate}
          />
        )}

        {/* New outfit card — доски бесплатны и не лимитируются планом (июль 2026) */}
        {!isEmpty && canAddCanvas && (
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
            </div>
          </button>
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
          onDelete={onDeleteTryOn}
          onCreate={() => onTabChange('boards')}
        />
      )}

      {activeTab === 'dressme' && <DressMeReels allItems={allItems} />}

      {activeTab === 'calendar' && (
        <CalendarTab allItems={allItems} onTryItOn={onTryItOnItems} />
      )}

      {/* Куда делиться доской: в ленту или во внешние приложения */}
      {shareBoard && (
        <ShareSheet
          onClose={() => setShareBoard(null)}
          onExternal={() => shareBoardExternally(shareBoard.layout)}
          feedSeed={`board:${shareBoard.id}`}
        />
      )}
    </div>
  );
}

// ── Outfits tab: gallery of completed virtual try-on results ────────────────────
// Витрина сгенерированных образов: сетка 2×N на всю вкладку (список вещей на ней
// не показываем) и у каждого образа — явная кнопка «В ленту»: публикация и есть
// главный сценарий этой вкладки.
function TryOnGallery({ jobs, loading, error, hasMore, onRetry, onLoadMore, onDelete, onCreate }: {
  jobs: TryOnJobResponse[];
  loading: boolean;
  error: boolean;
  hasMore: boolean;
  onRetry: () => void;
  onLoadMore: () => void;
  onDelete: (id: string) => void;
  onCreate: () => void;
}) {
  const { t, locale } = useI18n();
  const { theme } = useTheme();
  const router = useRouter();
  const [viewingJob, setViewingJob] = useState<TryOnJobResponse | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  // Какие образы уже опубликованы — считаем по provenance (sourceRefId) своих
  // постов, чтобы не предлагать выложить то, что уже в ленте.
  const [sharedIds, setSharedIds] = useState<Set<string>>(() => new Set());
  // Hardware Back closes the full-screen look viewer instead of leaving the page.
  useOverlayBackClose(viewingJob !== null, () => setViewingJob(null));

  useEffect(() => {
    let cancelled = false;
    getMyPosts(0, 60)
      .then((page) => {
        if (cancelled) return;
        const ids = new Set<string>();
        page.content.forEach((p) => p.images.forEach((img) => {
          if (img.sourceType === 'tryon' && img.sourceRefId) ids.add(img.sourceRefId);
        }));
        setSharedIds(ids);
      })
      .catch(() => { /* лента недоступна — просто не помечаем образы */ });
    return () => { cancelled = true; };
  }, []);

  // Куда делиться образом — общая шторка: в ленту (?seed=tryon:<id> открывает
  // подпись сразу с этим образом) или во внешние приложения.
  const [sharingJob, setSharingJob] = useState<TryOnJobResponse | null>(null);

  function confirmDelete() {
    if (!confirmDeleteId) return;
    onDelete(confirmDeleteId);
    // Close the full-screen viewer if the deleted look was the one being viewed.
    setViewingJob((cur) => (cur?.id === confirmDeleteId ? null : cur));
    setConfirmDeleteId(null);
  }
  // Newest generated first (createdAt desc). ISO strings compare lexically.
  // Без картинки образа нет — такие задания не занимают плитку в витрине.
  const sortedJobs = jobs
    .filter((j) => !!j.resultImageUrl)
    .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));

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

  if (sortedJobs.length === 0) {
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
        {/* Примерка начинается с доски — уводим туда, а не в пустоту. */}
        <button
          onClick={onCreate}
          className="mt-5 h-11 px-6 rounded-full text-[14px] font-bold active:scale-[0.97] transition-transform"
          style={{ background: theme === 'dark' ? '#fff' : '#141014', color: theme === 'dark' ? '#141014' : '#fff' }}
        >
          {t.cl_looks_empty_cta}
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="px-4 pt-1">
        <h2 className="text-[17px] font-bold text-gray-900 dark:text-white tracking-tight">
          {t.cl_looks_n.replace('{n}', String(sortedJobs.length))}
        </h2>
        <p className="text-[12.5px] mt-0.5" style={{ color: theme === 'dark' ? '#8a8a8a' : '#9ca3af' }}>{t.cl_share_all_hint}</p>
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-4 px-4 mt-3">
        {sortedJobs.map((job) => {
          const shared = sharedIds.has(job.id);
          return (
            <div key={job.id}>
              <div
                role="button"
                onClick={() => setViewingJob(job)}
                className="relative w-full overflow-hidden rounded-[20px] active:scale-[0.98] transition-transform cursor-pointer"
                style={{
                  aspectRatio: '3 / 4',
                  background: theme === 'dark' ? '#1a1a1a' : '#F3F4F6',
                  boxShadow: theme === 'dark' ? '0 2px 10px rgba(0,0,0,0.3)' : '0 2px 10px rgba(0,0,0,0.06)',
                }}
              >
                {job.resultImageUrl && (
                  <Image src={job.resultImageUrl} alt="Try-on result" fill sizes="50vw" className="object-cover" unoptimized={needsUnoptimized(job.resultImageUrl)} />
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(job.id); }}
                  className="absolute top-2 right-2 z-10 w-8 h-8 rounded-full flex items-center justify-center active:scale-[0.95] transition-transform"
                  style={{ background: 'rgba(0,0,0,0.42)', backdropFilter: 'blur(4px)' }}
                  title={t.delete}
                  aria-label={t.delete}
                >
                  <Trash2 size={14} strokeWidth={2.2} className="text-white" />
                </button>
                {job.createdAt && (
                  <span
                    className="absolute bottom-2 left-2 z-10 px-2 py-0.5 rounded-full text-[10.5px] font-semibold text-white"
                    style={{ background: 'rgba(0,0,0,0.42)', backdropFilter: 'blur(4px)' }}
                  >
                    {new Date(job.createdAt).toLocaleDateString(locale)}
                  </span>
                )}
              </div>
              {/* Публикация — главное действие вкладки, поэтому кнопка видна на
                  каждой карточке, а не спрятана внутри просмотра. */}
              <button
                onClick={() => (shared ? router.push('/feed/me') : setSharingJob(job))}
                className="w-full h-9 mt-2 px-1.5 rounded-full flex items-center justify-center gap-1.5 text-[12.5px] font-bold whitespace-nowrap active:scale-[0.97] transition-transform"
                style={shared
                  ? { background: theme === 'dark' ? 'rgba(255,255,255,0.10)' : 'rgba(20,16,20,0.06)', color: theme === 'dark' ? '#cfcfcf' : '#4b5563' }
                  : { background: theme === 'dark' ? '#fff' : '#141014', color: theme === 'dark' ? '#141014' : '#fff' }}
              >
                {shared ? <Check size={13} strokeWidth={3} className="shrink-0" /> : <Send size={13} strokeWidth={2.4} className="shrink-0" />}
                <span className="truncate">{shared ? t.cl_in_feed : t.cl_share_feed}</span>
              </button>
            </div>
          );
        })}
      </div>

      {hasMore && (
        <div className="px-4 mt-4">
          <button
            onClick={onLoadMore}
            disabled={loading}
            className="w-full h-11 rounded-full flex items-center justify-center text-[14px] font-semibold active:scale-[0.98] transition-transform disabled:opacity-60"
            style={{
              background: theme === 'dark' ? 'rgba(255,255,255,0.10)' : 'rgba(20,16,20,0.06)',
              color: theme === 'dark' ? '#f0f0f0' : '#141014',
            }}
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : t.loadMore}
          </button>
        </div>
      )}

      {/* Full-screen viewer with download */}
      {viewingJob?.resultImageUrl && (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col">
          <div className="shrink-0 flex items-center justify-between px-4 h-14">
            <button
              onClick={() => setConfirmDeleteId(viewingJob.id)}
              className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center"
              title={t.delete}
              aria-label={t.delete}
            >
              <Trash2 size={16} color="white" />
            </button>
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
          {/* «В ленту» — основное действие; сохранение в галерею ушло в иконку. */}
          <div className="shrink-0 px-5 pb-10 pt-4 flex gap-2.5">
            <button
              onClick={() => (sharedIds.has(viewingJob.id) ? router.push('/feed/me') : setSharingJob(viewingJob))}
              className="flex-1 h-12 rounded-full bg-white text-black text-[14px] font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
            >
              {sharedIds.has(viewingJob.id) ? <Check size={15} strokeWidth={3} /> : <Send size={15} strokeWidth={2.4} />}
              {sharedIds.has(viewingJob.id) ? t.cl_in_feed : t.cl_share_feed}
            </button>
            <button
              onClick={() => handleDownload(viewingJob.resultImageUrl!)}
              disabled={isDownloading}
              className="w-12 h-12 shrink-0 rounded-full bg-white/15 text-white flex items-center justify-center disabled:opacity-50 active:scale-[0.95] transition-transform"
              title={t.myLooksSaveLook}
              aria-label={t.myLooksSaveLook}
            >
              {isDownloading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              )}
            </button>
          </div>
        </div>
      )}

      {sharingJob && (
        <ShareSheet
          onClose={() => setSharingJob(null)}
          onExternal={() => { if (sharingJob.resultImageUrl) void shareWatermarked(sharingJob.resultImageUrl); }}
          feedSeed={`tryon:${sharingJob.id}`}
        />
      )}

      {/* Delete confirmation */}
      {confirmDeleteId && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center px-8"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={() => setConfirmDeleteId(null)}
        >
          <div
            className="w-full max-w-[320px] rounded-3xl bg-white dark:bg-[#1c1c1e] p-6 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-14 h-14 rounded-full mx-auto flex items-center justify-center mb-4" style={{ background: 'rgba(239,68,68,0.12)' }}>
              <Trash2 size={26} className="text-[#EF4444]" />
            </div>
            <h2 className="text-[18px] font-bold text-black dark:text-white">{t.tryOnDeleteTitle}</h2>
            <p className="text-[14px] leading-relaxed text-black/55 dark:text-white/55 mt-1.5">{t.tryOnDeleteBody}</p>
            <div className="flex gap-2.5 mt-5">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="flex-1 py-3 rounded-2xl font-semibold text-[15px] text-black dark:text-white active:opacity-80"
                style={{ background: 'rgba(128,128,128,0.14)' }}
              >
                {t.tryOnCancel}
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 py-3 rounded-2xl font-semibold text-[15px] text-white active:opacity-90"
                style={{ background: '#EF4444' }}
              >
                {t.delete}
              </button>
            </div>
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
      style={{ height, overscrollBehaviorX: 'contain', contain: 'layout paint' }}
    >
      <div className="shrink-0" style={{ width: '20%' }} />
      {items.map((item) => (
        <div key={item.id} className="relative shrink-0 h-full snap-center" style={{ width: '60%', scrollSnapStop: 'always' }}>
          <Image src={item.imageData} alt={item.category} fill className="object-contain" unoptimized={needsUnoptimized(item.imageData)} />
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
  onShare,
  onAddItem,
  allowAutoGenerate,
  autoGenDone,
  onAutoGenerate,
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
  /** Публикация доски в ленту. Нет id у канвы (ещё не сохранена) → нет и кнопки. */
  onShare?: () => void;
  onAddItem?: (cat: ClosetCategory) => void;
  allowAutoGenerate: boolean;
  autoGenDone: boolean;
  onAutoGenerate?: () => void;
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

  // Auto-generate the user's FIRST outfit as soon as the wardrobe is ready (a top
  // + bottom, or a dress) — no need to tap the generate button. `autoGenDone` is
  // the persisted, per-user guard (owned by the parent, set only after a
  // generation succeeds) so reloads with a ready-but-unsaved wardrobe don't
  // re-call the paid AI endpoint, while a failed first attempt still retries next
  // visit. `autoGenFiredRef` dedupes within this mount. Firing while the wardrobe
  // is already ready on load is intentional — that's the common first-run case.
  const autoGenFiredRef = React.useRef(false);
  React.useEffect(() => {
    if (autoGenFiredRef.current || autoGenDone) return;
    if (!allowAutoGenerate || !canGenerateOutfit) return;
    if (displayEntries.length > 0 || isAiSuggesting || !onAutoGenerate) return;
    const isDemo = allItems.length > 0 && allItems.every((i) => DEMO_ITEM_IDS.has(i.id));
    if (isDemo) return;
    autoGenFiredRef.current = true;
    onAutoGenerate();
  }, [canGenerateOutfit, allowAutoGenerate, displayEntries.length, isAiSuggesting, autoGenDone]); // eslint-disable-line react-hooks/exhaustive-deps

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
      {/* Top-left: удалить + «в ленту» (иконкой, как на карточках образов) */}
      <div className="absolute top-3.5 left-3.5 z-10 flex items-center gap-2">
        {onDelete && (
          <button
            onClick={onDelete}
            className="w-9 h-9 rounded-full flex items-center justify-center active:scale-[0.95] transition-transform"
            style={{ background: theme === 'dark' ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.08)' }}
            title="Delete"
          >
            <Trash2 size={14} strokeWidth={2.2} className="text-red-400" />
          </button>
        )}
        {onShare && displayEntries.length > 0 && (
          <button
            onClick={onShare}
            className="w-9 h-9 rounded-full flex items-center justify-center active:scale-[0.95] transition-transform"
            style={{ background: theme === 'dark' ? 'rgba(255,255,255,0.10)' : 'rgba(20,16,20,0.06)' }}
            title={t.cl_share_feed}
            aria-label={t.cl_share_feed}
          >
            <Send size={14} strokeWidth={2.3} style={{ color: theme === 'dark' ? '#f0f0f0' : '#141014' }} />
          </button>
        )}
      </div>

      {/* Top-right: Generate-outfit pill with its diamond cost */}
      {(canGenerateOutfit || isEmpty) && onRegenerate && (
        <button
          onClick={isAiSuggesting || isEmpty ? undefined : onRegenerate}
          disabled={isAiSuggesting || isEmpty}
          className="absolute top-3.5 right-3.5 z-10 flex items-center gap-1.5 h-9 pl-3 pr-1.5 rounded-full active:scale-[0.96] transition-transform disabled:opacity-50"
          style={{
            background: theme === 'dark' ? '#2a2a2a' : '#ffffff',
            border: theme === 'dark' ? '1px solid rgba(255,255,255,0.07)' : '1px solid rgba(243,112,167,0.22)',
            boxShadow: theme === 'dark' ? '0 3px 10px rgba(0,0,0,0.4)' : '0 3px 12px rgba(243,112,167,0.18), 0 1px 3px rgba(0,0,0,0.06)',
          }}
          title={isAiSuggesting ? t.aiThinking : t.regenerateWithAI}
        >
          {isAiSuggesting ? (
            <Loader2 size={15} strokeWidth={2.3} className="animate-spin" style={{ color: '#F370A7' }} />
          ) : (
            <Sparkles size={15} style={{ color: '#F370A7' }} />
          )}
          <span className="text-[12px] font-bold whitespace-nowrap" style={{ color: theme === 'dark' ? '#fff' : '#141118' }}>
            {isAiSuggesting ? t.aiThinking : t.generateOutfitLabel}
          </span>
          {!isAiSuggesting && (
            <span className="flex items-center gap-0.5 h-[22px] pl-1.5 pr-2 rounded-full" style={{ background: 'rgba(243,112,167,0.12)' }}>
              <Diamond size={12} />
              <span className="text-[11px] font-extrabold leading-none" style={{ color: '#C94E86' }}>{ACTION_COST.createOutfit}</span>
            </span>
          )}
        </button>
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
                    <Image src={entry.item.imageData} alt={entry.item.category} fill className="object-contain" unoptimized={needsUnoptimized(entry.item.imageData)} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom action bar — shown when there's a saved layout, outfit can be generated, or closet is empty.
          Публикация тут только иконкой сверху: подпись «в ленту» живёт в календаре. */}
      {(displayEntries.length > 0 || canGenerateOutfit || isEmpty) && (
      <div className="flex gap-2.5 px-5 pb-5">
        <button
          onClick={onViewItems}
          className="flex-1 h-[44px] rounded-full flex items-center justify-center gap-1.5 text-[12px] font-semibold tracking-wide active:scale-[0.97] transition-transform"
          style={{
            background: theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
            color: theme === 'dark' ? '#aaa' : '#666'
          }}
        >
          <Pencil size={14} strokeWidth={2.2} />
          {t.viewItems}
        </button>
        {onTryItOn && (displayEntries.length > 0 || canGenerateOutfit || isEmpty) && (
        <button
          onClick={isEmpty ? undefined : onTryItOn}
          disabled={isEmpty}
          className="flex-1 h-[44px] rounded-full flex items-center justify-center gap-1.5 text-[12px] font-bold text-white tracking-wide whitespace-nowrap active:scale-[0.97] transition-transform"
          style={{
            background: 'linear-gradient(135deg, #141014 0%, #332c33 50%, #141014 100%)',
            backgroundSize: '200% auto',
            animation: 'tryOnShimmer 2.4s linear infinite, tryOnPulse 2s ease-in-out infinite',
            boxShadow: '0 4px 18px rgba(20,16,20,0.35)',
          }}
        >
          <span>{t.tryItOn}</span>
          <span className="flex items-center gap-0.5 h-[19px] pl-1 pr-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.24)' }}>
            <Diamond size={11} />
            <span className="text-[10px] font-extrabold leading-none">{ACTION_COST.tryOn}</span>
          </span>
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

/** Фильтр-чип сетки. `subtle` — второй ряд (типы): визуально тише разделов,
 *  чтобы два ряда чипов не спорили за внимание. */
function FilterChip({ label, count, selected, onClick, subtle }: {
  label: string;
  count?: number;
  selected: boolean;
  onClick: () => void;
  subtle?: boolean;
}) {
  const base = 'shrink-0 flex items-center gap-1.5 rounded-full transition-colors active:scale-[0.96]';
  const size = subtle ? 'h-7 px-3 text-[12px]' : 'h-8 px-3.5 text-[12.5px]';
  const skin = selected
    ? (subtle ? 'bg-gray-900 text-white font-semibold dark:bg-white dark:text-black' : 'bg-black text-white font-bold dark:bg-white dark:text-black')
    : 'bg-gray-100 text-gray-500 font-medium dark:bg-white/10 dark:text-white/60';
  return (
    <button onClick={onClick} className={`${base} ${size} ${skin}`}>
      {label}
      {count !== undefined && count > 0 && (
        <span className="text-[11px] font-semibold" style={{ opacity: selected ? 0.65 : 0.75 }}>{count}</span>
      )}
    </button>
  );
}

function ClothingItemCard({ item, onTap, isProcessing, startedAt, onRemove, beautifying, onBeautify }: { item: ClosetItem; onTap: () => void; isProcessing?: boolean; processingStep?: string; processingProgress?: number; startedAt?: number; onRemove?: () => void; beautifying?: boolean; onBeautify?: () => void }) {
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

  // Дата добавления под карточкой — как в Acloset: с сортировкой «сначала
  // новые» она объясняет порядок сетки.
  const added = item.createdAt ? new Date(item.createdAt) : null;
  const addedLabel = added && !Number.isNaN(added.getTime()) ? added.toLocaleDateString(locale) : '';

  return (
    <div className="cursor-pointer active:scale-[0.97] transition-transform" onClick={isProcessing ? undefined : onTap}>
      <div className="relative w-full rounded-2xl overflow-hidden bg-gray-50 dark:bg-white/5" style={{ aspectRatio: '3 / 4' }}>
      {item.imageData ? (
        // beautified → unoptimized: next/image грузил бы /_next/image?url=…
        // (другой URL, чем предзагретый raw) → секунда старого фото после свапа.
        <Image src={item.imageData} alt={item.category} fill className={`object-contain ${isProcessing ? 'opacity-50' : ''}`} unoptimized={needsUnoptimized(item.imageData) || !!item.beautified} />
      ) : (
        <div className="w-full h-full bg-gray-200 dark:bg-white/10 animate-pulse" />
      )}
      {/* Beautify — прямо на карточке (в попапе вещи кнопки больше нет) */}
      {!isProcessing && onBeautify && (
        <button
          onClick={(e) => { e.stopPropagation(); onBeautify(); }}
          className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full flex items-center justify-center active:scale-90 transition-transform"
          style={{ background: '#F370A7', boxShadow: '0 2px 6px -1px rgba(243,112,167,0.55)' }}
          aria-label="Beautify"
        >
          <Sparkles size={14} className="text-white" />
        </button>
      )}
      {/* Processing overlay. Beautify визуально ДРУГОЙ (розовый + Sparkles),
          чтобы не путался с зелёным лоадером обычной загрузки. */}
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
          {beautifying ? (
            <>
              <div className="w-9 h-9 mb-1.5 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#F9A9CB,#F370A7)' }}>
                <Sparkles size={16} className="text-white" />
              </div>
              <span className="text-[9px] font-semibold text-white text-center px-2 leading-tight">{t.cv_bt_working}</span>
              <div className="w-[70%] h-1 mt-1.5 rounded-full bg-white/20 overflow-hidden">
                <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${simProgress}%`, background: '#F370A7' }} />
              </div>
            </>
          ) : (
            <>
              <div className="w-8 h-8 mb-1.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              <span className="text-[9px] font-medium text-white text-center px-2 leading-tight">{currentPhase.label()}</span>
              <div className="w-[70%] h-1 mt-1.5 rounded-full bg-white/20 overflow-hidden">
                <div className="h-full bg-green-400 rounded-full transition-all duration-1000" style={{ width: `${simProgress}%` }} />
              </div>
            </>
          )}
        </div>
      )}
      </div>

      {/* Подпись под карточкой: что это + когда добавили (как в Acloset).
          Раньше тип печатался поверх фото и мешал самой вещи. */}
      <p className="text-[11.5px] font-semibold leading-tight truncate mt-1.5 text-gray-800 dark:text-white/90">
        {isProcessing ? t.uploading : (item.displayName || taxLabel(effectiveSubcategory(item), locale))}
      </p>
      {!isProcessing && addedLabel && (
        <p className="text-[10.5px] leading-tight truncate mt-0.5 text-gray-400 dark:text-white/40">{addedLabel}</p>
      )}
    </div>
  );
}

// ─── Outfit Days Sheet ──────────────────────────────────────────────────────────

// Вещь дня: детерминированный выбор по дате, сдвинутый на `offset` — так кнопка
// «другой образ» перебирает варианты, а сам день остаётся стабильным.
function pickItem(items: ClosetItem[], day: Date, offset = 0): ClosetItem | null {
  if (!items.length) return null;
  const dayIndex = Math.floor(day.getTime() / 86400000) + offset;
  return items[((dayIndex % items.length) + items.length) % items.length];
}

// ── Calendar tab: next-7-days outfit suggestions, window-sized cards ────────────
// Вся неделя открыта всем (июль 2026): планов и замков на днях больше нет.
function CalendarTab({
  allItems,
  onTryItOn,
}: {
  allItems: ClosetItem[];
  onTryItOn: (items: ClosetItem[]) => void;
}) {
  const { t } = useI18n();
  const { theme } = useTheme();
  const dark = theme === 'dark';
  const [selectedDayIdx, setSelectedDayIdx] = useState(0);
  // Сдвиг подбора — свой у каждого дня, чтобы «другой образ» не сбрасывался при
  // переключении дат.
  const [shuffleByDay, setShuffleByDay] = useState<Record<number, number>>({});
  // Свайп по карточке листает дни — так же, как тап по строке недели.
  const swipeXRef = useRef<number | null>(null);
  // Куда делиться образом дня: в ленту или во внешние приложения.
  const [sharingDay, setSharingDay] = useState<ClosetItem[] | null>(null);

  async function shareDayExternally(dayItems: ClosetItem[]) {
    try {
      const blob = await captureCanvasSnapshot(buildLayoutFromIds(dayItems.map((i) => i.id), allItems), allItems);
      await shareImageBlob(blob, 'libas-outfit.png');
    } catch {
      /* отмена шаринга или сбой рендера — молча выходим */
    }
  }
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
        // Разные множители сдвига — иначе «другой образ» листал бы все категории
        // синхронно и на коротких списках менял бы вид не всегда.
        const shuffle = shuffleByDay[selectedDayIdx] ?? 0;
        const upper = pickItem(upperItems, selDay, shuffle);
        // A dress/jumpsuit is a complete outfit on its own — never pair it with a
        // separate bottom (hard rule H1: no "dress + skirt/pants").
        const upperIsFullBody = !!upper && FULL_BODY_CATS.includes(upper.category);
        const lower = upperIsFullBody ? null : pickItem(lowerItems, selDay, shuffle * 3);
        const shoe = pickItem(shoeItems, selDay, shuffle * 5);
        const shawl = pickItem(shawlItems, selDay, shuffle * 7);
        const sideAcc = pickItem(sideAccItems, selDay, shuffle * 11);
        const selIsToday = selectedDayIdx === 0 && new Date().toDateString() === selDay.toDateString();
        const headerLabel = `${t.dayNames[selDay.getDay()]}, ${selDay.getDate()} ${t.monthNames[selDay.getMonth()]}`;
        // Главная колонка тянется на всю карточку, поэтому пустые слоты не
        // резервируем: два предмета заполняют её так же, как четыре.
        const mainPieces = ([
          upper ? { item: upper, grow: 1.15 } : null,
          lower ? { item: lower, grow: 1 } : null,
          shoe ? { item: shoe, grow: 0.5 } : null,
        ].filter(Boolean) as { item: ClosetItem; grow: number }[]);
        const accPieces = [shawl, sideAcc].filter(Boolean) as ClosetItem[];
        const dayItems = [shawl, upper, lower, shoe, sideAcc].filter(Boolean) as ClosetItem[];
        return (
          <>
            {/* Неделя целиком, без горизонтальной прокрутки: семь равных ячеек
                читаются как строка календаря, а не как лента чипов. */}
            <div className="flex gap-1.5 pb-3">
              {days.map((day, i) => {
                const isToday = i === 0 && new Date().toDateString() === day.toDateString();
                const selected = i === selectedDayIdx;
                return (
                  <button
                    key={i}
                    onClick={() => setSelectedDayIdx(i)}
                    className="flex-1 min-w-0 flex flex-col items-center justify-center rounded-2xl active:scale-95 transition-transform"
                    style={{
                      height: 62,
                      // Выбранный день — чёрный, как активный фильтр в гардеробе:
                      // розовый в закладке оставлен за «добавить вещь».
                      background: selected
                        ? (dark ? '#ffffff' : '#141014')
                        : (dark ? '#1f1f1f' : '#f3f4f6'),
                    }}
                  >
                    <span
                      className="text-[10px] font-semibold leading-none mb-1"
                      style={{ color: selected ? (dark ? 'rgba(20,16,20,0.55)' : 'rgba(255,255,255,0.7)') : (dark ? '#9ca3af' : '#6b7280') }}
                    >
                      {t.dayNames[day.getDay()]}
                    </span>
                    <span
                      className="text-[16px] font-bold leading-none"
                      style={{ color: selected ? (dark ? '#141014' : '#fff') : (dark ? '#e5e7eb' : '#1f2937') }}
                    >
                      {day.getDate()}
                    </span>
                    {/* Точка = сегодня: подпись «Today» не влезает в узкую ячейку */}
                    <span
                      className="w-1 h-1 rounded-full mt-1"
                      style={{
                        background: isToday
                          ? (selected ? (dark ? '#141014' : '#fff') : (dark ? '#e5e7eb' : '#141014'))
                          : 'transparent',
                      }}
                    />
                  </button>
                );
              })}
            </div>

            {/* Образ дня. Дата и «другой образ» лежат поверх карточки, а вещи
                тянутся на всю её высоту — раньше пустые слоты под недостающие
                категории оставляли половину карточки белой. */}
            <div
              className="relative rounded-[28px] overflow-hidden flex flex-col"
              style={{
                height: 420,
                background: dark ? '#1a1a1a' : '#FFFFFF',
                boxShadow: dark ? '0 2px 12px rgba(0,0,0,0.3)' : '0 2px 12px rgba(0,0,0,0.06)',
              }}
              onTouchStart={(e) => { swipeXRef.current = e.touches[0].clientX; }}
              onTouchEnd={(e) => {
                const start = swipeXRef.current;
                swipeXRef.current = null;
                // Порог в 48px: вертикальную прокрутку страницы не трогаем.
                if (start === null) return;
                const dx = e.changedTouches[0].clientX - start;
                if (Math.abs(dx) < 48) return;
                setSelectedDayIdx((i) => Math.min(days.length - 1, Math.max(0, i + (dx < 0 ? 1 : -1))));
              }}
            >
              <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between gap-2">
                <span
                  className="h-8 px-3 rounded-full flex items-center gap-1.5 text-[12.5px] font-bold whitespace-nowrap"
                  style={{
                    background: dark ? 'rgba(255,255,255,0.10)' : 'rgba(20,16,20,0.06)',
                    color: dark ? '#f0f0f0' : '#141014',
                  }}
                >
                  <CalendarDays size={13} strokeWidth={2.4} />
                  {selIsToday ? t.today : headerLabel}
                </span>
                {dayItems.length > 0 && (
                  <button
                    onClick={() => setShuffleByDay((prev) => ({ ...prev, [selectedDayIdx]: (prev[selectedDayIdx] ?? 0) + 1 }))}
                    className="h-8 px-3 rounded-full flex items-center gap-1.5 text-[12px] font-bold whitespace-nowrap active:scale-[0.95] transition-transform"
                    style={{
                      background: dark ? 'rgba(255,255,255,0.10)' : 'rgba(20,16,20,0.06)',
                      color: dark ? '#f0f0f0' : '#141014',
                    }}
                  >
                    <RefreshCw size={12} strokeWidth={2.6} />
                    {t.cl_cal_shuffle}
                  </button>
                )}
              </div>

              {/* Вещи дня: главная колонка + рейл аксессуаров справа */}
              {dayItems.length === 0 ? (
                <div className="flex-1 flex items-center justify-center px-8 text-center">
                  <p className="text-[13px] font-medium" style={{ color: dark ? '#888' : '#9ca3af' }}>{t.addItemsFirst}</p>
                </div>
              ) : (
                <div className="flex-1 flex items-stretch gap-2 px-4 pt-14 pb-4 min-h-0">
                  <div className="flex-1 flex flex-col items-center justify-center min-h-0">
                    {mainPieces.map((p) => (
                      <div key={p.item.id} className="relative w-full min-h-0" style={{ flex: `${p.grow} 1 0` }}>
                        <Image src={p.item.imageData} alt={p.item.category} fill className="object-contain" unoptimized={needsUnoptimized(p.item.imageData)} />
                      </div>
                    ))}
                  </div>
                  {accPieces.length > 0 && (
                    <div className="w-16 shrink-0 flex flex-col justify-center gap-2">
                      {accPieces.map((a) => (
                        <div
                          key={a.id}
                          className="relative w-16 h-16 rounded-2xl overflow-hidden"
                          style={{ background: dark ? 'rgba(255,255,255,0.06)' : '#F6F6F7' }}
                        >
                          <Image src={a.imageData} alt={a.category} fill className="object-contain p-1.5" unoptimized={needsUnoptimized(a.imageData)} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

            </div>

            {/* В ленту + примерка. Образ дня нигде не сохранён, поэтому в
                композер уходит список вещей — он соберёт из него раскладку. */}
            <div className="flex gap-2 mt-3">
              {dayItems.length > 0 && (
                <button
                  onClick={() => setSharingDay(dayItems)}
                  className="shrink-0 h-11 px-4 rounded-full flex items-center justify-center gap-1.5 text-[12.5px] font-bold whitespace-nowrap active:scale-[0.96] transition-transform"
                  style={{
                    background: dark ? 'rgba(255,255,255,0.10)' : 'rgba(20,16,20,0.06)',
                    color: dark ? '#f0f0f0' : '#141014',
                  }}
                >
                  <Send size={13} strokeWidth={2.4} />
                  {t.cl_share_feed}
                </button>
              )}
              <button
                onClick={() => onTryItOn(dayItems)}
                disabled={dayItems.length === 0}
                className="flex-1 h-11 rounded-full flex items-center justify-center gap-1.5 text-[13px] font-bold text-white whitespace-nowrap active:scale-[0.97] transition-transform disabled:opacity-40"
                style={{ background: 'linear-gradient(135deg, #141014 0%, #332c33 50%, #141014 100%)', backgroundSize: '200% auto', animation: 'tryOnShimmer 2.4s linear infinite', boxShadow: '0 4px 18px rgba(20,16,20,0.32)' }}
              >
                <Sparkles size={13} />
                <span>{t.tryItOn}</span>
                <span className="flex items-center gap-0.5 h-[18px] pl-1 pr-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.24)' }}>
                  <Diamond size={11} />
                  <span className="text-[10px] font-extrabold leading-none">{ACTION_COST.tryOn}</span>
                </span>
              </button>
            </div>
          </>
        );
      })()}

      {sharingDay && (
        <ShareSheet
          onClose={() => setSharingDay(null)}
          onExternal={() => shareDayExternally(sharingDay)}
          feedSeed={`calendar:${sharingDay.map((i) => i.id).join(',')}`}
        />
      )}
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
  const [isSharing, setIsSharing] = useState(false);
  const [showShareSheet, setShowShareSheet] = useState(false);
  const { t, locale } = useI18n();
  const { theme } = useTheme();
  const dark = theme === 'dark';

  async function handleShare() {
    if (!item.imageData || isSharing) return;
    setIsSharing(true);
    try {
      const blob = await fetchImageBlob(item.imageData);
      await shareImageBlob(blob, `libas-item-${item.id}.png`);
    } catch {
      /* share cancelled or fetch failed — no-op */
    } finally {
      setIsSharing(false);
    }
  }

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
              <Image src={item.imageData} alt={item.category} fill className="object-contain" unoptimized={needsUnoptimized(item.imageData)} />
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

        {/* Delete + Share + Save buttons */}
        <div className="flex gap-2.5 px-5 pt-3 pb-8 shrink-0">
          <button
            onClick={() => onDelete(item.id)}
            className="flex-1 h-12 rounded-full flex items-center justify-center text-[14px] font-semibold text-red-500"
            style={{ background: 'rgba(239,68,68,0.1)' }}
          >
            {t.delete}
          </button>
          <button
            onClick={() => setShowShareSheet(true)}
            disabled={isSharing}
            aria-label={t.share}
            title={t.share}
            className="shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-[#2a2a2a] disabled:opacity-50"
          >
            {isSharing ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} strokeWidth={2.3} />}
          </button>
          {showShareSheet && (
            <ShareSheet onClose={() => setShowShareSheet(false)} onExternal={handleShare} />
          )}
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

