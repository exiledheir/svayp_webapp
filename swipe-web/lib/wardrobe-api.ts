import axios from 'axios';
import { getToken, clearTokens } from '@/lib/auth';
import type {
  WardrobeCategory,
  WardrobeUploadInitResponse,
  WardrobeUploadStatus,
  WardrobeItemResponse,
  WardrobeStats,
  PageResponse,
} from '@/types';

// All requests go to /proxy/* which Next.js rewrites to https://app.svaypai.com/api/v1/*
const api = axios.create({ baseURL: '/proxy' });

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      clearTokens();
      if (typeof window !== 'undefined') {
        window.location.href = '/auth/phone';
      }
    }
    return Promise.reject(error);
  },
);

function unwrapData<T>(res: { data: unknown }): T {
  const d = res.data as Record<string, unknown>;
  return (d.data ?? d) as T;
}

function mapUploadInitResponse(raw: Record<string, unknown>): WardrobeUploadInitResponse {
  return {
    uploadJobId: (raw.uploadJobId ?? raw.upload_job_id ?? '') as string,
    blobKey: (raw.blobKey ?? raw.blob_key ?? '') as string,
    uploadUrl: (raw.uploadUrl ?? raw.upload_url ?? '') as string,
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

// ── Upload Flow ───────────────────────────────────────────────────────────────

export async function initiateUpload(
  contentType: string,
  idempotencyKey: string,
  category?: WardrobeCategory,
): Promise<WardrobeUploadInitResponse> {
  const body: Record<string, unknown> = {
    contentType,
    content_type: contentType,
    idempotencyKey,
    idempotency_key: idempotencyKey,
  };
  if (category) body.category = category;
  const res = await api.post('/wardrobe/uploads', body);
  const raw = unwrapData<Record<string, unknown>>(res);
  const mapped = mapUploadInitResponse(raw);
  if (!mapped.uploadUrl) {
    throw new Error('Backend did not return a valid uploadUrl');
  }
  return mapped;
}

export async function uploadFileToBlob(
  uploadUrl: string,
  file: File | Blob,
  contentType: string,
): Promise<void> {
  await axios.put(uploadUrl, file, {
    headers: {
      'Content-Type': contentType,
      'x-ms-blob-type': 'BlockBlob',
    },
  });
}

export async function confirmUpload(uploadJobId: string): Promise<WardrobeUploadStatus> {
  const res = await api.post(`/wardrobe/uploads/${uploadJobId}/confirm`);
  return mapUploadStatus(unwrapData<Record<string, unknown>>(res));
}

export async function getUploadStatus(uploadJobId: string): Promise<WardrobeUploadStatus> {
  const res = await api.get(`/wardrobe/uploads/${uploadJobId}`);
  return mapUploadStatus(unwrapData<Record<string, unknown>>(res));
}

export async function listUploads(page = 0, size = 20): Promise<PageResponse<WardrobeUploadStatus>> {
  const res = await api.get('/wardrobe/uploads', { params: { page, size } });
  return unwrapData<PageResponse<WardrobeUploadStatus>>(res);
}

// ── Polling Helper ────────────────────────────────────────────────────────────

const TERMINAL_STATUSES = new Set(['READY', 'FAILED', 'REJECTED_NSFW']);
const POLL_TIMEOUT_MS = 3 * 60 * 1000; // 3 minutes

function getPollingInterval(status: string): number {
  if (status === 'UPLOADED' || status === 'NSFW_CHECKED') return 2000;
  if (status === 'BG_REMOVED' || status === 'UPSCALED' || status === 'EMBEDDED') return 3000;
  return 5000;
}

export async function pollUploadUntilDone(
  uploadJobId: string,
  onProgress?: (status: WardrobeUploadStatus) => void,
): Promise<WardrobeUploadStatus> {
  const startTime = Date.now();

  while (true) {
    const status = await getUploadStatus(uploadJobId);
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
    layer: (raw.layer ?? null) as WardrobeItemResponse['layer'],
    status: (raw.status ?? 'READY') as string,
    imageUrl: (raw.imageUrl ?? raw.image_url ?? '') as string,
    thumbnailUrl: (raw.thumbnailUrl ?? raw.thumbnail_url ?? '') as string,
    colorPrimary: (raw.colorPrimary ?? raw.color_primary ?? '') as string,
    pattern: (raw.pattern ?? '') as string,
    material: (raw.material ?? '') as string,
    season: (raw.season ?? 'ALL_SEASON') as string,
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
  },
): Promise<WardrobeItemResponse> {
  const body: Record<string, unknown> = {};
  if (updates.userLabel !== undefined) body.user_label = updates.userLabel;
  if (updates.userNotes !== undefined) body.user_notes = updates.userNotes;
  if (updates.isFavorite !== undefined) body.is_favorite = updates.isFavorite;
  if (updates.isClean !== undefined) body.is_clean = updates.isClean;
  const res = await api.patch(`/wardrobe/items/${id}`, body);
  return mapWardrobeItem(unwrapData<Record<string, unknown>>(res));
}

export async function markItemWorn(id: string): Promise<WardrobeItemResponse> {
  const res = await api.post(`/wardrobe/items/${id}/wear`);
  return unwrapData<WardrobeItemResponse>(res);
}

export async function deleteWardrobeItem(id: string): Promise<void> {
  await api.delete(`/wardrobe/items/${id}`);
}

// ── Full Upload Flow (convenience) ───────────────────────────────────────────

export async function uploadWardrobeItem(
  file: File,
  category?: WardrobeCategory,
  onProgress?: (status: WardrobeUploadStatus) => void,
): Promise<WardrobeUploadStatus> {
  const idempotencyKey = crypto.randomUUID();
  const contentType = file.type || 'image/jpeg';

  // 1. Initiate upload
  const { uploadJobId, uploadUrl } = await initiateUpload(contentType, idempotencyKey, category);

  // 2. Upload file to Azure blob
  await uploadFileToBlob(uploadUrl, file, contentType);

  // 3. Confirm upload → start AI pipeline
  await confirmUpload(uploadJobId);

  // 4. Poll until done
  return pollUploadUntilDone(uploadJobId, onProgress);
}
