// ─── Feed (Лента) API client ─────────────────────────────────────────────────
// Live backend bridge for the social feed. All paths hit the Spring backend
// under /api/v1 via the Next.js /proxy rewrite; the shared axios instance
// (lib/api.ts) handles JWT + 401-refresh.
//
// Backend contract (see the Feed plan §B): every response wrapped { data },
// lists are Spring pages { content, totalElements, totalPages, number, size }.
// Conventions mirror lib/market-api.ts exactly.

import { api } from '@/lib/api';
import { watchWithSse } from '@/lib/sse-client';
import type { SseHandle } from '@/types';
import type {
  FeedPost,
  FeedProfile,
  FeedFollowUser,
  FeedComment,
  FeedReportReason,
  CreatePostPayload,
  UpdateProfilePayload,
  FeedUploadInitResponse,
  FeedUploadStatus,
} from '@/types/feed';
// Temporary localStorage backend (used until the Spring /feed/* endpoints ship).
// Every public function below short-circuits to this when isFeedLocalMode().
import * as local from '@/lib/feed-storage';
import { isFeedLocalMode } from '@/lib/feed-storage';

// ── Envelope helpers (identical to market-api) ───────────────────────────────
function unwrap<T>(res: { data: unknown }): T {
  const d = res.data as Record<string, unknown>;
  return (d.data ?? d) as T;
}

export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

function asPage<T>(res: { data: unknown }): Page<T> {
  const d = unwrap<Record<string, unknown>>(res);
  return {
    content: (d.content ?? d.items ?? []) as T[],
    totalElements: (d.totalElements ?? 0) as number,
    totalPages: (d.totalPages ?? 0) as number,
    number: (d.number ?? 0) as number,
    size: (d.size ?? 0) as number,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
//  Feed list (date-sorted desc — newest first)
// ─────────────────────────────────────────────────────────────────────────────
export async function getFeed(page = 0, size = 10): Promise<Page<FeedPost>> {
  if (isFeedLocalMode()) return local.getFeed(page, size);
  return asPage<FeedPost>(
    await api.get('/feed/posts', { params: { page, size, sort: 'createdAt,desc' } }),
  );
}

// ── Posts CRUD ───────────────────────────────────────────────────────────────
export async function getPost(id: string): Promise<FeedPost> {
  if (isFeedLocalMode()) return local.getPost(id);
  return unwrap<FeedPost>(await api.get(`/feed/posts/${id}`));
}

export async function createPost(body: CreatePostPayload): Promise<FeedPost> {
  if (isFeedLocalMode()) return local.createPost(body);
  return unwrap<FeedPost>(await api.post('/feed/posts', body));
}

export async function deletePost(id: string): Promise<void> {
  if (isFeedLocalMode()) return local.deletePost(id);
  await api.delete(`/feed/posts/${id}`);
}

/** Current user's own posts (all statuses). */
export async function getMyPosts(page = 0, size = 21): Promise<Page<FeedPost>> {
  if (isFeedLocalMode()) return local.getMyPosts(page, size);
  return asPage<FeedPost>(await api.get('/feed/posts/mine', { params: { page, size } }));
}

/** Active posts by an arbitrary user (profile grid). */
export async function getUserPosts(userId: string, page = 0, size = 21): Promise<Page<FeedPost>> {
  if (isFeedLocalMode()) return local.getUserPosts(userId, page, size);
  return asPage<FeedPost>(await api.get(`/feed/users/${userId}/posts`, { params: { page, size } }));
}

/** Posts the current user has liked (the ♥ tab on the activity screen). */
export async function getLikedPosts(page = 0, size = 21): Promise<Page<FeedPost>> {
  if (isFeedLocalMode()) return local.getLikedPosts(page, size);
  return asPage<FeedPost>(await api.get('/feed/posts/liked', { params: { page, size } }));
}

/** Posts the current user has commented on (the comment tab on activity). */
export async function getCommentedPosts(page = 0, size = 21): Promise<Page<FeedPost>> {
  if (isFeedLocalMode()) return local.getCommentedPosts(page, size);
  return asPage<FeedPost>(await api.get('/feed/posts/commented', { params: { page, size } }));
}

// ── Comments ─────────────────────────────────────────────────────────────────
export async function getComments(postId: string, page = 0, size = 50): Promise<Page<FeedComment>> {
  if (isFeedLocalMode()) return local.getComments(postId, page, size);
  return asPage<FeedComment>(await api.get(`/feed/posts/${postId}/comments`, { params: { page, size } }));
}

export async function addComment(postId: string, text: string): Promise<FeedComment> {
  if (isFeedLocalMode()) return local.addComment(postId, text);
  return unwrap<FeedComment>(await api.post(`/feed/posts/${postId}/comments`, { text }));
}

// ── Profiles ─────────────────────────────────────────────────────────────────
export async function getProfile(userId: string): Promise<FeedProfile> {
  if (isFeedLocalMode()) return local.getProfile(userId);
  return unwrap<FeedProfile>(await api.get(`/feed/users/${userId}`));
}
export async function getProfileByUsername(username: string): Promise<FeedProfile> {
  if (isFeedLocalMode()) return local.getProfileByUsername(username);
  return unwrap<FeedProfile>(await api.get(`/feed/users/by-username/${encodeURIComponent(username)}`));
}
export async function getMyProfile(): Promise<FeedProfile> {
  if (isFeedLocalMode()) return local.getMyProfile();
  return unwrap<FeedProfile>(await api.get('/feed/me'));
}
export async function updateMyProfile(patch: UpdateProfilePayload): Promise<FeedProfile> {
  if (isFeedLocalMode()) return local.updateMyProfile(patch);
  return unwrap<FeedProfile>(await api.patch('/feed/me', patch));
}
export async function checkUsernameAvailable(username: string): Promise<boolean> {
  if (isFeedLocalMode()) return local.checkUsernameAvailable(username);
  const r = await api.get('/feed/me/username-available', { params: { username } });
  return unwrap<{ available: boolean }>(r).available;
}

// ── Likes ────────────────────────────────────────────────────────────────────
// Toggle returns the authoritative state so callers can reconcile an optimistic
// UI flip.
export async function toggleLike(postId: string): Promise<{ isLiked: boolean; likesCount: number }> {
  if (isFeedLocalMode()) return local.toggleLike(postId);
  return unwrap<{ isLiked: boolean; likesCount: number }>(
    await api.post(`/feed/posts/${postId}/toggle-like`),
  );
}

// ── Moderation backstop ──────────────────────────────────────────────────────
export async function reportPost(
  postId: string,
  reason: FeedReportReason,
  message?: string,
): Promise<void> {
  if (isFeedLocalMode()) return local.reportPost();
  await api.post(`/feed/posts/${postId}/report`, { reason, message });
}
export async function hideUserPosts(userId: string): Promise<void> {
  if (isFeedLocalMode()) return local.hideUserPosts(userId);
  await api.post(`/feed/users/${userId}/hide`);
}
export async function unhideUserPosts(userId: string): Promise<void> {
  if (isFeedLocalMode()) return local.unhideUserPosts(userId);
  await api.delete(`/feed/users/${userId}/hide`);
}

// ── Follow ─────────────────────────────────────────────────────────────────────
// Toggle returns the authoritative relationship + count so the UI can reconcile
// an optimistic flip.
export async function toggleFollow(userId: string): Promise<{ isFollowing: boolean; followersCount: number }> {
  if (isFeedLocalMode()) return local.toggleFollow(userId);
  return unwrap<{ isFollowing: boolean; followersCount: number }>(
    await api.post(`/feed/users/${userId}/toggle-follow`),
  );
}

export async function getFollowers(userId: string, page = 0, size = 30): Promise<Page<FeedFollowUser>> {
  if (isFeedLocalMode()) return local.getFollowers(userId, page, size);
  return asPage<FeedFollowUser>(await api.get(`/feed/users/${userId}/followers`, { params: { page, size } }));
}

export async function getFollowing(userId: string, page = 0, size = 30): Promise<Page<FeedFollowUser>> {
  if (isFeedLocalMode()) return local.getFollowing(userId, page, size);
  return asPage<FeedFollowUser>(await api.get(`/feed/users/${userId}/following`, { params: { page, size } }));
}

// ─────────────────────────────────────────────────────────────────────────────
//  Image upload (mirrors market-api init → PUT → confirm → watch).
//  Used for board/calendar flat-lay snapshots; try-on images are referenced by
//  URL and never go through here. The NSFW scan is part of this pipeline.
// ─────────────────────────────────────────────────────────────────────────────
async function initUpload(
  contentType: string,
  idempotencyKey: string,
  fileSizeBytes?: number,
  position?: number,
): Promise<FeedUploadInitResponse> {
  return unwrap<FeedUploadInitResponse>(
    await api.post('/feed/uploads', { contentType, idempotencyKey, fileSizeBytes, position }),
  );
}

// PUT bytes to Azure via the existing Next.js /api/blob-upload proxy (NOT the
// /proxy backend base — it's a local Next.js route).
async function uploadFileToBlob(putUrl: string, file: File | Blob, contentType: string): Promise<void> {
  const proxyUrl = `/api/blob-upload?putUrl=${encodeURIComponent(putUrl)}&contentType=${encodeURIComponent(contentType)}`;
  const res = await fetch(proxyUrl, {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    body: file,
  });
  if (!res.ok) throw new Error(`Blob upload failed: ${res.status}`);
}

async function confirmUpload(jobId: string): Promise<FeedUploadStatus> {
  return unwrap<FeedUploadStatus>(await api.post(`/feed/uploads/${jobId}/confirm`));
}
export async function getUploadStatus(jobId: string): Promise<FeedUploadStatus> {
  return unwrap<FeedUploadStatus>(await api.get(`/feed/uploads/${jobId}`));
}

function watchUpload(
  jobId: string,
  onProgress: (s: FeedUploadStatus) => void,
  onDone: (s: FeedUploadStatus) => void,
  onError: (e: Error) => void,
): SseHandle {
  return watchWithSse<FeedUploadStatus, FeedUploadStatus>({
    sseUrl: `/feed/uploads/${jobId}/stream`,
    fallbackPoll: () => getUploadStatus(jobId),
    onProgress,
    onDone,
    onError,
    isTerminal: (s) => s.status === 'COMPLETED' || s.status === 'FAILED',
    toFinal: (s) => s,
    timeoutMs: 3 * 60 * 1000,
  });
}

// Local mode: compress the image to a JPEG data URL (no network). Keeps
// localStorage small enough to hold several posts. Used for both outfit
// snapshots and profile avatars.
export function fileToCompressedDataUrl(file: File | Blob, maxW = 600, quality = 0.72): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new window.Image();
    image.onload = () => {
      const scale = Math.min(1, maxW / (image.naturalWidth || maxW));
      const w = Math.max(1, Math.round((image.naturalWidth || maxW) * scale));
      const h = Math.max(1, Math.round((image.naturalHeight || maxW) * scale));
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error('no canvas context'));
        return;
      }
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(image, 0, 0, w, h);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('image load failed'));
    };
    image.src = url;
  });
}

/** Orchestrates init → PUT → confirm → watch. Resolves on COMPLETED, rejects on FAILED. */
export async function uploadFeedImage(
  file: File,
  position?: number,
  onProgress?: (s: FeedUploadStatus) => void,
): Promise<FeedUploadStatus> {
  if (isFeedLocalMode()) {
    const dataUrl = await fileToCompressedDataUrl(file);
    // Carry the image inline as a data URL in `feedImageId`; local createPost /
    // updateMyProfile treat that as the image's URL.
    const status: FeedUploadStatus = {
      uploadJobId: `local_${Date.now()}`,
      feedImageId: dataUrl,
      status: 'COMPLETED',
      imageUrl: dataUrl,
      thumbnailUrl: dataUrl,
      progressPercent: 100,
      safetyFlag: 'OK',
      failureReason: null,
      updatedAt: new Date().toISOString(),
    };
    onProgress?.(status);
    return status;
  }
  const idempotencyKey = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const init = await initUpload(file.type, idempotencyKey, file.size, position);
  await uploadFileToBlob(init.putUrl, file, file.type);
  const first = await confirmUpload(init.uploadJobId);
  onProgress?.(first);
  if (first.status === 'COMPLETED') return first;
  if (first.status === 'FAILED') throw new Error(first.failureReason ?? 'Upload failed');
  return await new Promise<FeedUploadStatus>((resolve, reject) => {
    watchUpload(
      init.uploadJobId,
      (s) => onProgress?.(s),
      (s) => (s.status === 'COMPLETED' ? resolve(s) : reject(new Error(s.failureReason ?? 'Upload failed'))),
      reject,
    );
  });
}
