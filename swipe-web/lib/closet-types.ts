import type { ClosetItem, ClosetCategory } from '@/lib/closet-storage';

// ─── Category groups ────────────────────────────────────────────────────────────
export const UPPER_CATS: ClosetCategory[] = ['tops', 'dresses', 'jackets', 'blouses', 'jumpsuits', 'tshirts'];
// Full-body items are a complete outfit on their own — never paired with a bottom.
export const FULL_BODY_CATS: ClosetCategory[] = ['dresses', 'jumpsuits'];
export const LOWER_CATS: ClosetCategory[] = ['skirts', 'jeans', 'pants', 'shorts'];
export const SHOES_CATS: ClosetCategory[] = ['shoes', 'sneakers', 'heels', 'boots', 'sandals', 'flats'];
export const ACC_CATS: ClosetCategory[] = ['accessories', 'bags', 'shawl', 'jewelry', 'underwear'];

// ─── Saved canvas layout ──────────────────────────────────────────────────────────
export interface SavedCanvasEntry {
  id: string;
  x: number;
  y: number;
  scale: number;
  zIndex: number;
  group: 'upper' | 'lower' | 'shoes' | 'acc';
}
export type SavedCanvasLayout = SavedCanvasEntry[];

export type CanvasGroup = 'upper' | 'lower' | 'shoes' | 'acc';

/** Returns which canvas group a closet item belongs to. */
export function getItemGroup(item: ClosetItem): CanvasGroup {
  if (UPPER_CATS.includes(item.category)) return 'upper';
  if (LOWER_CATS.includes(item.category)) return 'lower';
  if (SHOES_CATS.includes(item.category)) return 'shoes';
  return 'acc';
}

/**
 * Build a random-but-sensible flat-lay layout from the given wardrobe items.
 * A dress/jumpsuit is a complete outfit — paired with shoes/accessories only,
 * never a bottom. Otherwise build a top + bottom.
 */
export function generateRandomOutfit(items: ClosetItem[]): SavedCanvasLayout {
  const pick = <T,>(arr: T[]): T | null => (arr.length ? arr[Math.floor(Math.random() * arr.length)] : null);
  const fullBodyAll = items.filter((i) => FULL_BODY_CATS.includes(i.category));
  const topOnlyAll = items.filter((i) => UPPER_CATS.includes(i.category) && !FULL_BODY_CATS.includes(i.category));
  const lowerAll = items.filter((i) => LOWER_CATS.includes(i.category));
  const shoesAll = items.filter((i) => SHOES_CATS.includes(i.category));
  const accAll = items.filter((i) => ACC_CATS.includes(i.category));
  const shawlPool = accAll.filter((a) => a.category === 'shawl');
  const sidePool = accAll.filter((a) => a.category !== 'shawl');

  // Prefer a full-body look when a dress/jumpsuit exists; fall back to top+bottom.
  const useFullBody = fullBodyAll.length > 0 && (topOnlyAll.length === 0 || lowerAll.length === 0 || Math.random() < 0.5);
  const u = useFullBody ? pick(fullBodyAll) : pick(topOnlyAll);
  const l = useFullBody ? null : pick(lowerAll);
  const s = pick(shoesAll);
  const shawlItem = pick(shawlPool);
  const sideAccItem = pick(sidePool);
  const layout: SavedCanvasLayout = [];
  if (u) layout.push({ id: u.id, x: 32, y: 17, scale: 1, zIndex: 1, group: 'upper' });
  if (l) layout.push({ id: l.id, x: 32, y: 39, scale: 1, zIndex: 2, group: 'lower' });
  if (s) layout.push({ id: s.id, x: 32, y: 58, scale: 0.72, zIndex: 3, group: 'shoes' });
  if (shawlItem) layout.push({ id: shawlItem.id, x: 30, y: 5, scale: 0.6, zIndex: 10, group: 'acc' });
  if (sideAccItem) layout.push({ id: sideAccItem.id, x: 63, y: 17, scale: 0.6, zIndex: 4, group: 'acc' });
  return layout;
}

/**
 * Build a flat-lay layout from a list of AI-suggested item IDs, resolving them
 * against the wardrobe items. Falls back to a random outfit when nothing matches.
 */
export function buildLayoutFromIds(aiItemIds: string[], items: ClosetItem[]): SavedCanvasLayout {
  const byId = new Map(items.map((i) => [i.id, i]));
  const matched = aiItemIds.map((id) => byId.get(id)).filter(Boolean) as ClosetItem[];
  if (!matched.length) return generateRandomOutfit(items);

  // A dress/jumpsuit is a complete outfit — drop any bottom that slipped into the set.
  const hasFullBody = matched.some((i) => FULL_BODY_CATS.includes(i.category));
  const cleaned = hasFullBody ? matched.filter((i) => !LOWER_CATS.includes(i.category)) : matched;

  const layout: SavedCanvasLayout = [];
  let yOffset = -15;

  for (const item of cleaned) {
    if (UPPER_CATS.includes(item.category)) {
      layout.push({ id: item.id, x: 32, y: 17, scale: 1, zIndex: 1, group: 'upper' });
    } else if (LOWER_CATS.includes(item.category)) {
      layout.push({ id: item.id, x: 32, y: 39, scale: 1, zIndex: 2, group: 'lower' });
    } else if (SHOES_CATS.includes(item.category)) {
      layout.push({ id: item.id, x: 32, y: 58, scale: 0.72, zIndex: 3, group: 'shoes' });
    } else if (item.category === 'shawl') {
      layout.push({ id: item.id, x: 30, y: 5, scale: 0.6, zIndex: 10, group: 'acc' });
    } else {
      yOffset += 15;
      layout.push({ id: item.id, x: 63, y: 17 + yOffset, scale: 0.6, zIndex: 4, group: 'acc' });
    }
  }
  return layout.length ? layout : generateRandomOutfit(items);
}
