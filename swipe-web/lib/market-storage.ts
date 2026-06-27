// ─── Market (C2C) localStorage layer + seeded mock feed ──────────────────────
// No backend yet. Listings, favorites, the active draft, and the one-time
// onboarding flag all live in localStorage, mirroring lib/closet-storage.ts /
// lib/cart-storage.ts / lib/liked-storage.ts conventions.
//
// IMAGE-STORAGE TRADEOFF: localStorage caps at ~5MB per origin. User photos are
// stored as COMPRESSED JPEG dataURLs (see PhotosStep: compressImageForUpload at
// 1000px / 0.7) and capped to MAX_STORED_PHOTOS to stay within quota. Object
// URLs are avoided because they are revoked on reload. saveAll() swallows
// QuotaExceededError so a publish never hard-crashes; callers should keep photo
// counts small. Replace all of this with real blob upload when the backend
// lands (cf. lib/wardrobe-api.ts).

import type {
  MarketListing,
  MarketListingStatus,
  MarketDraft,
  MarketContactMethod,
} from '@/types/market';
import { getUser } from '@/lib/auth';
import { NO_BRAND, OTHER_BRAND } from '@/lib/market-attributes';

const FEED_KEY = 'market_listings';
const DRAFT_KEY = 'market_draft';
const FAV_KEY = 'market_favorites';
const ONBOARDING_KEY = 'svayp_market_onboarding_complete';
const WIZARD_STEP_KEY = 'svayp_market_wizard_step';
// Bump the suffix whenever the seed shape changes (e.g. category keys) so
// existing installs re-seed with the new data on next load.
const SEED_FLAG_KEY = 'market_seeded_v3';

export const MAX_STORED_PHOTOS = 4;

const isBrowser = () => typeof window !== 'undefined';

// ── Generic JSON helpers ─────────────────────────────────────────────────────
function read<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): boolean {
  if (!isBrowser()) return false;
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    // QuotaExceededError (too many / too large photos) — fail soft.
    return false;
  }
}

// ── Favorites ────────────────────────────────────────────────────────────────
function readFavIds(): string[] {
  return read<string[]>(FAV_KEY, []);
}

export function isFavorite(id: string): boolean {
  return readFavIds().includes(id);
}

export function toggleFavorite(id: string): boolean {
  const ids = readFavIds();
  const idx = ids.indexOf(id);
  if (idx >= 0) {
    ids.splice(idx, 1);
    write(FAV_KEY, ids);
    return false;
  }
  ids.unshift(id);
  write(FAV_KEY, ids);
  return true;
}

// ── Listings ─────────────────────────────────────────────────────────────────
function readListings(): MarketListing[] {
  return read<MarketListing[]>(FEED_KEY, []);
}

function writeListings(list: MarketListing[]): boolean {
  return write(FEED_KEY, list);
}

function withFavorite(l: MarketListing): MarketListing {
  return { ...l, isFavorite: isFavorite(l.id) };
}

export interface FeedQuery {
  category?: string;
  offset?: number;
  limit?: number;
  search?: string;
}

export function getFeed(q: FeedQuery = {}): { listings: MarketListing[]; total: number } {
  ensureSeeded();
  let all = readListings().filter((l) => l.status === 'active');
  if (q.category) all = all.filter((l) => l.category === q.category);
  if (q.search) {
    const s = q.search.toLowerCase();
    all = all.filter((l) => l.title.toLowerCase().includes(s));
  }
  const total = all.length;
  const offset = q.offset ?? 0;
  const limit = q.limit ?? all.length;
  return { listings: all.slice(offset, offset + limit).map(withFavorite), total };
}

export function getListingById(id: string): MarketListing | undefined {
  const found = readListings().find((l) => l.id === id);
  return found ? withFavorite(found) : undefined;
}

export function addListing(listing: MarketListing): MarketListing {
  const list = readListings();
  list.unshift(listing);
  writeListings(list);
  return listing;
}

export function updateListing(id: string, patch: Partial<MarketListing>): void {
  const list = readListings();
  const idx = list.findIndex((l) => l.id === id);
  if (idx >= 0) {
    list[idx] = { ...list[idx], ...patch };
    writeListings(list);
  }
}

/** Change a listing's status (e.g. active ↔ sold ↔ archived). */
export function setListingStatus(id: string, status: MarketListingStatus): void {
  updateListing(id, { status });
}

/**
 * Saves edits from the create wizard back onto an existing listing, preserving
 * its identity (id, postedAt, seller.id). A rejected listing is resubmitted for
 * review (→ pending); any other status is kept as-is. Returns the updated
 * listing, or undefined when the id no longer exists.
 */
export function applyDraftToListing(id: string, d: MarketDraft, sellerName?: string): MarketListing | undefined {
  const list = readListings();
  const idx = list.findIndex((l) => l.id === id);
  if (idx < 0) return undefined;
  const prev = list[idx];
  const fresh = finalizeDraft(d, sellerName); // fills/normalizes every editable field
  const updated: MarketListing = {
    ...fresh,
    id: prev.id,
    postedAt: prev.postedAt,
    seller: { ...fresh.seller, id: prev.seller.id },
    status: prev.status === 'rejected' ? 'pending' : prev.status,
  };
  list[idx] = updated;
  writeListings(list);
  return updated;
}

export function deleteListing(id: string): void {
  writeListings(readListings().filter((l) => l.id !== id));
}

function currentUserId(): string {
  const u = getUser();
  return String(u?.id ?? u?.username ?? 'me');
}

/** The current user's own published listings (excludes seed data). */
export function getMyListings(): MarketListing[] {
  const uid = currentUserId();
  return readListings()
    .filter((l) => !l.id.startsWith('seed_') && l.seller.id === uid)
    .map(withFavorite);
}

export function getFavoriteListings(): MarketListing[] {
  const ids = new Set(readFavIds());
  return readListings().filter((l) => ids.has(l.id)).map(withFavorite);
}

// ── Draft ────────────────────────────────────────────────────────────────────
export function getDraft(): MarketDraft | null {
  return read<MarketDraft | null>(DRAFT_KEY, null);
}

export function saveDraft(d: MarketDraft): void {
  write(DRAFT_KEY, { ...d, updatedAt: new Date().toISOString() });
}

export function clearDraft(): void {
  if (isBrowser()) localStorage.removeItem(DRAFT_KEY);
}

export function hasDraft(): boolean {
  return getDraft() !== null;
}

// ── Wizard resume ────────────────────────────────────────────────────────────
export function getMarketWizardStep(): number {
  const v = parseInt(isBrowser() ? localStorage.getItem(WIZARD_STEP_KEY) ?? '' : '', 10);
  return Number.isFinite(v) && v >= 0 ? v : 0;
}

export function setMarketWizardStep(step: number): void {
  if (isBrowser()) localStorage.setItem(WIZARD_STEP_KEY, String(step));
}

export function clearMarketWizardStep(): void {
  if (isBrowser()) localStorage.removeItem(WIZARD_STEP_KEY);
}

// ── One-time onboarding gate ─────────────────────────────────────────────────
export function isMarketOnboardingComplete(): boolean {
  return isBrowser() && localStorage.getItem(ONBOARDING_KEY) === 'true';
}

export function setMarketOnboardingComplete(): void {
  if (isBrowser()) localStorage.setItem(ONBOARDING_KEY, 'true');
}

export function clearMarketOnboarding(): void {
  if (isBrowser()) localStorage.removeItem(ONBOARDING_KEY);
}

// ── Seeded mock feed ─────────────────────────────────────────────────────────
function img(seed: string): string {
  // Stable placeholder images keyed by seed so reloads are consistent.
  return `https://picsum.photos/seed/${seed}/600/750`;
}

const SEED_LISTINGS: MarketListing[] = [
  {
    id: 'seed_1', title: 'Юбка Polo', images: [img('mk-skirt1'), img('mk-skirt2')],
    category: 'SKIRTS', condition: 'used_good', brand: 'Polo', sizes: ['46 (M)'],
    colors: ['black'], season: 'all', length: 'midi', hijabFriendly: true, material: 'cotton', country: 'TR',
    dealType: 'sell', price: 50000,
    currency: 'UZS', isUrgent: false, description: 'Простая юбка Polo. Носили пару раз, в отличном состоянии.',
    location: { address: 'массив Юнусабад', landmark: 'Алайский рынок', latitude: 41.36, longitude: 69.29, courier: true },
    seller: { id: 'seed_seller_1', name: 'Дилноза', phone: '+998901234567', telegramUsername: 'dilnoza_sells' },
    contactMethods: ['chat', 'phone', 'telegram'], status: 'active', postedAt: '2026-06-20T18:00:00.000Z',
  },
  {
    id: 'seed_2', title: 'Платье летнее зелёное', images: [img('mk-dress1')],
    category: 'DRESSES', condition: 'new_with_tag', brand: 'Zara', sizes: ['44 (S)'],
    colors: ['green'], season: 'summer', length: 'mini', hijabFriendly: false, material: 'chiffon', country: 'UZ', fit: 'REGULAR',
    dealType: 'sell', price: 180000,
    currency: 'UZS', isUrgent: true, description: 'Новое платье с биркой, не подошёл размер.',
    location: { address: 'Чиланзар', courier: true },
    seller: { id: 'seed_seller_2', name: 'Madina', phone: '+998905556677' },
    contactMethods: ['chat', 'phone'], status: 'active', postedAt: '2026-06-21T10:00:00.000Z',
  },
  {
    id: 'seed_3', title: 'Джинсы синие mom', images: [img('mk-jeans1'), img('mk-jeans2')],
    category: 'TROUSERS_JEANS', condition: 'used_visible', brand: 'Bershka', sizes: ['46 (M)'],
    colors: ['blue'], season: 'all', dealType: 'sell', price: 90000,
    currency: 'UZS', isUrgent: false, description: 'Удобные mom jeans, есть лёгкие следы носки.',
    location: { address: 'Юнусабад' },
    seller: { id: 'seed_seller_3', name: 'Aziza', phone: '+998907778899', telegramUsername: 'aziza_market' },
    contactMethods: ['chat', 'telegram'], status: 'active', postedAt: '2026-06-19T09:00:00.000Z',
  },
  {
    id: 'seed_4', title: 'Кроссовки Nike Air', images: [img('mk-shoes1')],
    category: 'SNEAKERS', condition: 'used_good', brand: 'Nike', sizes: ['40'],
    colors: ['white'], dealType: 'sell', price: 350000,
    currency: 'UZS', isUrgent: false, description: 'Оригинальные кроссовки, носились аккуратно.',
    location: { address: 'Мирзо-Улугбек', courier: true },
    seller: { id: 'seed_seller_4', name: 'Jasur', phone: '+998901112233' },
    contactMethods: ['chat'], status: 'active', postedAt: '2026-06-18T14:00:00.000Z',
  },
  {
    id: 'seed_5', title: 'Сумка кожаная бежевая', images: [img('mk-bag1')],
    category: 'BAGS', condition: 'used_good', brand: 'Mango',
    colors: ['beige'], dealType: 'sell', price: 120000,
    currency: 'UZS', isUrgent: false, description: 'Вместительная сумка, натуральная кожа.',
    location: { address: 'Сергели' },
    seller: { id: 'seed_seller_5', name: 'Nilufar', phone: '+998903334455', telegramUsername: 'nilu_shop' },
    contactMethods: ['chat', 'telegram'], status: 'active', postedAt: '2026-06-17T12:00:00.000Z',
  },
  {
    id: 'seed_6', title: 'Свитер тёплый, отдам даром', images: [img('mk-sweater1')],
    category: 'SWEATERS_KNITS', condition: 'used_visible', brand: NO_BRAND, sizes: ['48 (L)'],
    colors: ['gray'], season: 'winter', dealType: 'free', price: 0,
    currency: 'UZS', isUrgent: false, description: 'Тёплый свитер, отдам даром. Самовывоз.',
    location: { address: 'Яккасарай' },
    seller: { id: 'seed_seller_6', name: 'Зухра', phone: '+998906667788' },
    contactMethods: ['chat'], status: 'active', postedAt: '2026-06-16T16:00:00.000Z',
  },
  {
    id: 'seed_7', title: 'Пальто демисезонное', images: [img('mk-coat1'), img('mk-coat2')],
    category: 'COAT', condition: 'used_good', brand: 'Massimo Dutti', sizes: ['46 (M)'],
    colors: ['brown'], season: 'demi', dealType: 'sell', price: 420000,
    currency: 'UZS', isUrgent: false, description: 'Стильное пальто, отличное состояние.',
    location: { address: 'Центр', courier: true },
    seller: { id: 'seed_seller_7', name: 'Kamila', phone: '+998908889900', telegramUsername: 'kamila_wear' },
    contactMethods: ['chat', 'telegram'], status: 'active', postedAt: '2026-06-15T11:00:00.000Z',
  },
  {
    id: 'seed_8', title: 'Блузка белая офисная', images: [img('mk-blouse1')],
    category: 'SHIRTS_BLOUSES', condition: 'new_with_tag', brand: 'H&M', sizes: ['44 (S)'],
    colors: ['white'], season: 'all', dealType: 'sell', price: 70000,
    currency: 'UZS', isUrgent: false, description: 'Новая блузка с биркой, классический крой.',
    location: { address: 'Алмазар' },
    seller: { id: 'seed_seller_8', name: 'Sevara', phone: '+998902223344' },
    contactMethods: ['chat'], status: 'active', postedAt: '2026-06-14T08:00:00.000Z',
  },
];

// ── Draft → Listing ──────────────────────────────────────────────────────────
/**
 * Converts a wizard draft into a publishable listing, filling in id, postedAt,
 * status, and the seller block from the signed-in user. Caps the persisted
 * photos to MAX_STORED_PHOTOS to respect the localStorage quota.
 */
export function finalizeDraft(d: MarketDraft, sellerName?: string): MarketListing {
  const u = getUser();
  const contactMethods = (d.contactMethods && d.contactMethods.length > 0
    ? d.contactMethods
    : ['chat']) as MarketContactMethod[];
  return {
    id: `local_${Date.now()}`,
    title: (d.title ?? '').trim() || 'Без названия',
    images: (d.images ?? []).slice(0, MAX_STORED_PHOTOS),
    category: d.category ?? 'TSHIRTS_TOPS',
    condition: d.condition ?? 'used_good',
    // "Other brand" + a typed name → store the actual name; otherwise the value as-is.
    brand: d.brand === OTHER_BRAND ? (d.customBrand?.trim() || OTHER_BRAND) : d.brand,
    sizes: d.sizes,
    colors: d.colors,
    season: d.season,
    length: d.length,
    hijabFriendly: d.hijabFriendly,
    fit: d.fit,
    material: d.material,
    country: d.country,
    customAttrs: d.customAttrs,
    dealType: d.dealType ?? 'sell',
    price: d.dealType === 'free' ? 0 : d.price ?? 0,
    currency: d.currency ?? 'UZS',
    isUrgent: d.isUrgent ?? false,
    description: d.description,
    location: d.location ?? {},
    seller: {
      id: currentUserId(),
      name: sellerName || String(u?.username ?? u?.name ?? 'Продавец'),
      phone: (d.seller?.phone as string | undefined) ?? (u?.phone as string | undefined),
      telegramUsername: d.seller?.telegramUsername,
      avatarUrl: d.seller?.avatarUrl,
    },
    contactMethods,
    promoOptions: d.promoOptions,
    // New user listings go to review (no backend to approve them yet, so they
    // surface in "My listings" but not the public feed, which shows 'active').
    status: 'pending',
    postedAt: new Date().toISOString(),
  };
}

/** Idempotently seeds the feed so it isn't empty on first load. */
export function ensureSeeded(): void {
  if (!isBrowser()) return;
  if (localStorage.getItem(SEED_FLAG_KEY) === 'true') return;
  const existing = readListings();
  // Merge seeds in front of any user listings already present.
  const userListings = existing.filter((l) => !l.id.startsWith('seed_'));
  writeListings([...SEED_LISTINGS, ...userListings]);
  localStorage.setItem(SEED_FLAG_KEY, 'true');
}
