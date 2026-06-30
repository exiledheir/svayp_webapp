import React from 'react';
import { X, ChevronLeft, ChevronRight, Info, Plus, LayoutGrid, Camera, CalendarDays, Images, type LucideIcon } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import type { ClosetItem } from '@/lib/closet-storage';
import { containsRealPhoto, type SelectedSource } from '@/lib/feed-publish';
import OutfitThumb from '@/components/feed/OutfitThumb';
import type { FeedSourceType } from '@/types/feed';

const TYPE_ICON: Record<FeedSourceType, LucideIcon> = {
  board: LayoutGrid,
  tryon: Camera,
  calendar: CalendarDays,
  library: Images,
};

interface Props {
  sources: SelectedSource[]; // ordered carousel
  items: ClosetItem[];
  caption: string;
  onCaptionChange: (v: string) => void;
  onRemove: (key: string) => void;
  onReorder: (key: string, dir: -1 | 1) => void;
  onAddMore: () => void;
  onPublish: () => void;
  publishing: boolean;
}

const MAX_CAPTION = 150;

/** Final compose step: ordered image carousel, caption, privacy notice, CTA. */
export default function ComposeSheet({
  sources,
  items,
  caption,
  onCaptionChange,
  onRemove,
  onReorder,
  onAddMore,
  onPublish,
  publishing,
}: Props) {
  const { t } = useI18n();
  const hasRealPhoto = containsRealPhoto(sources);

  const typeLabel: Record<FeedSourceType, string> = {
    board: t.tabBoards,
    tryon: t.tabOutfits,
    calendar: t.tabCalendar,
    library: t.feed_src_library,
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-4 pt-2 pb-4">
        <h2 className="text-[17px] font-bold text-black dark:text-white">{t.feed_compose_title}</h2>
        <p className="text-[13px] text-black/50 dark:text-white/50 mt-0.5 mb-3">{t.feed_compose_subtitle}</p>

        {/* Ordered image tiles */}
        <div className="flex gap-2.5 overflow-x-auto hide-scrollbar pb-1">
          {sources.map((s, i) => (
            <div key={s.key} className="relative shrink-0" style={{ width: 120 }}>
              <div className="relative rounded-xl overflow-hidden" style={{ aspectRatio: '3/4', background: '#F7F7F8' }}>
                {s.sourceType === 'tryon' || s.previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={s.sourceType === 'tryon' ? s.resultImageUrl : s.previewUrl!}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : s.layout ? (
                  <OutfitThumb layout={s.layout} items={s.items ?? items} className="w-full h-full" />
                ) : null}
                <span
                  className="absolute top-1.5 left-1.5 w-5 h-5 rounded-full flex items-center justify-center text-white text-[11px] font-bold"
                  style={{ background: 'rgba(0,0,0,0.55)' }}
                >
                  {i + 1}
                </span>
                <button
                  onClick={() => onRemove(s.key)}
                  className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-white"
                  style={{ background: 'rgba(0,0,0,0.55)' }}
                  aria-label="Remove"
                >
                  <X size={12} />
                </button>
                {/* Source-type label */}
                <span
                  className="absolute bottom-1.5 left-1.5 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-white text-[10px] font-semibold"
                  style={{ background: 'rgba(0,0,0,0.6)' }}
                >
                  {React.createElement(TYPE_ICON[s.sourceType], { size: 10 })}
                  <span>{typeLabel[s.sourceType]}</span>
                </span>
              </div>
              {/* Reorder controls */}
              {sources.length > 1 && (
                <div className="flex justify-between mt-1">
                  <button
                    onClick={() => onReorder(s.key, -1)}
                    disabled={i === 0}
                    className="text-black/50 dark:text-white/50 disabled:opacity-25"
                    aria-label="Move left"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <button
                    onClick={() => onReorder(s.key, 1)}
                    disabled={i === sources.length - 1}
                    className="text-black/50 dark:text-white/50 disabled:opacity-25"
                    aria-label="Move right"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              )}
            </div>
          ))}

          {/* Add more sources — keeps the current selection and returns to the
              picker so a board + try-on + calendar all land in ONE post. */}
          <button
            onClick={onAddMore}
            className="shrink-0 flex flex-col items-center justify-center gap-1.5 rounded-xl text-black/45 dark:text-white/45"
            style={{ width: 120, aspectRatio: '3/4', border: '1.5px dashed rgba(0,0,0,0.18)' }}
          >
            <Plus size={22} />
            <span className="text-[12px] font-medium">{t.feed_add_more}</span>
          </button>
        </div>

        {/* Caption */}
        <div className="mt-4">
          <textarea
            value={caption}
            onChange={(e) => onCaptionChange(e.target.value.slice(0, MAX_CAPTION))}
            placeholder={t.feed_caption_placeholder}
            rows={3}
            className="w-full p-3 rounded-xl text-[14px] bg-black/5 dark:bg-white/10 text-black dark:text-white resize-none outline-none"
          />
          <div className="text-right text-[12px] text-black/40 dark:text-white/40 mt-1">
            {caption.length}/{MAX_CAPTION}
          </div>
        </div>

        {/* Privacy notice */}
        <div
          className="flex items-start gap-2 mt-2 p-3 rounded-xl text-[12.5px] leading-snug"
          style={{
            background: hasRealPhoto ? 'rgba(243,112,167,0.10)' : 'rgba(0,0,0,0.04)',
            color: hasRealPhoto ? '#C13B7F' : 'rgba(0,0,0,0.55)',
          }}
        >
          <Info size={15} className="shrink-0 mt-0.5" />
          <span>{hasRealPhoto ? t.feed_privacy_notice_realphoto : t.feed_privacy_notice_flatlay}</span>
        </div>
      </div>

      {/* CTA */}
      <div className="px-4 pt-3 pb-6 shrink-0" style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom, 1.5rem))' }}>
        <button
          onClick={onPublish}
          disabled={publishing || sources.length === 0}
          className="w-full py-3.5 rounded-2xl text-white font-semibold text-[15px] active:opacity-90 disabled:opacity-50"
          style={{ background: '#F370A7' }}
        >
          {publishing ? t.feed_publishing : t.feed_publish_cta}
        </button>
      </div>
    </div>
  );
}
