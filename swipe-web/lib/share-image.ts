import { shareImageToNative } from './flutter-bridge';

/**
 * Share an image blob with the best mechanism available:
 *   1. Native Flutter share sheet (inside the WebView) via the bridge.
 *   2. Web Share API with a File (standalone mobile browsers that support it).
 *   3. Fallback: trigger a browser download.
 *
 * Never throws for a user-cancelled share — cancellation is a no-op.
 */
export async function shareImageBlob(blob: Blob, filename: string): Promise<void> {
  // 1. Native Flutter share sheet.
  const sharedNatively = await shareImageToNative(blob, filename);
  if (sharedNatively) return;

  // 2. Web Share API (level 2, with files).
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      const file = new File([blob], filename, { type: blob.type || 'image/png' });
      const canShareFiles =
        typeof navigator.canShare !== 'function' || navigator.canShare({ files: [file] });
      if (canShareFiles) {
        await navigator.share({ files: [file] });
        return;
      }
    }
  } catch (err) {
    // User dismissed the share sheet — treat as a no-op, don't fall through to a download.
    if ((err as Error)?.name === 'AbortError') return;
    // Any other failure falls through to the download fallback below.
  }

  // 3. Fallback: download the image.
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
}

/**
 * Fetch a remote/blob/data image URL and return it as a Blob, routing remote
 * URLs through the image proxy so cross-origin fetches succeed (same pattern as
 * captureCanvasSnapshot / downloadWithWatermark).
 */
export async function fetchImageBlob(url: string): Promise<Blob> {
  const src =
    url.startsWith('blob:') || url.startsWith('data:')
      ? url
      : `/api/proxy-image?url=${encodeURIComponent(url)}`;
  const res = await fetch(src);
  if (!res.ok) throw new Error(`image fetch failed: ${res.status}`);
  return res.blob();
}
