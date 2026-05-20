import type { WardrobeCategory, WardrobeItemResponse, WardrobeUploadStatus } from '@/types';
import {
  getWardrobeItems,
  deleteWardrobeItem,
  updateWardrobeItem,
  uploadWardrobeItem,
} from '@/lib/wardrobe-api';

export type ClosetCategory =
  | 'tops' | 'dresses' | 'jackets' | 'blouses' | 'jumpsuits'
  | 'tshirts' | 'skirts' | 'jeans' | 'pants' | 'shorts'
  | 'shoes' | 'sneakers' | 'heels' | 'boots' | 'sandals' | 'flats'
  | 'accessories' | 'bags' | 'shawl' | 'jewelry' | 'underwear';

export const CLOSET_CATEGORIES: { value: ClosetCategory; label: string }[] = [
  { value: 'tops',        label: 'Tops'        },
  { value: 'tshirts',     label: 'T-Shirts'    },
  { value: 'blouses',     label: 'Blouses'     },
  { value: 'dresses',     label: 'Dresses'     },
  { value: 'jumpsuits',   label: 'Jumpsuits'   },
  { value: 'jackets',     label: 'Jackets'     },
  { value: 'skirts',      label: 'Skirts'      },
  { value: 'jeans',       label: 'Jeans'       },
  { value: 'pants',       label: 'Pants'       },
  { value: 'shorts',      label: 'Shorts'      },
  { value: 'shoes',       label: 'Shoes'       },
  { value: 'sneakers',    label: 'Sneakers'    },
  { value: 'heels',       label: 'Heels'       },
  { value: 'boots',       label: 'Boots'       },
  { value: 'sandals',     label: 'Sandals'     },
  { value: 'flats',       label: 'Flats'       },
  { value: 'bags',        label: 'Bags'        },
  { value: 'accessories', label: 'Accessories' },
  { value: 'shawl',       label: 'Shawl'       },
  { value: 'jewelry',     label: 'Jewelry'     },
  { value: 'underwear',   label: 'Underwear'   },
];

export interface ClosetItem {
  id: string;
  category: ClosetCategory;
  imageData: string; // image URL (from API) or base64 data URL (legacy local)
  thumbnailUrl?: string;
  brand?: string;
  notes?: string;
  isFavorite?: boolean;
  isClean?: boolean;
  createdAt: string;
}

// ── Category mapping ──────────────────────────────────────────────────────────

const API_TO_LOCAL_CATEGORY: Record<WardrobeCategory, ClosetCategory> = {
  TOPS: 'tops',
  TSHIRTS: 'tshirts',
  SHIRTS: 'blouses',
  PANTS: 'pants',
  JEANS: 'jeans',
  SKIRTS: 'skirts',
  DRESSES: 'dresses',
  SHOES: 'shoes',
  BAGS: 'bags',
  ACCESSORIES: 'accessories',
  HIJAB_SCARVES: 'shawl',
  OUTERWEAR: 'jackets',
  OTHER: 'accessories',
};

const LOCAL_TO_API_CATEGORY: Record<ClosetCategory, WardrobeCategory> = {
  tops: 'TOPS',
  tshirts: 'TSHIRTS',
  blouses: 'SHIRTS',
  dresses: 'DRESSES',
  jumpsuits: 'DRESSES',
  jackets: 'OUTERWEAR',
  skirts: 'SKIRTS',
  jeans: 'JEANS',
  pants: 'PANTS',
  shorts: 'PANTS',
  shoes: 'SHOES',
  sneakers: 'SHOES',
  heels: 'SHOES',
  boots: 'SHOES',
  sandals: 'SHOES',
  flats: 'SHOES',
  bags: 'BAGS',
  accessories: 'ACCESSORIES',
  shawl: 'HIJAB_SCARVES',
  jewelry: 'ACCESSORIES',
  underwear: 'OTHER',
};

export function toLocalCategory(apiCategory: WardrobeCategory): ClosetCategory {
  return API_TO_LOCAL_CATEGORY[apiCategory] ?? 'accessories';
}

export function toApiCategory(localCategory: ClosetCategory): WardrobeCategory {
  return LOCAL_TO_API_CATEGORY[localCategory] ?? 'OTHER';
}

function mapApiItemToClosetItem(item: WardrobeItemResponse): ClosetItem {
  return {
    id: item.id,
    category: toLocalCategory(item.category),
    imageData: item.thumbnailUrl || item.imageUrl,
    thumbnailUrl: item.thumbnailUrl,
    brand: item.material || undefined,
    notes: item.userNotes || undefined,
    isFavorite: item.isFavorite,
    isClean: item.isClean,
    createdAt: item.createdAt,
  };
}

// ── API-backed functions ──────────────────────────────────────────────────────

export async function fetchClosetItems(): Promise<ClosetItem[]> {
  const page = await getWardrobeItems({ size: 100 });
  return page.content.map(mapApiItemToClosetItem);
}

export async function addClosetItemFromFile(
  file: File,
  category: ClosetCategory,
  onProgress?: (status: WardrobeUploadStatus) => void,
): Promise<WardrobeUploadStatus> {
  const apiCategory = toApiCategory(category);
  return uploadWardrobeItem(file, apiCategory, onProgress);
}

export async function removeClosetItem(id: string): Promise<void> {
  await deleteWardrobeItem(id);
}

export async function updateClosetItemApi(
  id: string,
  updates: { userLabel?: string | null; userNotes?: string | null; isFavorite?: boolean; isClean?: boolean },
): Promise<void> {
  await updateWardrobeItem(id, updates);
}

// ── Legacy localStorage functions (kept for offline/fallback) ─────────────────

const CLOSET_KEY = 'closet_items';

function readAll(): ClosetItem[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(CLOSET_KEY) ?? '[]') as ClosetItem[];
  } catch {
    return [];
  }
}

function saveAll(items: ClosetItem[]): void {
  localStorage.setItem(CLOSET_KEY, JSON.stringify(items));
}

export function getClosetItems(): ClosetItem[] {
  return readAll();
}

export function addClosetItem(item: Omit<ClosetItem, 'id' | 'createdAt'>): ClosetItem {
  const newItem: ClosetItem = {
    ...item,
    id: `local_${Date.now()}`,
    createdAt: new Date().toISOString(),
  };
  const items = readAll();
  items.unshift(newItem);
  saveAll(items);
  return newItem;
}

export function deleteClosetItem(id: string): void {
  saveAll(readAll().filter((item) => item.id !== id));
}

export function updateClosetItem(id: string, updates: Partial<Pick<ClosetItem, 'category'>>): void {
  const items = readAll();
  const idx = items.findIndex((i) => i.id === id);
  if (idx >= 0) {
    items[idx] = { ...items[idx], ...updates };
    saveAll(items);
  }
}
