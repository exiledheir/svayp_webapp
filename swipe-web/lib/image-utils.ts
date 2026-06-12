/**
 * Compresses an image File to a JPEG with a max dimension and quality cap
 * before uploading to the backend. Reduces blob upload time and backend AI
 * processing time on large gallery photos.
 *
 * @param file     Original image File from the file input or crop step
 * @param maxPx    Max width or height in pixels (default 1200)
 * @param quality  JPEG quality 0–1 (default 0.82)
 * @returns        A new File with the compressed JPEG bytes
 */
export async function compressImageForUpload(
  file: File,
  maxPx = 1200,
  quality = 0.82,
): Promise<File> {
  // If the file is already small enough, skip canvas round-trip
  if (file.size < 300 * 1024) return file;

  return new Promise<File>((resolve) => {
    const img = new window.Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      const { naturalWidth: w, naturalHeight: h } = img;
      const scale = Math.min(maxPx / w, maxPx / h, 1);
      const targetW = Math.round(w * scale);
      const targetH = Math.round(h * scale);

      const canvas = document.createElement('canvas');
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(file); return; }

      ctx.drawImage(img, 0, 0, targetW, targetH);

      canvas.toBlob(
        (blob) => {
          if (!blob) { resolve(file); return; }
          // Keep a meaningful filename; strip original extension → .jpg
          const baseName = file.name.replace(/\.[^.]+$/, '') || 'image';
          resolve(new File([blob], `${baseName}.jpg`, { type: 'image/jpeg' }));
        },
        'image/jpeg',
        quality,
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file); // fall back to original on error
    };

    img.src = objectUrl;
  });
}
