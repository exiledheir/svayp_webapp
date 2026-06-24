// ─── Marketplace ("Объявления") API client ───────────────────────────────────
// Live backend bridge for the C2C resale section. Additive: it replaces the
// localStorage layer (lib/market-storage.ts, lib/market-chat.ts) call-by-call,
// gated by isMarketApiEnabled(). All paths hit the Spring backend under /api/v1
// via the Next.js /proxy rewrite; the shared axios instance handles 401-refresh.
//
// Backend contract (see review-market handoff §A): every response wrapped { data },
// lists are Spring pages { content, totalElements, totalPages, number, size }.

import { api } from '@/lib/api';
import { watchWithSse } from '@/lib/sse-client';
import type {
  MarketListing,
  MarketListingStatus,
  MarketContactMethod,
} from '@/types/market';
import type { SseHandle } from '@/types';

// ── Envelope helpers ─────────────────────────────────────────────────────────
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

// ── Card projection (feed) ───────────────────────────────────────────────────
export interface ListingCard {
  id: string;
  coverImage: string | null;
  title: string;
  price: number;
  currency: string;
  dealType: string;
  isUrgent: boolean;
  region: string | null;
  postedAt: string;
  isFavorite: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
//  A4 · Feed / search / filter
// ─────────────────────────────────────────────────────────────────────────────
export interface FeedParams {
  category?: string[];
  q?: string;
  region?: string;
  district?: string;
  condition?: string;
  dealType?: string;
  priceMin?: number;
  priceMax?: number;
  currency?: string;
  brand?: string;
  color?: string;
  size?: string;
  season?: string;
  material?: string;
  country?: string;
  hijabFriendly?: boolean;
  isUrgent?: boolean;
  sellerId?: string;
  page?: number;
  size_?: number;
  sort?: string; // postedAt,desc | price,asc | price,desc
}

export async function getFeed(params: FeedParams = {}): Promise<Page<ListingCard>> {
  const { size_, ...rest } = params;
  const res = await api.get('/marketplace/listings', { params: { ...rest, size_ } });
  return asPage<ListingCard>(res);
}

// ─────────────────────────────────────────────────────────────────────────────
//  A1 · Listings CRUD + lifecycle
// ─────────────────────────────────────────────────────────────────────────────
export async function getListing(id: string): Promise<MarketListing> {
  return unwrap<MarketListing>(await api.get(`/marketplace/listings/${id}`));
}

export interface CreateListingPayload {
  title?: string;
  description?: string;
  category?: string;
  condition?: string;
  brand?: string;
  size?: string;
  color?: string;
  season?: string;
  length?: string;
  hijabFriendly?: boolean;
  fit?: string;
  material?: string;
  country?: string;
  customAttrs?: Record<string, unknown>;
  dealType?: string;
  price?: number;
  currency?: string;
  isUrgent?: boolean;
  location?: {
    region?: string; district?: string; address?: string; landmark?: string;
    latitude?: number; longitude?: number; courier?: boolean;
  };
  contactMethods?: MarketContactMethod[];
  sellerContact?: { name?: string; phone?: string; telegramUsername?: string };
  imageIds?: string[];
  status?: 'draft' | 'pending';
  idempotencyKey?: string;
}

export async function createListing(payload: CreateListingPayload): Promise<MarketListing> {
  return unwrap<MarketListing>(await api.post('/marketplace/listings', payload));
}

export async function updateListing(id: string, patch: Partial<CreateListingPayload>): Promise<MarketListing> {
  return unwrap<MarketListing>(await api.patch(`/marketplace/listings/${id}`, patch));
}

export async function deleteListing(id: string): Promise<void> {
  await api.delete(`/marketplace/listings/${id}`);
}

export async function publishListing(id: string): Promise<MarketListing> {
  return unwrap<MarketListing>(await api.post(`/marketplace/listings/${id}/publish`));
}
export async function markSold(id: string): Promise<MarketListing> {
  return unwrap<MarketListing>(await api.post(`/marketplace/listings/${id}/mark-sold`));
}
export async function archiveListing(id: string): Promise<MarketListing> {
  return unwrap<MarketListing>(await api.post(`/marketplace/listings/${id}/archive`));
}
export async function reactivateListing(id: string): Promise<MarketListing> {
  return unwrap<MarketListing>(await api.post(`/marketplace/listings/${id}/reactivate`));
}

// ── A2 · Drafts ──────────────────────────────────────────────────────────────
export async function getDrafts(): Promise<MarketListing[]> {
  return unwrap<MarketListing[]>(await api.get('/marketplace/listings/drafts'));
}

// ── A6 · My listings ─────────────────────────────────────────────────────────
export async function getMyListings(status?: MarketListingStatus, page = 0, size = 30): Promise<Page<MarketListing>> {
  return asPage<MarketListing>(await api.get('/marketplace/listings/mine', { params: { status, page, size } }));
}

// ── A5 · Favorites ───────────────────────────────────────────────────────────
export async function getFavorites(page = 0, size = 30): Promise<Page<MarketListing>> {
  return asPage<MarketListing>(await api.get('/marketplace/listings/favorites', { params: { page, size } }));
}
export async function addFavorite(id: string): Promise<void> {
  await api.post(`/marketplace/listings/${id}/favorite`);
}
export async function removeFavorite(id: string): Promise<void> {
  await api.delete(`/marketplace/listings/${id}/favorite`);
}

// ─────────────────────────────────────────────────────────────────────────────
//  A3 · Image upload (mirrors wardrobe-api)
// ─────────────────────────────────────────────────────────────────────────────
export interface MarketUploadInitResponse {
  uploadJobId: string;
  blobKey: string;
  putUrl: string;
  uploadUrlExpiresAt: string;
  httpMethod: string;
}
export interface MarketUploadStatus {
  uploadJobId: string;
  listingImageId: string | null;
  status: 'INITIATED' | 'UPLOADED' | 'NSFW_SCAN' | 'THUMBNAIL' | 'COMPLETED' | 'FAILED';
  imageUrl: string | null;
  thumbnailUrl: string | null;
  progressPercent: number;
  safetyFlag: 'OK' | 'REVIEW' | 'BLOCKED' | null;
  failureReason: string | null;
  updatedAt: string;
}

export async function initUpload(
  contentType: string, idempotencyKey: string, fileSizeBytes?: number, listingId?: string, position?: number,
): Promise<MarketUploadInitResponse> {
  return unwrap<MarketUploadInitResponse>(await api.post('/marketplace/uploads', {
    contentType, idempotencyKey, fileSizeBytes, listingId, position,
  }));
}

// Upload bytes to Azure via the existing Next.js /api/blob-upload proxy (same as wardrobe).
export async function uploadFileToBlob(putUrl: string, file: File | Blob, contentType: string): Promise<void> {
  const proxyUrl = `/api/blob-upload?putUrl=${encodeURIComponent(putUrl)}&contentType=${encodeURIComponent(contentType)}`;
  const res = await fetch(proxyUrl, {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    body: file,
  });
  if (!res.ok) throw new Error(`Blob upload failed: ${res.status}`);
}

export async function confirmUpload(jobId: string): Promise<MarketUploadStatus> {
  return unwrap<MarketUploadStatus>(await api.post(`/marketplace/uploads/${jobId}/confirm`));
}
export async function getUploadStatus(jobId: string): Promise<MarketUploadStatus> {
  return unwrap<MarketUploadStatus>(await api.get(`/marketplace/uploads/${jobId}`));
}
export async function deleteUpload(jobId: string): Promise<void> {
  await api.delete(`/marketplace/uploads/${jobId}`);
}

export function watchUpload(
  jobId: string,
  onProgress: (s: MarketUploadStatus) => void,
  onDone: (s: MarketUploadStatus) => void,
  onError: (e: Error) => void,
): SseHandle {
  return watchWithSse<MarketUploadStatus, MarketUploadStatus>({
    sseUrl: `/marketplace/uploads/${jobId}/stream`,
    fallbackPoll: () => getUploadStatus(jobId),
    onProgress,
    onDone,
    onError,
    isTerminal: (s) => s.status === 'COMPLETED' || s.status === 'FAILED',
    toFinal: (s) => s,
    timeoutMs: 3 * 60 * 1000,
  });
}

/** Orchestrates init → PUT → confirm → watch. Resolves on COMPLETED, rejects on FAILED. */
export async function uploadListingImage(
  file: File,
  onProgress?: (s: MarketUploadStatus) => void,
  position?: number,
  listingId?: string,
): Promise<MarketUploadStatus> {
  const idempotencyKey = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const init = await initUpload(file.type, idempotencyKey, file.size, listingId, position);
  await uploadFileToBlob(init.putUrl, file, file.type);
  const first = await confirmUpload(init.uploadJobId);
  onProgress?.(first);
  if (first.status === 'COMPLETED') return first;
  if (first.status === 'FAILED') throw new Error(first.failureReason ?? 'Upload failed');
  return await new Promise<MarketUploadStatus>((resolve, reject) => {
    watchUpload(init.uploadJobId, (s) => onProgress?.(s),
      (s) => (s.status === 'COMPLETED' ? resolve(s) : reject(new Error(s.failureReason ?? 'Upload failed'))),
      reject);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
//  A7 · Metadata
// ─────────────────────────────────────────────────────────────────────────────
export interface CategoryMeta {
  key: string;
  section: string;
  attributeFlags: Record<string, boolean>;
}
export async function getCategories(): Promise<CategoryMeta[]> {
  return unwrap<CategoryMeta[]>(await api.get('/marketplace/categories'));
}
export async function getBrands(q?: string): Promise<string[]> {
  return unwrap<string[]>(await api.get('/marketplace/brands', { params: { q } }));
}

// ─────────────────────────────────────────────────────────────────────────────
//  A8/§E · C2C chat (replaces lib/market-chat.ts)
// ─────────────────────────────────────────────────────────────────────────────
export interface MarketChatThread {
  id: string;
  listingId: string;
  listingTitle: string;
  listingImage: string | null;
  listingPrice: number | null;
  listingCurrency: string | null;
  chatType: string;
  counterpartyId: string | null;
  counterpartyName: string | null;
  counterpartyAvatar: string | null;
  lastMessagePreview: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
  createdAt: string;
}
export interface MarketChatMessage {
  id: string;
  chatId: string;
  senderId: string | null;
  content: string | null;
  messageType: string;
  listingId: string | null;
  isRead: boolean;
  createdAt: string;
}

export async function startListingChat(
  listingId: string, recipientUserId: string, initialMessage?: string,
): Promise<{ id: string }> {
  return unwrap<{ id: string }>(await api.post('/marketplace/chats', {
    listingId, recipientUserId, initialMessage,
  }));
}
export async function getChatThreads(page = 0, size = 30): Promise<Page<MarketChatThread>> {
  return asPage<MarketChatThread>(await api.get('/marketplace/chats', { params: { page, size } }));
}
export async function getChatThread(id: string): Promise<MarketChatThread> {
  return unwrap<MarketChatThread>(await api.get(`/marketplace/chats/${id}`));
}
export async function getChatMessages(id: string, page = 0, size = 50): Promise<Page<MarketChatMessage>> {
  return asPage<MarketChatMessage>(await api.get(`/marketplace/chats/${id}/messages`, { params: { page, size } }));
}
export async function sendChatMessage(id: string, content: string): Promise<MarketChatMessage> {
  return unwrap<MarketChatMessage>(await api.post(`/marketplace/chats/${id}/messages`, { content }));
}
export async function markChatRead(id: string): Promise<void> {
  await api.post(`/marketplace/chats/${id}/read`);
}
