export type ClosetCategory =
  | 'tops' | 'dresses' | 'jackets' | 'blouses' | 'jumpsuits'
  | 'tshirts' | 'skirts' | 'jeans' | 'pants' | 'shorts'
  | 'shoes' | 'accessories' | 'bags' | 'shawl' | 'jewelry' | 'underwear';

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
  { value: 'bags',        label: 'Bags'        },
  { value: 'accessories', label: 'Accessories' },
  { value: 'shawl',       label: 'Shawl'       },
  { value: 'jewelry',     label: 'Jewelry'     },
  { value: 'underwear',   label: 'Underwear'   },
];

export interface ClosetItem {
  id: string;
  category: ClosetCategory;
  imageData: string; // base64 data URL
  brand?: string;
  notes?: string;
  createdAt: string;
}

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
