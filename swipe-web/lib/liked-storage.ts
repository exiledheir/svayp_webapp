export interface LikedItem {
  productId: string;
  title: string;
  brand: string;
  price: number;
  currency: string;
  imageUrl: string;
  likedAt: string;
}

const LIKED_KEY = 'liked_items';

function readAll(): LikedItem[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(LIKED_KEY) ?? '[]') as LikedItem[];
  } catch {
    return [];
  }
}

function saveAll(items: LikedItem[]): void {
  localStorage.setItem(LIKED_KEY, JSON.stringify(items));
}

export function getLikedItems(): LikedItem[] {
  return readAll();
}

export function isLiked(productId: string): boolean {
  return readAll().some((item) => item.productId === productId);
}

export function toggleLiked(item: Omit<LikedItem, 'likedAt'>): boolean {
  const items = readAll();
  const idx = items.findIndex((i) => i.productId === item.productId);
  if (idx >= 0) {
    items.splice(idx, 1);
    saveAll(items);
    return false;
  }
  items.unshift({ ...item, likedAt: new Date().toISOString() });
  saveAll(items);
  return true;
}
