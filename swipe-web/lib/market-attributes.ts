// ─── Market attribute option lists + category mapping ────────────────────────
// The labels for conditions / seasons / lengths / colors are resolved via i18n
// (mk_* keys); the arrays here hold the stable VALUES stored on a listing.
// Brands and sizes are proper nouns / universal tokens — kept as literals.

import type {
  Translations,
} from './translations';
import type {
  MarketCondition,
  MarketSeason,
  MarketLength,
} from '@/types/market';

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

export const MARKET_BRANDS: string[] = [
  'Без бренда', 'Zara', 'H&M', 'Mango', 'Bershka', 'Pull&Bear', 'Uniqlo',
  'Nike', 'Adidas', 'Puma', 'Gloria Jeans', 'Befree', 'LC Waikiki',
  'Gucci', 'Prada', 'Massimo Dutti', '12storeez', 'Другая марка',
];

// ── Categories ──────────────────────────────────────────────────────────────
export interface MarketCategory {
  key: string;
  label: string; // RU label (display); kept inline since these are localized in the AI-style card
  parent: string;
}

export const MARKET_CATEGORIES: MarketCategory[] = [
  { key: 'skirts', label: 'Юбки', parent: 'Женская одежда' },
  { key: 'dresses', label: 'Платья', parent: 'Женская одежда' },
  { key: 'tops', label: 'Топы и футболки', parent: 'Женская одежда' },
  { key: 'blouses', label: 'Блузки и рубашки', parent: 'Женская одежда' },
  { key: 'pants', label: 'Брюки', parent: 'Женская одежда' },
  { key: 'jeans', label: 'Джинсы', parent: 'Женская одежда' },
  { key: 'outerwear', label: 'Верхняя одежда', parent: 'Женская одежда' },
  { key: 'knitwear', label: 'Свитеры и кофты', parent: 'Женская одежда' },
  { key: 'mens', label: 'Мужская одежда', parent: 'Одежда' },
  { key: 'kids', label: 'Детская одежда', parent: 'Одежда' },
  { key: 'shoes', label: 'Обувь', parent: 'Обувь и аксессуары' },
  { key: 'bags', label: 'Сумки', parent: 'Обувь и аксессуары' },
  { key: 'accessories', label: 'Аксессуары', parent: 'Обувь и аксессуары' },
];

export function getCategory(key: string | undefined): MarketCategory | undefined {
  if (!key) return undefined;
  return MARKET_CATEGORIES.find((c) => c.key === key);
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
  };
  switch (key) {
    case 'skirts':
    case 'dresses':
      return { ...base, showLength: true };
    case 'shoes':
      return { ...base, shoeSizes: true, showLength: false };
    case 'bags':
    case 'accessories':
      return { ...base, showSize: false, showSeason: false };
    default:
      return base;
  }
}

// ── Mock "AI" category suggestion (keyword heuristic over the title) ──────────
const KEYWORD_MAP: Array<{ rx: RegExp; key: string }> = [
  { rx: /(юбк|skirt|yubka)/i, key: 'skirts' },
  { rx: /(плать|dress|koylak|ko'ylak)/i, key: 'dresses' },
  { rx: /(джинс|jean)/i, key: 'jeans' },
  { rx: /(брюк|штан|pant|trouser)/i, key: 'pants' },
  { rx: /(рубашк|блуз|shirt|blouse)/i, key: 'blouses' },
  { rx: /(футболк|топ|tshirt|t-shirt|top)/i, key: 'tops' },
  { rx: /(свитер|кофт|худи|hoodie|sweater)/i, key: 'knitwear' },
  { rx: /(куртк|пальт|пуховик|jacket|coat)/i, key: 'outerwear' },
  { rx: /(кроссовк|туфл|ботин|обув|shoe|sneaker|boot)/i, key: 'shoes' },
  { rx: /(сумк|рюкзак|bag|backpack)/i, key: 'bags' },
];

/** Mock AI category suggestion from the listing title. */
export function suggestCategory(title: string | undefined): MarketCategory {
  const t = (title ?? '').trim();
  for (const { rx, key } of KEYWORD_MAP) {
    if (rx.test(t)) {
      const c = getCategory(key);
      if (c) return c;
    }
  }
  return MARKET_CATEGORIES[0]; // default → Юбки (matches the screenshot demo)
}

// ── i18n label helpers ───────────────────────────────────────────────────────
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
