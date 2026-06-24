// Wardrobe taxonomy (migration V96) — single source of truth for the richer
// upload/edit options on the web. The backend accepts the legacy flat category
// model too, so this layer is purely additive: a user picks a Section → Type
// (subcategory) and, where applicable, an itemType / length / fit. Everything
// except section + subcategory is optional.
//
// The legacy local ClosetItem model (ClosetCategory) is still used for layout
// and grouping, so every subcategory maps back to a local category here.

import type { Locale } from '@/lib/translations';
import type {
  WardrobeSection,
  WardrobeSubcategory,
  WardrobeItemType,
  WardrobeLength,
  WardrobeFitType,
} from '@/types';
import type { ClosetCategory } from '@/lib/closet-storage';

export type CanvasGroupKey = 'upper' | 'lower' | 'shoes' | 'acc';

export interface SubcategoryDef {
  value: WardrobeSubcategory;
  /** Local category used for layout/grouping/filtering. */
  local: ClosetCategory;
  /** Garment subtypes, where the taxonomy defines them. */
  itemTypes?: WardrobeItemType[];
  /** Curated length/cut options for this type. */
  lengths?: WardrobeLength[];
  /** Whether a fit chip (regular/loose/slim) is offered. */
  hasFit?: boolean;
}

export interface SectionDef {
  value: WardrobeSection;
  group: CanvasGroupKey;
  subcategories: SubcategoryDef[];
}

export const FIT_TYPES: WardrobeFitType[] = ['REGULAR', 'LOOSE', 'SLIM'];

export const WARDROBE_TAXONOMY: SectionDef[] = [
  {
    value: 'TOPS',
    group: 'upper',
    subcategories: [
      { value: 'TSHIRTS_TOPS',  local: 'tshirts', itemTypes: ['T_SHIRT', 'TANK_TOP', 'TOP', 'LONGSLEEVE', 'POLO'], hasFit: true },
      { value: 'SHIRTS_BLOUSES', local: 'blouses', itemTypes: ['SHIRT', 'BLOUSE', 'TUNIC'], hasFit: true },
      { value: 'SWEATERS_KNITS', local: 'tops',    itemTypes: ['SWEATER', 'HOODIE', 'CARDIGAN', 'TURTLENECK', 'VEST'], hasFit: true },
    ],
  },
  {
    value: 'BOTTOMS',
    group: 'lower',
    subcategories: [
      { value: 'SKIRTS',         local: 'skirts', lengths: ['MINI', 'MIDI', 'MAXI', 'KNEE_LENGTH', 'ABOVE_KNEE', 'FLOOR_LENGTH', 'TEA_LENGTH'] },
      { value: 'TROUSERS_JEANS', local: 'pants',  lengths: ['STRAIGHT', 'SKINNY', 'FLARED', 'ANKLE'], hasFit: true },
      { value: 'SHORTS',         local: 'shorts', lengths: ['MINI', 'BERMUDA', 'KNEE_LENGTH'] },
      { value: 'LEGGINGS_TRIKO', local: 'pants',  lengths: ['ANKLE', 'FLOOR_LENGTH'] },
    ],
  },
  {
    value: 'DRESSES_SETS',
    group: 'upper',
    subcategories: [
      { value: 'DRESSES', local: 'dresses',   lengths: ['MINI', 'MIDI', 'MAXI', 'KNEE_LENGTH', 'ABOVE_KNEE', 'FLOOR_LENGTH', 'TEA_LENGTH'], hasFit: true },
      { value: 'SETS',    local: 'jumpsuits', itemTypes: ['DUO', 'TRIO', 'SUIT', 'JUMPSUIT'], hasFit: true },
    ],
  },
  {
    value: 'OUTERWEAR',
    group: 'upper',
    subcategories: [
      { value: 'JACKET', local: 'jackets', hasFit: true },
      { value: 'COAT',   local: 'jackets', lengths: ['MIDI', 'MAXI', 'KNEE_LENGTH'], hasFit: true },
      { value: 'PUFFER', local: 'jackets', hasFit: true },
      { value: 'TRENCH', local: 'jackets', lengths: ['MIDI', 'MAXI', 'KNEE_LENGTH'], hasFit: true },
    ],
  },
  {
    value: 'FOOTWEAR',
    group: 'shoes',
    subcategories: [
      { value: 'PUMPS',       local: 'heels' },
      { value: 'SNEAKERS',    local: 'sneakers' },
      { value: 'HEELS',       local: 'heels' },
      { value: 'ANKLE_BOOTS', local: 'boots' },
      { value: 'SANDALS',     local: 'sandals' },
      { value: 'HIGH_BOOTS',  local: 'boots' },
      { value: 'FLATS',       local: 'flats' },
    ],
  },
  {
    value: 'ACCESSORIES',
    group: 'acc',
    subcategories: [
      { value: 'BAGS',            local: 'bags' },
      { value: 'HEADSCARF_HIJAB', local: 'shawl' },
      { value: 'SCARF',           local: 'shawl' },
      { value: 'GLASSES',         local: 'accessories' },
      { value: 'HEADWEAR',        local: 'accessories' },
      { value: 'JEWELRY',         local: 'jewelry', itemTypes: ['EARRINGS', 'BRACELET', 'CHAIN', 'RING', 'WATCH'] },
      { value: 'BELT',            local: 'accessories' },
    ],
  },
];

// ── Lookups ────────────────────────────────────────────────────────────────────

const SUB_DEFS: Record<string, SubcategoryDef> = {};
const SUB_TO_SECTION: Record<string, WardrobeSection> = {};
for (const section of WARDROBE_TAXONOMY) {
  for (const sub of section.subcategories) {
    SUB_DEFS[sub.value] = sub;
    SUB_TO_SECTION[sub.value] = section.value;
  }
}

export function getSection(section: WardrobeSection): SectionDef | undefined {
  return WARDROBE_TAXONOMY.find((s) => s.value === section);
}

export function getSubcategoryDef(sub: WardrobeSubcategory): SubcategoryDef | undefined {
  return SUB_DEFS[sub];
}

export function sectionForSubcategory(sub: WardrobeSubcategory): WardrobeSection | undefined {
  return SUB_TO_SECTION[sub];
}

// Map a (new or legacy) subcategory to the local layout category. Falls back to
// 'accessories' for anything unrecognised.
const LEGACY_SUB_TO_LOCAL: Record<string, ClosetCategory> = {
  TOPS: 'tops', TSHIRTS: 'tshirts', BLOUSES: 'blouses', DRESSES: 'dresses',
  JUMPSUITS: 'jumpsuits', JACKETS: 'jackets', SKIRTS: 'skirts', JEANS: 'jeans',
  PANTS: 'pants', SHORTS: 'shorts', SHOES: 'shoes', SNEAKERS: 'sneakers',
  HEELS: 'heels', BOOTS: 'boots', SANDALS: 'sandals', FLATS: 'flats',
  BAGS: 'bags', ACCESSORIES: 'accessories', SHAWL: 'shawl', JEWELRY: 'jewelry',
  UNDERWEAR: 'underwear',
};

export function subcategoryToLocal(sub: WardrobeSubcategory): ClosetCategory {
  return SUB_DEFS[sub]?.local ?? LEGACY_SUB_TO_LOCAL[sub] ?? 'accessories';
}

// Section → canvas group, for constraining the onboarding flow & default section.
export function groupForSection(section: WardrobeSection): CanvasGroupKey {
  return getSection(section)?.group ?? 'acc';
}

const GROUP_TO_SECTIONS: Record<CanvasGroupKey, WardrobeSection[]> = {
  upper: ['TOPS', 'DRESSES_SETS', 'OUTERWEAR'],
  lower: ['BOTTOMS'],
  shoes: ['FOOTWEAR'],
  acc: ['ACCESSORIES'],
};

export function sectionsForGroup(group: CanvasGroupKey): WardrobeSection[] {
  return GROUP_TO_SECTIONS[group] ?? [];
}

// All subcategories belonging to a canvas group — used to build the closet's
// per-section filter chips from the new taxonomy.
export function subcategoriesForGroup(group: CanvasGroupKey): WardrobeSubcategory[] {
  return sectionsForGroup(group).flatMap((s) => getSection(s)?.subcategories.map((sub) => sub.value) ?? []);
}

// The "Type" chips for a single section.
export function subcategoriesForSection(section: WardrobeSection): WardrobeSubcategory[] {
  return getSection(section)?.subcategories.map((sub) => sub.value) ?? [];
}

// The six sections, in display order.
export const SECTION_ORDER: WardrobeSection[] = WARDROBE_TAXONOMY.map((s) => s.value);

// Best-effort reverse map (legacy local category → a representative subcategory)
// so pre-migration items still land under the right chip in the closet.
const LOCAL_TO_SUB: Record<ClosetCategory, WardrobeSubcategory> = {
  tops: 'TSHIRTS_TOPS', tshirts: 'TSHIRTS_TOPS', blouses: 'SHIRTS_BLOUSES',
  dresses: 'DRESSES', jumpsuits: 'SETS', jackets: 'JACKET',
  skirts: 'SKIRTS', jeans: 'TROUSERS_JEANS', pants: 'TROUSERS_JEANS', shorts: 'SHORTS',
  shoes: 'SNEAKERS', sneakers: 'SNEAKERS', heels: 'HEELS', boots: 'ANKLE_BOOTS',
  sandals: 'SANDALS', flats: 'FLATS',
  bags: 'BAGS', accessories: 'GLASSES', shawl: 'HEADSCARF_HIJAB', jewelry: 'JEWELRY', underwear: 'BELT',
};

export function localToSubcategory(local: ClosetCategory): WardrobeSubcategory {
  return LOCAL_TO_SUB[local] ?? 'BAGS';
}

// ── Labels (en / ru / uz) ────────────────────────────────────────────────────────
// RU labels follow the official taxonomy doc; en/uz are localized equivalents.

type LabelMap = Record<string, string>;

const LABELS_EN: LabelMap = {
  // sections
  TOPS: 'Tops', BOTTOMS: 'Bottoms', DRESSES_SETS: 'Dresses & Sets',
  OUTERWEAR: 'Outerwear', FOOTWEAR: 'Footwear', ACCESSORIES: 'Accessories',
  // subcategories
  TSHIRTS_TOPS: 'T-Shirts & Tops', SHIRTS_BLOUSES: 'Shirts & Blouses', SWEATERS_KNITS: 'Sweaters & Knits',
  SKIRTS: 'Skirts', TROUSERS_JEANS: 'Trousers & Jeans', SHORTS: 'Shorts', LEGGINGS_TRIKO: 'Leggings',
  DRESSES: 'Dresses', SETS: 'Sets',
  JACKET: 'Jacket', COAT: 'Coat', PUFFER: 'Puffer', TRENCH: 'Trench',
  SNEAKERS: 'Sneakers', HEELS: 'Heels', PUMPS: 'Pumps', ANKLE_BOOTS: 'Ankle Boots', SANDALS: 'Sandals', HIGH_BOOTS: 'High Boots', FLATS: 'Flats',
  BAGS: 'Bags', HEADSCARF_HIJAB: 'Headscarf / Hijab', SCARF: 'Scarf', GLASSES: 'Glasses', HEADWEAR: 'Headwear', JEWELRY: 'Jewelry', BELT: 'Belt', UNDERWEAR: 'Underwear',
  // itemTypes
  T_SHIRT: 'T-Shirt', TANK_TOP: 'Tank Top', TOP: 'Top', LONGSLEEVE: 'Longsleeve', POLO: 'Polo',
  SHIRT: 'Shirt', BLOUSE: 'Blouse', TUNIC: 'Tunic',
  SWEATER: 'Sweater', HOODIE: 'Hoodie', CARDIGAN: 'Cardigan', TURTLENECK: 'Turtleneck', VEST: 'Vest',
  DUO: 'Duo', TRIO: 'Trio', SUIT: 'Suit', JUMPSUIT: 'Jumpsuit',
  EARRINGS: 'Earrings', BRACELET: 'Bracelet', CHAIN: 'Chain', RING: 'Ring', WATCH: 'Watch',
  // lengths
  MINI: 'Mini', MIDI: 'Midi', MAXI: 'Maxi', KNEE_LENGTH: 'Knee length', ABOVE_KNEE: 'Above knee',
  ANKLE: 'Ankle', FLOOR_LENGTH: 'Floor length', BERMUDA: 'Bermuda', STRAIGHT: 'Straight',
  FLARED: 'Flared', SKINNY: 'Skinny', TEA_LENGTH: 'Tea length',
  // fits
  REGULAR: 'Regular', LOOSE: 'Loose', SLIM: 'Slim',
};

const LABELS_RU: LabelMap = {
  TOPS: 'Верх', BOTTOMS: 'Низ', DRESSES_SETS: 'Платья и Комплекты',
  OUTERWEAR: 'Верхняя одежда', FOOTWEAR: 'Обувь', ACCESSORIES: 'Аксессуары',
  TSHIRTS_TOPS: 'Футболки и Топы', SHIRTS_BLOUSES: 'Рубашки и Блузки', SWEATERS_KNITS: 'Свитеры и Кофты',
  SKIRTS: 'Юбки', TROUSERS_JEANS: 'Брюки и Джинсы', SHORTS: 'Шорты', LEGGINGS_TRIKO: 'Трико',
  DRESSES: 'Платья', SETS: 'Комплекты',
  JACKET: 'Куртка', COAT: 'Пальто', PUFFER: 'Пуховик', TRENCH: 'Тренч',
  SNEAKERS: 'Кроссовки', HEELS: 'Каблуки', PUMPS: 'Туфли', ANKLE_BOOTS: 'Ботинки', SANDALS: 'Сандали', HIGH_BOOTS: 'Сапоги', FLATS: 'Балетки',
  BAGS: 'Сумка', HEADSCARF_HIJAB: 'Платок/Хиджаб', SCARF: 'Шарф', GLASSES: 'Очки', HEADWEAR: 'Головной убор', JEWELRY: 'Украшения', BELT: 'Ремень', UNDERWEAR: 'Бельё',
  T_SHIRT: 'Футболка', TANK_TOP: 'Майка', TOP: 'Топ', LONGSLEEVE: 'Лонгслив', POLO: 'Поло',
  SHIRT: 'Рубашка', BLOUSE: 'Блузка', TUNIC: 'Туника',
  SWEATER: 'Свитер', HOODIE: 'Худи', CARDIGAN: 'Кардиган', TURTLENECK: 'Водолазка', VEST: 'Жилет',
  DUO: 'Двойка', TRIO: 'Тройка', SUIT: 'Костюм', JUMPSUIT: 'Комбинезон',
  EARRINGS: 'Серьги', BRACELET: 'Браслет', CHAIN: 'Цепочка', RING: 'Кольцо', WATCH: 'Часы',
  MINI: 'Мини', MIDI: 'Миди', MAXI: 'Макси', KNEE_LENGTH: 'До колена', ABOVE_KNEE: 'Выше колена',
  ANKLE: 'Укороченные', FLOOR_LENGTH: 'В пол', BERMUDA: 'Бермуды', STRAIGHT: 'Прямые',
  FLARED: 'Клёш', SKINNY: 'Скинни', TEA_LENGTH: 'По середину икр',
  REGULAR: 'Обычный', LOOSE: 'Свободный', SLIM: 'Облегающий',
};

const LABELS_UZ: LabelMap = {
  TOPS: 'Ustki kiyim', BOTTOMS: 'Pastki kiyim', DRESSES_SETS: 'Koʻylak va Komplektlar',
  OUTERWEAR: 'Yuqori kiyim', FOOTWEAR: 'Poyabzal', ACCESSORIES: 'Aksessuarlar',
  TSHIRTS_TOPS: 'Futbolka va Toplar', SHIRTS_BLOUSES: 'Koʻylak va Bluzkalar', SWEATERS_KNITS: 'Sviter va Kofta',
  SKIRTS: 'Yubkalar', TROUSERS_JEANS: 'Shim va Jinsi', SHORTS: 'Shortilar', LEGGINGS_TRIKO: 'Triko',
  DRESSES: 'Koʻylaklar', SETS: 'Komplektlar',
  JACKET: 'Kurtka', COAT: 'Palto', PUFFER: 'Puxovik', TRENCH: 'Trench',
  SNEAKERS: 'Krossovkalar', HEELS: 'Poshnali', PUMPS: 'Tufli', ANKLE_BOOTS: 'Botinka', SANDALS: 'Sandal', HIGH_BOOTS: 'Etik', FLATS: 'Baletka',
  BAGS: 'Sumka', HEADSCARF_HIJAB: 'Roʻmol/Hijob', SCARF: 'Sharf', GLASSES: 'Koʻzoynak', HEADWEAR: 'Bosh kiyim', JEWELRY: 'Taqinchoqlar', BELT: 'Kamar', UNDERWEAR: 'Ichki kiyim',
  T_SHIRT: 'Futbolka', TANK_TOP: 'Mayka', TOP: 'Top', LONGSLEEVE: 'Longsliv', POLO: 'Polo',
  SHIRT: 'Koʻylak', BLOUSE: 'Bluzka', TUNIC: 'Tunika',
  SWEATER: 'Sviter', HOODIE: 'Xudi', CARDIGAN: 'Kardigan', TURTLENECK: 'Vodolazka', VEST: 'Jilet',
  DUO: 'Ikkilik', TRIO: 'Uchlik', SUIT: 'Kostyum', JUMPSUIT: 'Kombinezon',
  EARRINGS: 'Sirgʻa', BRACELET: 'Bilakuzuk', CHAIN: 'Zanjir', RING: 'Uzuk', WATCH: 'Soat',
  MINI: 'Mini', MIDI: 'Midi', MAXI: 'Maksi', KNEE_LENGTH: 'Tizzagacha', ABOVE_KNEE: 'Tizzadan yuqori',
  ANKLE: 'Kalta', FLOOR_LENGTH: 'Polgacha', BERMUDA: 'Bermuda', STRAIGHT: 'Toʻgʻri',
  FLARED: 'Klesh', SKINNY: 'Skinni', TEA_LENGTH: 'Boldirgacha',
  REGULAR: 'Oddiy', LOOSE: 'Erkin', SLIM: 'Tor',
};

const LABELS: Record<Locale, LabelMap> = { en: LABELS_EN, ru: LABELS_RU, uz: LABELS_UZ };

/** Localized label for any taxonomy enum value (section/subcategory/itemType/length/fit). */
export function taxLabel(value: string | null | undefined, locale: Locale): string {
  if (!value) return '';
  return LABELS[locale]?.[value] ?? LABELS_EN[value] ?? value;
}
