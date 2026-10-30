// QR decoding happens entirely in the browser with jsQR. The image is never uploaded:
// only the decoded text is sent to the local server.
import jsQR from 'jsqr';

const MAX_SIDE = 1600;

/** Decode an ImageData-like {data, width, height}. Returns the text or null. */
export function decodeImageData(img) {
  const res = jsQR(img.data, img.width, img.height, { inversionAttempts: 'attemptBoth' });
  return res?.data ? res.data : null;
}

/** Decode a File/Blob image. Throws a friendly error if there is no QR. */
export async function decodeQrFromBlob(blob) {
  if (!blob || !/^image\//.test(blob.type || '')) throw new Error('That file is not an image. Use a PNG, JPG or screenshot.');
  if (blob.size > 15 * 1024 * 1024) throw new Error('Image is too large (max 15 MB).');
  const bitmap = await createImageBitmap(blob);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();
  const text = decodeImageData(ctx.getImageData(0, 0, w, h));
  if (!text) throw new Error('No QR code found in this image. Try a sharper, well-lit, straight-on picture.');
  return text;
}

export const QR_SAMPLES = [
  { file: '/samples/qr-upi-receive-scam.png', label: 'UPI "receive cashback"', scam: true },
  { file: '/samples/qr-url-scam.png', label: 'Fake SBI link', scam: true },
  { file: '/samples/qr-upi-shop.png', label: 'Shop UPI (normal)', scam: false },
];
