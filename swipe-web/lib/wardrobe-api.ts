import { api } from '@/lib/api';
import { watchWithSse } from '@/lib/sse-client';
import type {
  WardrobeCategory,
  WardrobeSubcategory,
  WardrobeItemType,
  WardrobeLength,
  WardrobeFitType,
  WardrobeUploadInitResponse,
  WardrobeUploadStatus,
  WardrobeItemResponse,
  WardrobeStats,
  PageResponse,
  UserPlanResponse,
  OutfitCanvasResponse,
  OutfitCanvasItemRequest,
  OutfitSuggestionResponse,
  TryOnJobResponse,
  TryOnStatus,
  CalendarResponse,
  SseHandle,
} from '@/types';
import type { PlanTier } from '@/types';

// wardrobe-api uses the shared axios instance from lib/api.ts which has
// automatic token refresh on 401. Do not create a separate instance here.

function unwrapData<T>(res: { data: unknown }): T {
  const d = res.data as Record<string, unknown>;
  return (d.data ?? d) as T;
}

// ── Plan ──────────────────────────────────────────────────────────────────────

// Map the backend plan response (field names differ from frontend types).
// Backend: { tier: "FREE"|"TRIAL"|"PRO"|"PREMIUM", limits: { wardrobeItems, canvases, tryOnPerMonth, regenPerMonth }, usage: { wardrobeItems, tryOnThisMonth, regenThisMonth } }
// Frontend: { plan: "free"|"pro"|"premium", limits: { wardrobeItems, outfitCanvases, tryItOns, regenerations }, usage: { regenerationsUsed, tryItOnsUsed, itemCountByCategory } }
function mapPlanResponse(raw: Record<string, unknown>): UserPlanResponse {
  const tierMap: Record<string, PlanTier> = { FREE: 'free', TRIAL: 'pro', PRO: 'pro', PREMIUM: 'premium' };
  const tier = ((raw.tier ?? raw.plan ?? 'FREE') as string).toUpperCase();
  const limits = (raw.limits ?? {}) as Record<string, unknown>;
  const usage = (raw.usage ?? {}) as Record<string, unknown>;
  return {
    userId: (raw.userId ?? '') as string,
    plan: tierMap[tier] ?? 'free',
    limits: {
      wardrobeItems:    (limits.wardrobeItems ?? limits.itemsPerCategory ?? 5) as number,
      outfitCanvases:   (limits.canvases ?? limits.outfitCanvases ?? 1) as number,
      tryItOns:         (limits.tryOnPerMonth ?? limits.tryItOns ?? 2) as number,
      regenerations:    (limits.regenPerMonth ?? limits.regenerations ?? 5) as number,
      calendarDays:     (limits.calendarDays ?? 2) as number,
    },
    usage: {
      wardrobeItemsUsed:    (usage.wardrobeItemsUsed ?? usage.itemsUsed ?? 0) as number,
      regenerationsUsed:    (usage.regenThisMonth ?? usage.regenerationsUsed ?? usage.regenUsed ?? 0) as number,
      tryItOnsUsed:         (usage.tryOnThisMonth ?? usage.tryOnsThisMonth ?? usage.tryItOnsThisMonth ?? usage.tryItOnsUsed ?? usage.tryOnsUsed ?? 0) as number,
      itemCountByCategory:  (usage.itemCountByCategory ?? {}) as Record<string, number>,
    },
    billingPeriodStart: (raw.billingPeriodStart ?? '') as string,
    billingPeriodEnd:   (raw.billingPeriodEnd ?? '') as string,
  };
}

export async function getUserPlan(): Promise<UserPlanResponse> {
  const res = await api.get('/me/plan', { headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' } });
  const raw = unwrapData<Record<string, unknown>>(res);
  return mapPlanResponse(raw);
}

// FeatureFlagsProvider (_app), closet and the market contact step all request
// the same rarely-changing profile — coalesce concurrent calls and reuse the
// result briefly instead of firing several GET /me per screen. A full page
// reload (login redirect, token hand-off from Flutter) resets this module
// state, so a user switch can't serve a stale profile.
type UserProfileLite = { name?: string; phoneNumber?: string };
const PROFILE_CACHE_TTL_MS = 60_000;
let profileCache: { value: UserProfileLite; at: number } | null = null;
let profileInFlight: Promise<UserProfileLite> | null = null;

/** Drop the cached /me result (call after profile create/update). */
export function invalidateUserProfileCache(): void {
  profileCache = null;
  profileInFlight = null;
}

export async function getUserProfile(): Promise<UserProfileLite> {
  if (profileCache && Date.now() - profileCache.at < PROFILE_CACHE_TTL_MS) {
    return profileCache.value;
  }
  if (profileInFlight) return profileInFlight;
  profileInFlight = (async () => {
    try {
      const res = await api.get('/me');
      const raw = unwrapData<Record<string, unknown>>(res);
      const name = (
        raw.name ?? raw.firstName ?? raw.first_name ??
        raw.username ?? raw.fullName ?? raw.full_name ?? raw.displayName ?? raw.display_name
      ) as string | undefined;
      const phoneNumber = (
        raw.phoneNumber ?? raw.phone_number ?? raw.phone
      ) as string | undefined;
      const value: UserProfileLite = { name: name || undefined, phoneNumber: phoneNumber || undefined };
      profileCache = { value, at: Date.now() };
      return value;
    } finally {
      profileInFlight = null;
    }
  })();
  return profileInFlight;
}

// ── Upload Flow ───────────────────────────────────────────────────────────────

function mapUploadInitResponse(raw: Record<string, unknown>): WardrobeUploadInitResponse {
  return {
    uploadJobId: (raw.uploadJobId ?? raw.upload_job_id ?? '') as string,
    blobKey: (raw.blobKey ?? raw.blob_key ?? '') as string,
    putUrl: (raw.putUrl ?? raw.put_url ?? '') as string,
    uploadUrlExpiresAt: (raw.uploadUrlExpiresAt ?? raw.upload_url_expires_at ?? '') as string,
    httpMethod: (raw.httpMethod ?? raw.http_method ?? 'PUT') as string,
  };
}

function mapUploadStatus(raw: Record<string, unknown>): WardrobeUploadStatus {
  return {
    uploadJobId: (raw.uploadJobId ?? raw.upload_job_id ?? '') as string,
    wardrobeItemId: (raw.wardrobeItemId ?? raw.wardrobe_item_id ?? null) as string | null,
    status: (raw.status ?? 'UPLOADED') as WardrobeUploadStatus['status'],
    progressPercent: (raw.progressPercent ?? raw.progress_percent ?? 0) as number,
    currentStep: (raw.currentStep ?? raw.current_step ?? '') as string,
    failureReason: (raw.failureReason ?? raw.failure_reason ?? null) as string | null,
    updatedAt: (raw.updatedAt ?? raw.updated_at ?? '') as string,
  };
}

// Optional taxonomy fields shared by the upload-init and item-update calls.
export interface WardrobeItemOptions {
  category?: WardrobeCategory;
  subcategory?: WardrobeSubcategory;
  itemType?: WardrobeItemType | null;
  length?: WardrobeLength | null;
  fitType?: WardrobeFitType | null;
}

export async function initiateUpload(
  contentType: string,
  idempotencyKey: string,
  options: WardrobeItemOptions = {},
  fileSizeBytes?: number,
): Promise<WardrobeUploadInitResponse> {
  const body: Record<string, unknown> = {
    contentType,
    idempotencyKey,
  };
  if (options.category) body.category = options.category;
  if (options.subcategory) body.subcategory = options.subcategory;
  if (options.itemType) body.itemType = options.itemType;
  if (options.length) body.length = options.length;
  if (options.fitType) body.fitType = options.fitType;
  if (fileSizeBytes && fileSizeBytes > 0) body.fileSizeBytes = fileSizeBytes;
  const res = await api.post('/wardrobe/uploads', body);
  const raw = unwrapData<Record<string, unknown>>(res);
  const mapped = mapUploadInitResponse(raw);
  if (!mapped.putUrl) {
    throw new Error('Backend did not return a valid putUrl');
  }
  return mapped;
}

export async function uploadFileToBlob(
  putUrl: string,
  file: File | Blob,
  contentType: string,
): Promise<void> {
  // Proxy through Next.js API to avoid Azure Blob CORS preflight rejection.
  // Use a plain fetch (not the `api` instance) — /api/blob-upload is a
  // Next.js local route, not a backend endpoint, so it must NOT go through
  // the /proxy base URL.
  const url = `/api/blob-upload?putUrl=${encodeURIComponent(putUrl)}&contentType=${encodeURIComponent(contentType)}`;
  const res = await fetch(url, {
    method: 'PUT',
    body: file,
    headers: { 'Content-Type': contentType },
  });
  if (!res.ok) {
    throw new Error(`Blob upload failed: ${res.status} ${res.statusText}`);
  }
}

export async function confirmUpload(jobId: string): Promise<WardrobeUploadStatus> {
  const res = await api.post(`/wardrobe/uploads/${jobId}/confirm`);
  return mapUploadStatus(unwrapData<Record<string, unknown>>(res));
}

export async function getUploadStatus(jobId: string): Promise<WardrobeUploadStatus> {
  const res = await api.get(`/wardrobe/uploads/${jobId}`);
  return mapUploadStatus(unwrapData<Record<string, unknown>>(res));
}

export async function listUploads(page = 0, size = 20): Promise<PageResponse<WardrobeUploadStatus>> {
  const res = await api.get('/wardrobe/uploads', { params: { page, size } });
  return unwrapData<PageResponse<WardrobeUploadStatus>>(res);
}

// ── Polling Helper ────────────────────────────────────────────────────────────

const TERMINAL_STATUSES = new Set(['COMPLETED', 'FAILED']);
const POLL_TIMEOUT_MS = 3 * 60 * 1000; // 3 minutes

function getPollingInterval(status: string): number {
  if (status === 'UPLOADED' || status === 'NSFW_SCAN') return 2000;
  if (status === 'UPSCALE' || status === 'BG_REMOVE' || status === 'EMBED') return 3000;
  return 5000;
}

export async function pollUploadUntilDone(
  jobId: string,
  onProgress?: (status: WardrobeUploadStatus) => void,
  timeoutMs = POLL_TIMEOUT_MS,
): Promise<WardrobeUploadStatus> {
  const startTime = Date.now();
  let consecutiveErrors = 0;
  const MAX_CONSECUTIVE_ERRORS = 5;

  while (true) {
    try {
      const status = await getUploadStatus(jobId);
      consecutiveErrors = 0;
      onProgress?.(status);

      if (TERMINAL_STATUSES.has(status.status)) {
        return status;
      }

      if (Date.now() - startTime > timeoutMs) {
        throw new Error('Upload processing timed out');
      }

      const interval = getPollingInterval(status.status);
      await new Promise((resolve) => setTimeout(resolve, interval));
    } catch (err) {
      if ((err as Error).message === 'Upload processing timed out') throw err;
      consecutiveErrors++;
      if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) throw err;
      // Transient network error — wait and retry
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
}

export function watchUploadUntilDone(
  jobId: string,
  onProgress: (status: WardrobeUploadStatus) => void,
  onDone: (status: WardrobeUploadStatus) => void,
  onError: (err: Error) => void,
): SseHandle {
  // Fallback polling gets a longer timeout than SSE — by the time SSE
  // has timed out (3 min), the ML pipeline may still be running.
  const FALLBACK_POLL_TIMEOUT = 15 * 60 * 1000;
  // SSE events arrive as raw JSON and are NOT passed through mapUploadStatus
  // by watchWithSse. The backend may send snake_case keys (current_step,
  // progress_percent) so we must normalise every SSE event before forwarding.
  const mapRaw = (raw: WardrobeUploadStatus) =>
    mapUploadStatus(raw as unknown as Record<string, unknown>);
  return watchWithSse<WardrobeUploadStatus, WardrobeUploadStatus>({
    sseUrl: `/wardrobe/uploads/${jobId}/stream`,
    fallbackPoll: () => pollUploadUntilDone(jobId, onProgress, FALLBACK_POLL_TIMEOUT),
    onProgress: (raw) => onProgress(mapRaw(raw)),
    onDone: (raw) => onDone(mapRaw(raw)),
    onError,
    isTerminal: (raw) => TERMINAL_STATUSES.has((raw as unknown as Record<string, unknown>).status as string ?? raw.status),
    toFinal: (raw) => mapRaw(raw),
    timeoutMs: POLL_TIMEOUT_MS,
  });
}

export function watchTryOnUntilDone(
  jobId: string,
  onProgress: (job: TryOnJobResponse) => void,
  onDone: (job: TryOnJobResponse) => void,
  onError: (err: Error) => void,
): SseHandle {
  return watchWithSse<TryOnJobResponse, TryOnJobResponse>({
    sseUrl: `/outfits/try-on/${jobId}/stream`,
    fallbackPoll: () => pollTryOnUntilDone(jobId, onProgress),
    onProgress,
    onDone,
    onError,
    isTerminal: (j) => j.status === 'COMPLETED' || j.status === 'FAILED',
    toFinal: (j) => j,
    timeoutMs: 5 * 60 * 1000,
  });
}

// ── Wardrobe Items ────────────────────────────────────────────────────────────

function mapWardrobeItem(raw: Record<string, unknown>): WardrobeItemResponse {
  return {
    id: (raw.id ?? '') as string,
    category: (raw.category ?? 'OTHER') as WardrobeCategory,
    subcategory: (raw.subcategory ?? 'ACCESSORIES') as WardrobeSubcategory,
    itemType: (raw.itemType ?? raw.item_type ?? null) as WardrobeItemType | null,
    length: (raw.length ?? null) as WardrobeLength | null,
    fitType: (raw.fitType ?? raw.fit_type ?? null) as WardrobeFitType | null,
    layer: (raw.layer ?? null) as WardrobeItemResponse['layer'],
    status: (raw.status ?? 'READY') as string,
    imageUrl: (raw.imageUrl ?? raw.image_url ?? '') as string,
    thumbnailUrl: (raw.thumbnailUrl ?? raw.thumbnail_url ?? '') as string,
    colorPrimary: (raw.colorPrimary ?? raw.color_primary ?? '') as string,
    pattern: (raw.pattern ?? '') as string,
    material: (raw.material ?? '') as string,
    season: (raw.season ?? 'ALL') as string,
    styleTags: (raw.styleTags ?? raw.style_tags ?? []) as string[],
    formalityScore: (raw.formalityScore ?? raw.formality_score ?? 3) as number,
    warmthScore: (raw.warmthScore ?? raw.warmth_score ?? 2) as number,
    userLabel: (raw.userLabel ?? raw.user_label ?? null) as string | null,
    userNotes: (raw.userNotes ?? raw.user_notes ?? null) as string | null,
    isFavorite: (raw.isFavorite ?? raw.is_favorite ?? false) as boolean,
    isClean: (raw.isClean ?? raw.is_clean ?? true) as boolean,
    timesWorn: (raw.timesWorn ?? raw.times_worn ?? 0) as number,
    lastWornAt: (raw.lastWornAt ?? raw.last_worn_at ?? null) as string | null,
    createdAt: (raw.createdAt ?? raw.created_at ?? '') as string,
  };
}

export async function getWardrobeStats(): Promise<WardrobeStats> {
  const res = await api.get('/wardrobe/items/stats');
  return unwrapData<WardrobeStats>(res);
}

export async function getWardrobeItems(
  params: { category?: WardrobeCategory; page?: number; size?: number } = {},
): Promise<PageResponse<WardrobeItemResponse>> {
  const res = await api.get('/wardrobe/items', {
    params: { page: params.page ?? 0, size: params.size ?? 30, ...(params.category ? { category: params.category } : {}) },
  });
  const raw = unwrapData<Record<string, unknown>>(res);
  const content = (raw.content ?? []) as Record<string, unknown>[];
  return {
    content: content.map(mapWardrobeItem),
    totalElements: (raw.totalElements ?? raw.total_elements ?? 0) as number,
    totalPages: (raw.totalPages ?? raw.total_pages ?? 0) as number,
    number: (raw.number ?? 0) as number,
    size: (raw.size ?? 30) as number,
  };
}

export async function getWardrobeItem(id: string): Promise<WardrobeItemResponse> {
  const res = await api.get(`/wardrobe/items/${id}`);
  return mapWardrobeItem(unwrapData<Record<string, unknown>>(res));
}

export async function updateWardrobeItem(
  id: string,
  updates: {
    userLabel?: string | null;
    userNotes?: string | null;
    isFavorite?: boolean;
    isClean?: boolean;
    category?: WardrobeCategory;
    subcategory?: WardrobeSubcategory;
    itemType?: WardrobeItemType | null;
    length?: WardrobeLength | null;
    fitType?: WardrobeFitType | null;
  },
): Promise<WardrobeItemResponse> {
  const body: Record<string, unknown> = {};
  if (updates.userLabel !== undefined) body.userLabel = updates.userLabel;
  if (updates.userNotes !== undefined) body.userNotes = updates.userNotes;
  if (updates.isFavorite !== undefined) body.isFavorite = updates.isFavorite;
  if (updates.isClean !== undefined) body.isClean = updates.isClean;
  if (updates.category !== undefined) body.category = updates.category;
  if (updates.subcategory !== undefined) body.subcategory = updates.subcategory;
  if (updates.itemType !== undefined) body.itemType = updates.itemType;
  if (updates.length !== undefined) body.length = updates.length;
  if (updates.fitType !== undefined) body.fitType = updates.fitType;
  const res = await api.patch(`/wardrobe/items/${id}`, body);
  return mapWardrobeItem(unwrapData<Record<string, unknown>>(res));
}

export async function markItemWorn(id: string): Promise<WardrobeItemResponse> {
  const res = await api.post(`/wardrobe/items/${id}/wear`);
  return mapWardrobeItem(unwrapData<Record<string, unknown>>(res));
}

export async function deleteWardrobeItem(id: string): Promise<void> {
  await api.delete(`/wardrobe/items/${id}`);
}

// ── Full Upload Flow (convenience) ───────────────────────────────────────────

export async function uploadWardrobeItem(
  file: File,
  options: WardrobeItemOptions = {},
  onProgress?: (status: WardrobeUploadStatus) => void,
  onJobId?: (jobId: string) => void,
): Promise<WardrobeUploadStatus> {
  const idempotencyKey = crypto.randomUUID();
  const contentType = file.type || 'image/jpeg';

  // 1. Initiate upload
  const { uploadJobId, putUrl } = await initiateUpload(contentType, idempotencyKey, options, file.size);

  // Fire early so the caller can persist a preview before the slow blob upload
  onJobId?.(uploadJobId);

  // 2. Upload file to Azure blob
  await uploadFileToBlob(putUrl, file, contentType);

  // 3. Confirm upload → start AI pipeline
  const confirmStatus = await confirmUpload(uploadJobId);

  // Fire an immediate progress update with the post-confirmation status so the
  // UI card transitions away from "Uploading…" right away, without waiting for
  // the first SSE event (which may arrive with a delay).
  onProgress?.(confirmStatus);

  // 4. Watch via SSE — backend pushes every ML callback (NSFW_SCAN → UPSCALE →
  // BG_REMOVE → EMBED → ANALYZE → COMPLETED) so we get the same intermediate
  // steps as polling but with a single persistent connection instead of repeated
  // GET requests. Falls back to polling automatically if SSE fails.
  return new Promise<WardrobeUploadStatus>((resolve, reject) => {
    watchUploadUntilDone(
      uploadJobId,
      (s) => onProgress?.(s),
      (s) => resolve(s),
      (err) => reject(err),
    );
  });
}

// ── Outfit Canvases ───────────────────────────────────────────────────────────

export async function getOutfitCanvases(
  params: { page?: number; size?: number; sort?: string } = {},
): Promise<PageResponse<OutfitCanvasResponse>> {
  const res = await api.get('/outfits/canvases', {
    params: { page: params.page ?? 0, size: params.size ?? 20, sort: params.sort ?? 'updatedAt,desc' },
  });
  return unwrapData<PageResponse<OutfitCanvasResponse>>(res);
}

export async function getOutfitCanvas(id: string): Promise<OutfitCanvasResponse> {
  const res = await api.get(`/outfits/canvases/${id}`);
  return unwrapData<OutfitCanvasResponse>(res);
}

export async function createOutfitCanvas(data: {
  name?: string;
  occasion?: string;
  thumbnailUrl?: string;
  items: OutfitCanvasItemRequest[];
}): Promise<OutfitCanvasResponse> {
  const payload = {
    name: data.name || 'My Outfit',
    items: data.items,
    ...(data.occasion ? { occasion: data.occasion } : {}),
    ...(data.thumbnailUrl ? { thumbnailUrl: data.thumbnailUrl } : {}),
  };
  try {
    const res = await api.post('/outfits/canvases', payload);
    return unwrapData<OutfitCanvasResponse>(res);
  } catch (err: unknown) {
    const axErr = err as { response?: { data?: unknown } };
    console.error('createOutfitCanvas failed — payload:', JSON.stringify(payload, null, 2), 'response:', axErr?.response?.data);
    throw err;
  }
}

export async function updateOutfitCanvas(
  id: string,
  data: {
    name?: string;
    occasion?: string;
    thumbnailUrl?: string;
    items: OutfitCanvasItemRequest[];
  },
): Promise<OutfitCanvasResponse> {
  const res = await api.put(`/outfits/canvases/${id}`, data);
  return unwrapData<OutfitCanvasResponse>(res);
}

export async function deleteOutfitCanvas(id: string): Promise<void> {
  await api.delete(`/outfits/canvases/${id}`);
}

// ── Outfit Suggestions ────────────────────────────────────────────────────────

export async function getOutfitSuggestions(
  params: { page?: number; size?: number } = {},
): Promise<PageResponse<OutfitSuggestionResponse>> {
  const res = await api.get('/outfits/suggestions', {
    params: { page: params.page ?? 0, size: params.size ?? 20 },
  });
  return unwrapData<PageResponse<OutfitSuggestionResponse>>(res);
}

export async function getOutfitSuggestionByDate(date: string): Promise<OutfitSuggestionResponse[]> {
  const res = await api.get('/outfits/suggestions/by-date', { params: { date } });
  return unwrapData<OutfitSuggestionResponse[]>(res);
}

export async function getOutfitSuggestion(id: string): Promise<OutfitSuggestionResponse> {
  const res = await api.get(`/outfits/suggestions/${id}`);
  return unwrapData<OutfitSuggestionResponse>(res);
}

export async function generateOutfitSuggestions(count = 3): Promise<{ queued: boolean; count: number }> {
  const res = await api.post('/outfits/generate', null, { params: { count } });
  return unwrapData<{ queued: boolean; count: number }>(res);
}

export interface AiCanvasSuggestResponse {
  itemIds: string[];
  occasion: string;
  tipRu: string;
}

export async function fetchAiCanvasSuggest(excludeIds: string[] = []): Promise<AiCanvasSuggestResponse> {
  const res = await api.post('/outfits/canvases/ai-suggest', { excludeIds });
  return unwrapData<AiCanvasSuggestResponse>(res);
}

export async function rateOutfitSuggestion(id: string, rating: number): Promise<void> {
  await api.post(`/outfits/suggestions/${id}/rate`, null, { params: { rating } });
}

export async function wearOutfitSuggestion(id: string): Promise<void> {
  await api.post(`/outfits/suggestions/${id}/wear`);
}

export async function dismissOutfitSuggestion(id: string): Promise<void> {
  await api.delete(`/outfits/suggestions/${id}`);
}

// ── Virtual Try-On ────────────────────────────────────────────────────────────

async function blobToBase64(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

/**
 * Upload the user's OWN photo for "try on myself" mode.
 * Gets a presigned PUT URL from the backend, uploads the file (proxied through the
 * Next.js blob-upload route to dodge Azure CORS), and returns the blob key to pass
 * as `personImageKey` when creating the try-on job.
 */
export async function uploadModelPhoto(file: File): Promise<string> {
  const contentType = file.type || 'image/jpeg';
  const res = await api.post('/outfits/try-on/model-image-url', null, { params: { contentType } });
  const raw = unwrapData<Record<string, unknown>>(res);
  const putUrl = (raw.putUrl ?? raw.put_url ?? '') as string;
  const blobKey = (raw.blobKey ?? raw.blob_key ?? '') as string;
  if (!putUrl || !blobKey) throw new Error('Backend did not return a valid model-image upload URL');
  await uploadFileToBlob(putUrl, file, contentType);
  return blobKey;
}

export async function createTryOnJob(data: {
  canvasId?: string;
  wardrobeItemIds: string[];
  modelImageUrl?: string;
  /** Blob key of the user's own uploaded photo — switches ML into "dress this person" mode. */
  personImageKey?: string;
  snapshotBlob?: Blob;
}): Promise<TryOnJobResponse> {
  const snapshotBase64 = data.snapshotBlob ? await blobToBase64(data.snapshotBlob) : undefined;
  const res = await api.post('/outfits/try-on', {
    canvasId: data.canvasId,
    wardrobeItemIds: data.wardrobeItemIds,
    modelImageUrl: data.modelImageUrl,
    personImageKey: data.personImageKey,
    snapshotBase64,
  });
  return unwrapData<TryOnJobResponse>(res);
}

export async function getTryOnJob(id: string): Promise<TryOnJobResponse> {
  const res = await api.get(`/outfits/try-on/${id}`);
  return unwrapData<TryOnJobResponse>(res);
}

export async function deleteTryOnJob(id: string): Promise<void> {
  await api.delete(`/outfits/try-on/${id}`);
}

/**
 * Try-on history for the current user (newest first), paginated.
 * Pass status (e.g. 'COMPLETED') to only get finished jobs that have a resultImageUrl.
 */
export async function getTryOnJobHistory(
  params: { page?: number; size?: number; status?: TryOnStatus } = {},
): Promise<PageResponse<TryOnJobResponse>> {
  const res = await api.get('/outfits/try-on', {
    params: {
      page: params.page ?? 0,
      size: params.size ?? 20,
      ...(params.status ? { status: params.status } : {}),
    },
  });
  return unwrapData<PageResponse<TryOnJobResponse>>(res);
}

export async function pollTryOnUntilDone(
  jobId: string,
  onProgress?: (job: TryOnJobResponse) => void,
): Promise<TryOnJobResponse> {
  const startTime = Date.now();
  const TIMEOUT_MS = 5 * 60 * 1000;

  while (true) {
    const job = await getTryOnJob(jobId);
    onProgress?.(job);

    if (job.status === 'COMPLETED' || job.status === 'FAILED') {
      return job;
    }

    if (Date.now() - startTime > TIMEOUT_MS) {
      throw new Error('Try-on processing timed out after 2 minutes');
    }

    await new Promise((resolve) => setTimeout(resolve, 3000));
  }
}

// ── Outfit Calendar ───────────────────────────────────────────────────────────

export async function getOutfitCalendar(from: string, to: string): Promise<CalendarResponse> {
  const res = await api.get('/outfits/calendar', { params: { from, to } });
  return unwrapData<CalendarResponse>(res);
}
