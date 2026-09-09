// next/image optimization guard.
//
// Remote https images (Azure Blob product/listing photos) go through the
// Next.js optimizer (/_next/image → resized WebP, ~50-200KB instead of
// megabyte originals). data:/blob: sources (upload previews, locally
// composed canvases) cannot be fetched by the optimizer and must stay
// unoptimized.
export function needsUnoptimized(src: string | undefined | null): boolean {
  if (!src) return true;
  return src.startsWith('data:') || src.startsWith('blob:');
}

/**
 * Natural pixel size of an image URL (data:, blob:, or remote). Used at feed
 * publish time so masonry tiles can reserve their height before the image
 * loads. Never rejects: resolves null on error, timeout, or during SSR.
 * (No crossOrigin needed — natural dims are readable without a CORS grant.)
 */
export function measureImageDims(
  src: string,
  timeoutMs = 8000,
): Promise<{ width: number; height: number } | null> {
  if (typeof window === 'undefined' || !src) return Promise.resolve(null);
  return new Promise((resolve) => {
    let done = false;
    const finish = (v: { width: number; height: number } | null) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      resolve(v);
    };
    const timer = setTimeout(() => finish(null), timeoutMs);
    const image = new window.Image();
    image.onload = () => {
      const w = image.naturalWidth;
      const h = image.naturalHeight;
      finish(w > 0 && h > 0 ? { width: w, height: h } : null);
    };
    image.onerror = () => finish(null);
    image.src = src;
  });
}
