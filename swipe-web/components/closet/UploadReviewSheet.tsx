import React, { useEffect, useRef, useState } from 'react';
import { Check, Pencil, ChevronLeft, Loader2, AlertCircle, ArrowRight, Sparkles } from 'lucide-react';
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

// Пример «до/после» для витрины Beautify (те же кадры, что в обучающем попапе).
const DEMO_ORIGINAL = '/images/onboarding/beautify/original.png';
const DEMO_BEAUTIFIED = '/images/onboarding/beautify/beautifed.jpeg';

const SECTION_EMOJI: Record<WardrobeSection, string> = {
  TOPS: '👕',
  BOTTOMS: '👖',
  DRESSES_SETS: '👗',
  OUTERWEAR: '🧥',
  FOOTWEAR: '👟',
  ACCESSORIES: '👜',
};

/**
 * Розовый beautify-оверлей поверх миниатюры строки (как на карточке гардероба).
 * Прогресс = max(реальный процент джобы, локальный тик) с капом 95% — бэкенд
 * присылает проценты редко, а бар не должен стоять на нуле.
 */
function BeautifyThumbOverlay({ progress, label }: { progress: number; label: string }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setElapsed((s) => Math.min(s + 1, 60)), 1000);
    return () => clearInterval(id);
  }, []);
  const sim = Math.min(Math.round((elapsed / 60) * 95), 95);
  const pct = Math.min(Math.max(progress, sim), 95);
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/35 backdrop-blur-[2px]">
      <div className="w-7 h-7 mb-1 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#F9A9CB,#F370A7)' }}>
        <Sparkles size={13} className="text-white" />
      </div>
      <span className="text-[8.5px] font-semibold text-white text-center px-1 leading-tight">{label}</span>
      <div className="w-[70%] h-1 mt-1 rounded-full bg-white/20 overflow-hidden">
        <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${pct}%`, background: '#F370A7' }} />
      </div>
    </div>
  );
}

function seedSelection(item: ClosetItem): ItemOptionsSelection {
  // Keep subcategory empty when the item has none so the user must pick one;
  // only the section is seeded (for the picker's starting tab).
  const sub = item.subcategory ?? null;
  const section = sectionForSubcategory(sub ?? localToSubcategory(item.category)) ?? 'TOPS';
  return { section, subcategory: sub, itemType: item.itemType ?? null, length: item.length ?? null, fitType: item.fitType ?? null };
}

/** Состояние Beautify для строки ревью — улучшение идёт в этом же окне. */
export type ReviewBeautifyState = { phase: 'working' | 'done' | 'failed'; progress: number };

/**
 * Closet v2 — post-upload review window (Acloset-style, full-screen). The parent
 * passes the freshly-added items (already saved to the wardrobe, carrying the
 * AI-detected taxonomy) plus edit callbacks. Each row shows the structured
 * taxonomy (section · type · subtype · fit · length) with an edit affordance;
 * checkboxes drive bulk Delete; "Add to Closet" confirms everything still listed.
 *
 * Beautify стартует СРАЗУ по тапу (или из авто-попапа) и крутится прямо здесь:
 * строка показывает прогресс, а «Добавить в гардероб» остаётся доступной — можно
 * добавить вещь не дожидаясь конца улучшения, оно доживёт в фоне.
 */
export default function UploadReviewSheet({
  items,
  onClose,
  onConfirm,
  onBeautify,
  onBeautifyAll,
  beautifyReadyIds,
  beautifyState,
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
  /** Тап Beautify на строке — запускает улучшение немедленно (или открывает попап). */
  onBeautify: (item: ClosetItem) => void;
  /** «Улучшить все» из витрины наверху списка. */
  onBeautifyAll?: () => void;
  /** id вещей, которые реально можно улучшить сейчас (загрузились, ещё не улучшены). */
  beautifyReadyIds?: string[];
  /** id строки → статус улучшения (работает / готово / ошибка). */
  beautifyState?: Map<string, ReviewBeautifyState>;
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
            {/* Чёрная, как «Добавить в гардероб» под ней: розовый оставлен за Beautify. */}
            <button onClick={saveCategory} disabled={!isSelectionComplete(editSel)} className="w-full h-13 rounded-2xl text-[15px] font-bold disabled:opacity-40" style={{ background: dark ? '#fff' : '#141014', color: dark ? '#141014' : '#fff', height: 52 }}>{t.save}</button>
          </div>
        </div>
      </div>
  ) : null;

  // ── Full-screen review window ────────────────────────────────────────────
  return (
    <>
    <div className="fixed inset-0 z-[62] flex flex-col" style={{ background: surface }}>
      {/* Header — с заголовком: раньше экран начинался с одинокой стрелки и было
          непонятно, что это за список и чего от него ждут. */}
      <div className="flex items-center gap-1 px-3 pt-4 pb-2.5">
        <button onClick={onClose} aria-label={t.close} className="w-9 h-9 flex-none rounded-full flex items-center justify-center active:scale-[0.9] transition-transform" style={{ color: ink }}>
          <ChevronLeft size={24} strokeWidth={2} />
        </button>
        <h2 className="text-[17px] font-extrabold leading-tight truncate min-w-0" style={{ color: ink }}>
          {t.cv_rv_new_items.replace('{n}', String(items.length))}
        </h2>
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
        {/* ── Витрина Beautify ────────────────────────────────────────────────
            Улучшение платное, автоматически его не запускают. Объяснять словами
            бесполезно — показываем ДВА КАДРА рядом, «Оригинал» и «Улучшенное»,
            в том же размере и с теми же подписями, что в окне выбора после
            улучшения. Одна картинка вместо абзаца текста. */}
        {beautifyEnabled && onBeautifyAll && (beautifyReadyIds?.length ?? 0) > 0 && (
          <div className="px-4 pt-3.5 pb-1">
            <div
              className="rounded-2xl p-3"
              style={{
                background: dark ? 'rgba(243,112,167,0.10)' : '#FFF3F8',
                border: `1px solid ${dark ? 'rgba(243,112,167,0.28)' : '#FADCEA'}`,
              }}
            >
              <div className="flex items-center gap-1.5">
                {([
                  { url: DEMO_ORIGINAL, label: t.cv_bt_original, on: false },
                  { url: DEMO_BEAUTIFIED, label: t.cv_bt_beautified, on: true },
                ]).map((card, i) => (
                  <React.Fragment key={card.label}>
                    {/* Стрелка «из этого → в это»: связывает два кадра в одно
                        утверждение, без неё они читались как два разных товара. */}
                    {i === 1 && (
                      <span className="flex-none w-6 h-6 rounded-full flex items-center justify-center" style={{ background: '#F370A7' }}>
                        <ArrowRight size={14} strokeWidth={3} color="#fff" />
                      </span>
                    )}
                    <div className="flex-1 min-w-0">
                      <div
                        className="relative w-full rounded-xl overflow-hidden"
                        style={{
                          height: 132,
                          background: dark ? '#141014' : '#fff',
                          border: `1.5px solid ${card.on ? '#F370A7' : dark ? '#2f2b31' : '#f0e3ea'}`,
                        }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={card.url} alt="" className="absolute inset-0 w-full h-full object-contain" style={{ padding: 6 }} />
                        <span
                          className="absolute text-[10px] font-extrabold px-2 py-0.5 rounded-full whitespace-nowrap"
                          style={{
                            top: 6, left: 6,
                            background: card.on ? '#F370A7' : dark ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.94)',
                            color: card.on ? '#fff' : ink,
                          }}
                        >
                          {card.label}
                        </span>
                      </div>
                    </div>
                  </React.Fragment>
                ))}
              </div>

              <button
                onClick={onBeautifyAll}
                className="w-full h-11 mt-2.5 rounded-full text-white text-[14px] font-bold flex items-center justify-center active:scale-[0.98] transition-transform"
                style={{ background: '#F370A7' }}
              >
                {(beautifyReadyIds?.length ?? 0) > 1 ? t.cv_bt_offer_all : t.cv_bt_intro_do}
                <span className="flex items-center gap-0.5 pl-2 ml-2" style={{ borderLeft: '1px solid rgba(255,255,255,0.4)' }}>
                  <Diamond size={14} />{BEAUTIFY_COST * (beautifyReadyIds?.length ?? 0)}
                </span>
              </button>
            </div>
          </div>
        )}

        {items.map((item) => {
          const section = sectionOf(item);
          const attrs = attrsOf(item);
          const checked = selected.has(item.id);
          const detecting = !!detectingIds?.has(item.id);
          const incomplete = !detecting && requireComplete && !itemComplete(item);
          const bt = beautifyState?.get(item.id);
          return (
            <div key={item.id} className="flex items-center gap-3 px-4 py-3.5" style={{ borderBottom: `1px solid ${line}` }}>
              {/* select */}
              <button onClick={() => toggleOne(item.id)} aria-label={t.cv_rv_select_all} className="flex-none active:scale-[0.9] transition-transform">
                <span className="w-6 h-6 rounded-md flex items-center justify-center" style={checked ? { background: dark ? '#fff' : '#141118' } : { border: `1.6px solid ${dark ? '#48484a' : '#c9c7cd'}` }}>
                  {checked && <Check size={15} strokeWidth={3} color={dark ? '#000' : '#fff'} />}
                </span>
              </button>

              {/* thumbnail — тап открывает фото на весь экран (во время улучшения
                  зум не открываем, чтобы не перекрывать прогресс) */}
              <button
                onClick={() => { if (bt?.phase === 'working') return; if (item.imageData) setZoomSrc(item.imageData); }}
                className="relative w-[74px] h-[74px] rounded-2xl flex-none overflow-hidden flex items-center justify-center active:scale-[0.96] transition-transform"
                style={{ background: dark ? '#2a2a2c' : '#f5f2f5', border: `1px solid ${line}` }}
              >
                {item.imageData ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.imageData} alt="" className="w-full h-full object-cover" />
                ) : null}
                {bt?.phase === 'working' && <BeautifyThumbOverlay progress={bt.progress} label={t.cv_bt_working} />}
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
                {/* Beautify: идёт / готово / ошибка (повтор) / не запускался */}
                {beautifyEnabled && !detecting && (
                  bt?.phase === 'working' ? (
                    <span className="inline-flex items-center gap-1.5 mt-2 text-[12.5px] font-semibold" style={{ color: '#F370A7' }}>
                      <Sparkles size={13} className="animate-pulse" />{t.cv_bt_working}
                    </span>
                  ) : bt?.phase === 'done' ? (
                    <span className="inline-flex items-center gap-1.5 mt-2 h-7 px-2.5 rounded-full text-[12px] font-bold" style={{ background: dark ? 'rgba(243,112,167,0.18)' : '#fdeef5', color: '#E0559A' }}>
                      <Sparkles size={13} />{t.cv_bt_beautified}
                    </span>
                  ) : (
                    <>
                      <button
                        onClick={() => onBeautify(item)}
                        className="inline-flex items-center gap-1.5 mt-2 h-7 pl-3 pr-2.5 rounded-full text-white text-[12px] font-bold active:scale-[0.96] transition-all"
                        style={{ background: '#F370A7' }}
                      >
                        {t.cv_bt_button}
                        <span className="flex items-center gap-0.5 pl-1.5 ml-0.5" style={{ borderLeft: '1px solid rgba(255,255,255,0.35)' }}>
                          <Diamond size={12} />{BEAUTIFY_COST}
                        </span>
                      </button>
                      {bt?.phase === 'failed' && (
                        <p className="text-[11.5px] mt-1 leading-snug" style={{ color: '#E0559A' }}>{t.cv_bt_failed}</p>
                      )}
                    </>
                  )
                )}
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
        <button
          onClick={() => { if (confirmDisabled) return; logAnalyticsEvent(Events.REVIEW_CONFIRMED, { [Params.ITEM_COUNT]: selected.size }); onConfirm([...selected]); }}
          disabled={confirmDisabled}
          className="w-full h-14 rounded-2xl text-[16px] font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-40 disabled:active:scale-100"
          // Розовый оставлен за Beautify (витрина выше) — подтверждение чёрное,
          // иначе на экране две розовые кнопки и непонятно, какая главная.
          style={{ background: dark ? '#fff' : '#141014', color: dark ? '#141014' : '#fff' }}
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
