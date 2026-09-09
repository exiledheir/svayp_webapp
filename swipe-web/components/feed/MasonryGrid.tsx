import React from 'react';
import { useI18n } from '@/lib/i18n';
import { layoutColumns } from '@/lib/feed-layout';
import MasonryTile from '@/components/feed/MasonryTile';
import type { FeedPost } from '@/types/feed';

interface Props {
  posts: FeedPost[];
  onOpen: (post: FeedPost) => void;
  onMore?: (post: FeedPost) => void;
  /** Shown when `posts` is empty. Defaults to t.feed_profile_empty. */
  emptyHint?: string;
  /** Render the skeleton instead of `posts`. */
  loading?: boolean;
  skeletonCount?: number;
  /** Full-width slot under the columns (e.g. a "loading more" indicator). */
  footer?: React.ReactNode;
  trackImpressions?: boolean;
  className?: string;
}

// Varied skeleton heights so the placeholder already reads as a masonry.
const SKELETON_HEIGHTS = [220, 170, 250, 200, 180, 240, 210, 190];

/**
 * Pinterest-style two-column masonry of post tiles. Posts are dealt into the
 * shorter column in feed order (lib/feed-layout.ts), which keeps earlier tiles
 * in place when more pages are appended.
 */
export default function MasonryGrid({
  posts,
  onOpen,
  onMore,
  emptyHint,
  loading,
  skeletonCount = 6,
  footer,
  trackImpressions,
  className = '',
}: Props) {
  const { t } = useI18n();
  const columns = React.useMemo(() => layoutColumns(posts, 2), [posts]);

  if (loading) {
    const heights = Array.from({ length: skeletonCount }, (_, i) => SKELETON_HEIGHTS[i % SKELETON_HEIGHTS.length]);
    const cols = [heights.filter((_, i) => i % 2 === 0), heights.filter((_, i) => i % 2 === 1)];
    return (
      <div className={`flex gap-2 px-2 ${className}`}>
        {cols.map((col, c) => (
          <div key={c} className="flex-1 min-w-0 flex flex-col gap-2">
            {col.map((h, i) => (
              <div key={i}>
                <div className="rounded-2xl bg-black/5 dark:bg-white/10 animate-pulse" style={{ height: h }} />
                <div className="mt-2 ml-1 h-3 w-2/3 rounded bg-black/5 dark:bg-white/10 animate-pulse" />
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <p className={`text-center text-[14px] text-black/45 dark:text-white/45 py-12 px-6 ${className}`}>
        {emptyHint ?? t.feed_profile_empty}
      </p>
    );
  }

  return (
    <div className={className}>
      <div className="flex gap-2 px-2">
        {columns.map((col, c) => (
          <div key={c} className="flex-1 min-w-0 flex flex-col gap-2">
            {col.map((post) => (
              <MasonryTile key={post.id} post={post} onOpen={onOpen} onMore={onMore} trackImpressions={trackImpressions} />
            ))}
          </div>
        ))}
      </div>
      {footer}
    </div>
  );
}
