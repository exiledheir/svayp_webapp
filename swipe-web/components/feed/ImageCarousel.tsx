import React from 'react';
import Image from 'next/image';
import { LayoutGrid, Camera, CalendarDays, Images, type LucideIcon } from 'lucide-react';
import CarouselDots from '@/components/market/CarouselDots';
import { useI18n } from '@/lib/i18n';
import type { FeedPostImage, FeedSourceType } from '@/types/feed';

interface Props {
  images: FeedPostImage[];
  alt: string;
  /** CSS aspect-ratio for the frame. Default 4/5 (matches boards/try-ons). */
  aspectRatio?: string;
  onClick?: () => void;
}

const TYPE_ICON: Record<FeedSourceType, LucideIcon> = {
  board: LayoutGrid,
  tryon: Camera,
  calendar: CalendarDays,
  library: Images,
};

/**
 * Swipeable image carousel for a feed post. Mirrors the MarketFeedCard swipe
 * pattern (scroll-snap + page-indicator dots). Each image is tagged with its
 * source type (Board / Outfit / Calendar); multi-image posts get a chip row
 * below so viewers can see the mix and jump straight to an image.
 */
export default function ImageCarousel({ images, alt, aspectRatio = '4/5', onClick }: Props) {
  const { t } = useI18n();
  const [idx, setIdx] = React.useState(0);
  const scrollerRef = React.useRef<HTMLDivElement>(null);
  const list = images.length ? images : [];

  const typeLabel: Record<FeedSourceType, string> = {
    board: t.tabBoards,
    tryon: t.tabOutfits,
    calendar: t.tabCalendar,
    library: t.feed_src_library,
  };

  function handleScroll(e: React.UIEvent<HTMLDivElement>) {
    const el = e.currentTarget;
    if (el.clientWidth) setIdx(Math.round(el.scrollLeft / el.clientWidth));
  }
  function scrollTo(i: number) {
    const el = scrollerRef.current;
    if (el) el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' });
  }

  const current = list[idx];
  const CurrentIcon = current ? TYPE_ICON[current.sourceType] : null;

  return (
    <div>
      <div className="relative" style={{ aspectRatio, background: '#F7F7F8' }} onClick={onClick}>
        <div
          ref={scrollerRef}
          className="absolute inset-0 flex overflow-x-auto hide-scrollbar"
          style={{ scrollSnapType: 'x mandatory' }}
          onScroll={handleScroll}
        >
          {list.map((img, i) => (
            <div key={img.id || i} className="relative shrink-0 w-full h-full" style={{ scrollSnapAlign: 'start' }}>
              <Image
                src={img.imageUrl}
                alt={`${alt} ${i + 1}`}
                fill
                sizes="(max-width: 480px) 100vw, 480px"
                className="object-cover"
                unoptimized
              />
            </div>
          ))}
        </div>

        {/* Source-type pill for the currently visible image */}
        {current && CurrentIcon && (
          <div
            className="absolute top-2.5 left-2.5 flex items-center gap-1 px-2 py-1 rounded-full text-white text-[11px] font-semibold pointer-events-none"
            style={{ background: 'rgba(0,0,0,0.55)' }}
          >
            <CurrentIcon size={12} />
            <span>{typeLabel[current.sourceType]}</span>
          </div>
        )}

        <CarouselDots count={images.length} active={idx} />
      </div>

      {/* Per-image navigation chips (only when there's more than one) */}
      {list.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto hide-scrollbar px-3.5 pt-2.5">
          {list.map((img, i) => {
            const Icon = TYPE_ICON[img.sourceType];
            const active = i === idx;
            return (
              <button
                key={img.id || i}
                onClick={() => scrollTo(i)}
                className={`flex items-center gap-1 shrink-0 px-2.5 py-1 rounded-full text-[12px] font-semibold transition-colors ${
                  active ? 'text-white' : 'text-black/55 dark:text-white/55 bg-black/5 dark:bg-white/10'
                }`}
                style={active ? { background: '#F370A7' } : undefined}
              >
                <Icon size={12} />
                <span>{typeLabel[img.sourceType]}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
