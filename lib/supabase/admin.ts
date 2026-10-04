/**
 * YÖNETİCİ (secret key) Supabase istemcisi — RLS'i ATLAR.
 *
 * Sadece sunucuda, doğrulama yapıldıktan sonra kullanılmalı (ör. müşterinin randevu
 * oluşturması, cron işleri). "server-only" importu, bu dosya yanlışlıkla bir Client
 * Component'e eklenirse derlemenin hata vermesini sağlar; böylece anahtar tarayıcıya sızmaz.
 */
import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

export function createAdminClient() {
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("SUPABASE_SECRET_KEY tanımlı değil (.env.local dosyasını kontrol edin).");
  }

  return createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, secretKey, {
    auth: {
      // Sunucu tarafı istemci: oturum saklanmaz, token yenilenmez.
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
