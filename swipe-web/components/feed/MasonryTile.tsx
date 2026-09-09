import React from 'react';
import { MoreHorizontal } from 'lucide-react';
import { coverAspect } from '@/lib/feed-layout';
import { logAnalyticsEvent } from '@/lib/analytics';
import { Events, Params } from '@/lib/analytics-events';
import type { FeedPost } from '@/types/feed';

// Дедуп показов постов в рамках визита страницы (общий для всех плиток).
const seenPostImpressions = new Set<string>();

interface Props {
  post: FeedPost;
  onOpen: (post: FeedPost) => void;
  /** Open the ⋯ actions sheet (report / hide / delete). Hidden when omitted. */
  onMore?: (post: FeedPost) => void;
  /** Log a FEED_POST_IMPRESSION once the tile is ≥50% visible for 1s. Only the
   *  home feed sets this — profile / related grids must not inflate the funnel. */
  trackImpressions?: boolean;
}

/**
 * Pinterest-style grid tile: the cover image at its natural aspect ratio with
 * rounded corners, then a one-line caption (if any) and a ⋯ button. Deliberately
 * no author, time, like or comment affordances — the image is the content.
 */
export default function MasonryTile({ post, onOpen, onMore, trackImpressions }: Props) {
  const rootRef = React.useRef<HTMLDivElement>(null);

  // Показ поста: плитка видна >=50% площади не меньше 1 секунды, один раз
  // за визит — иначе воронка ленты не отличает «открыл ленту» от «реально видел посты».
  React.useEffect(() => {
    if (!trackImpressions) return;
    const el = rootRef.current;
    if (!el || seenPostImpressions.has(post.id) || typeof IntersectionObserver === 'undefined') return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          timer = setTimeout(() => {
            if (!seenPostImpressions.has(post.id)) {
              seenPostImpressions.add(post.id);
              logAnalyticsEvent(Events.FEED_POST_IMPRESSION, { [Params.POST_ID]: post.id });
            }
            observer.disconnect();
          }, 1000);
        } else if (timer) {
          clearTimeout(timer);
          timer = null;
        }
      },
      { threshold: 0.5 },
    );
    observer.observe(el);
    return () => {
      if (timer) clearTimeout(timer);
      observer.disconnect();
    };
  }, [post.id, trackImpressions]);

  const cover = post.images[0]?.imageUrl;
  const caption = post.caption?.trim() || '';

  return (
    <div ref={rootRef}>
      {/* Height is reserved from the recorded image size (or a per-source
          default), so tiles never jump as images stream in. */}
      <button
        type="button"
        onClick={() => onOpen(post)}
        className="relative block w-full overflow-hidden rounded-2xl bg-[#F7F7F8] dark:bg-white/10 active:opacity-90"
        style={{ aspectRatio: coverAspect(post) }}
        aria-label={caption || 'outfit'}
      >
        {cover && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt="" loading="lazy" decoding="async" draggable={false} className="w-full h-full object-cover" />
        )}
        {post.images.length > 1 && (
          <span
            className="absolute top-2 right-2 text-white text-[11px] font-bold px-1.5 py-0.5 rounded-md tabular-nums"
            style={{ background: 'rgba(0,0,0,0.45)' }}
          >
            {post.images.length}
          </span>
        )}
      </button>

      <div className={`flex items-center pt-1.5 pl-1 pr-0.5 ${caption ? '' : 'justify-end'}`}>
        {caption && (
          <button
            type="button"
            onClick={() => onOpen(post)}
            className="min-w-0 flex-1 text-left text-[13px] font-semibold leading-tight truncate text-black dark:text-white"
          >
            {caption}
          </button>
        )}
        {onMore && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onMore(post);
            }}
            className="ml-auto shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-black/60 dark:text-white/60 active:bg-black/5 dark:active:bg-white/10"
            aria-label="More"
          >
            <MoreHorizontal size={18} />
          </button>
        )}
      </div>
    </div>
  );
}
