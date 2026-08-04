import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { needsUnoptimized } from '@/lib/img';
import { Heart, Pencil } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { taxLabel, sectionForSubcategory, localToSubcategory } from '@/lib/wardrobe-taxonomy';
import ItemOptionsPicker, { isSelectionComplete, type ItemOptionsSelection } from '@/components/closet/ItemOptionsPicker';
import { updateClosetItemApi, type ClosetItem } from '@/lib/closet-storage';
import { logAnalyticsEvent } from '@/lib/analytics';
import { Events } from '@/lib/analytics-events';

function seedSelection(item: ClosetItem): ItemOptionsSelection {
  const sub = item.subcategory ?? localToSubcategory(item.category);
  const section = sectionForSubcategory(sub) ?? 'TOPS';
  return { section, subcategory: sub, itemType: item.itemType ?? null, length: item.length ?? null, fitType: item.fitType ?? null };
}

/**
 * Closet v2 — item detail sheet. Два режима:
 *
 * - **Просмотр** (по умолчанию): фото, название и одна кнопка — «Примерить».
 *   Раньше лист сразу открывался формой (чипы Раздел / Тип / Подтип / Длина /
 *   Крой + Удалить/Сохранить), хотя в 99% случаев вещь просто открывают
 *   посмотреть или примерить.
 * - **Редактирование** (по кнопке «Изменить»): компактная шапка, чипы таксономии,
 *   переименование и футер Удалить / Сохранить.
 *
 * Read-only для демо-вещей (они принадлежат общему бэкенд-пользователю): правки
 * не сохраняются, но скрыть (удалить) такую вещь по-прежнему можно.
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
  // Детали (таксономия) и деструктивные действия появляются только по «Изменить».
  const [editing, setEditing] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [sel, setSel] = useState<ItemOptionsSelection>(() => seedSelection(item));
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
  function commitName() {
    const v = nameDraft.trim();
    if (v && v !== displayName) onRename(item.id, v);
    setEditingName(false);
  }
  function save() {
    if (!readOnly && isSelectionComplete(sel)) onEditCategory(item.id, sel);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center" style={{ background: 'rgba(15,8,14,0.42)' }} onClick={onClose}>
      <div className="w-full max-w-[460px] rounded-t-3xl flex flex-col" style={{ background: surface, maxHeight: '90%' }} onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-center pt-3 pb-1"><div className="w-9 h-1 rounded-full" style={{ background: dark ? '#3a3a3c' : '#e2dbe1' }} /></div>

        <div className="overflow-y-auto px-5 pb-2">
          {editing ? (
            <>
              {/* Компактная шапка формы: большое фото тут только мешало бы —
                  чипы таксономии должны быть видны сразу. */}
              <div className="flex items-center gap-3 pt-1">
                <div className="relative w-16 h-16 rounded-2xl overflow-hidden flex-none flex items-center justify-center" style={{ background: dark ? '#222' : '#f4f0f4' }}>
                  {item.imageData ? <Image src={item.imageData} alt={displayName} fill className="object-contain" unoptimized={needsUnoptimized(item.imageData)} /> : null}
                </div>
                <div className="min-w-0 flex-1">
                  {editingName ? (
                    <input autoFocus value={nameDraft} onChange={(e) => setNameDraft(e.target.value)} onBlur={commitName} onKeyDown={(e) => { if (e.key === 'Enter') commitName(); }} className="w-full bg-transparent outline-none text-[17px] font-extrabold border-b" style={{ color: ink, borderColor: '#F370A7' }} placeholder={t.cv_dt_name_placeholder} />
                  ) : (
                    <button disabled={readOnly} onClick={() => { setNameDraft(displayName); setEditingName(true); }} className="flex items-center gap-2 max-w-full">
                      <span className="text-[17px] font-extrabold tracking-[-0.3px] truncate" style={{ color: ink }}>{displayName}</span>
                      {!readOnly && <Pencil size={14} style={{ color: sub }} className="flex-none" />}
                    </button>
                  )}
                  <p className="text-[12.5px] mt-0.5 truncate" style={{ color: sub }}>{taxLabel(subcat, locale)} · {taxLabel(sel.section, locale)}</p>
                </div>
              </div>

              {/* Taxonomy (section / type / subtype / length / fit) */}
              <div className="mt-4">
                <ItemOptionsPicker value={sel} onChange={setSel} dark={dark} />
              </div>
            </>
          ) : (
            <>
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

              {/* Name — действия (Примерить / Изменить) живут в закреплённом
                  футере, чтобы до них не нужно было доскроллить. */}
              <div className="mt-3">
                <p className="text-[20px] font-extrabold tracking-[-0.4px] truncate" style={{ color: ink }}>{displayName}</p>
                <p className="text-[12.5px] mt-1" style={{ color: sub }}>{taxLabel(subcat, locale)} · {taxLabel(sel.section, locale)}</p>
              </div>
            </>
          )}
        </div>

        {/* Footer — просмотр: только «Изменить»; редактирование: Удалить / Сохранить. */}
        <div className="flex gap-2.5 px-5 pt-3 pb-8" style={{ borderTop: `1px solid ${line}` }}>
          {editing ? (
            <>
              <button onClick={() => onDelete(item.id)} className="flex-1 h-12 rounded-full text-[14px] font-bold" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>{t.delete}</button>
              <button onClick={save} disabled={!readOnly && !isSelectionComplete(sel)} className="flex-1 h-12 rounded-full text-[14px] font-bold text-white disabled:opacity-40" style={{ background: dark ? '#fff' : '#141014', color: dark ? '#141014' : '#fff' }}>{t.save}</button>
            </>
          ) : (
            <>
              <button onClick={() => setEditing(true)} aria-label={t.cv_dt_edit} className="flex-none h-12 px-5 rounded-full text-[14px] font-bold flex items-center justify-center gap-2" style={{ background: dark ? '#2a2a2a' : '#f1eef1', color: ink }}>
                <Pencil size={15} strokeWidth={2.2} />
                {t.cv_dt_edit}
              </button>
              <button onClick={() => onTryOn(item)} className="flex-1 h-12 rounded-full text-[14px] font-bold text-white flex items-center justify-center" style={{ background: dark ? '#fff' : '#141014', color: dark ? '#141014' : '#fff' }}>
                {t.cv_dt_tryon}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
