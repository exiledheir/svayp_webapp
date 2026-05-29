import { api } from '@/lib/api';
import type {
  WardrobeCategory,
  WardrobeSubcategory,
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
  CalendarResponse,
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
// Backend: { tier: "FREE"|"TRIAL"|"PREMIUM", limits: { wardrobeItems, canvases, tryOnPerMonth, regenPerMonth }, usage: { wardrobeItems, tryOnThisMonth, regenThisMonth } }
// Frontend: { plan: "free"|"pro"|"premium", limits: { itemsPerCategory, outfitCanvases, tryItOns, regenerations }, usage: { regenerationsUsed, tryItOnsUsed, itemCountByCategory } }
function mapPlanResponse(raw: Record<string, unknown>): UserPlanResponse {
  const tierMap: Record<string, PlanTier> = { FREE: 'free', TRIAL: 'pro', PREMIUM: 'premium' };
  const tier = ((raw.tier ?? raw.plan ?? 'FREE') as string).toUpperCase();
  const limits = (raw.limits ?? {}) as Record<string, unknown>;
  const usage = (raw.usage ?? {}) as Record<string, unknown>;
  return {
    userId: (raw.userId ?? '') as string,
    plan: tierMap[tier] ?? 'free',
    limits: {
      itemsPerCategory: (limits.wardrobeItems ?? limits.itemsPerCategory ?? 20) as number,
      outfitCanvases:   (limits.canvases ?? limits.outfitCanvases ?? 1) as number,
      tryItOns:         (limits.tryOnPerMonth ?? limits.tryItOns ?? 2) as number,
      regenerations:    (limits.regenPerMonth ?? limits.regenerations ?? 5) as number,
      calendarDays:     (limits.calendarDays ?? 2) as number,
    },
    usage: {
      regenerationsUsed:    (usage.regenThisMonth ?? usage.regenerationsUsed ?? 0) as number,
      tryItOnsUsed:         (usage.tryOnThisMonth ?? usage.tryItOnsUsed ?? 0) as number,
      itemCountByCategory:  (usage.itemCountByCategory ?? {}) as Record<string, number>,
    },
    billingPeriodStart: (raw.billingPeriodStart ?? '') as string,
    billingPeriodEnd:   (raw.billingPeriodEnd ?? '') as string,
  };
}

export async function getUserPlan(): Promise<UserPlanResponse> {
  const res = await api.get('/me/plan');
  const raw = unwrapData<Record<string, unknown>>(res);
  return mapPlanResponse(raw);
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

export async function initiateUpload(
  contentType: string,
  idempotencyKey: string,
  category?: WardrobeCategory,
  subcategory?: WardrobeSubcategory,
  fileSizeBytes?: number,
): Promise<WardrobeUploadInitResponse> {
  const body: Record<string, unknown> = {
    contentType,
    idempotencyKey,
  };
  if (category) body.category = category;
  if (subcategory) body.subcategory = subcategory;
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
  // Proxy through Next.js API to avoid Azure Blob CORS preflight rejection
  await api.put(
    `/api/blob-upload?putUrl=${encodeURIComponent(putUrl)}&contentType=${encodeURIComponent(contentType)}`,
    file,
    { headers: { 'Content-Type': contentType } },
  );
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
): Promise<WardrobeUploadStatus> {
  const startTime = Date.now();

  while (true) {
    const status = await getUploadStatus(jobId);
    onProgress?.(status);

    if (TERMINAL_STATUSES.has(status.status)) {
      return status;
    }

    if (Date.now() - startTime > POLL_TIMEOUT_MS) {
      throw new Error('Upload processing timed out after 3 minutes');
    }

    const interval = getPollingInterval(status.status);
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
}

// ── Wardrobe Items ────────────────────────────────────────────────────────────

function mapWardrobeItem(raw: Record<string, unknown>): WardrobeItemResponse {
  return {
    id: (raw.id ?? '') as string,
    category: (raw.category ?? 'OTHER') as WardrobeCategory,
    subcategory: (raw.subcategory ?? 'ACCESSORIES') as WardrobeSubcategory,
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
  },
): Promise<WardrobeItemResponse> {
  const body: Record<string, unknown> = {};
  if (updates.userLabel !== undefined) body.userLabel = updates.userLabel;
  if (updates.userNotes !== undefined) body.userNotes = updates.userNotes;
  if (updates.isFavorite !== undefined) body.isFavorite = updates.isFavorite;
  if (updates.isClean !== undefined) body.isClean = updates.isClean;
  if (updates.category !== undefined) body.category = updates.category;
  if (updates.subcategory !== undefined) body.subcategory = updates.subcategory;
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
  category?: WardrobeCategory,
  subcategory?: WardrobeSubcategory,
  onProgress?: (status: WardrobeUploadStatus) => void,
): Promise<WardrobeUploadStatus> {
  const idempotencyKey = crypto.randomUUID();
  const contentType = file.type || 'image/jpeg';

  // 1. Initiate upload
  const { uploadJobId, putUrl } = await initiateUpload(contentType, idempotencyKey, category, subcategory, file.size);

  // 2. Upload file to Azure blob
  await uploadFileToBlob(putUrl, file, contentType);

  // 3. Confirm upload → start AI pipeline
  await confirmUpload(uploadJobId);

  // 4. Poll until done
  return pollUploadUntilDone(uploadJobId, onProgress);
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

export async function createTryOnJob(data: {
  canvasId?: string;
  wardrobeItemIds: string[];
  modelImageUrl?: string;
}): Promise<TryOnJobResponse> {
  const res = await api.post('/outfits/try-on', data);
  return unwrapData<TryOnJobResponse>(res);
}

export async function getTryOnJob(id: string): Promise<TryOnJobResponse> {
  const res = await api.get(`/outfits/try-on/${id}`);
  return unwrapData<TryOnJobResponse>(res);
}

export async function pollTryOnUntilDone(
  jobId: string,
  onProgress?: (job: TryOnJobResponse) => void,
): Promise<TryOnJobResponse> {
  const startTime = Date.now();
  const TIMEOUT_MS = 2 * 60 * 1000;

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
