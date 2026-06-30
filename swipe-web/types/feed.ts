// ─── Feed (Лента) domain types ───────────────────────────────────────────────
// The social feed where users publish outfit posts assembled from three closet
// sources. Mirrors types/market.ts conventions: UUID ids, ISO-8601 timestamps,
// camelCase. Backend contract lives under /api/v1/feed/* (see the Feed plan).

/** Which surface an image was published from. `calendar` is legacy (kept so old
 *  posts still render); the composer now offers board / tryon / library. */
export type FeedSourceType = 'board' | 'calendar' | 'tryon' | 'library';

/** Post-moderation lifecycle. Posts are born `active` (instant publish). */
export type FeedPostStatus = 'active' | 'hidden' | 'removed';

export type FeedReportReason =
  | 'inappropriate' // Непристойный контент
  | 'spam' // Спам
  | 'not_fashion' // Не относится к моде
  | 'copyright' // Нарушение авторских прав
  | 'other'; // Другое

export interface FeedAuthor {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
}

export interface FeedPostImage {
  id: string;
  sourceType: FeedSourceType;
  imageUrl: string; // snapshot URL (board/calendar) or resultImageUrl (tryon)
  position: number; // 0-based carousel order; 0 = cover
  sourceRefId?: string | null; // canvasId / suggestionId / tryOnJobId (provenance)
}

export interface FeedPost {
  id: string;
  author: FeedAuthor;
  images: FeedPostImage[]; // 1..N (carousel)
  caption: string | null; // ≤150 chars
  likesCount: number;
  isLiked: boolean; // resolved for the current user
  containsRealPhoto: boolean; // true if any image is a try-on (real photo)
  status: FeedPostStatus;
  isOwner: boolean; // resolved server-side
  createdAt: string; // ISO; feed sorted by this desc
}

export interface FeedProfile {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  postsCount: number; // «Образов»
  likesTotal: number; // «Лайков» — sum across the user's posts (server-computed)
  isOwn: boolean;
}

// ── Create-post request ──────────────────────────────────────────────────────
// Each attachment is EITHER an uploaded snapshot (board/calendar → imageId from
// the upload pipeline) OR a referenced try-on result URL (tryon → no upload).
export interface CreatePostImageInput {
  sourceType: FeedSourceType;
  position: number;
  imageId?: string; // board/calendar (uploaded snapshot id)
  imageUrl?: string; // tryon (resultImageUrl referenced directly)
  sourceRefId?: string; // canvasId / suggestionId / tryOnJobId
}

export interface CreatePostPayload {
  caption?: string; // ≤150
  images: CreatePostImageInput[]; // ordered, length ≥1
  idempotencyKey?: string;
}

export interface UpdateProfilePayload {
  displayName?: string;
  username?: string; // unique — backend validates
  bio?: string;
  avatarImageId?: string; // uploaded via uploadFeedImage
}

// ── Upload status (mirrors MarketUploadStatus; returns a feedImageId) ──────────
export type FeedUploadJobStatus =
  | 'INITIATED'
  | 'UPLOADED'
  | 'NSFW_SCAN'
  | 'THUMBNAIL'
  | 'COMPLETED'
  | 'FAILED';

export interface FeedUploadInitResponse {
  uploadJobId: string;
  blobKey: string;
  putUrl: string;
  uploadUrlExpiresAt: string;
  httpMethod: string;
}

export interface FeedUploadStatus {
  uploadJobId: string;
  feedImageId: string | null;
  status: FeedUploadJobStatus;
  imageUrl: string | null;
  thumbnailUrl: string | null;
  progressPercent: number;
  safetyFlag: 'OK' | 'REVIEW' | 'BLOCKED' | null;
  failureReason: string | null;
  updatedAt: string;
}
