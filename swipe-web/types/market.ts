// ─── Market (C2C) domain types ───────────────────────────────────────────────
// A user-to-user clothing marketplace ("объявления"). Distinct from the B2B
// Shop (partner products). No backend yet — listings live in localStorage
// (see lib/market-storage.ts). Modelled loosely on the Product type but with
// resale-specific attributes (condition, brand, season, deal type, location).

export type MarketCondition =
  | 'used_good' // Б/у (отличное, как новое)
  | 'used_visible' // Б/у (есть следы носки)
  | 'used_defects' // Б/у (есть заметные дефекты)
  | 'new_with_tag'; // Новое (с биркой, в упаковке)

export type MarketSeason = 'demi' | 'winter' | 'summer' | 'all';
export type MarketLength = 'maxi' | 'midi' | 'mini';
export type MarketCurrency = 'UZS' | 'USD'; // Сум / у.е.
export type MarketDealType = 'sell' | 'free'; // Указать цену / Отдам даром
export type MarketListingStatus = 'draft' | 'pending' | 'active' | 'sold' | 'archived' | 'rejected';
export type MarketContactMethod = 'chat' | 'phone' | 'telegram';

export interface MarketLocation {
  region?: string; // UZ region key — see MARKET_REGIONS in lib/market-attributes
  district?: string; // district (район/tuman) key within the region
  address?: string;
  landmark?: string; // ориентир
  latitude?: number;
  longitude?: number;
  courier?: boolean; // Готов отправить курьером
}

export interface MarketSeller {
  id: string;
  name: string;
  phone?: string; // +998…
  telegramUsername?: string; // optional; usually absent → share-link fallback
  avatarUrl?: string;
}

export interface MarketListing {
  id: string; // `local_${Date.now()}` (user) or `seed_*` (mock feed)
  title: string;
  images: string[]; // remote URLs (seed) or compressed dataURLs (user)
  category: string; // MARKET_CATEGORIES key
  condition: MarketCondition;
  brand?: string;
  size?: string; // e.g. '46 (M)'
  color?: string; // MARKET_COLORS key
  season?: MarketSeason;
  length?: MarketLength;
  hijabFriendly?: boolean; // «Подходит для покрытых» (Да/Нет)
  fit?: string; // taxonomy fit: 'REGULAR' | 'LOOSE' | 'SLIM'
  material?: string; // MATERIALS key
  country?: string; // ISO 3166-1 alpha-2 country-of-origin code
  customAttrs?: Record<string, string | boolean>;
  dealType: MarketDealType;
  price: number; // 0 when free
  currency: MarketCurrency;
  isUrgent: boolean; // Продам срочно. Торг
  description?: string;
  location: MarketLocation;
  seller: MarketSeller;
  contactMethods: MarketContactMethod[]; // default ['chat']
  promoOptions?: string[]; // mocked promo keys
  status: MarketListingStatus;
  postedAt: string; // ISO
  isFavorite?: boolean; // resolved at read time from favorites store
}

// A work-in-progress listing held by the create wizard. Everything optional
// except the id + updatedAt bookkeeping fields.
export interface MarketDraft extends Partial<Omit<MarketListing, 'id'>> {
  id: string;
  updatedAt: string;
  /** Free-text brand typed by the user when "Other brand" is chosen. */
  customBrand?: string;
}

/** A fresh, empty draft for the create wizard. */
export function emptyDraft(): MarketDraft {
  return {
    id: `draft_${Date.now()}`,
    updatedAt: new Date().toISOString(),
    images: [],
    dealType: 'sell',
    currency: 'UZS',
    price: 0,
    isUrgent: false,
    contactMethods: ['chat'],
    location: {},
    customAttrs: {},
  };
}
