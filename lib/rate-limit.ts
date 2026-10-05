/**
 * Basit hız sınırı (Bölüm 6.5). Sayaç veritabanında (rate_limits tablosu) tutulur;
 * böylece sunucu birden fazla kopya hâlinde çalışsa bile (Vercel) sınır doğru uygulanır.
 */
import "server-only";
import { headers } from "next/headers";
import { createAdminClient } from "./supabase/admin";

/**
 * Sayaç artırır; sınır aşıldıysa false döner.
 * Veritabanı hatasında isteği engellemez (true döner) ama hatayı loglar: hız sınırı
 * servisi bozuk diye müşterinin randevu alamaması daha kötü bir sonuç olur.
 */
export async function checkRateLimit(key: string, max: number, windowSeconds: number): Promise<boolean> {
  const { data, error } = await createAdminClient().rpc("rate_limit_hit", {
    p_key: key,
    p_window_seconds: windowSeconds,
  });
  if (error) {
    console.error("Hız sınırı kontrol edilemedi:", error.message);
    return true;
  }
  return (data ?? 0) <= max;
}

/** İsteği yapanın IP adresi (Vercel ve çoğu barındırıcı x-forwarded-for başlığını doldurur). */
export async function getClientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}
