/**
 * Randevu yönetim linki token'ları (Bölüm 6.4).
 *
 * - Token 32 baytlık kriptografik rastgele değerdir (tahmin edilemez).
 * - Veritabanına SADECE SHA-256 hash'i yazılır. Veritabanı sızsa bile linkler ele geçmez.
 * - Müşteriye düz token gider: https://{slug}.PLATFORM_DOMAIN/randevu/{token}
 */
import "server-only";
import { createHash, randomBytes } from "node:crypto";

/** URL'de güvenle kullanılabilen (base64url) 43 karakterlik token üretir. */
export function generateManageToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashManageToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

/** Gelen token biçim olarak geçerli mi (veritabanına gitmeden önce hızlı eleme) */
export function isWellFormedToken(token: string): boolean {
  return /^[A-Za-z0-9_-]{43}$/.test(token);
}
