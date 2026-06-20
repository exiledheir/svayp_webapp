import React, { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { Plus, X, Crown, RefreshCw } from 'lucide-react';
import type { ClosetItem } from '@/lib/closet-storage';
import { UPPER_CATS, LOWER_CATS, SHOES_CATS, ACC_CATS, type SavedCanvasLayout, type CanvasGroup } from '@/lib/closet-types';
import { useI18n } from '@/lib/i18n';
import { isCanvasHintSeen, setCanvasHintSeen } from '@/lib/onboarding-storage';

interface CanvasItem {
  item: ClosetItem;
  x: number;
  y: number;
  scale: number;
  zIndex: number;
  group: CanvasGroup;
}

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
  canRegenerate: boolean;
  plansEnabled: boolean;
  /** Force-show the drag hint even if the user has seen it before (used in onboarding). */
  alwaysShowHint?: boolean;
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
  // Pinch zoom state — stores the target item index so handleTouchMove doesn't rely on selectedIdx closure
  const pinchRef = useRef<{ initialDist: number; initialScale: number; itemIdx: number } | null>(null);

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

  // The demo only makes sense with both a top and a bottom item to swap.
  const demoEligible =
    alwaysShowHint &&
    canvasItems.some((c) => c.group === 'upper') &&
    canvasItems.some((c) => c.group === 'lower');

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
    const upperIdx = canvasItems.findIndex((c) => c.group === 'upper');
    const lowerIdx = canvasItems.findIndex((c) => c.group === 'lower');
    if (upperIdx === -1 || lowerIdx === -1 || upperIdx === lowerIdx) return;

    const u = { x: canvasItems[upperIdx].x, y: canvasItems[upperIdx].y };
    const l = { x: canvasItems[lowerIdx].x, y: canvasItems[lowerIdx].y };
    demoIdx.current = { upper: upperIdx, lower: lowerIdx, u, l };

    // Horizontal gap that pulls the two items into separate columns while they
    // trade rows, so their paths never cross (no overlapping/“blob” moment).
    const OFS = 24;
    const place = (up: { x: number; y: number }, lo: { x: number; y: number }) =>
      setCanvasItems((prev) =>
        prev.map((c, i) =>
          i === upperIdx ? { ...c, x: up.x, y: up.y } :
          i === lowerIdx ? { ...c, x: lo.x, y: lo.y } : c
        )
      );
    const at = (ms: number, fn: () => void) => demoTimers.current.push(setTimeout(fn, ms));

    // Beat 1 — caption appears, items still in place.
    at(700,  () => setDemo({ active: true, text: t.canvasDemoIntro, moving: false }));
    // Beat 2 — items lift and slide apart into two columns.
    at(1700, () => { setDemo({ active: true, text: t.canvasDemoSwap, moving: true });
                     place({ x: u.x - OFS, y: u.y }, { x: l.x + OFS, y: l.y }); });
    // Beat 3 — they trade rows (top ↔ bottom) without ever overlapping.
    at(2500, () => place({ x: u.x - OFS, y: l.y }, { x: l.x + OFS, y: u.y }));
    // Beat 4 — settle in the swapped position, hold so the change registers.
    at(3300, () => setDemo({ active: true, text: t.canvasDemoSwap, moving: false }));
    // Beat 5 — trade rows back (still in separate columns).
    at(4100, () => { setDemo({ active: true, text: t.canvasDemoDone, moving: true });
                     place({ x: u.x - OFS, y: u.y }, { x: l.x + OFS, y: l.y }); });
    // Beat 6 — merge back to the original centered layout.
    at(4900, () => place({ x: u.x, y: u.y }, { x: l.x, y: l.y }));
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
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  }

  function handlePointerMove(e: React.PointerEvent) {
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
    if (canvasItems.length === 0) return;

    // If no upper-body item is on canvas, show a toast and block save
    if (!canvasItems.some((ci) => ci.group === 'upper')) {
      setSaveWarning(true);
      setTimeout(() => setSaveWarning(false), 3000);
      return;
    }

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
            className="text-[14px] text-gray-500 leading-snug mt-1 min-h-[38px]"
            style={{ animation: 'demoTextPop 0.4s ease both' }}
          >
            {demo.active ? demo.text : t.ob_edit_body}
          </p>
        </header>
      ) : (
        <header className="shrink-0 flex items-center justify-between px-4 h-14 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
              <X size={17} strokeWidth={2} className="text-gray-700" />
            </button>
            <span className="text-[15px] font-semibold text-gray-900">{t.myOutfits}</span>
          </div>
          <div className="flex items-center gap-2">
            {plansEnabled && (
              <button
                onClick={(e) => { e.stopPropagation(); onShowPlans(); }}
                className="w-9 h-9 rounded-full flex items-center justify-center active:scale-[0.95] transition-transform"
                style={{ background: 'linear-gradient(135deg, #B8860B, #8B6914)', boxShadow: '0 2px 8px rgba(184,134,11,0.25)' }}
                title="View plans"
              >
                <Crown size={14} strokeWidth={2} color="#FFD700" />
              </button>
            )}
          </div>
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
            {/* Arrow pointing right toward the Add button */}
            <div className="flex items-center gap-1 mt-1">
              <span className="text-[12px] text-gray-400 font-medium">{t.addToCloset}</span>
              <svg width="20" height="12" viewBox="0 0 20 12" fill="none">
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

        {/* Action buttons — icon-only, right side */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col gap-2 z-[9999]">
          {[
            { label: 'Swap',   icon: <RefreshCw size={16} />,         action: () => { if (selectedIdx !== null) setSwapTarget(selectedIdx); }, needsSelection: true,  pink: false },
            { label: 'Front',  icon: (<svg width="16" height="16" viewBox="0 0 16 16"><rect x="1" y="5" width="8" height="8" rx="1.2" stroke="currentColor" strokeWidth="1.4" fill="none"/><rect x="7" y="1" width="8" height="8" rx="1.2" fill="currentColor"/></svg>), action: bringToFront, needsSelection: true,  pink: false },
            { label: 'Back',   icon: (<svg width="16" height="16" viewBox="0 0 16 16"><rect x="1" y="5" width="8" height="8" rx="1.2" fill="currentColor"/><rect x="7" y="1" width="8" height="8" rx="1.2" stroke="currentColor" strokeWidth="1.4" fill="white"/></svg>), action: sendToBack,   needsSelection: true,  pink: false },
            { label: 'Delete', icon: (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14"/></svg>), action: deleteSelected, needsSelection: true,  pink: false },
            { label: 'Add',    icon: <Plus size={16} />,              action: () => setAddPicker(true),                                            needsSelection: false, pink: true  },
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
                    <Image src={item.imageData} alt={item.category} fill className="object-contain" unoptimized />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Save button — bottom of screen */}
      <div
        className="shrink-0 px-5 py-3 bg-white border-t border-gray-100"
        style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0.75rem))' }}
      >
        <button
          onClick={handleSave}
          disabled={canvasItems.length === 0}
          className="w-full py-3.5 rounded-2xl text-white text-[15px] font-semibold disabled:opacity-40 transition-opacity flex items-center justify-center"
          style={{ backgroundColor: '#F370A7' }}
        >
          {t.save}
        </button>
      </div>

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
