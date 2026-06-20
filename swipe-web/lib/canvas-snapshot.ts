import type { ClosetItem } from '@/lib/closet-storage';
import type { SavedCanvasLayout } from '@/lib/closet-types';

/**
 * Render a flat-lay canvas layout to a PNG blob (used as the try-on snapshot input).
 * Mirrors the on-screen 3:4 canvas geometry (35% item width, % positions, scale).
 */
export async function captureCanvasSnapshot(layout: SavedCanvasLayout, allItems: ClosetItem[]): Promise<Blob> {
  const W = 400, H = 533;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);

  const sorted = [...layout].sort((a, b) => a.zIndex - b.zIndex);
  for (const entry of sorted) {
    const closetItem = allItems.find((i) => i.id === entry.id);
    if (!closetItem?.imageData) continue;
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    const src =
      closetItem.imageData.startsWith('blob:') || closetItem.imageData.startsWith('data:')
        ? closetItem.imageData
        : `/api/proxy-image?url=${encodeURIComponent(closetItem.imageData)}`;
    await new Promise<void>((res, rej) => {
      img.onload = () => res();
      img.onerror = () => rej(new Error(`Failed to load image for item ${entry.id}`));
      img.src = src;
    });
    const itemW = W * 0.35;
    const itemH = itemW;
    const drawW = itemW * entry.scale;
    const drawH = itemH * entry.scale;
    const cx = W * (entry.x / 100) + itemW / 2;
    const cy = H * (entry.y / 100) + itemH / 2;
    ctx.drawImage(img, cx - drawW / 2, cy - drawH / 2, drawW, drawH);
  }

  return new Promise<Blob>((res, rej) =>
    canvas.toBlob((b) => (b ? res(b) : rej(new Error('toBlob failed'))), 'image/png'),
  );
}

/** Download a try-on result image with the LIBΛS watermark burned in. */
export async function downloadWithWatermark(resultUrl: string): Promise<void> {
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

  return new Promise<void>((resolve) => {
    canvas.toBlob((blob) => {
      if (blob) {
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = `libas-tryon-${Date.now()}.jpg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
      }
      resolve();
    }, 'image/jpeg', 0.95);
  });
}
