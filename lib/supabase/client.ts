/**
 * Tarayıcıda (Client Component) kullanılan Supabase istemcisi.
 * Sadece herkese açık "publishable" anahtarı kullanır; yetkiler RLS ile sınırlıdır.
 */
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
