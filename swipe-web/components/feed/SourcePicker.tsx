import React from 'react';
import { useI18n } from '@/lib/i18n';
import type { ClosetItem } from '@/lib/closet-storage';
import type { SelectedSource } from '@/lib/feed-publish';
import type { FeedSourceType } from '@/types/feed';
import OutfitThumb from '@/components/feed/OutfitThumb';

interface Props {
  sources: Record<FeedSourceType, SelectedSource[]>;
  selectedKeys: string[]; // ordered selection (for badges)
  onToggle: (s: SelectedSource) => void;
  items: ClosetItem[];
  loading: boolean;
  tab: FeedSourceType; // controlled by the parent (so a prompt can switch tabs)
  onTabChange: (t: FeedSourceType) => void;
}

// Outfits (try-ons) first, then Boards, then Calendar.
const TABS: FeedSourceType[] = ['tryon', 'board', 'calendar'];

/**
 * Source picker for publishing. Grid of sources up top; the tab switcher
 * (Образы / Доски / Календарь) sits at the BOTTOM. Multi-select across tabs —
 * selection lives in the parent so an order badge shows the carousel position.
 */
export default function SourcePicker({ sources, selectedKeys, onToggle, items, loading, tab, onTabChange }: Props) {
  const { t } = useI18n();

  const tabLabel: Record<FeedSourceType, string> = {
    board: t.tabBoards,
    tryon: t.tabOutfits,
    calendar: t.tabCalendar,
  };

  const list = sources[tab] ?? [];

  return (
    <div className="flex flex-col h-full">
      {/* Grid (top, scrollable) */}
      <div className="flex-1 overflow-y-auto px-4 pt-3 pb-4">
        {loading ? (
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="rounded-xl bg-black/5 dark:bg-white/10 animate-pulse" style={{ aspectRatio: '3/4' }} />
            ))}
          </div>
        ) : list.length === 0 ? (
          <p className="text-center text-[14px] text-black/45 dark:text-white/45 mt-10">{t.feed_no_sources}</p>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {list.map((s) => {
              const order = selectedKeys.indexOf(s.key);
              const selected = order >= 0;
              return (
                <button
                  key={s.key}
                  onClick={() => onToggle(s)}
                  className="relative rounded-xl overflow-hidden"
                  style={{ aspectRatio: '3/4', outline: selected ? '2px solid #F370A7' : '1px solid rgba(0,0,0,0.08)' }}
                >
                  {s.sourceType === 'tryon' || s.previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={s.sourceType === 'tryon' ? s.resultImageUrl : s.previewUrl!}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : s.layout ? (
                    <OutfitThumb layout={s.layout} items={s.items ?? items} className="w-full h-full" />
                  ) : (
                    <div className="w-full h-full bg-black/5 dark:bg-white/10" />
                  )}

                  {selected && (
                    <span
                      className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full flex items-center justify-center text-white text-[12px] font-bold"
                      style={{ background: '#F370A7' }}
                    >
                      {order + 1}
                    </span>
                  )}
                  {!selected && (
                    <span
                      className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full"
                      style={{ border: '1.5px solid rgba(255,255,255,0.9)', background: 'rgba(0,0,0,0.15)' }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Tabs (bottom) */}
      <div
        className="flex gap-2 px-4 pt-2.5 shrink-0 border-t border-black/5 dark:border-white/10 bg-white dark:bg-[#111111]"
        style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0.75rem))' }}
      >
        {TABS.map((key) => {
          const active = tab === key;
          const count = (sources[key] ?? []).filter((s) => selectedKeys.includes(s.key)).length;
          return (
            <button
              key={key}
              onClick={() => onTabChange(key)}
              className={`relative flex-1 py-2.5 rounded-full text-[13px] font-semibold transition-colors ${
                active ? 'text-white' : 'text-black/60 dark:text-white/60 bg-black/5 dark:bg-white/10'
              }`}
              style={active ? { background: '#F370A7' } : undefined}
            >
              {tabLabel[key]}
              {count > 0 && (
                <span
                  className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center text-[11px] font-bold text-white"
                  style={{ background: active ? '#C13B7F' : '#F370A7' }}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
