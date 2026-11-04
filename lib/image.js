// Downscale and recompress a photo in the browser before upload.
// Phone photos are often 5–10 MB; this turns them into small JPEGs so uploads
// are fast, fit the server's size limit, and don't carry EXIF (location) data.
// Runs only in the browser. On any failure it returns the original file.

export async function compressImage(file, { maxDim = 1600, quality = 0.82 } = {}) {
  if (typeof document === 'undefined') return file;
  if (!file || !file.type?.startsWith('image/') || file.type === 'image/gif') return file;
  try {
    const img = await loadImage(file);
    const srcW = img.width || img.naturalWidth;
    const srcH = img.height || img.naturalHeight;
    if (!srcW || !srcH) return file;

    const scale = Math.min(1, maxDim / Math.max(srcW, srcH));
    const w = Math.round(srcW * scale);
    const h = Math.round(srcH * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff'; // flatten any transparency, since JPEG has no alpha
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    img.close?.();

    const blob = await new Promise(res => canvas.toBlob(res, 'image/jpeg', quality));
    if (!blob) return file;
    // Keep the original if it was already smaller and we didn't resize.
    if (scale === 1 && blob.size >= file.size) return file;
    return new File([blob], jpgName(file.name), { type: 'image/jpeg', lastModified: Date.now() });
  } catch {
    return file;
  }
}

function jpgName(name) {
  return (name || 'photo').replace(/\.[^.]+$/, '') + '.jpg';
}

async function loadImage(file) {
  if (window.createImageBitmap) {
    try { return await createImageBitmap(file); } catch { /* fall through to <img> */ }
  }
  const url = URL.createObjectURL(file);
  try {
    return await new Promise((resolve, reject) => {
      const im = new Image();
      im.onload = () => resolve(im);
      im.onerror = () => reject(new Error('decode failed'));
      im.src = url;
    });
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}
