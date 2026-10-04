/**
 * Sunucuda (Server Component, Server Action, Route Handler) kullanılan Supabase istemcisi.
 * Giriş yapmış kullanıcının oturumunu çerezlerden okur; yetkiler RLS ile sınırlıdır.
 */
import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./database.types";

/**
 * Not: Bu istemciyi global bir değişkende saklamayın; her fonksiyonda yeniden oluşturun.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Server Component içinden çağrıldıysa çerez yazılamaz.
            // Oturumu proxy yenilediği için bu durum güvenle yok sayılabilir.
          }
        },
      },
    },
  );
}
