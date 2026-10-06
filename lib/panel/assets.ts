/**
 * Dükkan görsel adreslerinin doğrulanması (galeri, logo, kapak, berber fotoğrafı).
 * Sadece dükkanın kendi Storage klasörüne ({shopId}/...) yüklenmiş görsellere izin verilir.
 */
import "server-only";
import type { PanelUser } from "./auth";

const PUBLIC_MARKER = "/storage/v1/object/public/shop-assets/";

export function isOwnAssetUrl(user: PanelUser, url: string): boolean {
  const prefix = `${process.env.NEXT_PUBLIC_SUPABASE_URL}${PUBLIC_MARKER}${user.shop.id}/`;
  return url.startsWith(prefix) && !url.includes("..");
}

/** Public adresten Storage içindeki yolu çıkarır; dükkanın kendi klasöründe değilse null */
export function ownStoragePath(user: PanelUser, url: string): string | null {
  const i = url.indexOf(PUBLIC_MARKER);
  const path = i === -1 ? null : decodeURIComponent(url.slice(i + PUBLIC_MARKER.length));
  return path?.startsWith(`${user.shop.id}/`) && !path.includes("..") ? path : null;
}
