const PREFIX = 'libas_upload_preview_';
const THUMB_SIZE = 200;

async function compressThumbnail(dataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const scale = Math.min(THUMB_SIZE / img.naturalWidth, THUMB_SIZE / img.naturalHeight, 1);
      canvas.width = Math.round(img.naturalWidth * scale);
      canvas.height = Math.round(img.naturalHeight * scale);
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(dataUrl); return; }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.5));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

export async function saveUploadPreview(jobId: string, imageDataUrl: string, category: string, startedAt?: number): Promise<void> {
  try {
    const thumbnail = await compressThumbnail(imageDataUrl);
    localStorage.setItem(`${PREFIX}${jobId}`, JSON.stringify({ preview: thumbnail, category, startedAt: startedAt ?? Date.now() }));
  } catch {
    // storage full or canvas unavailable — silent fail
  }
}

export function getUploadPreview(jobId: string): { preview: string; category: string; startedAt?: number } | null {
  try {
    const raw = localStorage.getItem(`${PREFIX}${jobId}`);
    return raw ? (JSON.parse(raw) as { preview: string; category: string; startedAt?: number }) : null;
  } catch {
    return null;
  }
}

export function clearUploadPreview(jobId: string): void {
  try {
    localStorage.removeItem(`${PREFIX}${jobId}`);
  } catch {
    // ignore
  }
}
