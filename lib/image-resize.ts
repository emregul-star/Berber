/**
 * Tarayıcıda görsel küçültme (Bölüm 10, performans): telefondan çekilen 5-10 MB'lık fotoğraflar
 * yüklenmeden önce küçültülüp WebP'ye çevrilir. Hem yükleme hızlanır hem depolama kotası korunur.
 * Sadece tarayıcıda çalışır (canvas kullanır).
 */

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

/**
 * Görseli en uzun kenarı maxSize piksel olacak şekilde küçültür ve WebP olarak döndürür.
 * Görsel zaten küçükse sadece WebP'ye çevrilir.
 */
export async function resizeImage(file: File, maxSize: number, quality = 0.85): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Tarayıcı görsel işlemeyi desteklemiyor.");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Görsel dönüştürülemedi."))), "image/webp", quality),
  );
}
