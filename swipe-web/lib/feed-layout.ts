// ─── Feed masonry layout helpers (pure, no React) ────────────────────────────
// The Pinterest-style grid needs each tile's height BEFORE its image loads, so
// the columns can be balanced up front and nothing jumps around as images
// arrive. Height comes from the image's natural size recorded at publish
// (FeedPostImage.width/height); older posts fall back to a per-source default.

import type { FeedPost, FeedPostImage, FeedSourceType } from '@/types/feed';

/** Bottom inset so scrollable feed content clears the native Flutter navbar
 *  (feed pages are WebView tabs in the shell and don't render the web BottomNav). */
export const NAV_INSET = 'calc(84px + env(safe-area-inset-bottom, 0px))';

/** width / height fallback per source when a post carries no dimensions.
 *  Board & calendar snapshots are rendered 3:4 (lib/canvas-snapshot.ts); try-on
 *  results are portrait photos; library photos are usually phone shots (4:5). */
export const DEFAULT_ASPECT: Record<FeedSourceType, number> = {
  board: 3 / 4,
  calendar: 3 / 4,
  tryon: 3 / 4,
  library: 4 / 5,
};

// Extreme panoramas / strips would break the 2-column rhythm; clamp to a sane
// range (the image is object-cover'd inside the box anyway).
const MIN_ASPECT = 0.5;
const MAX_ASPECT = 1.6;

/** CSS aspect-ratio (width / height) for one image. */
export function imageAspect(img?: FeedPostImage | null): number {
  if (!img) return 4 / 5;
  const w = img.width ?? 0;
  const h = img.height ?? 0;
  const raw = w > 0 && h > 0 ? w / h : (DEFAULT_ASPECT[img.sourceType] ?? 4 / 5);
  return Math.min(MAX_ASPECT, Math.max(MIN_ASPECT, raw));
}

/** Aspect of a post's cover (first image) — what the grid tile shows. */
export function coverAspect(post: Pick<FeedPost, 'images'>): number {
  return imageAspect(post.images[0]);
}

/** Estimated height of the caption / ⋯ row under a tile, in column-width units
 *  (~34px on a ~180px column). Only used for column balancing. */
export const TILE_ROW_ESTIMATE = 0.19;

/**
 * Distribute posts over `columns` columns, each new post going to the currently
 * shortest column (ties → leftmost). Deterministic on the prefix: running it on
 * a longer list never moves posts that were already placed, so infinite-scroll
 * appends don't reshuffle what the user is looking at.
 */
export function layoutColumns<T extends Pick<FeedPost, 'images' | 'caption'>>(posts: T[], columns = 2): T[][] {
  const cols: T[][] = Array.from({ length: columns }, () => []);
  const heights = new Array<number>(columns).fill(0);
  for (const post of posts) {
    let target = 0;
    for (let c = 1; c < columns; c++) {
      if (heights[c] < heights[target]) target = c;
    }
    cols[target].push(post);
    heights[target] += 1 / coverAspect(post) + TILE_ROW_ESTIMATE;
  }
  return cols;
}
