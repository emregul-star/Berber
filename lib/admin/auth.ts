/**
 * Süper yönetici yetki katmanı (admin.PLATFORM_DOMAIN). Bölüm 11: sadece platform_admins
 * tablosundaki kullanıcılar girebilir. Her sayfa ve her işlem requireAdmin() ile başlar.
 */
import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "../supabase/server";

export type AdminUser = { userId: string; email: string | null };

export const ADMIN_LOGIN_PATH = "/giris";

export const getAdminUser = cache(async (): Promise<AdminUser | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return null;
  // RLS: kullanıcı sadece kendi platform_admins satırını görebilir
  const { data: row } = await supabase.from("platform_admins").select("id").eq("user_id", userId).maybeSingle();
  if (!row) return null;
  return { userId, email: (data.claims.email as string | undefined) ?? null };
});

export async function requireAdmin(): Promise<AdminUser> {
  const user = await getAdminUser();
  if (!user) redirect(ADMIN_LOGIN_PATH);
  return user;
}
