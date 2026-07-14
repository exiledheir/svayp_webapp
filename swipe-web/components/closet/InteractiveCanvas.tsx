import { needsUnoptimized } from '@/lib/img';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { Plus, X, RefreshCw, Loader2, Check } from 'lucide-react';
import type { ClosetItem } from '@/lib/closet-storage';
import { UPPER_CATS, LOWER_CATS, SHOES_CATS, ACC_CATS, type SavedCanvasLayout, type CanvasGroup } from '@/lib/closet-types';
import { useI18n } from '@/lib/i18n';
import { isCanvasHintSeen, setCanvasHintSeen, isCanvasEditOnboarded, setCanvasEditOnboarded } from '@/lib/onboarding-storage';
import CanvasOnboarding from '@/components/closet/CanvasOnboarding';
import { getAllProducts, getFavoriteProducts } from '@/lib/api';
import type { Product } from '@/types';

interface CanvasItem {
  item: ClosetItem;
  x: number;
  y: number;
  scale: number;
  zIndex: number;
  group: CanvasGroup;
}

// Bottom-toolbar button — either a picker source (closet/shop) or an edit action.
type ToolBtn = {
  key: string;
  label: string;
  kind: 'source' | 'action';
  source?: 'closet' | 'shop';
  needsSelection?: boolean;
  action?: () => void;
  icon: React.ReactNode;
};

export default function InteractiveCanvas({
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
  onAddProduct,
  canRegenerate,
  plansEnabled,
  alwaysShowHint = false,
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
  /** Import a shop product into the closet (resolves once it's in `allItems`). */
  onAddProduct?: (product: Product) => void | Promise<void>;
  canRegenerate: boolean;
  plansEnabled: boolean;
  /** Force-show the drag hint even if the user has seen it before (used in onboarding). */
  alwaysShowHint?: boolean;
}) {
  const { t } = useI18n();
  const containerRef = useRef<HTMLDivElement>(null);
  const nextZ = useRef(10);
  // Category tab in the closet (add) picker.
  const [pickerTab, setPickerTab] = useState<'all' | CanvasGroup>('all');
  // One-time Acloset-style gesture tutorial (normal edit mode only).
  const [showEditOnboarding, setShowEditOnboarding] = useState(false);

  // ── Docked closet/shop picker — a bottom panel that shrinks the canvas
  // (not an overlay). Its height is drag-controlled so it can be swiped down
  // and closed with the finger. ────────────────────────────────────────────
  const vh = () => (typeof window !== 'undefined' ? window.innerHeight : 800);
  const [pickerSource, setPickerSource] = useState<'closet' | 'shop'>('closet');
  const [pickerH, setPickerH] = useState(0); // panel height in px; 0 = closed
  const [pickerDragging, setPickerDragging] = useState(false);
  const pickerDragRef = useRef<{ startY: number; startH: number } | null>(null);

  // Shop catalog (lazy-loaded on first shop open) + per-product import state.
  const [shopProducts, setShopProducts] = useState<Product[]>([]);
  const [shopLoading, setShopLoading] = useState(false);
  const shopLoadedRef = useRef(false);
  const [shopAdding, setShopAdding] = useState<Set<string>>(new Set());
  const [shopAdded, setShopAdded] = useState<Set<string>>(new Set());

  // Latest allItems (for the shop auto-place watcher, which runs after an async import).
  const allItemsRef = useRef(allItems);
  useEffect(() => { allItemsRef.current = allItems; }, [allItems]);
  // When an imported shop item lands in allItems, drop it onto the canvas.
  const pendingShopRef = useRef<{ before: Set<string>; productId: string }[]>([]);
  useEffect(() => {
    if (pendingShopRef.current.length === 0) return;
    const consumed = new Set<string>(); // don't hand the same new item to two imports
    const remaining: { before: Set<string>; productId: string }[] = [];
    for (const p of pendingShopRef.current) {
      const fresh = allItems.find((i) => !p.before.has(i.id) && !consumed.has(i.id));
      if (fresh) {
        consumed.add(fresh.id);
        addItem(fresh);
        setShopAdding((prev) => { const n = new Set(prev); n.delete(p.productId); return n; });
        setShopAdded((prev) => new Set(prev).add(p.productId));
      } else {
        remaining.push(p);
      }
    }
    pendingShopRef.current = remaining;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allItems]);

  const DEFAULT_FRAC = 0.4;
  function openPicker(source: 'closet' | 'shop') {
    setPickerSource(source);
    setPickerH(Math.round(vh() * DEFAULT_FRAC));
    if (source === 'shop') loadShop();
  }
  function togglePicker(source: 'closet' | 'shop') {
    if (pickerH > 0 && pickerSource === source) { setPickerH(0); return; }
    openPicker(source);
  }

  async function loadShop() {
    if (shopLoadedRef.current) return;
    shopLoadedRef.current = true;
    setShopLoading(true);
    try {
      const [liked, all] = await Promise.all([
        getFavoriteProducts(0, 12).catch(() => [] as Product[]),
        getAllProducts(0, 24).catch(() => ({ products: [] as Product[], total: 0 })),
      ]);
      const seen = new Set<string>();
      const merged: Product[] = [];
      for (const p of [...liked, ...all.products]) { if (!seen.has(p.id)) { seen.add(p.id); merged.push(p); } }
      setShopProducts(merged);
    } finally {
      setShopLoading(false);
    }
  }

  function addShopProduct(product: Product) {
    if (!onAddProduct || shopAdding.has(product.id) || shopAdded.has(product.id)) return;
    setShopAdding((prev) => new Set(prev).add(product.id));
    pendingShopRef.current.push({ before: new Set(allItemsRef.current.map((i) => i.id)), productId: product.id });
    Promise.resolve(onAddProduct(product)).catch(() => {
      pendingShopRef.current = pendingShopRef.current.filter((p) => p.productId !== product.id);
      setShopAdding((prev) => { const n = new Set(prev); n.delete(product.id); return n; });
    });
    // Safety net: if the import never lands (e.g. plan-gated), stop the spinner.
    setTimeout(() => {
      if (pendingShopRef.current.some((p) => p.productId === product.id)) {
        pendingShopRef.current = pendingShopRef.current.filter((p) => p.productId !== product.id);
        setShopAdding((prev) => { const n = new Set(prev); n.delete(product.id); return n; });
      }
    }, 30000);
  }

  // Drag the picker handle to resize / close it, following the finger.
  function pickerTouchStart(e: React.TouchEvent) {
    pickerDragRef.current = { startY: e.touches[0].clientY, startH: pickerH };
    setPickerDragging(true);
  }
  function pickerTouchMove(e: React.TouchEvent) {
    if (!pickerDragRef.current) return;
    const dy = e.touches[0].clientY - pickerDragRef.current.startY;
    const maxH = Math.round(vh() * 0.82);
    setPickerH(Math.max(0, Math.min(maxH, pickerDragRef.current.startH - dy)));
  }
  function pickerTouchEnd() {
    if (!pickerDragRef.current) return;
    pickerDragRef.current = null;
    setPickerDragging(false);
    const h = vh();
    setPickerH((cur) => {
      if (cur < h * 0.18) return 0;                 // swiped down far → close
      if (cur > h * 0.62) return Math.round(h * 0.75); // pulled up → expand
      return Math.round(h * DEFAULT_FRAC);          // otherwise snap to 40%
    });
  }

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
    // No saved layout — start with empty canvas, user builds manually
    return [];
  }, [initialLayout, allItems]);

  const [canvasItems, setCanvasItems] = useState<CanvasItem[]>(buildInitialItems);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number; itemX: number; itemY: number }>({ x: 0, y: 0, itemX: 0, itemY: 0 });
  const [swapTarget, setSwapTarget] = useState<number | null>(null);
  const [addPicker, setAddPicker] = useState(false);
  const [saveWarning, setSaveWarning] = useState(false);
  // In onboarding, hold the Save/Continue button disabled for a moment so the
  // user reads the instruction and watches the move demo before advancing.
  const [continueReady, setContinueReady] = useState(!alwaysShowHint);
  useEffect(() => {
    if (!alwaysShowHint) return;
    const id = setTimeout(() => setContinueReady(true), 3000);
    return () => clearTimeout(id);
  }, [alwaysShowHint]);
  // Pinch zoom state — stores the target item index so handleTouchMove doesn't rely on selectedIdx closure
  const pinchRef = useRef<{ initialDist: number; initialScale: number; itemIdx: number } | null>(null);
  // Container rect captured once at drag start — the canvas doesn't resize mid-drag,
  // so reading getBoundingClientRect() on every pointermove is a needless reflow
  // that makes dragging feel uneven. Cache it here for handlePointerMove.
  const dragRectRef = useRef<{ width: number; height: number }>({ width: 1, height: 1 });

  // ── Item-nudge animation — runs once, shows items are draggable ──
  const [showDragHint, setShowDragHint] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return alwaysShowHint || !isCanvasHintSeen();
  });
  useEffect(() => {
    if (!showDragHint) return;
    const timer = setTimeout(() => {
      setShowDragHint(false);
      setCanvasHintSeen();
    }, 3200);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Show the one-time gesture tutorial the first time a user opens the editor
  // (skipped during registration onboarding, which has its own guided demo).
  useEffect(() => {
    if (alwaysShowHint || isCanvasEditOnboarded()) return;
    setShowEditOnboarding(true);
    setShowDragHint(false); // don't run the legacy drag hint under the tutorial
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Open the closet picker docked at 40% on entering the editor, so the canvas
  // starts shrunk with items ready to place (normal edit mode only).
  useEffect(() => {
    if (alwaysShowHint) return;
    setPickerH(Math.round(vh() * DEFAULT_FRAC));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── One-time "move" demo (onboarding) ──────────────────────────────────────
  // New users don't realize the canvas is editable, so when `alwaysShowHint` is
  // set we play a short, hands-free demonstration: the top and bottom items
  // visibly swap places (with a captioned explanation), then glide back to where
  // they started — making it obvious that any item can be dragged anywhere.
  const [demo, setDemo] = useState<{ active: boolean; text: string; moving: boolean }>(
    { active: false, text: '', moving: false }
  );
  const demoTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const demoIdx = useRef<{ upper: number; lower: number; u: { x: number; y: number }; l: { x: number; y: number } } | null>(null);

  // Play the demo whenever there's at least one item on the canvas — it adapts
  // to whatever the user added (top+bottom, dress+shoes, top+shoes, or a single
  // item), so the pieces always visibly move.
  const demoEligible = alwaysShowHint && canvasItems.length >= 1;

  const cancelDemo = useCallback(() => {
    demoTimers.current.forEach(clearTimeout);
    demoTimers.current = [];
    const d = demoIdx.current;
    if (d) {
      // Snap both items back to their original (generated) positions.
      setCanvasItems((prev) =>
        prev.map((c, i) =>
          i === d.upper ? { ...c, x: d.u.x, y: d.u.y } :
          i === d.lower ? { ...c, x: d.l.x, y: d.l.y } : c
        )
      );
    }
    setDemo({ active: false, text: '', moving: false });
    setShowDragHint(false);
    setCanvasHintSeen();
  }, []);

  useEffect(() => {
    if (!demoEligible) return;
    const at = (ms: number, fn: () => void) => demoTimers.current.push(setTimeout(fn, ms));

    // Anchor on the top item when present, otherwise the first item; the partner
    // is the first *other* item of any group (so top+shoes / dress+shoes work too).
    let aIdx = canvasItems.findIndex((c) => c.group === 'upper');
    if (aIdx === -1) aIdx = 0;
    const bIdx = canvasItems.findIndex((_, i) => i !== aIdx);
    const a = { x: canvasItems[aIdx].x, y: canvasItems[aIdx].y };

    // ── Single item — wiggle it around so it's obviously draggable. ──
    if (bIdx === -1) {
      demoIdx.current = { upper: aIdx, lower: aIdx, u: a, l: a };
      const move = (x: number, y: number) =>
        setCanvasItems((prev) => prev.map((c, i) => (i === aIdx ? { ...c, x, y } : c)));
      at(700,  () => setDemo({ active: true, text: t.canvasDemoIntro, moving: false }));
      at(1500, () => { setDemo({ active: true, text: t.canvasDemoSwap, moving: true }); move(a.x + 22, a.y); });
      at(2300, () => move(a.x - 22, a.y));
      at(3100, () => move(a.x, a.y + 14));
      at(3900, () => { setDemo({ active: true, text: t.canvasDemoDone, moving: true }); move(a.x, a.y); });
      at(4900, () => setDemo({ active: true, text: t.canvasDemoDone, moving: false }));
      at(5800, () => { setDemo({ active: false, text: '', moving: false }); setShowDragHint(false); setCanvasHintSeen(); });
      return () => { demoTimers.current.forEach(clearTimeout); demoTimers.current = []; };
    }

    // ── Two items — slide apart and trade places (any two groups). ──
    const b = { x: canvasItems[bIdx].x, y: canvasItems[bIdx].y };
    demoIdx.current = { upper: aIdx, lower: bIdx, u: a, l: b };

    // Horizontal gap that pulls the two items into separate columns while they
    // trade rows, so their paths never cross (no overlapping/“blob” moment).
    const OFS = 24;
    const place = (ap: { x: number; y: number }, bp: { x: number; y: number }) =>
      setCanvasItems((prev) =>
        prev.map((c, i) =>
          i === aIdx ? { ...c, x: ap.x, y: ap.y } :
          i === bIdx ? { ...c, x: bp.x, y: bp.y } : c
        )
      );

    // Beat 1 — caption appears, items still in place.
    at(700,  () => setDemo({ active: true, text: t.canvasDemoIntro, moving: false }));
    // Beat 2 — items lift and slide apart into two columns.
    at(1700, () => { setDemo({ active: true, text: t.canvasDemoSwap, moving: true });
                     place({ x: a.x - OFS, y: a.y }, { x: b.x + OFS, y: b.y }); });
    // Beat 3 — they trade rows without ever overlapping.
    at(2500, () => place({ x: a.x - OFS, y: b.y }, { x: b.x + OFS, y: a.y }));
    // Beat 4 — settle in the swapped position, hold so the change registers.
    at(3300, () => setDemo({ active: true, text: t.canvasDemoSwap, moving: false }));
    // Beat 5 — trade rows back (still in separate columns).
    at(4100, () => { setDemo({ active: true, text: t.canvasDemoDone, moving: true });
                     place({ x: a.x - OFS, y: a.y }, { x: b.x + OFS, y: b.y }); });
    // Beat 6 — merge back to the original centered layout.
    at(4900, () => place({ x: a.x, y: a.y }, { x: b.x, y: b.y }));
    at(5700, () => setDemo({ active: true, text: t.canvasDemoDone, moving: false }));
    // Beat 7 — hand control to the user.
    at(6600, () => {
      setDemo({ active: false, text: '', moving: false });
      setShowDragHint(false);
      setCanvasHintSeen();
    });

    return () => { demoTimers.current.forEach(clearTimeout); demoTimers.current = []; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function getGroupItems(group: CanvasGroup): ClosetItem[] {
    switch (group) {
      case 'upper': return allItems.filter((i) => UPPER_CATS.includes(i.category));
      case 'lower': return allItems.filter((i) => LOWER_CATS.includes(i.category));
      case 'shoes': return allItems.filter((i) => SHOES_CATS.includes(i.category));
      case 'acc': return allItems.filter((i) => ACC_CATS.includes(i.category));
    }
  }

  function getAllItems(): ClosetItem[] {
    return allItems;
  }

  function getGroupLabel(group: CanvasGroup): string {
    switch (group) {
      case 'upper': return t.upperBody;
      case 'lower': return t.lowerBody;
      case 'shoes': return t.shoes;
      case 'acc': return t.accessories;
    }
  }

  function getItemGroup(item: ClosetItem): CanvasGroup {
    if (UPPER_CATS.includes(item.category)) return 'upper';
    if (LOWER_CATS.includes(item.category)) return 'lower';
    if (SHOES_CATS.includes(item.category)) return 'shoes';
    return 'acc';
  }

  // Select item on tap
  function handleSelect(idx: number) {
    setSelectedIdx(idx);
  }

  // Drag start — skip if a 2-finger pinch is already active
  function handlePointerDown(e: React.PointerEvent, idx: number) {
    if (pinchRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    // First touch during the demo just dismisses it (and restores the layout);
    // the user can drag freely on their next touch.
    if (demo.active) { cancelDemo(); return; }
    if (showDragHint) { setShowDragHint(false); setCanvasHintSeen(); }
    handleSelect(idx);
    const ci = canvasItems[idx];
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY, itemX: ci.x, itemY: ci.y });
    if (containerRef.current) {
      const r = containerRef.current.getBoundingClientRect();
      dragRectRef.current = { width: r.width || 1, height: r.height || 1 };
    }
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!isDragging || pinchRef.current || selectedIdx === null || !containerRef.current) return;
    e.preventDefault();
    const rect = dragRectRef.current;
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

  // Pinch-to-zoom via Touch Events.
  // Uses pinchRef.itemIdx so handleTouchMove never relies on the selectedIdx closure.
  function handleTouchStart(e: React.TouchEvent, idx: number) {
    if (e.touches.length === 2) {
      e.preventDefault();
      setIsDragging(false);
      // Always pinch whichever item was already selected; fall back to the touched item
      const pinchItemIdx = selectedIdx ?? idx;
      handleSelect(pinchItemIdx);
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY,
      );
      pinchRef.current = {
        initialDist: dist,
        initialScale: canvasItems[pinchItemIdx]?.scale ?? 1,
        itemIdx: pinchItemIdx,
      };
    }
  }

  // Second finger landing on the canvas background (not on an item)
  function handleContainerTouchStart(e: React.TouchEvent) {
    if (e.touches.length === 2 && isDragging && selectedIdx !== null) {
      e.preventDefault();
      setIsDragging(false);
      const ci = canvasItems[selectedIdx];
      if (ci) {
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY,
        );
        pinchRef.current = { initialDist: dist, initialScale: ci.scale, itemIdx: selectedIdx };
      }
    }
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (e.touches.length === 2 && pinchRef.current) {
      e.preventDefault();
      const { initialDist, initialScale, itemIdx } = pinchRef.current;
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY,
      );
      const newScale = Math.max(0.3, Math.min(3, initialScale * (dist / initialDist)));
      setCanvasItems((prev) =>
        prev.map((ci, i) => (i === itemIdx ? { ...ci, scale: newScale } : ci))
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
    setCanvasItems((prev) => {
      // Cascade newly-added items slightly so they don't stack in one spot.
      const n = prev.length;
      const x = 20 + (n % 4) * 11;
      const y = 16 + (n % 4) * 11;
      return [...prev, { item, x, y, scale: 1, zIndex: nextZ.current++, group }];
    });
    setAddPicker(false); // closes the onboarding overlay; docked picker stays open
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
    if (canvasItems.length === 0) return;

    // If no upper-body item is on canvas, show a toast and block save
    if (!canvasItems.some((ci) => ci.group === 'upper')) {
      setSaveWarning(true);
      setTimeout(() => setSaveWarning(false), 3000);
      return;
    }

    // If the user taps Continue while the intro demo is still playing, persist
    // the items' original (generated) positions, not their mid-animation offset.
    const d = demoIdx.current;
    const posFor = (idx: number, ci: CanvasItem) => {
      if (demo.active && d) {
        if (idx === d.upper) return d.u;
        if (idx === d.lower) return d.l;
      }
      return { x: ci.x, y: ci.y };
    };

    const seen = new Set<string>();
    const deduped: SavedCanvasLayout = [];
    // Iterate in reverse so the last (top) occurrence wins
    for (let i = canvasItems.length - 1; i >= 0; i--) {
      const ci = canvasItems[i];
      if (!seen.has(ci.item.id)) {
        seen.add(ci.item.id);
        const p = posFor(i, ci);
        deduped.unshift({ id: ci.item.id, x: p.x, y: p.y, scale: ci.scale, zIndex: ci.zIndex, group: ci.group });
      }
    }
    if (demo.active) cancelDemo();
    onSave(deduped);
  }

  // Deselect when tapping empty canvas
  function handleCanvasTap() {
    if (demo.active) { cancelDemo(); return; }
    setSelectedIdx(null);
  }

  return (
    <div className="fixed inset-0 z-[65] flex flex-col bg-white">
      {/* Save warning toast */}
      {saveWarning && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[999] px-4 py-2.5 rounded-full bg-amber-500 text-white text-[13px] font-semibold shadow-lg text-center max-w-[90vw]">
          {t.saveNeedsTopItem}
        </div>
      )}
      {/* Header — onboarding shows a top instruction banner (no chrome);
          the closet keeps the close button + title. */}
      {alwaysShowHint ? (
        <header className="shrink-0 px-6 pt-4 pb-3" style={{ paddingTop: 'max(1rem, env(safe-area-inset-top, 1rem))' }}>
          <h2 className="text-[22px] font-black tracking-tight text-gray-900 leading-tight">{t.ob_edit_title}</h2>
          <p
            key={demo.active ? demo.text : 'body'}
            className="text-[15px] font-medium text-gray-600 leading-snug mt-1.5 min-h-[40px]"
            style={{ animation: 'demoTextPop 0.4s ease both' }}
          >
            {demo.active ? demo.text : t.ob_edit_body}
          </p>
        </header>
      ) : (
        <header className="shrink-0 flex items-center justify-between px-3 h-14">
          <button onClick={onClose} aria-label={t.close} className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center active:scale-[0.92] transition-transform">
            <X size={18} strokeWidth={2} className="text-gray-800" />
          </button>
          <span className="text-[15px] font-bold text-gray-900">{t.myOutfits}</span>
          <button
            onClick={handleSave}
            disabled={canvasItems.length === 0}
            className="h-9 px-5 rounded-full text-white text-[14px] font-bold disabled:opacity-40 active:scale-[0.95] transition-transform"
            style={{ background: '#F370A7' }}
          >
            {t.save}
          </button>
        </header>
      )}


      {/* Canvas area */}
      <div
        className="flex-1 relative overflow-hidden bg-white touch-none flex items-center justify-center"
        style={{ containerType: 'size', userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none' as any }}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onTouchStart={handleContainerTouchStart}
        onTouchMove={(e) => handleTouchMove(e)}
        onTouchEnd={handleTouchEnd}
        onClick={handleCanvasTap}
      >
        {/* Inner canvas with fixed aspect ratio — matches preview card. Uses container-query units so 3:4 is always maintained on all viewport sizes. */}
        <div ref={containerRef} className="relative" style={{ aspectRatio: '3 / 4', width: 'min(75cqh, 100cqw)' }}>
        {/* ── Empty-canvas tutorial hint ─────────────────────────── */}
        {canvasItems.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10 gap-3 px-8">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(243,112,167,0.12)', border: '2px dashed rgba(243,112,167,0.5)' }}
            >
              <Plus size={28} strokeWidth={2} color="#F370A7" />
            </div>
            <p className="text-[14px] font-semibold text-gray-500 text-center leading-snug">
              {t.canvasEmptyHint}
            </p>
            {/* Arrow points to the Add button — right during onboarding, down to
                the bottom toolbar in normal editing. */}
            <div className="flex items-center gap-1 mt-1">
              <span className="text-[12px] text-gray-400 font-medium">{t.addToCloset}</span>
              <svg width="20" height="12" viewBox="0 0 20 12" fill="none" style={{ transform: alwaysShowHint ? undefined : 'rotate(90deg)' }}>
                <path d="M1 6h16M13 1l5 5-5 5" stroke="#F370A7" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
        )}

        {canvasItems.map((ci, idx) => {
          // During the onboarding demo the two swapped items "lift" (scale up +
          // shadow) and animate between positions via a CSS transition.
          const isDemoMover = demo.active && demoIdx.current !== null && (idx === demoIdx.current.upper || idx === demoIdx.current.lower);
          const liftScale = demo.moving && isDemoMover ? 1.08 : 1;
          return (
          <div
            key={`${ci.group}-${idx}-${ci.item.id}`}
            className={`absolute origin-center ${selectedIdx === idx ? 'ring-2 ring-[#F370A7] ring-offset-2 rounded-xl' : ''}`}
            style={{
              left: `${ci.x}%`,
              top: `${ci.y}%`,
              width: '35%',
              aspectRatio: '1',
              transform: `scale(${ci.scale * liftScale})`,
              transition: demo.active
                ? 'left 0.7s cubic-bezier(0.22,1,0.36,1), top 0.7s cubic-bezier(0.22,1,0.36,1), transform 0.4s ease'
                : undefined,
              zIndex: isDemoMover ? 9990 : ci.zIndex,
              userSelect: 'none',
              WebkitUserSelect: 'none',
              WebkitTouchCallout: 'none',
              WebkitUserDrag: 'none',
              touchAction: 'none',
            } as any}
            onPointerDown={(e) => handlePointerDown(e, idx)}
            onTouchStart={(e) => handleTouchStart(e, idx)}
            onWheel={(e) => handleWheel(e, idx)}
            onClick={(e) => { e.stopPropagation(); if (demo.active) { cancelDemo(); return; } handleSelect(idx); }}
          >
            <div
              className="relative w-full h-full rounded-xl overflow-hidden cursor-grab active:cursor-grabbing"
              style={
                isDemoMover
                  ? { filter: demo.moving ? 'drop-shadow(0 14px 22px rgba(0,0,0,0.20))' : 'none', transition: 'filter 0.4s ease' }
                  : (!demoEligible && showDragHint && idx === 0 && !isDragging
                      ? { animation: 'itemNudge 1.8s ease-in-out 0.4s 2 both' }
                      : undefined)
              }
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={ci.item.imageData} alt={ci.item.category} className="absolute inset-0 w-full h-full object-contain" decoding="sync" draggable={false} style={{ pointerEvents: 'none', WebkitUserDrag: 'none' } as any} />
            </div>
          </div>
          );
        })}
        </div>

        {/* Action buttons — right side, only during the registration onboarding
            demo (normal editing uses the bottom toolbar). */}
        {alwaysShowHint && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col gap-2 z-[9999]">
          {[
            { label: 'Swap',   icon: <RefreshCw size={16} />,         action: () => { if (selectedIdx !== null) setSwapTarget(selectedIdx); }, needsSelection: true,  pink: false },
            { label: 'Front',  icon: (<svg width="16" height="16" viewBox="0 0 16 16"><rect x="1" y="5" width="8" height="8" rx="1.2" stroke="currentColor" strokeWidth="1.4" fill="none"/><rect x="7" y="1" width="8" height="8" rx="1.2" fill="currentColor"/></svg>), action: bringToFront, needsSelection: true,  pink: false },
            { label: 'Back',   icon: (<svg width="16" height="16" viewBox="0 0 16 16"><rect x="1" y="5" width="8" height="8" rx="1.2" fill="currentColor"/><rect x="7" y="1" width="8" height="8" rx="1.2" stroke="currentColor" strokeWidth="1.4" fill="white"/></svg>), action: sendToBack,   needsSelection: true,  pink: false },
            { label: 'Delete', icon: (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14"/></svg>), action: deleteSelected, needsSelection: true,  pink: false },
            { label: 'Add',    icon: <Plus size={16} />,              action: () => { setPickerTab('all'); setAddPicker(true); },                    needsSelection: false, pink: true  },
          ].map((btn) => {
            const disabled = btn.needsSelection && selectedIdx === null;
            return (
              <button
                key={btn.label}
                onClick={(e) => { e.stopPropagation(); if (!disabled) btn.action(); }}
                className={`relative w-10 h-10 rounded-full bg-white shadow-md border border-gray-200 flex items-center justify-center transition-all active:scale-95 ${
                  disabled ? 'opacity-30 cursor-not-allowed' : btn.pink ? '' : 'text-gray-700 hover:bg-gray-50'
                }`}
                title={btn.label}
              >
                {btn.pink && canvasItems.length === 0 && (
                  <span className="absolute inset-0 rounded-full animate-ping" style={{ backgroundColor: '#F370A7', opacity: 0.35 }} />
                )}
                <span style={btn.pink ? { color: '#F370A7' } : undefined}>{btn.icon}</span>
              </button>
            );
          })}
        </div>
        )}

        {/* Hint text — always at bottom while hint is active (suppressed during the demo) */}
        {showDragHint && !demoEligible && canvasItems.length > 0 && (
          <div className="absolute bottom-4 left-0 right-0 flex justify-center pointer-events-none z-[9997]">
            <div
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[12px] font-semibold"
              style={{ background: 'rgba(243,112,167,0.12)', color: '#F370A7' }}
            >
              <span>👆</span>
              <span>{t.canvasHintDrag}</span>
            </div>
          </div>
        )}
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
                    <Image src={item.imageData} alt={item.category} fill className="object-contain" unoptimized={needsUnoptimized(item.imageData)} />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer — onboarding keeps the big Continue button; normal editing shows
          a floating toolbar (closet · swap · layer · delete). */}
      {alwaysShowHint ? (
        <div
          className="shrink-0 px-5 py-3 bg-white border-t border-gray-100"
          style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0.75rem))' }}
        >
          <button
            onClick={handleSave}
            disabled={canvasItems.length === 0 || !continueReady}
            className="w-full py-3.5 rounded-2xl text-white text-[15px] font-semibold disabled:opacity-40 transition-opacity flex items-center justify-center"
            style={{ backgroundColor: '#F370A7' }}
          >
            {t.save}
          </button>
        </div>
      ) : (
        <div
          className="shrink-0 flex justify-center px-4 pt-2 pb-4"
          style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 1rem))' }}
        >
          <div className="flex items-center gap-0.5 rounded-full bg-white px-2 py-1.5" style={{ boxShadow: '0 8px 28px rgba(0,0,0,0.13), 0 1px 3px rgba(0,0,0,0.08)', border: '1px solid #f0eef1' }}>
            {([
              { key: 'closet', label: t.addToCloset, kind: 'source' as const, source: 'closet' as const,
                icon: (<svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="3" width="16" height="18" rx="1.7"/><line x1="12" y1="3.5" x2="12" y2="20.5"/><line x1="9.4" y1="11" x2="9.4" y2="13"/><line x1="14.6" y1="11" x2="14.6" y2="13"/></svg>) },
              ...(onAddProduct ? [{ key: 'shop', label: t.cv_shop_title, kind: 'source' as const, source: 'shop' as const,
                icon: (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>) }] : []),
              { key: 'swap', label: 'Swap', kind: 'action' as const, needsSelection: true,
                action: () => { if (selectedIdx !== null) setSwapTarget(selectedIdx); },
                icon: <RefreshCw size={19} strokeWidth={1.9} /> },
              { key: 'front', label: 'Bring to front', kind: 'action' as const, needsSelection: true,
                action: bringToFront,
                icon: (<svg width="19" height="19" viewBox="0 0 16 16"><rect x="1" y="5" width="8" height="8" rx="1.2" stroke="currentColor" strokeWidth="1.4" fill="none"/><rect x="7" y="1" width="8" height="8" rx="1.2" fill="currentColor"/></svg>) },
              { key: 'back', label: 'Send to back', kind: 'action' as const, needsSelection: true,
                action: sendToBack,
                icon: (<svg width="19" height="19" viewBox="0 0 16 16"><rect x="1" y="5" width="8" height="8" rx="1.2" fill="currentColor"/><rect x="7" y="1" width="8" height="8" rx="1.2" stroke="currentColor" strokeWidth="1.4" fill="#fff"/></svg>) },
              { key: 'delete', label: 'Delete', kind: 'action' as const, needsSelection: true,
                action: deleteSelected,
                icon: (<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14"/></svg>) },
            ] as ToolBtn[]).map((btn) => {
              const isSource = btn.kind === 'source';
              const active = isSource && pickerH > 0 && pickerSource === btn.source;
              const disabled = btn.kind === 'action' && !!btn.needsSelection && selectedIdx === null;
              return (
                <button
                  key={btn.key}
                  onClick={() => { if (isSource) togglePicker(btn.source!); else if (!disabled) btn.action!(); }}
                  disabled={disabled}
                  aria-label={btn.label}
                  title={btn.label}
                  className="relative w-11 h-11 rounded-full flex items-center justify-center active:scale-90 transition-transform"
                  style={{
                    color: active ? '#fff' : isSource ? '#F370A7' : disabled ? '#cbc8ce' : '#39343f',
                    background: active ? '#F370A7' : isSource ? 'rgba(243,112,167,0.10)' : 'transparent',
                  }}
                >
                  {btn.key === 'closet' && canvasItems.length === 0 && !active && (
                    <span className="absolute inset-0 rounded-full animate-ping" style={{ backgroundColor: '#F370A7', opacity: 0.3 }} />
                  )}
                  <span className="relative">{btn.icon}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Docked closet / shop picker — a bottom panel that shrinks the canvas.
          Drag its handle down to close it (follows the finger). */}
      {!alwaysShowHint && (
        <div
          className="shrink-0 bg-white overflow-hidden"
          style={{
            height: pickerH,
            borderTopLeftRadius: 22,
            borderTopRightRadius: 22,
            borderTop: pickerH > 0 ? '1px solid #efeef1' : 'none',
            boxShadow: pickerH > 0 ? '0 -10px 28px rgba(0,0,0,0.07)' : 'none',
            transition: pickerDragging ? 'none' : 'height 0.28s cubic-bezier(0.22,1,0.36,1)',
          }}
        >
          {pickerH > 0 && (() => {
            const groupsPresent = (['upper', 'lower', 'shoes', 'acc'] as CanvasGroup[]).filter((g) => getGroupItems(g).length > 0);
            const tabs: { key: 'all' | CanvasGroup; label: string }[] = [
              { key: 'all', label: t.cv_ce_all },
              ...groupsPresent.map((g) => ({ key: g, label: getGroupLabel(g) })),
            ];
            const closetItems = pickerTab === 'all' ? getAllItems() : getGroupItems(pickerTab);
            return (
              <div className="h-full flex flex-col">
                {/* Drag handle + source/category row */}
                <div className="flex-none">
                  <div
                    className="pt-2.5 pb-1.5 touch-none cursor-grab active:cursor-grabbing"
                    onTouchStart={pickerTouchStart}
                    onTouchMove={pickerTouchMove}
                    onTouchEnd={pickerTouchEnd}
                  >
                    <div className="w-10 h-1.5 rounded-full bg-gray-200 mx-auto" />
                  </div>
                  {pickerSource === 'closet' ? (
                    <div className="flex gap-2 overflow-x-auto hide-scrollbar px-4 py-2">
                      {tabs.map((tab) => {
                        const on = pickerTab === tab.key;
                        return (
                          <button key={tab.key} onClick={() => setPickerTab(tab.key)}
                            className="shrink-0 h-8 px-3.5 rounded-full text-[13px] font-semibold transition-colors active:scale-95"
                            style={{ background: on ? '#141118' : '#f3f1f5', color: on ? '#fff' : '#6b6570' }}>
                            {tab.label}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-[14px] font-bold text-gray-900 text-center py-2">{t.cv_shop_title}</p>
                  )}
                </div>

                {/* Items */}
                <div className="flex-1 overflow-y-auto px-4 pb-5">
                  {pickerSource === 'closet' ? (
                    closetItems.length === 0 ? (
                      <p className="text-center text-[13px] text-gray-400 py-10">{t.cv_shop_empty}</p>
                    ) : (
                      <div className="grid grid-cols-3 gap-2.5">
                        {closetItems.map((item) => (
                          <button key={item.id} onClick={() => addItem(item)} className="relative aspect-[3/4] rounded-xl overflow-hidden border border-gray-100 active:scale-[0.96] transition-transform">
                            <Image src={item.imageData} alt={item.category} fill className="object-contain" unoptimized={needsUnoptimized(item.imageData)} />
                          </button>
                        ))}
                      </div>
                    )
                  ) : shopLoading && shopProducts.length === 0 ? (
                    <div className="flex items-center justify-center py-10 text-gray-400"><Loader2 size={20} className="animate-spin" /></div>
                  ) : shopProducts.length === 0 ? (
                    <p className="text-center text-[13px] text-gray-400 py-10">{t.cv_shop_empty}</p>
                  ) : (
                    <div className="grid grid-cols-3 gap-2.5">
                      {shopProducts.map((p) => {
                        const adding = shopAdding.has(p.id);
                        const added = shopAdded.has(p.id);
                        return (
                          <button key={p.id} onClick={() => addShopProduct(p)} disabled={adding || added}
                            className="relative aspect-[3/4] rounded-xl overflow-hidden border active:scale-[0.96] transition-transform"
                            style={{ borderColor: added ? '#2FB27A' : '#eee' }}>
                            {p.images?.[0] ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={p.images[0]} alt="" className="w-full h-full object-cover" loading="lazy" />
                            ) : <div className="w-full h-full bg-gray-100" />}
                            <span className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full flex items-center justify-center text-white"
                              style={{ background: added ? '#2FB27A' : adding ? '#F370A7' : 'rgba(15,8,14,0.35)' }}>
                              {adding ? <Loader2 size={13} className="animate-spin" /> : added ? <Check size={13} strokeWidth={3} /> : <Plus size={14} strokeWidth={2.6} />}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Closet picker — categorized (All · Tops · Bottoms · Shoes · Accessories) */}
      {addPicker && (() => {
        const groupsPresent = (['upper', 'lower', 'shoes', 'acc'] as CanvasGroup[]).filter((g) => getGroupItems(g).length > 0);
        const tabs: { key: 'all' | CanvasGroup; label: string }[] = [
          { key: 'all', label: t.cv_ce_all },
          ...groupsPresent.map((g) => ({ key: g, label: getGroupLabel(g) })),
        ];
        const pickerItems = pickerTab === 'all' ? getAllItems() : getGroupItems(pickerTab);
        return (
          <div className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/30 backdrop-blur-sm" onClick={() => setAddPicker(false)}>
            <div className="w-full max-w-[460px] rounded-t-3xl bg-white max-h-[74vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-center pt-3 pb-1"><div className="w-9 h-1 rounded-full bg-gray-200" /></div>
              <h3 className="text-[15px] font-bold text-gray-900 text-center pb-2.5">{t.addToCloset}</h3>
              {/* Category tabs */}
              <div className="flex gap-2 overflow-x-auto hide-scrollbar px-5 pb-3">
                {tabs.map((tab) => {
                  const active = pickerTab === tab.key;
                  return (
                    <button
                      key={tab.key}
                      onClick={() => setPickerTab(tab.key)}
                      className="shrink-0 h-8 px-3.5 rounded-full text-[13px] font-semibold transition-colors active:scale-95"
                      style={{ background: active ? '#141118' : '#f3f1f5', color: active ? '#fff' : '#6b6570' }}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>
              <div className="flex-1 overflow-y-auto px-5 pb-8">
                {pickerItems.length === 0 ? (
                  <p className="text-center text-[13px] text-gray-400 py-12">{t.cv_shop_empty}</p>
                ) : (
                  <div className="grid grid-cols-3 gap-2.5">
                    {pickerItems.map((item) => (
                      <button key={item.id} onClick={() => addItem(item)} className="relative aspect-[3/4] rounded-xl overflow-hidden border border-gray-100 active:scale-[0.97] transition-transform">
                        <Image src={item.imageData} alt={item.category} fill className="object-contain" unoptimized={needsUnoptimized(item.imageData)} />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* One-time gesture tutorial (first open only) */}
      {showEditOnboarding && (
        <CanvasOnboarding
          onDone={() => {
            setCanvasEditOnboarded();
            setShowEditOnboarding(false);
            setShowDragHint(false);
            setCanvasHintSeen();
          }}
        />
      )}
    </div>
  );
}
