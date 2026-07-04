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
