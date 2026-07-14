import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { needsUnoptimized } from '@/lib/img';
import { Heart, Pencil, Share2, Sparkles, Loader2 } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { taxLabel, sectionForSubcategory, localToSubcategory } from '@/lib/wardrobe-taxonomy';
import ItemOptionsPicker, { isSelectionComplete, type ItemOptionsSelection } from '@/components/closet/ItemOptionsPicker';
import { updateClosetItemApi, type ClosetItem } from '@/lib/closet-storage';
import { markItemWorn } from '@/lib/wardrobe-api';
import { shareImageBlob, fetchImageBlob } from '@/lib/share-image';
import { logAnalyticsEvent } from '@/lib/analytics';
import { Events } from '@/lib/analytics-events';

function seedSelection(item: ClosetItem): ItemOptionsSelection {
  const sub = item.subcategory ?? localToSubcategory(item.category);
  const section = sectionForSubcategory(sub) ?? 'TOPS';
  return { section, subcategory: sub, itemType: item.itemType ?? null, length: item.length ?? null, fitType: item.fitType ?? null };
}

/**
 * Closet v2 — item detail sheet. Shows the taxonomy (Section / Type / Subtype /
 * Length / Fit) inline for viewing & editing (as the pre-redesign sheet did),
 * plus a name field, wear tracking, one-tap Try on and Beautify. Read-only for
 * demo items (they belong to a shared backend user).
 */
export default function ItemDetailSheet({
  item,
  readOnly,
  beautifyEnabled,
  dark,
  onClose,
  onDelete,
  onRename,
  onEditCategory,
  onBeautify,
  onTryOn,
  onChanged,
}: {
  item: ClosetItem;
  readOnly: boolean;
  beautifyEnabled: boolean;
  dark: boolean;
  onClose: () => void;
  onDelete: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onEditCategory: (id: string, sel: ItemOptionsSelection) => void;
  onBeautify: (item: ClosetItem) => void;
  onTryOn: (item: ClosetItem) => void;
  onChanged: () => void;
}) {
  const { t, locale } = useI18n();
  const [fav, setFav] = useState(!!item.isFavorite);
  const [worn, setWorn] = useState(item.timesWorn ?? 0);
  const [marking, setMarking] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [sel, setSel] = useState<ItemOptionsSelection>(() => seedSelection(item));
  const [sharing, setSharing] = useState(false);
  const viewed = useRef(false);

  useEffect(() => {
    if (viewed.current) return;
    viewed.current = true;
    logAnalyticsEvent(Events.ITEM_DETAIL_VIEWED);
  }, []);

  const ink = dark ? '#fff' : '#141118';
  const sub = dark ? '#8e8e93' : '#9a8f98';
  const surface = dark ? '#1a1a1a' : '#fff';
  const line = dark ? '#2a2a2c' : '#ececed';

  const subcat = item.subcategory ?? localToSubcategory(item.category);
  const displayName = item.displayName || taxLabel(subcat, locale);

  function toggleFav() {
    if (readOnly) return;
    const next = !fav;
    setFav(next);
    updateClosetItemApi(item.id, { isFavorite: next }).then(onChanged).catch(() => {});
  }
  async function markWorn() {
    if (readOnly || marking) return;
    setMarking(true);
    setWorn((w) => w + 1);
    try {
      await markItemWorn(item.id);
      logAnalyticsEvent(Events.ITEM_MARKED_WORN);
      onChanged();
    } catch {
      setWorn((w) => Math.max(0, w - 1));
    } finally {
      setMarking(false);
    }
  }
  function commitName() {
    const v = nameDraft.trim();
    if (v && v !== displayName) onRename(item.id, v);
    setEditingName(false);
  }
  function save() {
    if (!readOnly && isSelectionComplete(sel)) onEditCategory(item.id, sel);
    onClose();
  }
  async function share() {
    if (!item.imageData || sharing) return;
    setSharing(true);
    try {
      const blob = await fetchImageBlob(item.imageData);
      await shareImageBlob(blob, `libas-item-${item.id}.png`);
    } catch {
      /* cancelled */
    } finally {
      setSharing(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center" style={{ background: 'rgba(15,8,14,0.42)' }} onClick={onClose}>
      <div className="w-full max-w-[460px] rounded-t-3xl flex flex-col" style={{ background: surface, maxHeight: '90%' }} onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-center pt-3 pb-1"><div className="w-9 h-1 rounded-full" style={{ background: dark ? '#3a3a3c' : '#e2dbe1' }} /></div>

        <div className="overflow-y-auto px-5 pb-2">
          {/* Hero */}
          <div className="relative">
            <div className="w-full rounded-2xl overflow-hidden flex items-center justify-center" style={{ aspectRatio: '1/1', background: dark ? '#222' : '#f4f0f4' }}>
              {item.imageData ? <Image src={item.imageData} alt={displayName} fill className="object-contain" unoptimized={needsUnoptimized(item.imageData)} /> : null}
            </div>
            {!readOnly && (
              <button onClick={toggleFav} aria-label="Favorite" className="absolute top-3 right-3 w-10 h-10 rounded-full flex items-center justify-center" style={{ background: dark ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.85)' }}>
                <Heart size={19} strokeWidth={2} color={fav ? '#F370A7' : (dark ? '#fff' : '#141118')} fill={fav ? '#F370A7' : 'none'} />
              </button>
            )}
          </div>

          {/* Name */}
          <div className="mt-3">
            {editingName ? (
              <input autoFocus value={nameDraft} onChange={(e) => setNameDraft(e.target.value)} onBlur={commitName} onKeyDown={(e) => { if (e.key === 'Enter') commitName(); }} className="w-full bg-transparent outline-none text-[20px] font-extrabold border-b" style={{ color: ink, borderColor: '#F370A7' }} placeholder={t.cv_dt_name_placeholder} />
            ) : (
              <button disabled={readOnly} onClick={() => { setNameDraft(displayName); setEditingName(true); }} className="flex items-center gap-2 max-w-full">
                <span className="text-[20px] font-extrabold tracking-[-0.4px] truncate" style={{ color: ink }}>{displayName}</span>
                {!readOnly && <Pencil size={15} style={{ color: sub }} className="flex-none" />}
              </button>
            )}
            <p className="text-[12.5px] mt-1" style={{ color: sub }}>{taxLabel(subcat, locale)} · {taxLabel(sel.section, locale)}</p>
          </div>

          {/* Taxonomy (section / type / subtype / length / fit) — the info that existed before */}
          <div className="mt-3">
            <ItemOptionsPicker value={sel} onChange={setSel} dark={dark} />
          </div>

          {/* Wear tracking */}
          <div className="flex items-center justify-between mt-4 rounded-2xl p-3.5" style={{ background: dark ? '#232325' : '#f5f2f5' }}>
            <span className="text-[13px] font-bold" style={{ color: ink }}>{worn > 0 ? t.cv_dt_worn.replace('{n}', String(worn)) : t.cv_dt_worn_never}</span>
            {!readOnly && (
              <button onClick={markWorn} disabled={marking} className="px-3.5 h-9 rounded-full text-[13px] font-bold flex items-center gap-1.5" style={{ background: dark ? '#3a3a3c' : '#fff', color: ink }}>
                {marking ? <Loader2 size={14} className="animate-spin" /> : null}{t.cv_dt_mark_worn}
              </button>
            )}
          </div>

          {/* Primary actions */}
          <div className="grid grid-cols-2 gap-2.5 mt-3.5">
            {beautifyEnabled && !readOnly && (
              <button onClick={() => onBeautify(item)} className="h-12 rounded-2xl text-white text-[14px] font-bold flex items-center justify-center gap-1.5" style={{ background: '#F370A7' }}>
                <Sparkles size={16} />{t.cv_bt_button}
              </button>
            )}
            <button onClick={() => onTryOn(item)} className={`h-12 rounded-2xl text-white text-[14px] font-bold flex items-center justify-center ${beautifyEnabled && !readOnly ? '' : 'col-span-2'}`} style={{ background: '#141014' }}>
              {t.cv_dt_tryon}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2.5 px-5 pt-3 pb-8" style={{ borderTop: `1px solid ${line}` }}>
          <button onClick={() => onDelete(item.id)} className="flex-1 h-12 rounded-full text-[14px] font-bold" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>{t.delete}</button>
          <button onClick={share} disabled={sharing} aria-label={t.share} className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: dark ? '#2a2a2a' : '#f1eef1', color: ink }}>
            {sharing ? <Loader2 size={16} className="animate-spin" /> : <Share2 size={16} />}
          </button>
          <button onClick={save} disabled={!readOnly && !isSelectionComplete(sel)} className="flex-1 h-12 rounded-full text-[14px] font-bold text-white disabled:opacity-40" style={{ background: dark ? '#fff' : '#141014', color: dark ? '#141014' : '#fff' }}>{t.save}</button>
        </div>
      </div>
    </div>
  );
}
