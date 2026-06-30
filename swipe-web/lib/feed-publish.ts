// ─── Feed publish orchestration ──────────────────────────────────────────────
// Browser-side helper that turns the user's selected closet sources into a
// published post. Board/calendar sources are rendered to a flat-lay PNG via
// captureCanvasSnapshot and uploaded (so they pass the NSFW scan); try-on
// sources reference their existing resultImageUrl directly (no re-render).
//
// Kept separate from lib/feed-api.ts so that the pure-HTTP client stays free of
// the browser-only canvas dependency.

import { captureCanvasSnapshot } from '@/lib/canvas-snapshot';
import { createPost, uploadFeedImage } from '@/lib/feed-api';
import type { ClosetItem } from '@/lib/closet-storage';
import type { SavedCanvasLayout } from '@/lib/closet-types';
import type { CreatePostImageInput, FeedPost, FeedSourceType } from '@/types/feed';

/** A single item the user picked in the source picker (UI-level, pre-upload). */
export interface SelectedSource {
  /** Stable selection key, e.g. `board:<id>`, `tryon:<id>`, `calendar:<id>`. */
  key: string;
  sourceType: FeedSourceType;
  sourceRefId: string;
  /** Preview thumbnail for picker/compose; null → render from layout on demand. */
  previewUrl: string | null;
  /** Present for board/calendar — drives the flat-lay snapshot. */
  layout?: SavedCanvasLayout;
  /** Items used to resolve images for this source's snapshot. Falls back to the
   *  global wardrobe list passed to publishPost when omitted. */
  items?: ClosetItem[];
  /** Present for try-on — the real-photo result, referenced directly. */
  resultImageUrl?: string;
}

export class FeedPublishError extends Error {
  constructor(message: string, readonly code: 'nsfw_blocked' | 'upload_failed' | 'unknown' = 'unknown') {
    super(message);
    this.name = 'FeedPublishError';
  }
}

/**
 * Publish an ordered list of selected sources as one multi-image post.
 * @param sources  selected items already in carousel order
 * @param caption  optional caption (≤150 chars; trimmed)
 * @param allItems wardrobe items used to resolve images for snapshot rendering
 * @param onProgress fires after each image is prepared (1-based done / total)
 */
export async function publishPost(
  sources: SelectedSource[],
  caption: string,
  allItems: ClosetItem[],
  onProgress?: (done: number, total: number) => void,
): Promise<FeedPost> {
  if (sources.length === 0) throw new FeedPublishError('No sources selected', 'unknown');

  const images: CreatePostImageInput[] = [];

  for (let i = 0; i < sources.length; i++) {
    const s = sources[i];

    if (s.sourceType === 'tryon') {
      if (!s.resultImageUrl) throw new FeedPublishError('Try-on has no result image', 'unknown');
      images.push({
        sourceType: 'tryon',
        position: i,
        imageUrl: s.resultImageUrl,
        sourceRefId: s.sourceRefId,
      });
    } else {
      // board | calendar → flat-lay PNG snapshot, uploaded through the pipeline
      // (always re-uploaded — even when a board thumbnail exists — so every
      // published image passes the NSFW scan).
      if (!s.layout || s.layout.length === 0) {
        throw new FeedPublishError('Outfit has no items to render', 'unknown');
      }
      const blob = await captureCanvasSnapshot(s.layout, s.items ?? allItems);
      const file = new File([blob], `feed-${s.sourceType}-${i}.png`, { type: 'image/png' });
      let up;
      try {
        up = await uploadFeedImage(file, i);
      } catch (e) {
        throw new FeedPublishError((e as Error).message || 'Upload failed', 'upload_failed');
      }
      if (up.safetyFlag === 'BLOCKED') throw new FeedPublishError('Image blocked by moderation', 'nsfw_blocked');
      if (up.status !== 'COMPLETED' || !up.feedImageId) {
        throw new FeedPublishError(up.failureReason ?? 'Upload failed', 'upload_failed');
      }
      images.push({
        sourceType: s.sourceType,
        position: i,
        imageId: up.feedImageId,
        sourceRefId: s.sourceRefId,
      });
    }

    onProgress?.(i + 1, sources.length);
  }

  const trimmed = caption.trim();
  return createPost({
    caption: trimmed || undefined,
    images,
    idempotencyKey: crypto.randomUUID(),
  });
}

/** Whether any selected source is a real-photo try-on (drives the privacy notice). */
export function containsRealPhoto(sources: SelectedSource[]): boolean {
  return sources.some((s) => s.sourceType === 'tryon');
}
