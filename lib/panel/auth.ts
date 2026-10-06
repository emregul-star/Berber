/**
 * Panel yetki katmanı (DAL — Data Access Layer).
 *
 * Her panel sayfası ve her panel Server Action'ı İLK İŞ olarak requirePanelUser() veya
 * requireOwner() çağırır. Layout'ta yapılan kontrol tek başına yeterli değildir (Next.js,
 * sayfa geçişlerinde layout'u yeniden çalıştırmaz). Son savunma hattı veritabanındaki RLS'tir:
 * bu kontroller atlansa bile kullanıcı başka dükkanın verisini göremez.
 */
import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { getShopBySlug, type Shop } from "../shops";
import { createClient } from "../supabase/server";

export type PanelRole = "owner" | "barber";

export type PanelUser = {
  userId: string;
  email: string | null;
  role: PanelRole;
  /** Süper yönetici başka bir dükkanın paneline bakıyorsa true (sahip yetkisiyle) */
  isPlatformAdmin: boolean;
  /** Kullanıcının bu dükkandaki berber kaydı (varsa) */
  barberId: string | null;
  barberName: string | null;
  shop: Shop;
};

export const LOGIN_PATH = "/panel/giris";

/**
 * Demo dükkan herkese açık olduğu için ziyaretçiler giriş hesaplarını ve şifreleri değiştiremez
 * (aksi halde bir ziyaretçi şifreyi değiştirip demoyu diğerlerine kapatabilirdi).
 */
export const DEMO_ACCOUNT_LOCKED_MESSAGE = "Demo dükkanda giriş hesapları ve şifreler değiştirilemez.";

/**
 * Giriş yapmış ve bu dükkanın üyesi olan kullanıcıyı döndürür; değilse null.
 * cache(): aynı istek içinde layout + sayfa + bileşenler çağırsa da bir kez çalışır.
 */
export const getPanelUser = cache(async (slug: string): Promise<PanelUser | null> => {
  const shop = await getShopBySlug(slug);
  if (!shop) return null;

  const supabase = await createClient();
  // getClaims(): token imzasını doğrular (getSession'a sunucuda güvenilmez)
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return null;
  const email = (data.claims.email as string | undefined) ?? null;

  const [membership, admin, barber] = await Promise.all([
    supabase.from("shop_members").select("role").eq("shop_id", shop.id).eq("user_id", userId).maybeSingle(),
    supabase.from("platform_admins").select("id").eq("user_id", userId).maybeSingle(),
    supabase.from("barbers").select("id, name").eq("shop_id", shop.id).eq("user_id", userId).maybeSingle(),
  ]);

  const isPlatformAdmin = Boolean(admin.data);
  const role = membership.data?.role as PanelRole | undefined;
  if (!role && !isPlatformAdmin) return null;

  return {
    userId,
    email,
    // Süper yönetici dükkan panelinde sahip yetkisiyle çalışır (RLS de buna izin verir)
    role: role ?? "owner",
    isPlatformAdmin,
    barberId: barber.data?.id ?? null,
    barberName: barber.data?.name ?? null,
    shop,
  };
});

/** Panel kullanıcısı değilse giriş sayfasına yönlendirir. */
export async function requirePanelUser(slug: string): Promise<PanelUser> {
  const user = await getPanelUser(slug);
  if (!user) redirect(LOGIN_PATH);
  return user;
}

/** Sadece dükkan sahibi (veya süper yönetici); berberse panel ana sayfasına yönlendirir. */
export async function requireOwner(slug: string): Promise<PanelUser> {
  const user = await requirePanelUser(slug);
  if (user.role !== "owner") redirect("/panel");
  return user;
}

/** Bu kullanıcı bu berberin kayıtlarını yönetebilir mi? (sahip: hepsi, berber: sadece kendisi) */
export function canManageBarber(user: PanelUser, barberId: string | null): boolean {
  return user.role === "owner" || (barberId !== null && barberId === user.barberId);
}
