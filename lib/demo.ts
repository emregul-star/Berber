/**
 * Demo dükkanı sıfırlama (Bölüm 12): satış gösterimlerinde veriler karışınca kullanılır.
 * 1) Eski demo dükkanın Storage'a yüklenmiş dosyalarını siler
 * 2) Veritabanında demo verisini baştan kurar (public.reset_demo_shop)
 * 3) Demo panel hesaplarını (varsa) yeni dükkan kaydına yeniden bağlar — şifreler DEĞİŞMEZ
 *
 * Demo hesapları .env.local'deki DEMO_OWNER_EMAIL / DEMO_BARBER_EMAIL / DEMO_BARBER_NAME ile belirlenir.
 * Yönetici panelindeki buton bu dosyayı, npm run demo:reset ise scripts/demo-reset.mjs'i kullanır
 * (ikisi aynı adımları izler).
 */
import "server-only";
import { findAuthUserIdByEmail } from "./auth-users";
import { createAdminClient } from "./supabase/admin";

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

  // 3) Demo hesaplarını bağla
  const linked: string[] = [];
  const ownerEmail = process.env.DEMO_OWNER_EMAIL;
  if (ownerEmail) {
    const userId = await findAuthUserIdByEmail(ownerEmail);
    if (userId) {
      await admin.from("shop_members").insert({ shop_id: shopId, user_id: userId, role: "owner" });
      linked.push(ownerEmail);
    }
  }
  const barberEmail = process.env.DEMO_BARBER_EMAIL;
  const barberName = process.env.DEMO_BARBER_NAME || "Can Kaya";
  if (barberEmail) {
    const userId = await findAuthUserIdByEmail(barberEmail);
    if (userId) {
      await admin.from("shop_members").insert({ shop_id: shopId, user_id: userId, role: "barber" });
      await admin.from("barbers").update({ user_id: userId }).eq("shop_id", shopId).eq("name", barberName);
      linked.push(barberEmail);
    }
  }
  return { linkedAccounts: linked };
}
