/**
 * Demo dükkanı sıfırlama (Bölüm 12): satış gösterimlerinde veriler karışınca kullanılır.
 * 1) Eski demo dükkanın Storage'a yüklenmiş dosyalarını siler
 * 2) Veritabanında demo verisini baştan kurar (public.reset_demo_shop)
 * 3) Demo panel hesaplarını (varsa) yeni dükkan kaydına yeniden bağlar. DEMO_*_PASSWORD tanımlıysa
 *    şifreler de bu değerlere geri alınır (ziyaretçi Supabase API'si üzerinden şifreyi değiştirmiş olabilir).
 *
 * Demo hesapları .env.local'deki DEMO_OWNER_EMAIL / DEMO_BARBER_EMAIL / DEMO_BARBER_NAME ile belirlenir.
 * Yönetici panelindeki buton bu dosyayı, npm run demo:reset ise scripts/demo-reset.mjs'i kullanır
 * (ikisi aynı adımları izler).
 */
import "server-only";
import { findAuthUserIdByEmail } from "./auth-users";
import { getShopBySlug } from "./shops";
import { createAdminClient } from "./supabase/admin";

export type DemoRole = "owner" | "barber";

/**
 * Herkese açık "Demoyu dene" girişi için hesap bilgileri. Şifreler sadece sunucuda okunur,
 * sayfaya hiç yazılmaz. İkisi de tanımlı değilse demo girişi butonları gösterilmez.
 */
export function demoCredentials(role: DemoRole): { email: string; password: string } | null {
  const email = role === "owner" ? process.env.DEMO_OWNER_EMAIL : process.env.DEMO_BARBER_EMAIL;
  const password = role === "owner" ? process.env.DEMO_OWNER_PASSWORD : process.env.DEMO_BARBER_PASSWORD;
  return email && password ? { email, password } : null;
}

const ASSET_FOLDERS = ["gallery", "barbers", "logo", "cover"];

export async function resetDemoShop(): Promise<{ linkedAccounts: string[] }> {
  const admin = createAdminClient();

  // 1) Eski demo dosyaları
  const { data: old } = await admin.from("shops").select("id").eq("slug", "demo").maybeSingle();
  if (old) {
    for (const folder of ASSET_FOLDERS) {
      const { data: files } = await admin.storage.from("shop-assets").list(`${old.id}/${folder}`, { limit: 1000 });
      const paths = (files ?? []).map((f) => `${old.id}/${folder}/${f.name}`);
      if (paths.length) await admin.storage.from("shop-assets").remove(paths);
    }
  }

  // 2) Veritabanı
  const { data: shopId, error } = await admin.rpc("reset_demo_shop");
  if (error || !shopId) throw new Error(`Demo sıfırlanamadı: ${error?.message ?? "bilinmeyen hata"}`);

  // 3) Demo hesaplarını bağla (ve şifreleri geri al)
  const linked: string[] = [];
  for (const role of ["owner", "barber"] as const) {
    const email = await repairDemoAccount(role, shopId);
    if (email) linked.push(email);
  }
  return { linkedAccounts: linked };
}

/**
 * Bir demo hesabını kullanılabilir hale getirir: hesap yoksa oluşturur, şifre tanımlıysa şifreyi
 * geri alır, dükkan üyeliğini ve (berberse) berber kaydı bağlantısını tamamlar.
 *
 * Neden gerekli: "…olarak dene" ile giren bir ziyaretçi, Supabase Auth API'sini doğrudan kullanarak
 * demo hesabının şifresini değiştirebilir (Supabase'de kullanıcının kendi şifresini değiştirmesini
 * hesap bazında engellemenin ücretsiz bir yolu yok). Demo girişi başarısız olunca ve her gece bu
 * onarım çalışır; böylece demo kalıcı olarak kapatılamaz.
 * @returns bağlanan hesabın e-postası; e-posta tanımlı değilse null
 */
export async function repairDemoAccount(role: DemoRole, shopId?: string): Promise<string | null> {
  const email = role === "owner" ? process.env.DEMO_OWNER_EMAIL : process.env.DEMO_BARBER_EMAIL;
  if (!email) return null;
  const password = demoCredentials(role)?.password;
  const admin = createAdminClient();

  const demoShopId = shopId ?? (await getShopBySlug("demo"))?.id;
  if (!demoShopId) return null;

  let userId = await findAuthUserIdByEmail(email);
  if (!userId) {
    if (!password) return null; // şifre bilinmeden hesap açılmaz (npm run demo:reset açar ve şifreyi yazar)
    const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    if (error || !data.user) throw new Error(`Demo hesabı oluşturulamadı: ${error?.message ?? "bilinmeyen hata"}`);
    userId = data.user.id;
  } else if (password) {
    await admin.auth.admin.updateUserById(userId, { password });
  }

  const { data: member } = await admin
    .from("shop_members")
    .select("id")
    .eq("shop_id", demoShopId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!member) await admin.from("shop_members").insert({ shop_id: demoShopId, user_id: userId, role });
  if (role === "barber") {
    const barberName = process.env.DEMO_BARBER_NAME || "Can Kaya";
    await admin.from("barbers").update({ user_id: userId }).eq("shop_id", demoShopId).eq("name", barberName);
  }
  return email;
}
