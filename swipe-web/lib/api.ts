import axios from 'axios';
import { getToken, getRefreshToken, saveTokens, clearTokens } from '@/lib/auth';
import type { Product, ChatSummary, ChatMessage } from '@/types';

// All requests go to /proxy/* which Next.js rewrites to https://app.svaypai.com/api/v1/*
// This avoids browser CORS restrictions.
export const api = axios.create({ baseURL: '/proxy' });

// ── Token refresh state ───────────────────────────────────────────────────────

let isRefreshing = false;
let refreshQueue: Array<(token: string) => void> = [];

function processQueue(newToken: string) {
  refreshQueue.forEach((resolve) => resolve(newToken));
  refreshQueue = [];
}

function redirectToLogin() {
  clearTokens();
  if (typeof window !== 'undefined') {
    // Already in the auth flow → don't redirect. `window.location.href` is a full
    // page reload, so redirecting to /auth/phone while already on an /auth/* page
    // reloads it in an infinite loop (e.g. a background 401 from the feature-flags
    // provider's /me call on the logged-out login page).
    if (window.location.pathname.startsWith('/auth/')) return;
    window.location.href = '/auth/phone';
  }
}

// ── Interceptors ──────────────────────────────────────────────────────────────

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;

    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error);
    }

    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      redirectToLogin();
      return Promise.reject(error);
    }

    // If a refresh is already in progress, queue this request
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        refreshQueue.push((newToken: string) => {
          original.headers.Authorization = `Bearer ${newToken}`;
          resolve(api(original));
        });
        // If refresh ultimately fails, reject queued requests too
        const originalReject = reject;
        refreshQueue.push(() => originalReject(error));
      });
    }

    original._retry = true;
    isRefreshing = true;

    try {
      const res = await axios.post('/proxy/auth/token/refresh', {
        refresh_token: refreshToken,
      });

      const data = res.data?.data ?? res.data;
      const newAccess: string = data.access_token;
      const newRefresh: string = data.refresh_token ?? refreshToken;

      saveTokens(newAccess, newRefresh);
      api.defaults.headers.common.Authorization = `Bearer ${newAccess}`;

      processQueue(newAccess);
      original.headers.Authorization = `Bearer ${newAccess}`;
      return api(original);
    } catch {
      refreshQueue = [];
      redirectToLogin();
      return Promise.reject(error);
    } finally {
      isRefreshing = false;
    }
  }
);

// ── Helper: unwrap the nested data structures the backend uses ────────────────

function unwrapList(d: unknown): unknown[] {
  if (!d || typeof d !== 'object') return [];
  const o = d as Record<string, unknown>;
  const inner = o.data;
  if (inner && typeof inner === 'object') {
    const i = inner as Record<string, unknown>;
    if (Array.isArray(i.data)) return i.data;
    if (Array.isArray(i.items)) return i.items;
    if (Array.isArray(i.content)) return i.content;
    if (Array.isArray(inner)) return inner as unknown[];
  }
  if (Array.isArray(o.items)) return o.items;
  if (Array.isArray(o.content)) return o.content;
  if (Array.isArray(d)) return d as unknown[];
  return [];
}

function unwrapSingle(d: unknown): unknown {
  if (!d || typeof d !== 'object') return d;
  const o = d as Record<string, unknown>;
  // Handle nested data.data structure (mirrors Flutter ChatService logic)
  const inner = o.data;
  if (inner && typeof inner === 'object' && !Array.isArray(inner)) {
    const i = inner as Record<string, unknown>;
    if (i.data && typeof i.data === 'object' && !Array.isArray(i.data)) {
      return i.data; // { data: { data: { ... } } }
    }
    return inner; // { data: { ... } }
  }
  return d;
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export async function sendOtp(phoneNumber: string) {
  const res = await api.post('/auth/otp/send', { phoneNumber });
  return res.data as { message?: string; success?: boolean; data?: { expires_in_seconds?: number } };
}

export async function verifyOtp(phoneNumber: string, otpCode: string) {
  const res = await api.post('/auth/otp/verify', { phoneNumber, otpCode });
  const payload = (unwrapSingle(res.data) as Record<string, unknown>);
  return {
    accessToken: payload.access_token as string,
    refreshToken: payload.refresh_token as string,
    user: payload.user as Record<string, unknown>,
  };
}

// Reads the `feature.sms_otp_enabled` flag from the backend feature-flag map
// (GET /app/feature-flags → { data: { "feature.*": "true"|"false" } }), the
// same source the native app reads. Unauthenticated so it can run on the
// pre-OTP verify-method screen. Defaults to false on any error / missing key so
// SMS stays hidden and Google/Apple is the only path.
//
// NOTE: backend values are STRINGS ("true"/"false"), so they must be compared
// explicitly — the string "false" is truthy in JS.
export async function getSmsOtpEnabled(): Promise<boolean> {
  try {
    const res = await api.get<{ data?: Record<string, unknown> }>('/app/feature-flags');
    const flags = (res.data?.data ?? res.data) as Record<string, unknown> | undefined;
    const value = flags?.['feature.sms_otp_enabled'];
    if (typeof value === 'boolean') return value;
    return String(value).toLowerCase() === 'true';
  } catch {
    return false;
  }
}

// Reads the `feature.subscription_badge.enabled` flag from the backend
// feature-flag map (GET /app/feature-flags → { data: { "feature.*": "true"|"false" } }).
// This is a FRONTEND-ONLY flag controlling the subscription badge / premium UI
// visibility; it is independent of the backend `feature.premium.enabled` flag
// (which gates entitlements server-side). Defaults to true so the badge stays
// visible if the key is missing or the request fails.
//
// NOTE: backend values are STRINGS ("true"/"false"), so they must be compared
// explicitly — the string "false" is truthy in JS.
export async function getSubscriptionBadgeEnabled(): Promise<boolean> {
  try {
    const res = await api.get<{ data?: Record<string, unknown> }>('/app/feature-flags');
    const flags = (res.data?.data ?? res.data) as Record<string, unknown> | undefined;
    const value = flags?.['feature.subscription_badge.enabled'];
    if (value === undefined || value === null) return true; // missing key → default on
    if (typeof value === 'boolean') return value;
    return String(value).toLowerCase() === 'true';
  } catch {
    return true;
  }
}

export async function adminLogin(username: string, password: string) {
  const res = await api.post('/auth/admin/login', { username, password });
  const payload = unwrapSingle(res.data) as Record<string, unknown>;
  return {
    accessToken: payload.access_token as string,
    refreshToken: payload.refresh_token as string,
  };
}

export interface CreateProfileRequest {
  fullName?: string;
  gender: string;
  dateOfBirth: string; // YYYY-MM-DD
}

export async function createProfile(data: CreateProfileRequest) {
  const res = await api.post('/users/profile', data);
  return unwrapSingle(res.data) as Record<string, unknown>;
}

// v2 — simplified profile creation (name + dob + gender only, no measurements)
export interface CreateProfileV2Request {
  fullName: string;
  dateOfBirth: string; // YYYY-MM-DD
  gender?: string;     // defaults to FEMALE on backend
}

export async function createProfileV2(data: CreateProfileV2Request) {
  const res = await api.post('/users/profile', data, {
    baseURL: '/proxy-v2',
  });
  return unwrapSingle(res.data) as Record<string, unknown>;
}

export interface TelegramOidcRequest {
  code: string;
  codeVerifier: string;
  redirectUri: string;
  nonce?: string;
}

export async function telegramOidcLogin(req: TelegramOidcRequest) {
  const res = await api.post('/auth/telegram/oidc', req);
  const payload = unwrapSingle(res.data) as Record<string, unknown>;
  return {
    accessToken: payload.access_token as string,
    refreshToken: payload.refresh_token as string,
    user: payload.user as Record<string, unknown>,
  };
}

// ── Products ──────────────────────────────────────────────────────────────────

function mapProduct(raw: unknown): Product {
  const p = raw as Record<string, unknown>;
  return {
    id: p.id as string,
    brand: (p.brand ?? p.seller ?? '') as string,
    title: (p.title ?? '') as string,
    description: p.description as string | undefined,
    price: (p.price ?? 0) as number,
    originalPrice: p.original_price as number | undefined,
    discountPercentage: p.discount_percentage as number | undefined,
    currency: (p.currency ?? 'UZS') as string,
    images: (Array.isArray(p.images) ? p.images : []) as string[],
    sizes: (Array.isArray(p.sizes) ? p.sizes : undefined) as string[] | undefined,
    colors: (Array.isArray(p.colors) ? p.colors : undefined) as string[] | undefined,
    inStock: (p.in_stock ?? true) as boolean,
    rating: p.rating as number | undefined,
    sellerId: (p.seller_id ?? p.sellerId) as string | undefined,
    isNew: p.is_new as boolean | undefined,
    titleLocalized: p.title_localized as Record<string, string> | undefined,
    descriptionLocalized: p.description_localized as Record<string, string> | undefined,
  };
}

export async function getRecommendedProducts(page = 0, size = 20): Promise<Product[]> {
  const res = await api.get('/products/recommendations', { params: { page, size } });
  return unwrapList(res.data).map(mapProduct);
}

export async function getFavoriteProducts(page = 0, size = 20): Promise<Product[]> {
  const res = await api.get('/products/favorites', { params: { page, size } });
  return unwrapList(res.data).map(mapProduct);
}

export async function removeFavorite(productId: string): Promise<void> {
  await api.delete(`/products/${productId}/favorite`);
}

export async function getTrendingProducts(skip = 0, limit = 20): Promise<Product[]> {
  const res = await api.get('/feed/trending', { params: { skip, limit } });
  return unwrapList(res.data).map(mapProduct);
}

export async function getAllProducts(page = 0, size = 20, search?: string, category?: string): Promise<{ products: Product[]; total: number }> {
  const params: Record<string, unknown> = { page, size };
  if (search) params.search = search;
  if (category) params.category = category;
  const res = await api.get('/products/all', { params });
  const list = unwrapList(res.data).map(mapProduct);
  const d = res.data as Record<string, unknown>;
  const inner = d?.data as Record<string, unknown> | undefined;
  const total = (inner?.total ?? list.length) as number;
  return { products: list, total };
}

function mapSellerInfo(s: Record<string, unknown>): import('@/types').SellerInfo {
  const rawLocs = Array.isArray(s.locations) ? s.locations as Record<string, unknown>[] : [];
  return {
    id: s.id as string,
    name: (s.name ?? '') as string,
    logoImg: s.logo_img as string | undefined,
    description: s.description as string | undefined,
    productCount: s.product_count as number | undefined,
    primaryAddress: s.primary_address as string | undefined,
    phoneNumber: s.phone_number as string | undefined,
    websiteUrl: s.website_url as string | undefined,
    locations: rawLocs.map((l) => ({
      name: l.name as string | undefined,
      address: l.address as string | undefined,
      phoneNumber: l.phone_number as string | undefined,
      isPrimary: (l.is_primary ?? false) as boolean,
      latitude: l.latitude as number | undefined,
      longitude: l.longitude as number | undefined,
    })),
  };
}

export async function getSellers(skip = 0, limit = 50): Promise<import('@/types').SellerInfo[]> {
  const res = await api.get('/sellers', { params: { skip, limit, isActive: true } });
  const d = res.data as Record<string, unknown>;
  const inner = (d?.data ?? d) as Record<string, unknown>;
  const items: unknown[] = Array.isArray(inner)
    ? inner
    : Array.isArray(inner.items) ? inner.items as unknown[]
    : Array.isArray(inner.sellers) ? inner.sellers as unknown[]
    : Array.isArray(inner.content) ? inner.content as unknown[]
    : Array.isArray(inner.data) ? inner.data as unknown[]
    : [];
  return items.map((raw) => mapSellerInfo(raw as Record<string, unknown>));
}

export async function getProductById(id: string): Promise<Product> {
  const res = await api.get(`/products/${id}`);
  return mapProduct(unwrapSingle(res.data));
}

export async function getSellerInfo(id: string): Promise<import('@/types').SellerInfo> {
  const res = await api.get(`/sellers/${id}`);
  const s = (unwrapSingle(res.data) as Record<string, unknown>);
  return mapSellerInfo(s);
}

export async function getSellerProducts(id: string, skip = 0, limit = 20): Promise<{ products: Product[]; total: number }> {
  const res = await api.get(`/sellers/${id}/detail`, { params: { skip, limit, sort: 'newest' } });
  const d = res.data as Record<string, unknown>;
  // Response shape: { data: { products: [...], total: N } } or similar
  const inner = (d?.data ?? d) as Record<string, unknown>;
  const rawProducts = Array.isArray(inner.products)
    ? inner.products as unknown[]
    : Array.isArray(inner.items) ? inner.items as unknown[]
    : Array.isArray(inner.data) ? inner.data as unknown[]
    : unwrapList(res.data);
  // Use 0 as sentinel when total is absent so callers can detect "unknown total"
  const total = (inner.total != null ? inner.total : 0) as number;
  return { products: rawProducts.map(mapProduct), total };
}

export async function toggleLikeProduct(id: string) {
  const res = await api.post(`/products/${id}/toggle-like`);
  return res.data;
}

// ── Chats ─────────────────────────────────────────────────────────────────────

function mapChat(raw: unknown): ChatSummary {
  const c = raw as Record<string, unknown>;
  return {
    id: c.id as string,
    subject: c.subject as string | undefined,
    status: (c.status ?? 'ACTIVE') as string,
    sellerName: c.seller_name as string | undefined,
    sellerLogo: c.seller_logo as string | undefined,
    productTitle: c.product_title as string | undefined,
    productImage: c.product_image as string | undefined,
    lastMessagePreview: c.last_message_preview as string | undefined,
    lastMessageAt: c.last_message_at as string | undefined,
    unreadCount: (c.unread_count ?? 0) as number,
  };
}

function mapMessage(raw: unknown): ChatMessage {
  const m = raw as Record<string, unknown>;
  // API may return snake_case (created_at) or camelCase (createdAt); fall back to now
  const createdAt = (m.created_at ?? m.createdAt ?? new Date().toISOString()) as string;
  // Normalise attachments: API returns snake_case file_url / file_type
  const rawAttachments = Array.isArray(m.attachments) ? m.attachments as Record<string, unknown>[] : [];
  const attachments: ChatMessage['attachments'] = rawAttachments.map((a) => ({
    fileUrl: (a.file_url ?? a.fileUrl ?? '') as string,
    fileType: (a.file_type ?? a.fileType ?? '') as string,
  }));
  return {
    id: (m.id ?? '') as string,
    senderId: (m.sender_id ?? m.senderId ?? '') as string,
    senderName: (m.sender_name ?? m.senderName) as string | undefined,
    senderType: ((m.sender_type ?? m.senderType) ?? 'USER') as ChatMessage['senderType'],
    isMine: (m.is_mine ?? m.isMine) as boolean | undefined,
    content: (m.content ?? '') as string,
    messageType: ((m.message_type ?? m.messageType) ?? 'TEXT') as ChatMessage['messageType'],
    isRead: (m.is_read ?? m.isRead ?? false) as boolean,
    createdAt,
    attachments: attachments.length > 0 ? attachments : undefined,
    // Product card fields
    productId: (m.product_id ?? m.productId) as string | undefined,
    productTitle: (m.product_title ?? m.productTitle) as string | undefined,
    productImage: (m.product_image ?? m.productImage) as string | undefined,
    productPrice: (m.product_price ?? m.productPrice) as number | undefined,
    productColor: (m.color) as string | undefined,
    productSize: (m.size) as string | undefined,
    productQuantity: (m.quantity) as number | undefined,
  };
}

export async function getChats(page = 0, size = 20): Promise<ChatSummary[]> {
  const res = await api.get('/chats', { params: { page, size } });
  return unwrapList(res.data).map(mapChat);
}

export async function getChatMessages(chatId: string, page = 0, size = 50): Promise<ChatMessage[]> {
  const res = await api.get(`/chats/${chatId}/messages`, { params: { page, size } });
  // API returns newest-first; reverse so oldest is at top (chat convention)
  return unwrapList(res.data).map(mapMessage).reverse();
}

export async function sendChatMessage(chatId: string, content: string): Promise<ChatMessage> {
  const res = await api.post(`/chats/${chatId}/messages`, { content });
  return mapMessage(unwrapSingle(res.data));
}

// POST /chats/{id}/messages/multipart — send message with file attachment(s)
export async function sendMultipartMessage(
  chatId: string,
  content: string,
  files: File[],
): Promise<ChatMessage> {
  const formData = new FormData();
  if (content.trim()) formData.append('content', content.trim());
  for (const file of files) formData.append('files', file);
  const res = await api.post(`/chats/${chatId}/messages/multipart`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return mapMessage(unwrapSingle(res.data));
}

export async function createChat(opts: {
  sellerId: string;
  productId?: string;
  color?: string;
  size?: string;
  quantity?: number;
  subject?: string;
}): Promise<{ id: string }> {
  const body: Record<string, unknown> = { sellerId: opts.sellerId };
  if (opts.productId) body.productId = opts.productId;
  if (opts.color)     body.color     = opts.color;
  if (opts.size)      body.size      = opts.size;
  if (opts.quantity)  body.quantity  = opts.quantity;
  if (opts.subject)   body.subject   = opts.subject;
  const res = await api.post('/chats', body);
  const d = unwrapSingle(res.data) as Record<string, unknown>;
  return { id: d.id as string };
}

/**
 * Open (or reuse) the user's support chat with the Libas team.
 * Backend: POST /chats/support → ApiResponse.of({ id, ... }); unwrapSingle peels
 * the wrapper so we read the chat id directly.
 */
export async function createSupportChat(): Promise<{ id: string }> {
  const res = await api.post('/chats/support');
  const d = unwrapSingle(res.data) as Record<string, unknown>;
  return { id: d.id as string };
}

export async function placeOrder(opts: {
  deliveryMethod: 'PICKUP' | 'DELIVERY';
  paymentMethod: 'CASH' | 'CARD';
  addressId?: string;
}): Promise<{ orderNumber: string; status: string }> {
  const body: Record<string, unknown> = {
    deliveryMethod: opts.deliveryMethod,
    paymentMethod: opts.paymentMethod,
  };
  if (opts.deliveryMethod === 'DELIVERY' && opts.addressId) {
    body.addressId = opts.addressId;
  }
  const res = await api.post('/orders', body);
  const d = (res.data?.data ?? res.data) as Record<string, unknown>;
  return {
    orderNumber: (d.orderNumber ?? d.order_number ?? `#SW${Date.now().toString().slice(-6)}`) as string,
    status: (d.status ?? 'confirmed') as string,
  };
}
