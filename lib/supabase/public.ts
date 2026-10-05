/**
 * Müşteri sitesi için "ziyaretçi" Supabase istemcisi.
 *
 * Çerez okumaz; her zaman anonim (anon) rolle çalışır. Böylece dükkan sahibi giriş
 * yapmış olsa bile müşteri sitesini tam olarak bir ziyaretçinin gördüğü gibi görür
 * (ör. pasif hizmetler görünmez). Yetkiler RLS ile sınırlıdır.
 */
import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

export function createPublicClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } },
  );
}
