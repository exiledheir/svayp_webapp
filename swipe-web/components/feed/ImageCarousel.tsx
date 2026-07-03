import React from 'react';
import Image from 'next/image';
import { LayoutGrid, Camera, CalendarDays, Images, Heart, type LucideIcon } from 'lucide-react';
import CarouselDots from '@/components/market/CarouselDots';
import { useI18n } from '@/lib/i18n';
import type { FeedPostImage, FeedSourceType } from '@/types/feed';

interface Props {
  images: FeedPostImage[];
  alt: string;
  /** CSS aspect-ratio for the frame. Default 4/5 (matches boards/try-ons). */
  aspectRatio?: string;
  /** Instagram-style double-tap to like. Fires on every double-tap; the parent
   *  decides whether to actually like. A heart animation plays regardless. */
  onDoubleTapLike?: () => void;
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
export default function ImageCarousel({ images, alt, aspectRatio = '4/5', onDoubleTapLike }: Props) {
  const { t } = useI18n();
  const [idx, setIdx] = React.useState(0);
  const scrollerRef = React.useRef<HTMLDivElement>(null);
  const list = images.length ? images : [];

  // Double-tap → like (Instagram). A quick second tap within 300ms fires the
  // like and plays a heart burst; a single tap does nothing.
  const lastTap = React.useRef(0);
  const [burstKey, setBurstKey] = React.useState(0);
  const [burst, setBurst] = React.useState(false);
  const burstTimer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  React.useEffect(() => () => { if (burstTimer.current) clearTimeout(burstTimer.current); }, []);

  function handleTap() {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      lastTap.current = 0;
      onDoubleTapLike?.();
      setBurstKey((k) => k + 1);
      setBurst(true);
      if (burstTimer.current) clearTimeout(burstTimer.current);
      burstTimer.current = setTimeout(() => setBurst(false), 850);
    } else {
      lastTap.current = now;
    }
  }

  const typeLabel: Record<FeedSourceType, string> = {
    board: t.tabBoards,
    tryon: t.tabOutfits,
    calendar: t.tabCalendar,
    library: t.feed_src_library,
  };

  // Coalesce dot-index updates into one rAF per frame: reading scrollLeft /
  // clientWidth on every native scroll event forces synchronous layout inside
  // the WebView and makes the horizontal swipe stutter ("то быстро, то медленно").
  const idxTicking = React.useRef(false);
  function handleScroll() {
    if (idxTicking.current) return;
    idxTicking.current = true;
    requestAnimationFrame(() => {
      idxTicking.current = false;
      const el = scrollerRef.current;
      if (el && el.clientWidth) setIdx(Math.round(el.scrollLeft / el.clientWidth));
    });
  }
  function scrollTo(i: number) {
    const el = scrollerRef.current;
    if (el) el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' });
  }

  return (
    <div>
      <div className="relative" style={{ aspectRatio, background: '#F7F7F8' }} onClick={handleTap}>
        <div
          ref={scrollerRef}
          className="absolute inset-0 flex overflow-x-auto hide-scrollbar"
          // overscroll-contain stops a horizontal fling from chaining into the
          // vertical feed scroller; contain isolates the carousel's layout/paint
          // so per-frame scroll work never reflows the whole feed.
          style={{ scrollSnapType: 'x mandatory', overscrollBehaviorX: 'contain', contain: 'layout paint' }}
          onScroll={handleScroll}
        >
          {list.map((img, i) => (
            // snap-stop:always caps a fling at ONE image per swipe — without it a
            // fast swipe skips several photos ("скролл очень быстрый").
            <div key={img.id || i} className="relative shrink-0 w-full h-full" style={{ scrollSnapAlign: 'start', scrollSnapStop: 'always' }}>
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

        {burst && (
          <div
            key={burstKey}
            className="feed-heart-burst pointer-events-none absolute inset-0 flex items-center justify-center z-20"
          >
            <Heart size={92} strokeWidth={1.5} style={{ color: '#F370A7', fill: '#F370A7', filter: 'drop-shadow(0 2px 12px rgba(0,0,0,0.25))' }} />
          </div>
        )}
        <CarouselDots count={images.length} active={idx} variant="dark" />
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
