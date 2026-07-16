import React, { useEffect, useRef, useState } from 'react';
import { Check, Pencil, ChevronLeft, Loader2, AlertCircle } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { taxLabel, sectionForSubcategory, localToSubcategory } from '@/lib/wardrobe-taxonomy';
import ItemOptionsPicker, { isSelectionComplete, type ItemOptionsSelection } from '@/components/closet/ItemOptionsPicker';
import Diamond from '@/components/closet/Diamond';
import type { ClosetItem } from '@/lib/closet-storage';
import type { WardrobeSection } from '@/types';
import { logAnalyticsEvent } from '@/lib/analytics';
import { Events, Params } from '@/lib/analytics-events';

// Beautify costs 2 diamonds per photo.
const BEAUTIFY_COST = 2;

const SECTION_EMOJI: Record<WardrobeSection, string> = {
  TOPS: '👕',
  BOTTOMS: '👖',
  DRESSES_SETS: '👗',
  OUTERWEAR: '🧥',
  FOOTWEAR: '👟',
  ACCESSORIES: '👜',
};

function seedSelection(item: ClosetItem): ItemOptionsSelection {
  // Keep subcategory empty when the item has none so the user must pick one;
  // only the section is seeded (for the picker's starting tab).
  const sub = item.subcategory ?? null;
  const section = sectionForSubcategory(sub ?? localToSubcategory(item.category)) ?? 'TOPS';
  return { section, subcategory: sub, itemType: item.itemType ?? null, length: item.length ?? null, fitType: item.fitType ?? null };
}

/**
 * Closet v2 — post-upload review window (Acloset-style, full-screen). The parent
 * passes the freshly-added items (already saved to the wardrobe, carrying the
 * AI-detected taxonomy) plus edit callbacks. Each row shows the structured
 * taxonomy (section · type · subtype · fit · length) with an edit affordance;
 * checkboxes drive bulk Delete; "Add to Closet" confirms everything still listed.
 */
export default function UploadReviewSheet({
  items,
  onClose,
  onConfirm,
  onBeautify,
  beautifyMarked,
  onEditCategory,
  onDelete,
  beautifyEnabled,
  dark,
  requireComplete = false,
  finalizing = false,
  detectingIds,
}: {
  items: ClosetItem[];
  onClose: () => void;
  /** Подтверждение добавления: в гардероб попадают ТОЛЬКО выбранные id. */
  onConfirm: (selectedIds: string[]) => void;
  onTryOn: (items: ClosetItem[]) => void;
  /** Toggle отметки Beautify на строке: улучшение стартует после «Добавить в гардероб». */
  onBeautify: (item: ClosetItem) => void;
  /** id строк, отмеченных на Beautify (кнопка в состоянии «нажата»). */
  beautifyMarked?: Set<string>;
  onRename: (id: string, name: string) => void;
  onEditCategory: (id: string, sel: ItemOptionsSelection) => void;
  onDelete: (id: string) => void;
  beautifyEnabled: boolean;
  dark: boolean;
  /** Require every item to have a complete category before "Add to Closet". */
  requireComplete?: boolean;
  /** Persisting to the closet — shows a spinner + blocks interaction. */
  finalizing?: boolean;
  /** localIds still awaiting AI category detection — row shows a "determining…" state. */
  detectingIds?: Set<string>;
}) {
  const { t, locale } = useI18n();
  const [editCatId, setEditCatId] = useState<string | null>(null);
  const [editSel, setEditSel] = useState<ItemOptionsSelection | null>(null);
  // Fullscreen-просмотр фото по тапу на миниатюру.
  const [zoomSrc, setZoomSrc] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(() => new Set(items.map((i) => i.id)));
  const viewed = useRef(false);
  const autoOpenedRef = useRef(false);

  useEffect(() => {
    if (viewed.current) return;
    viewed.current = true;
    logAnalyticsEvent(Events.REVIEW_SHEET_VIEWED, { [Params.ITEM_COUNT]: items.length });
  }, [items.length]);

  // Auto-open the category/details editor for the first item the AI couldn't
  // classify (once), so the user is prompted to fix it. Waits until detection
  // finished — we don't want to prompt for a category the AI is about to fill.
  useEffect(() => {
    if (!requireComplete || autoOpenedRef.current) return;
    if (detectingIds && detectingIds.size > 0) return;
    const firstIncomplete = items.find((i) => !itemComplete(i));
    if (firstIncomplete) { autoOpenedRef.current = true; openCategoryEditor(firstIncomplete); }
  }, [requireComplete, items, detectingIds]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep the selection in sync as items are deleted from the list.
  useEffect(() => {
    setSelected((prev) => new Set(items.map((i) => i.id).filter((id) => prev.has(id))));
  }, [items]);

  const ink = dark ? '#fff' : '#141118';
  const sub = dark ? '#8e8e93' : '#9a8f98';
  const surface = dark ? '#111111' : '#fff';
  const line = dark ? '#232325' : '#efeef1';
  const allSelected = items.length > 0 && selected.size === items.length;

  function sectionOf(item: ClosetItem): WardrobeSection {
    return sectionForSubcategory(item.subcategory ?? localToSubcategory(item.category)) ?? 'TOPS';
  }
  // Structured taxonomy line: type · subtype · fit · length (only what's actually
  // set — no fallback, so an unclassified item reads as empty / "add details").
  function attrsOf(item: ClosetItem): string {
    return [item.subcategory, item.itemType, item.fitType, item.length]
      .map((v) => (v ? taxLabel(v, locale) : ''))
      .filter(Boolean)
      .join(' · ');
  }
  // Whether an item's taxonomy is fully specified (all required fields set).
  function itemComplete(item: ClosetItem): boolean {
    if (!item.subcategory) return false;
    return isSelectionComplete({ section: sectionForSubcategory(item.subcategory) ?? 'TOPS', subcategory: item.subcategory, itemType: item.itemType ?? null, length: item.length ?? null, fitType: item.fitType ?? null });
  }
  const anyDetecting = !!detectingIds && detectingIds.size > 0;
  const allComplete = items.every(itemComplete) && !anyDetecting;
  // Пустой выбор блокирует добавление — в гардероб попадают только выбранные.
  const confirmDisabled = finalizing || anyDetecting || selected.size === 0
    || (requireComplete && !allComplete);

  function toggleOne(id: string) {
    setSelected((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  }
  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(items.map((i) => i.id)));
  }
  function deleteSelected() {
    if (selected.size === 0) return;
    [...selected].forEach((id) => onDelete(id));
    logAnalyticsEvent(Events.REVIEW_ITEM_CORRECTED);
  }

  function openCategoryEditor(item: ClosetItem) {
    setEditCatId(item.id);
    setEditSel(seedSelection(item));
  }
  function saveCategory() {
    if (editCatId && editSel && isSelectionComplete(editSel)) {
      onEditCategory(editCatId, editSel);
      logAnalyticsEvent(Events.REVIEW_ITEM_CORRECTED);
      // Advance to the next item still missing a category (guided fill).
      const savedId = editCatId;
      const next = items.find((i) => i.id !== savedId && !itemComplete(i));
      if (next) { openCategoryEditor(next); return; }
    }
    setEditCatId(null);
    setEditSel(null);
  }

  // ── Category / attributes editor — overlays the review window (z-64) ─────
  const editItem = editCatId ? items.find((i) => i.id === editCatId) ?? null : null;
  const editItemIdx = editCatId ? items.findIndex((i) => i.id === editCatId) : -1;
  const editorOverlay = editCatId && editSel ? (
      <div className="fixed inset-0 z-[64] flex items-end justify-center" style={{ background: 'rgba(15,8,14,0.42)' }} onClick={() => { setEditCatId(null); setEditSel(null); }}>
        <div className="w-full max-w-[460px] rounded-t-3xl flex flex-col" style={{ background: dark ? '#1c1c1e' : '#fff', maxHeight: '92%' }} onClick={(e) => e.stopPropagation()}>
          <div className="flex justify-center pt-3 pb-1"><div className="w-9 h-1 rounded-full" style={{ background: dark ? '#3a3a3c' : '#e2dbe1' }} /></div>
          {/* Which item are we editing — thumbnail + title (+ n/N when multiple) */}
          <div className="flex items-center justify-center gap-2.5 pt-1 pb-2.5 px-5">
            <span className="w-11 h-11 rounded-xl flex-none overflow-hidden flex items-center justify-center" style={{ background: dark ? '#2a2a2c' : '#f5f2f5', border: `1px solid ${line}` }}>
              {editItem?.imageData ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={editItem.imageData} alt="" className="w-full h-full object-cover" />
              ) : null}
            </span>
            <div className="text-left">
              <h3 className="text-[16px] font-bold leading-tight" style={{ color: ink }}>{t.cv_rv_edit_cat}</h3>
              {items.length > 1 && editItemIdx >= 0 && (
                <p className="text-[12px] font-semibold mt-0.5" style={{ color: sub }}>{t.cv_rv_item_n.replace('{n}', String(editItemIdx + 1)).replace('{total}', String(items.length))}</p>
              )}
            </div>
          </div>
          <div className="px-5 pb-3 overflow-y-auto">
            <ItemOptionsPicker value={editSel} onChange={setEditSel} dark={dark} />
          </div>
          <div className="px-5 pt-2 pb-8" style={{ borderTop: `1px solid ${line}` }}>
            <button onClick={saveCategory} disabled={!isSelectionComplete(editSel)} className="w-full h-13 rounded-2xl text-white text-[15px] font-bold disabled:opacity-40" style={{ background: '#F370A7', height: 52 }}>{t.save}</button>
          </div>
        </div>
      </div>
  ) : null;

  // ── Full-screen review window ────────────────────────────────────────────
  return (
    <>
    <div className="fixed inset-0 z-[62] flex flex-col" style={{ background: surface }}>
      {/* Header */}
      <div className="flex items-center px-3 pt-4 pb-2.5">
        <button onClick={onClose} aria-label={t.close} className="w-9 h-9 rounded-full flex items-center justify-center active:scale-[0.9] transition-transform" style={{ color: ink }}>
          <ChevronLeft size={24} strokeWidth={2} />
        </button>
      </div>

      {/* Select all · Delete */}
      <div className="flex items-center justify-between px-4 py-2.5" style={{ borderTop: `1px solid ${line}`, borderBottom: `1px solid ${line}` }}>
        <button onClick={toggleAll} className="flex items-center gap-2.5 active:opacity-70">
          <span className="w-6 h-6 rounded-md flex items-center justify-center" style={allSelected ? { background: dark ? '#fff' : '#141118' } : { border: `1.6px solid ${dark ? '#48484a' : '#c9c7cd'}` }}>
            {allSelected && <Check size={15} strokeWidth={3} color={dark ? '#000' : '#fff'} />}
          </span>
          <span className="text-[15px] font-semibold" style={{ color: ink }}>{t.cv_rv_select_all}</span>
        </button>
        <button onClick={deleteSelected} disabled={selected.size === 0} className="text-[15px] font-semibold disabled:opacity-40" style={{ color: ink }}>
          {t.cv_rv_delete}
        </button>
      </div>

      {/* Rows */}
      <div className="flex-1 overflow-y-auto">
        {items.map((item) => {
          const section = sectionOf(item);
          const attrs = attrsOf(item);
          const checked = selected.has(item.id);
          const detecting = !!detectingIds?.has(item.id);
          const incomplete = !detecting && requireComplete && !itemComplete(item);
          return (
            <div key={item.id} className="flex items-center gap-3 px-4 py-3.5" style={{ borderBottom: `1px solid ${line}` }}>
              {/* select */}
              <button onClick={() => toggleOne(item.id)} aria-label={t.cv_rv_select_all} className="flex-none active:scale-[0.9] transition-transform">
                <span className="w-6 h-6 rounded-md flex items-center justify-center" style={checked ? { background: dark ? '#fff' : '#141118' } : { border: `1.6px solid ${dark ? '#48484a' : '#c9c7cd'}` }}>
                  {checked && <Check size={15} strokeWidth={3} color={dark ? '#000' : '#fff'} />}
                </span>
              </button>

              {/* thumbnail — тап открывает фото на весь экран */}
              <button
                onClick={() => item.imageData && setZoomSrc(item.imageData)}
                className="w-[74px] h-[74px] rounded-2xl flex-none overflow-hidden flex items-center justify-center active:scale-[0.96] transition-transform"
                style={{ background: dark ? '#2a2a2c' : '#f5f2f5', border: `1px solid ${line}` }}
              >
                {item.imageData ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.imageData} alt="" className="w-full h-full object-cover" />
                ) : null}
              </button>

              {/* structured taxonomy */}
              <div className="flex-1 min-w-0">
                {detecting ? (
                  <span className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold" style={{ color: '#F370A7' }}>
                    <Loader2 size={13} className="animate-spin" />{t.cv_proc_identifying}
                  </span>
                ) : (
                <>
                <button onClick={() => openCategoryEditor(item)} className="inline-flex items-center gap-1 text-[12.5px] font-bold px-2.5 py-1 rounded-full" style={{ background: dark ? 'rgba(243,112,167,0.16)' : '#f3f1f5', color: dark ? '#e6d7e0' : '#4b4550' }}>
                  <span>{SECTION_EMOJI[section]}</span>
                  {taxLabel(section, locale)}
                </button>
                {attrs && <p className="text-[12.5px] mt-1.5 leading-snug line-clamp-2" style={{ color: sub }}>{attrs}</p>}
                {incomplete && (
                  <button onClick={() => openCategoryEditor(item)} className="inline-flex items-center gap-1 mt-1.5 text-[12.5px] font-semibold" style={{ color: '#E0559A' }}>
                    <AlertCircle size={13} />{t.cv_rv_add_details}
                  </button>
                )}
                </>
                )}
                {beautifyEnabled && !detecting && (() => {
                  const marked = !!beautifyMarked?.has(item.id);
                  return (
                    <button
                      onClick={() => onBeautify(item)}
                      className="inline-flex items-center gap-1.5 mt-2 h-7 pl-3 pr-2.5 rounded-full text-white text-[12px] font-bold active:scale-[0.96] transition-all"
                      style={{ background: marked ? '#141014' : '#F370A7', boxShadow: marked ? 'inset 0 0 0 1.5px #F370A7' : 'none' }}
                    >
                      {marked && <Check size={13} strokeWidth={3} />}
                      {t.cv_bt_button}
                      <span className="flex items-center gap-0.5 pl-1.5 ml-0.5" style={{ borderLeft: '1px solid rgba(255,255,255,0.35)' }}>
                        <Diamond size={12} />{BEAUTIFY_COST}
                      </span>
                    </button>
                  );
                })()}
              </div>

              {/* edit taxonomy */}
              <button onClick={() => openCategoryEditor(item)} aria-label={t.cv_rv_edit_cat} className="flex-none w-9 h-9 rounded-full flex items-center justify-center active:scale-[0.9] transition-transform" style={{ color: ink, background: dark ? '#242426' : '#f4f2f5' }}>
                <Pencil size={16} strokeWidth={2} />
              </button>
            </div>
          );
        })}
      </div>

      {/* Add to Closet */}
      <div className="px-4 pt-3 pb-8" style={{ borderTop: `1px solid ${line}` }}>
        {requireComplete && !allComplete && (
          <p className="text-[12px] text-center mb-2" style={{ color: sub }}>{t.cv_rv_complete_hint}</p>
        )}
        <button
          onClick={() => { if (confirmDisabled) return; logAnalyticsEvent(Events.REVIEW_CONFIRMED, { [Params.ITEM_COUNT]: selected.size }); onConfirm([...selected]); }}
          disabled={confirmDisabled}
          className="w-full h-14 rounded-2xl text-white text-[16px] font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-40 disabled:active:scale-100"
          style={{ background: '#F370A7' }}
        >
          {finalizing ? <><Loader2 size={18} className="animate-spin" />{t.cv_rv_add_to_closet}</> : t.cv_rv_add_to_closet}
        </button>
      </div>
    </div>
    {editorOverlay}
    {/* Fullscreen-просмотр фото — тап в любом месте закрывает */}
    {zoomSrc && (
      <div className="fixed inset-0 z-[70] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.9)' }} onClick={() => setZoomSrc(null)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={zoomSrc} alt="" className="max-w-full max-h-full object-contain" />
      </div>
    )}
    </>
  );
}
