import type { ClosetItem } from '@/lib/closet-storage';
import type { SavedCanvasLayout } from '@/lib/closet-types';
import { saveImageToGallery } from '@/lib/flutter-bridge';
import { shareImageBlob } from '@/lib/share-image';

// Snapshot pixel size. Rendered at 3× the on-screen 3:4 geometry so the flat-lay
// stays crisp when the feed shows it as a full-bleed poster (400×533 upscaled
// looked blurry). PNG is lossless, so the only quality limit is the source item
// images themselves. Exported so the feed publisher can record the natural size
// of a board snapshot without re-measuring it.
const SNAPSHOT_SCALE = 3;
export const SNAPSHOT_WIDTH = 400 * SNAPSHOT_SCALE;
export const SNAPSHOT_HEIGHT = 533 * SNAPSHOT_SCALE;

/**
 * Render a flat-lay canvas layout to a PNG blob (used as the try-on snapshot input).
 *
 * Mirrors the on-screen canvas EXACTLY, because this is the image the feed
 * publishes: every editor and preview draws an item as a SQUARE box —
 * `left:x% top:y% width:35% aspect-ratio:1 transform:scale(s)` — with the
 * picture `object-contain`ed inside it (InteractiveCanvas, the closet board
 * card, TryOnFlow, the onboarding steps). This used to stretch each picture to
 * fill that square instead of fitting it, so published boards came out with
 * skirts squashed and bags stretched — nothing like the board the user built.
 */
export async function captureCanvasSnapshot(layout: SavedCanvasLayout, allItems: ClosetItem[]): Promise<Blob> {
  const W = SNAPSHOT_WIDTH, H = SNAPSHOT_HEIGHT;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);

  const sorted = [...layout].sort((a, b) => a.zIndex - b.zIndex);
  for (const entry of sorted) {
    const closetItem = allItems.find((i) => i.id === entry.id);
    // fullImage first: imageData is a 400px grid thumbnail, and each item box
    // here is ~420px on a 1200px canvas, so the thumbnail alone renders soft —
    // same reason the on-screen canvas upgrades to fullImage once it loads.
    const source = closetItem?.fullImage || closetItem?.imageData;
    if (!source) continue;
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    const src =
      source.startsWith('blob:') || source.startsWith('data:')
        ? source
        : `/api/proxy-image?url=${encodeURIComponent(source)}`;
    await new Promise<void>((res, rej) => {
      img.onload = () => res();
      img.onerror = () => rej(new Error(`Failed to load image for item ${entry.id}`));
      img.src = src;
    });

    // The item's box: a square 35% of the FRAME WIDTH (`width:35%` +
    // `aspect-ratio:1`), positioned by its top-left corner and scaled about its
    // centre — so the centre is where it would be at scale 1.
    const boxSide = W * 0.35;
    const cx = W * (entry.x / 100) + boxSide / 2;
    const cy = H * (entry.y / 100) + boxSide / 2;

    // `object-contain` inside that scaled box: fit the picture's own aspect
    // ratio, centred, never stretched to the square.
    const scaledSide = boxSide * entry.scale;
    const nw = img.naturalWidth || scaledSide;
    const nh = img.naturalHeight || scaledSide;
    const fit = Math.min(scaledSide / nw, scaledSide / nh);
    const drawW = nw * fit;
    const drawH = nh * fit;
    ctx.drawImage(img, cx - drawW / 2, cy - drawH / 2, drawW, drawH);
  }

  return new Promise<Blob>((res, rej) =>
    canvas.toBlob((b) => (b ? res(b) : rej(new Error('toBlob failed'))), 'image/png'),
  );
}

/** Render a try-on result image with the LIBΛS watermark burned in, as a JPEG blob. */
export async function renderWatermarkedBlob(resultUrl: string): Promise<Blob> {
  const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(resultUrl)}`;
  const img = new window.Image();
  img.crossOrigin = 'anonymous';
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('load failed'));
    img.src = proxyUrl;
  });
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0);

  const scale = Math.max(img.naturalWidth / 400, 1);
  const fontSize = Math.round(14 * scale);
  ctx.font = `bold ${fontSize}px system-ui, -apple-system, sans-serif`;
  ctx.textBaseline = 'middle';
  const margin = Math.round(14 * scale);
  const textY = margin + fontSize / 2 + Math.round(16 * scale);

  ctx.shadowColor = 'rgba(255,255,255,0.6)';
  ctx.shadowBlur = Math.round(4 * scale);
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  ctx.globalAlpha = 1;

  ctx.fillStyle = '#000000';
  ctx.fillText('LIB', margin, textY);
  const libW = ctx.measureText('LIB').width;
  ctx.fillStyle = '#F370A7';
  ctx.fillText('Λ', margin + libW, textY);
  const lambdaW = ctx.measureText('Λ').width;
  ctx.fillStyle = '#000000';
  ctx.fillText('S', margin + libW + lambdaW, textY);

  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('toBlob failed'))),
      'image/jpeg',
      0.95,
    );
  });
}

/** Download a try-on result image with the LIBΛS watermark burned in. */
export async function downloadWithWatermark(resultUrl: string): Promise<void> {
  const blob = await renderWatermarkedBlob(resultUrl);
  const filename = `libas-tryon-${Date.now()}.jpg`;
  // Inside the Flutter WebView, `<a download>` is a no-op — hand the image to the
  // native app so it lands in the device photo gallery.
  const savedNatively = await saveImageToGallery(blob, filename);
  if (savedNatively) return;
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
}

/** Share a try-on result image with the LIBΛS watermark burned in. */
export async function shareWatermarked(resultUrl: string): Promise<void> {
  const blob = await renderWatermarkedBlob(resultUrl);
  await shareImageBlob(blob, `libas-tryon-${Date.now()}.jpg`);
}
