import React, { useRef, useState } from 'react';
import Image from 'next/image';
import { X, Check, RotateCcw } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { needsUnoptimized } from '@/lib/img';
import type { ClosetItem } from '@/lib/closet-storage';
import type { DaySlot } from '@/lib/calendar-picks';

/** Группы фильтра в шторке. Соответствуют строкам гардероба, а не слотам образа. */
export type PickGroup = 'upper' | 'lower' | 'shoes' | 'acc';

/**
 * Выбор вещей для образа дня в «Календаре».
 *
 * Одно действие вместо двух: человек не выбирает сначала слот, а потом вещь —
 * он просто жмёт на вещь, а слот берётся из её категории (платье уходит в «верх»,
 * платок — в «платок»). Повторный тап по выбранной вещи убирает её из образа:
 * так «убрать» не требует отдельной кнопки у каждого слота.
 *
 * Чипы сверху — только фильтр списка; они ничего не выбирают сами по себе.
 */
export default function CalendarPickSheet({
  dayLabel,
  groups,
  selectedIds,
  initialGroup = 'upper',
  canReset,
  onToggle,
  onReset,
  onClose,
  dark,
}: {
  /** Дата дня — человек мог открыть шторку и забыть, какой день правит. */
  dayLabel: string;
  groups: Record<PickGroup, ClosetItem[]>;
  /** id вещей, которые сейчас в образе (по всем слотам). */
  selectedIds: string[];
  initialGroup?: PickGroup;
  canReset: boolean;
  /** Тап по вещи: выбрать её в свой слот либо убрать, если она уже в образе. */
  onToggle: (item: ClosetItem) => void;
  onReset: () => void;
  onClose: () => void;
  dark: boolean;
}) {
  const { t } = useI18n();
  const [group, setGroup] = useState<PickGroup>(initialGroup);

  // Свайп вниз по шапке закрывает шторку — как в остальных шторках гардероба.
  const [dragY, setDragY] = useState(0);
  const dragStartRef = useRef<number | null>(null);

  const ink = dark ? '#fff' : '#141118';
  const sub = dark ? '#8e8e93' : '#9a8f98';
  const surface = dark ? '#1c1c1e' : '#fff';
  const chipOff = dark ? '#2a2a2c' : '#f3f1f5';
  const tileBg = dark ? 'rgba(255,255,255,0.06)' : '#F6F6F7';

  // Пустые группы в фильтре не показываем: чип, за которым нет ни одной вещи,
  // выглядит как сломанный фильтр.
  const tabs: { key: PickGroup; label: string }[] = (
    [
      ['upper', t.upperBody],
      ['lower', t.lowerBody],
      ['shoes', t.shoes],
      ['acc', t.accessories],
    ] as [PickGroup, string][]
  )
    .filter(([key]) => groups[key].length > 0)
    .map(([key, label]) => ({ key, label }));

  // Активная группа могла опустеть (вещь удалили из гардероба) — показываем первую живую.
  const activeGroup = tabs.some((tab) => tab.key === group) ? group : tabs[0]?.key;
  const items = activeGroup ? groups[activeGroup] : [];

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center"
      style={{ background: 'rgba(15,8,14,0.5)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-[460px] rounded-t-3xl flex flex-col"
        style={{
          background: surface,
          maxHeight: '82%',
          transform: dragY ? `translateY(${dragY}px)` : undefined,
          transition: dragStartRef.current == null ? 'transform 0.25s ease' : 'none',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="shrink-0 px-5 pt-3 pb-2"
          onTouchStart={(e) => { dragStartRef.current = e.touches[0].clientY; }}
          onTouchMove={(e) => {
            if (dragStartRef.current == null) return;
            const dy = e.touches[0].clientY - dragStartRef.current;
            setDragY(dy > 0 ? dy : 0);
          }}
          onTouchEnd={() => {
            if (dragStartRef.current == null) return;
            const close = dragY > 90;
            dragStartRef.current = null;
            if (close) onClose(); else setDragY(0);
          }}
        >
          <div className="flex justify-center pb-2">
            <div className="w-9 h-1 rounded-full" style={{ background: dark ? '#3a3a3c' : '#e2dbe1' }} />
          </div>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-[17px] font-extrabold leading-tight" style={{ color: ink }}>
                {t.cl_cal_pick_title}
              </h2>
              <p className="text-[12px] mt-0.5" style={{ color: sub }}>{dayLabel}</p>
            </div>
            <button
              onClick={onClose}
              aria-label={t.close}
              className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center active:scale-[0.95] transition-transform"
              style={{ background: dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)', color: sub }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="shrink-0 flex gap-2 overflow-x-auto hide-scrollbar px-5 py-1.5">
          {tabs.map((tab) => {
            const on = activeGroup === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setGroup(tab.key)}
                className="shrink-0 h-8 px-3.5 rounded-full text-[13px] font-semibold transition-colors active:scale-95"
                style={{ background: on ? ink : chipOff, color: on ? surface : sub }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="flex-1 overflow-y-auto px-5 pt-2 pb-4">
          {items.length === 0 ? (
            <p className="text-[13px] py-6 text-center" style={{ color: sub }}>{t.cv_ce_closet_empty}</p>
          ) : (
            <div className="grid grid-cols-3 gap-2.5">
              {items.map((item) => {
                const picked = selectedIds.includes(item.id);
                return (
                  <button
                    key={item.id}
                    onClick={() => onToggle(item)}
                    className="relative aspect-[3/4] rounded-xl overflow-hidden active:scale-[0.96] transition-transform"
                    style={{
                      background: tileBg,
                      border: `1.5px solid ${picked ? '#F370A7' : 'transparent'}`,
                    }}
                  >
                    <Image
                      src={item.imageData}
                      alt={item.category}
                      fill
                      className="object-contain p-1"
                      unoptimized={needsUnoptimized(item.imageData)}
                    />
                    {picked && (
                      <span
                        className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full flex items-center justify-center text-white"
                        style={{ background: '#F370A7' }}
                      >
                        <Check size={13} strokeWidth={3} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* «Вернуть подбор» — только когда есть что возвращать: на дне без правок
            кнопка ничего не делает и лишь путает. */}
        <div
          className="shrink-0 px-5 pt-2"
          style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 1rem))' }}
        >
          {canReset && (
            <button
              onClick={onReset}
              className="w-full h-11 rounded-2xl flex items-center justify-center gap-1.5 text-[13.5px] font-bold active:scale-[0.98] transition-transform"
              style={{ background: dark ? 'rgba(255,255,255,0.08)' : 'rgba(20,16,20,0.06)', color: ink }}
            >
              <RotateCcw size={14} strokeWidth={2.4} />
              {t.cl_cal_reset}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
