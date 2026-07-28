/**
 * Демо-режим киоска: `/kiosk?demo=1`.
 *
 * Нужен, чтобы показывать сценарий партнёрам в обычном браузере — без ключа
 * устройства, без развёрнутого бэкенда киоска и без расходов на генерацию.
 *
 * Что настоящее: каталог тянется из публичного API магазина — живые товары,
 * фото и цены. Что имитировано: сборка образа и его отрисовка. Экран об этом
 * прямо говорит, выдавать имитацию за работающую примерку нельзя.
 */
import axios from 'axios';
import type { KioskCatalogItem, KioskFinish, KioskLook, KioskLookItem, KioskSession } from './kiosk-api';

const DEMO_STORAGE = 'kiosk_demo_mode';

/** Включить демо — когда бэкенд киоска недоступен. */
export function enableDemo(): void {
  try {
    sessionStorage.setItem(DEMO_STORAGE, '1');
  } catch {
    /* приватный режим — режим доживёт до перезагрузки */
  }
}

/**
 * Выключить демо. Вызывается, как только бэкенд ответил: иначе один сбой сети
 * запирал бы планшет в имитации до перезапуска браузера.
 */
export function disableDemo(): void {
  try {
    sessionStorage.removeItem(DEMO_STORAGE);
  } catch {
    /* игнорируем */
  }
}

/** Демо запрошено явно через адрес — тогда бэкенд не трогаем вообще. */
export function isDemoForced(): boolean {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get('demo') === '1';
}

export function isDemoMode(): boolean {
  if (typeof window === 'undefined') return false;
  const fromUrl = new URLSearchParams(window.location.search).get('demo');
  if (fromUrl === '1') {
    try {
      sessionStorage.setItem(DEMO_STORAGE, '1');
    } catch {
      /* приватный режим — режим доживёт до перезагрузки */
    }
    return true;
  }
  if (fromUrl === '0') {
    try {
      sessionStorage.removeItem(DEMO_STORAGE);
    } catch {
      /* игнорируем */
    }
    return false;
  }
  try {
    return sessionStorage.getItem(DEMO_STORAGE) === '1';
  } catch {
    return false;
  }
}

/** Снятый кадр держим в памяти: он же показывается как «результат». */
let lastPhotoUrl: string | null = null;
let catalogCache: KioskCatalogItem[] = [];
let lastLook: KioskLook | null = null;

export function rememberPhoto(blob: Blob): string {
  if (lastPhotoUrl) URL.revokeObjectURL(lastPhotoUrl);
  lastPhotoUrl = URL.createObjectURL(blob);
  return lastPhotoUrl;
}

export function demoSession(): KioskSession {
  return {
    sessionId: crypto.randomUUID(),
    storeLabel: 'Демо-магазин · Ташкент',
    catalogSize: 0,
  };
}

const PAGE_SIZE = 100;

/**
 * Каталог из публичного API — он открыт без авторизации, так что демо показывает
 * реальные вещи, а не выдуманные карточки.
 *
 * Тянем ВСЕ страницы: на витрине магазина обрезанный каталог выглядит как пустой
 * зал. Первая страница отдаётся сразу через onPage, остальные догружаются следом.
 */
export async function demoCatalog(
  onPage?: (items: KioskCatalogItem[]) => void,
  category?: string | null,
): Promise<{ items: KioskCatalogItem[]; total: number }> {
  const filtered = (list: KioskCatalogItem[]) =>
    category ? list.filter((i) => i.category === category) : list;

  if (catalogCache.length) {
    onPage?.(filtered(catalogCache));
    return { items: filtered(catalogCache), total: filtered(catalogCache).length };
  }

  const collected: KioskCatalogItem[] = [];
  let page = 0;
  let total = Infinity;

  while (collected.length < total) {
    const res = await axios.get('/proxy/products/all', { params: { page, size: PAGE_SIZE } });
    const payload = res.data?.data ?? {};
    const products: any[] = payload.data ?? [];
    total = payload.pagination?.total ?? products.length;

    if (!products.length) break;

    collected.push(
      ...products
        .filter((p) => p?.images?.length)
        .map((p) => ({
          id: p.id,
          title: p.title,
          category: p.category ?? null,
          price: p.price ?? null,
          currency: p.currency ?? 'UZS',
          imageUrl: p.images[0],
          sizes: p.sizes ?? [],
        })),
    );

    catalogCache = collected;
    onPage?.(filtered([...collected]));
    page += 1;
  }

  return { items: filtered(catalogCache), total: filtered(catalogCache).length };
}

/** Слот товара — та же логика, что на бэкенде, но огрублённая до категорий. */
function slotOf(item: KioskCatalogItem): 'TOP' | 'BOTTOM' | 'FULL' | 'SHOES' | 'OTHER' {
  switch (item.category) {
    case 'TOPWEAR':
      return 'TOP';
    case 'BOTTOMWEAR':
      return 'BOTTOM';
    case 'DRESSES':
    case 'ONE_PIECE':
    case 'TWO_PIECE_SET':
      return 'FULL';
    case 'FOOTWEAR':
      return 'SHOES';
    default:
      return 'OTHER';
  }
}

/** Собирает образ по тем же правилам, что бэкенд: цельная вещь ИЛИ верх + низ. */
export async function demoLook(picked: string[], attempt: number): Promise<KioskLook> {
  const { items } = await demoCatalog();
  const chosen = items.filter((i) => picked.includes(i.id));

  const pick = (slot: ReturnType<typeof slotOf>): KioskCatalogItem | undefined => {
    const pool = items.filter((i) => slotOf(i) === slot && !picked.includes(i.id));
    return pool.length ? pool[attempt % pool.length] : undefined;
  };

  const look: KioskCatalogItem[] = [...chosen];
  const hasFull = look.some((i) => slotOf(i) === 'FULL');

  if (!hasFull) {
    if (!look.some((i) => slotOf(i) === 'TOP')) {
      const top = pick('TOP');
      if (top) look.push(top);
    }
    if (!look.some((i) => slotOf(i) === 'BOTTOM')) {
      const bottom = pick('BOTTOM');
      if (bottom) look.push(bottom);
    }
  }
  if (!look.some((i) => slotOf(i) === 'SHOES')) {
    const shoes = pick('SHOES');
    if (shoes) look.push(shoes);
  }

  const lookItems: KioskLookItem[] = look.slice(0, 4).map((i) => ({
    productId: i.id,
    title: i.title,
    category: i.category,
    size: i.sizes?.length ? sizeRange(i.sizes) : '—',
    price: i.price,
    currency: i.currency,
    imageUrl: i.imageUrl,
  }));

  lastLook = {
    lookId: crypto.randomUUID(),
    status: 'COMPLETED',
    // В демо «результат» — это снятый кадр: настоящей генерации здесь нет,
    // и подменять её сгенерированной откуда-то картинкой было бы обманом.
    resultImageUrl: lastPhotoUrl,
    items: lookItems,
    totalPrice: lookItems.reduce((sum, i) => sum + (i.price ?? 0), 0),
    currency: lookItems[0]?.currency ?? 'UZS',
    regenerateCount: attempt,
    canRegenerate: attempt < 3,
    failureReason: null,
  };
  return lastLook;
}

/** Последний собранный образ — его запрашивает вотчер вместо похода в бэкенд. */
export function demoLastLook(): KioskLook | null {
  return lastLook;
}

/** Диапазон размеров — как KioskSizeAdvisor на бэкенде. */
function sizeRange(sizes: string[]): string {
  if (sizes.length === 1) return sizes[0];
  const mid = Math.floor((sizes.length - 1) / 2);
  const from = sizes[mid];
  const to = sizes[Math.min(mid + 1, sizes.length - 1)];
  return from === to ? from : `${from}–${to}`;
}

export function demoFinish(): KioskFinish {
  const code = `LB-${1000 + Math.floor(Math.random() * 9000)}`;
  return {
    code,
    shareUrl: `${typeof window !== 'undefined' ? window.location.origin : ''}/k/${code}`,
    shareExpiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
  };
}

/** Сколько «генерируем» в демо — близко к реальным 27 секундам, но короче. */
export const DEMO_GENERATION_MS = 6000;
