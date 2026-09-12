// ─── Artwork for the Market category rail ────────────────────────────────────
// Each browse group is illustrated by a cut-out product photo living in
// public/images/market/categories/<group id>.webp — transparent background,
// garment only. The soft gradient disc behind it is drawn in CSS by
// CategoryRail, so one set of files serves both light and dark themes.
//
// WebP (not PNG) because these are photographs: with alpha at 320px they land
// around 10 KB each instead of ~200 KB, and the whole rail loads at once.
//
// The path is derived from the group id rather than kept in a hand-maintained
// map: dropping tops.webp into the folder is all it takes for the rail to pick
// it up. If a file is missing the request 404s and the bubble falls back to its
// line-drawn glyph, so the rail is never blank or broken.

export const CATEGORY_IMAGE_DIR = '/images/market/categories';

/** Cut-out photo for a browse group (e.g. 'shoes' → …/categories/shoes.webp). */
export function browseGroupImageSrc(id: string): string {
  return `${CATEGORY_IMAGE_DIR}/${id}.webp`;
}
