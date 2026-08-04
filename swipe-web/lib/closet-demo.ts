import type { ClosetItem } from '@/lib/closet-storage';
import type { SavedCanvasLayout } from '@/lib/closet-types';

// ── Demo items shown to users with empty wardrobes ───────────────────────────
// IDs are the real backend UUIDs so that try-on and other API features work.
export const DEMO_ITEM_IDS = new Set([
  '0d1b6b18-bd57-4a3e-a4c4-5aac9ca5fa5e',
  'd101c8a6-35fa-4cba-9a7c-e7288947f3b2',
  'da66eb48-1cd7-4087-8a1f-16a011bcae3e',
  'fb18130c-1192-4d32-aa84-0d5a837a3bcd',
]);

export const DEMO_TOP_ID = '0d1b6b18-bd57-4a3e-a4c4-5aac9ca5fa5e';
export const DEMO_SKIRT_ID = 'd101c8a6-35fa-4cba-9a7c-e7288947f3b2';
export const DEMO_SHOES_ID = 'da66eb48-1cd7-4087-8a1f-16a011bcae3e';
export const DEMO_BAG_ID = 'fb18130c-1192-4d32-aa84-0d5a837a3bcd';

export const DEMO_ITEMS: ClosetItem[] = [
  { id: DEMO_TOP_ID,   category: 'tops',   imageData: 'https://libasimages.blob.core.windows.net/product-images/wardrobe%2F07bbfdf7-504d-44f4-9880-6003831845cf%2F4f7dbf50-c725-418c-b9ca-4a7f14eef80a.thumb.png',  createdAt: '2024-01-01T00:00:00Z' },
  { id: DEMO_SKIRT_ID, category: 'skirts', imageData: 'https://libasimages.blob.core.windows.net/product-images/wardrobe%2F07bbfdf7-504d-44f4-9880-6003831845cf%2Fd44bec44-ad12-41ad-a08c-ce90b863d0f3.thumb.png', createdAt: '2024-01-01T00:00:00Z' },
  { id: DEMO_SHOES_ID, category: 'shoes',  imageData: 'https://libasimages.blob.core.windows.net/product-images/wardrobe%2F07bbfdf7-504d-44f4-9880-6003831845cf%2F8d912326-ee36-41bf-988f-0cde9bbedce3.thumb.png',  createdAt: '2024-01-01T00:00:00Z' },
  { id: DEMO_BAG_ID,   category: 'bags',   imageData: 'https://libasimages.blob.core.windows.net/product-images/wardrobe%2F07bbfdf7-504d-44f4-9880-6003831845cf%2F32150c11-a5f4-4b32-98b1-49c8ed2a952a.thumb.png',  createdAt: '2024-01-01T00:00:00Z' },
];

export const DEMO_CANVAS_LAYOUT: SavedCanvasLayout = [
  { id: DEMO_TOP_ID,   x: 32, y: 17, scale: 1,    zIndex: 1, group: 'upper' },
  { id: DEMO_SKIRT_ID, x: 32, y: 39, scale: 1,    zIndex: 2, group: 'lower' },
  { id: DEMO_SHOES_ID, x: 32, y: 58, scale: 0.72, zIndex: 3, group: 'shoes' },
  { id: DEMO_BAG_ID,   x: 63, y: 17, scale: 0.6,  zIndex: 4, group: 'acc'   },
];
