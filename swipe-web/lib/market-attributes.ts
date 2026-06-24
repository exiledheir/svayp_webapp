// ─── Market attribute option lists + category mapping ────────────────────────
// The labels for conditions / seasons / lengths / colors are resolved via i18n
// (mk_* keys); the arrays here hold the stable VALUES stored on a listing.
// Brands and sizes are proper nouns / universal tokens — kept as literals.

import type {
  Translations,
  Locale,
} from './translations';
import { WARDROBE_TAXONOMY, taxLabel } from '@/lib/wardrobe-taxonomy';
import type {
  MarketCondition,
  MarketSeason,
  MarketLength,
  MarketListingStatus,
} from '@/types/market';

// Re-export the taxonomy fit options so the market UI shares the closet's set.
export { FIT_TYPES } from '@/lib/wardrobe-taxonomy';

export const MARKET_CONDITIONS: MarketCondition[] = [
  'used_good',
  'used_visible',
  'used_defects',
  'new_with_tag',
];

export const MARKET_SEASONS: MarketSeason[] = ['demi', 'winter', 'summer', 'all'];

export const MARKET_LENGTHS: MarketLength[] = ['maxi', 'midi', 'mini'];

export interface MarketColor {
  key: string; // stored value + i18n suffix (mk_color_<key>)
  hex: string;
}

export const MARKET_COLORS: MarketColor[] = [
  { key: 'black', hex: '#000000' },
  { key: 'white', hex: '#FFFFFF' },
  { key: 'beige', hex: '#E8D9C0' },
  { key: 'gray', hex: '#9B9B9B' },
  { key: 'blue', hex: '#2E5BFF' },
  { key: 'lightblue', hex: '#7FB8E8' },
  { key: 'red', hex: '#E23B3B' },
  { key: 'green', hex: '#3BA55D' },
  { key: 'yellow', hex: '#F2C94C' },
  { key: 'pink', hex: '#F178B6' },
  { key: 'brown', hex: '#8B5A2B' },
  { key: 'purple', hex: '#8E5BD6' },
  { key: 'orange', hex: '#F2994A' },
  { key: 'multicolor', hex: 'linear-gradient(135deg,#f093fb,#5b8cff,#3ba55d)' },
];

export const MARKET_SIZES: string[] = [
  '40 (XXS)', '42 (XS)', '44 (S)', '46 (M)', '48 (L)', '50 (XL)',
  '52 (XXL)', '54 (3XL)', '56 (4XL)', '58 (5XL)', 'One size',
];

export const MARKET_SHOE_SIZES: string[] = [
  '35', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45',
];

// The two non-brand options ("No brand" / "Other brand") use stable sentinel
// VALUES with localized labels (see brandLabel); the rest are proper nouns that
// read the same in every language, so they stay as literals.
export const NO_BRAND = 'no_brand';
export const OTHER_BRAND = 'other_brand';

export const MARKET_BRANDS: string[] = [
  'Zara', 'H&M', 'Mango', 'Bershka', 'Pull&Bear', 'Uniqlo',
  'Nike', 'Adidas', 'Puma', 'Gloria Jeans', 'Befree', 'LC Waikiki',
  'Gucci', 'Prada', 'Massimo Dutti', '12storeez',
];

// ── Materials (most popular for UZ resale first) ─────────────────────────────
export const MARKET_MATERIALS: string[] = [
  'cotton', 'polyester', 'silk', 'linen', 'wool', 'chiffon', 'satin', 'velvet',
  'denim', 'leather', 'suede', 'jersey', 'modal', 'rayon', 'spandex', 'lycra',
  'nylon', 'viscose', 'bamboo', 'cashmere', 'mixed',
];

const MATERIAL_LABELS: Record<Locale, Record<string, string>> = {
  en: {
    cotton: 'Cotton', polyester: 'Polyester', silk: 'Silk', linen: 'Linen', wool: 'Wool',
    chiffon: 'Chiffon', satin: 'Satin', velvet: 'Velvet', denim: 'Denim', leather: 'Leather',
    suede: 'Suede', jersey: 'Jersey', modal: 'Modal', rayon: 'Rayon', spandex: 'Spandex',
    lycra: 'Lycra', nylon: 'Nylon', viscose: 'Viscose', bamboo: 'Bamboo', cashmere: 'Cashmere',
    mixed: 'Mixed',
  },
  ru: {
    cotton: 'Хлопок', polyester: 'Полиэстер', silk: 'Шёлк', linen: 'Лён', wool: 'Шерсть',
    chiffon: 'Шифон', satin: 'Атлас', velvet: 'Бархат', denim: 'Деним', leather: 'Кожа',
    suede: 'Замша', jersey: 'Джерси', modal: 'Модал', rayon: 'Район', spandex: 'Спандекс',
    lycra: 'Лайкра', nylon: 'Нейлон', viscose: 'Вискоза', bamboo: 'Бамбук', cashmere: 'Кашемир',
    mixed: 'Смешанный',
  },
  uz: {
    cotton: 'Paxta', polyester: 'Polyester', silk: 'Ipak', linen: 'Zigʻir', wool: 'Jun',
    chiffon: 'Shifon', satin: 'Atlas', velvet: 'Baxmal', denim: 'Denim', leather: 'Charm',
    suede: 'Zamsha', jersey: 'Jersi', modal: 'Modal', rayon: 'Rayon', spandex: 'Spandeks',
    lycra: 'Laykra', nylon: 'Neylon', viscose: 'Viskoza', bamboo: 'Bambuk', cashmere: 'Kashemir',
    mixed: 'Aralash',
  },
};

export function materialLabel(value: string, locale: Locale): string {
  return MATERIAL_LABELS[locale]?.[value] ?? MATERIAL_LABELS.en[value] ?? value;
}

// ── Country of origin (most popular for UZ first, then the rest of the world) ─
// Stored as ISO 3166-1 alpha-2 codes; names are localized at render time via
// Intl.DisplayNames, so we don't hand-maintain ~190 names × 3 languages.
const POPULAR_COUNTRIES = [
  'UZ', 'TR', 'CN', 'RU', 'KZ', 'KG', 'KR', 'TJ', 'TM', 'AE', 'IN', 'IT',
  'FR', 'DE', 'GB', 'US', 'JP', 'BD', 'PK', 'VN', 'ID', 'TH', 'PL', 'ES',
];
const ALL_COUNTRIES = [
  'AD', 'AE', 'AF', 'AG', 'AL', 'AM', 'AO', 'AR', 'AT', 'AU', 'AZ', 'BA', 'BB', 'BD', 'BE',
  'BF', 'BG', 'BH', 'BI', 'BJ', 'BN', 'BO', 'BR', 'BS', 'BT', 'BW', 'BY', 'BZ', 'CA', 'CD',
  'CG', 'CH', 'CI', 'CL', 'CM', 'CN', 'CO', 'CR', 'CU', 'CV', 'CY', 'CZ', 'DE', 'DJ', 'DK',
  'DM', 'DO', 'DZ', 'EC', 'EE', 'EG', 'ER', 'ES', 'ET', 'FI', 'FJ', 'FM', 'FR', 'GA', 'GB',
  'GD', 'GE', 'GH', 'GM', 'GN', 'GQ', 'GR', 'GT', 'GW', 'GY', 'HN', 'HR', 'HT', 'HU', 'ID',
  'IE', 'IL', 'IN', 'IQ', 'IR', 'IS', 'IT', 'JM', 'JO', 'JP', 'KE', 'KG', 'KH', 'KI', 'KM',
  'KN', 'KP', 'KR', 'KW', 'KZ', 'LA', 'LB', 'LC', 'LI', 'LK', 'LR', 'LS', 'LT', 'LU', 'LV',
  'LY', 'MA', 'MC', 'MD', 'ME', 'MG', 'MH', 'MK', 'ML', 'MM', 'MN', 'MR', 'MT', 'MU', 'MV',
  'MW', 'MX', 'MY', 'MZ', 'NA', 'NE', 'NG', 'NI', 'NL', 'NO', 'NP', 'NR', 'NZ', 'OM', 'PA',
  'PE', 'PG', 'PH', 'PK', 'PL', 'PT', 'PW', 'PY', 'QA', 'RO', 'RS', 'RU', 'RW', 'SA', 'SB',
  'SC', 'SD', 'SE', 'SG', 'SI', 'SK', 'SL', 'SM', 'SN', 'SO', 'SR', 'SS', 'ST', 'SV', 'SY',
  'SZ', 'TD', 'TG', 'TH', 'TJ', 'TL', 'TM', 'TN', 'TO', 'TR', 'TT', 'TV', 'TW', 'TZ', 'UA',
  'UG', 'US', 'UY', 'UZ', 'VA', 'VC', 'VE', 'VN', 'VU', 'WS', 'YE', 'ZA', 'ZM', 'ZW',
];

export const MARKET_COUNTRY_CODES: string[] = [
  ...POPULAR_COUNTRIES,
  ...ALL_COUNTRIES.filter((c) => !POPULAR_COUNTRIES.includes(c)),
];

type RegionNamer = { of(code: string): string | undefined };
function regionNamer(locale: Locale): RegionNamer | null {
  const DN = (Intl as unknown as { DisplayNames?: new (l: string[], o: { type: string }) => RegionNamer }).DisplayNames;
  if (!DN) return null;
  try { return new DN([locale], { type: 'region' }); } catch { return null; }
}

export function countryLabel(code: string, locale: Locale): string {
  return regionNamer(locale)?.of(code) ?? code;
}

/** Localized {value,label} list for the country picker (one namer instance). */
export function countryOptions(locale: Locale): { value: string; label: string }[] {
  const dn = regionNamer(locale);
  return MARKET_COUNTRY_CODES.map((code) => ({ value: code, label: dn?.of(code) ?? code }));
}

// ── Categories ──────────────────────────────────────────────────────────────
// Sourced from the same wardrobe taxonomy the closet uses (single source of
// truth), so the Market offers exactly the closet's sections/subcategories.
// Only stable taxonomy KEYS are stored here; display labels are resolved per
// locale at render time via categoryLabel()/categoryParentLabel().
export interface MarketCategory {
  key: string; // taxonomy subcategory value (e.g. 'SKIRTS'); stored on listings
  section: string; // taxonomy section value (drives attribute flags)
  parentKey: string; // taxonomy value whose localized label shows as the parent
}

export const MARKET_CATEGORIES: MarketCategory[] = [
  ...WARDROBE_TAXONOMY.flatMap((section) =>
    section.subcategories.map((sub) => ({
      key: sub.value,
      section: section.value,
      parentKey: section.value,
    })),
  ),
  // Market-only category (not part of the closet taxonomy); shown under Accessories.
  { key: 'UNDERWEAR', section: 'UNDERWEAR', parentKey: 'ACCESSORIES' },
];

export function getCategory(key: string | undefined): MarketCategory | undefined {
  if (!key) return undefined;
  return MARKET_CATEGORIES.find((c) => c.key === key);
}

/** Localized label for a category key (e.g. 'SKIRTS' → 'Юбки' / 'Skirts'). */
export function categoryLabel(key: string | undefined, locale: Locale): string {
  return taxLabel(key, locale);
}

/** Localized parent/section label shown under a category (e.g. 'Accessories'). */
export function categoryParentLabel(cat: MarketCategory | undefined, locale: Locale): string {
  return cat ? taxLabel(cat.parentKey, locale) : '';
}

// ── Meeting-place regions (UZ) ───────────────────────────────────────────────
// The listing's meeting place is just the seller's region (no precise address /
// map). Stored as a stable key; names are localized at render time.
export const MARKET_REGIONS: string[] = [
  'tashkent_city', 'tashkent_region', 'andijan', 'bukhara', 'fergana',
  'jizzakh', 'namangan', 'navoi', 'kashkadarya', 'samarkand', 'sirdarya',
  'surkhandarya', 'khorezm', 'karakalpakstan',
];

const REGION_LABELS: Record<Locale, Record<string, string>> = {
  en: {
    tashkent_city: 'Tashkent (city)', tashkent_region: 'Tashkent region',
    andijan: 'Andijan', bukhara: 'Bukhara', fergana: 'Fergana', jizzakh: 'Jizzakh',
    namangan: 'Namangan', navoi: 'Navoi', kashkadarya: 'Kashkadarya',
    samarkand: 'Samarkand', sirdarya: 'Sirdarya', surkhandarya: 'Surkhandarya',
    khorezm: 'Khorezm', karakalpakstan: 'Karakalpakstan',
  },
  ru: {
    tashkent_city: 'Ташкент (город)', tashkent_region: 'Ташкентская область',
    andijan: 'Андижанская область', bukhara: 'Бухарская область',
    fergana: 'Ферганская область', jizzakh: 'Джизакская область',
    namangan: 'Наманганская область', navoi: 'Навоийская область',
    kashkadarya: 'Кашкадарьинская область', samarkand: 'Самаркандская область',
    sirdarya: 'Сырдарьинская область', surkhandarya: 'Сурхандарьинская область',
    khorezm: 'Хорезмская область', karakalpakstan: 'Республика Каракалпакстан',
  },
  uz: {
    tashkent_city: 'Toshkent (shahar)', tashkent_region: 'Toshkent viloyati',
    andijan: 'Andijon viloyati', bukhara: 'Buxoro viloyati',
    fergana: "Fargʻona viloyati", jizzakh: 'Jizzax viloyati',
    namangan: 'Namangan viloyati', navoi: 'Navoiy viloyati',
    kashkadarya: 'Qashqadaryo viloyati', samarkand: 'Samarqand viloyati',
    sirdarya: 'Sirdaryo viloyati', surkhandarya: 'Surxondaryo viloyati',
    khorezm: 'Xorazm viloyati', karakalpakstan: "Qoraqalpogʻiston Respublikasi",
  },
};

export function regionLabel(key: string | undefined, locale: Locale): string {
  if (!key) return '';
  return REGION_LABELS[locale]?.[key] ?? REGION_LABELS.en[key] ?? key;
}

// ── Which attribute rows a category shows ────────────────────────────────────
export interface CategoryAttributeFlags {
  showCondition: boolean;
  showBrand: boolean;
  showSize: boolean;
  showSeason: boolean;
  showLength: boolean;
  showColor: boolean;
  shoeSizes: boolean; // use MARKET_SHOE_SIZES instead of MARKET_SIZES
  showModesty: boolean; // «Подходит для покрытых» (clothing only)
  showFit: boolean; // fit type (clothing only)
  showMaterial: boolean; // optional, all categories
  showCountry: boolean; // optional, all categories
}

export function attributesForCategory(key: string | undefined): CategoryAttributeFlags {
  const base: CategoryAttributeFlags = {
    showCondition: true,
    showBrand: true,
    showSize: true,
    showSeason: true,
    showLength: false,
    showColor: true,
    shoeSizes: false,
    showModesty: true,
    showFit: true,
    showMaterial: true,
    showCountry: true,
  };
  const section = getCategory(key)?.section;
  // Modesty / fit apply to garments, not footwear or accessories.
  if (section === 'FOOTWEAR') return { ...base, shoeSizes: true, showModesty: false, showFit: false };
  if (section === 'ACCESSORIES') return { ...base, showSize: false, showSeason: false, showModesty: false, showFit: false };
  // Underwear: size + brand + color + material, but no season / modesty / fit.
  if (section === 'UNDERWEAR') return { ...base, showSeason: false, showModesty: false, showFit: false };
  if (key === 'SKIRTS' || key === 'DRESSES') return { ...base, showLength: true };
  return base;
}

// ── Mock "AI" category suggestion (keyword heuristic over the title) ──────────
const KEYWORD_MAP: Array<{ rx: RegExp; key: string }> = [
  { rx: /(юбк|skirt|yubka)/i, key: 'SKIRTS' },
  { rx: /(плать|dress|koylak|ko'ylak)/i, key: 'DRESSES' },
  { rx: /(джинс|брюк|штан|jean|pant|trouser|shim)/i, key: 'TROUSERS_JEANS' },
  { rx: /(шорт|short)/i, key: 'SHORTS' },
  { rx: /(рубашк|блуз|shirt|blouse|tunika|туник)/i, key: 'SHIRTS_BLOUSES' },
  { rx: /(футболк|майк|топ|tshirt|t-shirt|top|polo|поло)/i, key: 'TSHIRTS_TOPS' },
  { rx: /(свитер|кофт|худи|кардиган|водолазк|hoodie|sweater|cardigan)/i, key: 'SWEATERS_KNITS' },
  { rx: /(пуховик|puffer)/i, key: 'PUFFER' },
  { rx: /(тренч|trench)/i, key: 'TRENCH' },
  { rx: /(пальт|coat)/i, key: 'COAT' },
  { rx: /(куртк|jacket)/i, key: 'JACKET' },
  { rx: /(комбинезон|костюм|двойк|тройк|set|suit|jumpsuit)/i, key: 'SETS' },
  { rx: /(кроссовк|sneaker)/i, key: 'SNEAKERS' },
  { rx: /(сапог|high.?boot)/i, key: 'HIGH_BOOTS' },
  { rx: /(ботин|ankle.?boot)/i, key: 'ANKLE_BOOTS' },
  { rx: /(каблук|heel)/i, key: 'HEELS' },
  { rx: /(туфл|pump)/i, key: 'PUMPS' },
  { rx: /(сандал|sandal)/i, key: 'SANDALS' },
  { rx: /(балетк|flat)/i, key: 'FLATS' },
  { rx: /(сумк|рюкзак|bag|backpack)/i, key: 'BAGS' },
  { rx: /(серьг|кольц|браслет|цепочк|час[ыо]|украшен|jewel|ring|earring|watch)/i, key: 'JEWELRY' },
  { rx: /(платок|хиджаб|hijab|headscarf)/i, key: 'HEADSCARF_HIJAB' },
  { rx: /(шарф|scarf)/i, key: 'SCARF' },
  { rx: /(очк|glass)/i, key: 'GLASSES' },
  { rx: /(ремен|belt)/i, key: 'BELT' },
  { rx: /(бель[её]|трус|бюстгальтер|нижнее|underwear|lingerie|bra|ichki kiyim)/i, key: 'UNDERWEAR' },
];

/**
 * Mock AI category suggestion from the listing title. Returns null when nothing
 * matches — callers must not fall back to a default category (we no longer
 * pre-fill "Юбки"); the user picks one explicitly instead.
 */
export function suggestCategory(title: string | undefined): MarketCategory | null {
  const t = (title ?? '').trim();
  if (!t) return null;
  for (const { rx, key } of KEYWORD_MAP) {
    if (rx.test(t)) {
      const c = getCategory(key);
      if (c) return c;
    }
  }
  return null;
}

// ── i18n label helpers ───────────────────────────────────────────────────────
/** Brand display: localize the two sentinel options; proper nouns pass through. */
export function brandLabel(value: string | undefined, t: Translations): string {
  if (!value) return '';
  if (value === NO_BRAND) return t.mk_brand_none;
  if (value === OTHER_BRAND) return t.mk_brand_other;
  return value;
}

/** Size display: only 'One size' needs translating; numeric sizes are universal. */
export function sizeLabel(value: string | undefined, t: Translations): string {
  if (!value) return '';
  return value === 'One size' ? t.mk_size_one : value;
}

/** Localized label for a listing's lifecycle status. */
export function statusLabel(t: Translations, s: MarketListingStatus): string {
  return {
    draft: t.mk_draft_label,
    pending: t.mk_status_review,
    active: t.mk_status_active,
    sold: t.mk_status_sold,
    archived: t.mk_status_archived,
    rejected: t.mk_status_rejected,
  }[s];
}

export function conditionLabel(t: Translations, c: MarketCondition): string {
  return {
    used_good: t.mk_cond_used_good,
    used_visible: t.mk_cond_used_visible,
    used_defects: t.mk_cond_used_defects,
    new_with_tag: t.mk_cond_new_with_tag,
  }[c];
}

export function seasonLabel(t: Translations, s: MarketSeason): string {
  return {
    demi: t.mk_season_demi,
    winter: t.mk_season_winter,
    summer: t.mk_season_summer,
    all: t.mk_season_all,
  }[s];
}

export function lengthLabel(t: Translations, l: MarketLength): string {
  return { maxi: t.mk_length_maxi, midi: t.mk_length_midi, mini: t.mk_length_mini }[l];
}

export function colorLabel(t: Translations, key: string): string {
  const map: Record<string, string> = {
    black: t.mk_color_black,
    white: t.mk_color_white,
    beige: t.mk_color_beige,
    gray: t.mk_color_gray,
    blue: t.mk_color_blue,
    lightblue: t.mk_color_lightblue,
    red: t.mk_color_red,
    green: t.mk_color_green,
    yellow: t.mk_color_yellow,
    pink: t.mk_color_pink,
    brown: t.mk_color_brown,
    purple: t.mk_color_purple,
    orange: t.mk_color_orange,
    multicolor: t.mk_color_multicolor,
  };
  return map[key] ?? key;
}
