/**
 * API киоска.
 *
 * Отдельный axios-инстанс, а не общий lib/api.ts: у стенда нет пользователя и JWT,
 * устройство авторизуется ключом X-Kiosk-Key. Перехватчик общего клиента при 401
 * увёл бы киоск на экран входа по телефону — в торговом зале это выглядело бы дико.
 */
import axios from 'axios';
import {
  DEMO_GENERATION_MS,
  demoCatalog,
  demoFinish,
  demoLastLook,
  demoLook,
  demoSession,
  isDemoMode,
  rememberPhoto,
} from './kiosk-demo';

const KEY_STORAGE = 'kiosk_device_key';

export interface KioskSession {
  sessionId: string;
  storeLabel: string;
  catalogSize: number;
}

export interface KioskCatalogItem {
  id: string;
  title: string;
  category: string | null;
  price: number | null;
  currency: string | null;
  imageUrl: string | null;
  sizes: string[] | null;
}

export interface KioskLookItem {
  productId: string;
  title: string;
  category: string | null;
  size: string | null;
  price: number | null;
  currency: string | null;
  imageUrl: string | null;
}

export interface KioskLook {
  lookId: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  resultImageUrl: string | null;
  items: KioskLookItem[];
  totalPrice: number;
  currency: string | null;
  regenerateCount: number;
  canRegenerate: boolean;
  failureReason: string | null;
}

export interface KioskPhotoValidation {
  faceFound: boolean;
  faceCount: number;
  faceRatio: number;
  tooDark: boolean;
  hint: 'FACE_NOT_FOUND' | 'MULTIPLE_FACES' | 'MOVE_CLOSER' | 'TOO_DARK' | null;
}

export interface KioskFinish {
  code: string;
  shareUrl: string;
  shareExpiresAt: string;
}

/**
 * Ключ устройства выдаётся при настройке планшета: один раз приходит в адресе
 * (?device_key=…) и дальше живёт в localStorage — киоск перезагружается сам по себе,
 * и просить ключ заново каждый раз некому.
 */
export function getDeviceKey(): string | null {
  if (typeof window === 'undefined') return null;
  const fromUrl = new URLSearchParams(window.location.search).get('device_key');
  if (fromUrl) {
    try {
      localStorage.setItem(KEY_STORAGE, fromUrl);
    } catch {
      /* приватный режим — ключ проживёт до перезагрузки */
    }
    return fromUrl;
  }
  try {
    return localStorage.getItem(KEY_STORAGE);
  } catch {
    return null;
  }
}

const kioskApi = axios.create({ baseURL: '/proxy' });

kioskApi.interceptors.request.use((config) => {
  const key = getDeviceKey();
  if (key) config.headers['X-Kiosk-Key'] = key;
  return config;
});

/** Бэкенд заворачивает ответы в {data: …}, иногда дважды. */
function unwrap<T>(payload: any): T {
  const first = payload?.data ?? payload;
  return (first?.data ?? first) as T;
}

export async function startSession(lang: string, path: 'create' | 'catalog'): Promise<KioskSession> {
  if (isDemoMode()) return demoSession();
  const res = await kioskApi.post('/kiosk/session', null, { params: { lang, path } });
  return unwrap<KioskSession>(res.data);
}

export async function fetchCatalog(
  params: { category?: string; page?: number; size?: number } = {},
): Promise<{ items: KioskCatalogItem[]; total: number }> {
  const res = await kioskApi.get('/kiosk/catalog', { params });
  const page = unwrap<{ items: KioskCatalogItem[]; total: number }>(res.data);
  return { items: page.items ?? [], total: page.total ?? 0 };
}

/**
 * Весь каталог зала, а не первая страница: на витрине обрезанный список читается
 * как пустой магазин. Первая страница отдаётся сразу, остальные догружаются следом.
 */
export async function fetchWholeCatalog(
  onPage: (items: KioskCatalogItem[]) => void,
  category?: string | null,
  /** Пока возвращает true — качаем дальше. Даёт отменить загрузку при смене фильтра. */
  isCurrent: () => boolean = () => true,
): Promise<void> {
  if (isDemoMode()) {
    await demoCatalog(onPage, category, isCurrent);
    return;
  }

  const PAGE = 60; // потолок бэкенда на размер страницы
  const collected: KioskCatalogItem[] = [];
  let page = 0;
  let total = Infinity;

  while (collected.length < total) {
    // Переключили фильтр — прежняя выдача больше не нужна: и дописывать её в
    // список нельзя (перетрёт отфильтрованное), и качать оставшиеся страницы незачем.
    if (!isCurrent()) return;
    const chunk = await fetchCatalog({ page, size: PAGE, category: category ?? undefined });
    if (!isCurrent()) return;
    if (!chunk.items.length) break;
    total = chunk.total || chunk.items.length;
    collected.push(...chunk.items);
    onPage([...collected]);
    page += 1;
  }
}

/**
 * Кадр уходит прямо в хранилище по временной ссылке, минуя наш бэкенд (тот же путь,
 * что у загрузки вещей в гардероб). PUT идёт через локальный прокси — Azure не
 * отдаёт CORS-заголовки браузеру.
 */
export async function uploadPhoto(sessionId: string, blob: Blob): Promise<string> {
  // В демо кадр никуда не уходит: он остаётся в браузере и служит превью результата.
  if (isDemoMode()) return rememberPhoto(blob);

  const contentType = blob.type || 'image/jpeg';
  const res = await kioskApi.post(`/kiosk/sessions/${sessionId}/photo-url`, null, {
    params: { contentType },
  });
  const { blobKey, uploadUrl } = unwrap<{ blobKey: string; uploadUrl: string }>(res.data);
  if (!blobKey || !uploadUrl) throw new Error('Backend did not return an upload URL');

  await axios.put(`/api/blob-upload?putUrl=${encodeURIComponent(uploadUrl)}`, blob, {
    headers: { 'Content-Type': contentType },
  });
  return blobKey;
}

export async function confirmPhoto(sessionId: string, blobKey: string): Promise<KioskPhotoValidation> {
  if (isDemoMode()) {
    return { faceFound: true, faceCount: 1, faceRatio: 0.3, tooDark: false, hint: null };
  }
  const res = await kioskApi.post('/kiosk/photo/confirm', { sessionId, blobKey });
  return unwrap<KioskPhotoValidation>(res.data);
}

export async function createLook(payload: {
  sessionId: string;
  gender: string;
  bodyShape: string;
  styles?: string[];
  productIds?: string[];
  attempt?: number;
}): Promise<KioskLook> {
  if (isDemoMode()) return demoLook(payload.productIds ?? [], payload.attempt ?? 0);

  // attempt нужен только демо-режиму: бэкенд отклоняет неизвестные поля тела
  // (INVALID_REQUEST_BODY), поэтому наружу уходит ровно контракт LookRequest.
  const { attempt, ...body } = payload;
  const res = await kioskApi.post('/kiosk/looks', body);
  return unwrap<KioskLook>(res.data);
}

export async function getLook(lookId: string): Promise<KioskLook> {
  if (isDemoMode()) {
    const look = demoLastLook();
    if (look) return look;
  }
  const res = await kioskApi.get(`/kiosk/looks/${lookId}`);
  return unwrap<KioskLook>(res.data);
}

export async function finishSession(sessionId: string): Promise<KioskFinish> {
  if (isDemoMode()) return demoFinish();
  const res = await kioskApi.post(`/kiosk/sessions/${sessionId}/finish`);
  return unwrap<KioskFinish>(res.data);
}

export async function resetSession(sessionId: string): Promise<void> {
  if (isDemoMode()) return;
  await kioskApi.post(`/kiosk/sessions/${sessionId}/reset`);
}

/** Код ошибки бэкенда — по нему экран решает, что показать человеку. */
export function kioskErrorCode(err: unknown): string | null {
  const data = (err as any)?.response?.data;
  return data?.code ?? data?.error?.code ?? null;
}

/**
 * Следим за генерацией: SSE, а если поток не поднялся — обычный поллинг.
 * Свой вотчер, а не общий watchWithSse, потому что тот подставляет JWT, которого
 * у киоска нет.
 */
export function watchLook(
  lookId: string,
  handlers: {
    onProgress?: (look: KioskLook) => void;
    onDone: (look: KioskLook) => void;
    onError: (err: Error) => void;
  },
): { close: () => void } {
  let closed = false;
  let source: EventSource | null = null;
  let pollTimer: ReturnType<typeof setTimeout> | null = null;

  const finish = (look: KioskLook) => {
    if (closed) return;
    close();
    handlers.onDone(look);
  };

  const close = () => {
    closed = true;
    if (source) source.close();
    if (pollTimer) clearTimeout(pollTimer);
  };

  const poll = () => {
    if (closed) return;
    getLook(lookId)
      .then((look) => {
        if (closed) return;
        if (look.status === 'COMPLETED' || look.status === 'FAILED') {
          finish(look);
          return;
        }
        handlers.onProgress?.(look);
        pollTimer = setTimeout(poll, 2500);
      })
      .catch((err) => {
        if (closed) return;
        // Сеть могла моргнуть — продолжаем опрашивать, экран сам решит про таймаут.
        console.warn('kiosk poll failed', err);
        pollTimer = setTimeout(poll, 3000);
      });
  };

  if (isDemoMode()) {
    const timer = setTimeout(() => {
      if (closed) return;
      getLook(lookId).then(handlers.onDone).catch(() => {});
    }, DEMO_GENERATION_MS);
    return { close: () => clearTimeout(timer) };
  }

  const key = getDeviceKey();
  if (typeof EventSource !== 'undefined' && key) {
    const params = new URLSearchParams({ path: `/kiosk/looks/${lookId}/stream`, kioskKey: key });
    source = new EventSource(`/api/sse-proxy?${params.toString()}`);
    source.onmessage = (event) => {
      try {
        const look = JSON.parse(event.data) as KioskLook;
        if (look.status === 'COMPLETED' || look.status === 'FAILED') finish(look);
        else handlers.onProgress?.(look);
      } catch {
        /* битый кадр — ждём следующий */
      }
    };
    source.onerror = () => {
      if (closed) return;
      source?.close();
      source = null;
      poll(); // молча переходим на поллинг: для человека у стенда это незаметно
    };
  } else {
    poll();
  }

  return { close };
}

/**
 * Аналитика киоска. Пишем в общий публичный ingest: события анонимные, и своей
 * ручки для них заводить не нужно.
 */
export function trackKiosk(
  eventName: string,
  sessionId: string | null,
  properties: Record<string, unknown> = {},
): void {
  if (typeof window === 'undefined' || !sessionId) return;
  const payload = {
    eventName,
    sessionId,
    anonId: getDeviceAnonId(),
    screen: 'kiosk',
    source: 'webapp',
    platform: 'web',
    properties,
  };
  // Аналитика не должна ронять сценарий у стенда — ошибки глотаем намеренно.
  axios.post('/proxy/analytics/events', payload).catch(() => {});
}

const ANON_STORAGE = 'kiosk_anon_id';

/**
 * Идентификатор планшета для аналитики. Именно отдельный id, а не ключ устройства:
 * ключ — секрет, и отправлять его в поток событий нельзя.
 */
function getDeviceAnonId(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    let id = localStorage.getItem(ANON_STORAGE);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(ANON_STORAGE, id);
    }
    return id;
  } catch {
    return undefined;
  }
}
