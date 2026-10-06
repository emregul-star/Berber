/**
 * Geçici şifre üretimi (e-posta göndermeden hesap açma / şifre sıfırlama için).
 */
import "server-only";
import { randomBytes } from "node:crypto";

/** Okunaklı, karışmayan karakterlerden 14 haneli geçici şifre (ör. Kx7m-Pq2r-Tz9w) */
export function generateTempPassword(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const bytes = randomBytes(12);
  const chars = Array.from(bytes, (b) => alphabet[b % alphabet.length]);
  return [chars.slice(0, 4), chars.slice(4, 8), chars.slice(8, 12)].map((g) => g.join("")).join("-");
}
