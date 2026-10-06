"use server";

/**
 * Berber yönetimi (sadece sahip): ekle/düzenle, pasif yap, sil, giriş hesabı aç, geçici şifre ver.
 *
 * Hesap işlemleri e-posta GÖNDERMEZ (ücretsiz kurulum): hesap geçici şifreyle açılır, sahip şifreyi
 * berbere iletir, berber ilk girişte değiştirir.
 *
 * GÜVENLİK: Şifre sıfırlama sadece "bu dükkana bağlı, başka hiçbir dükkanda üyeliği olmayan ve
 * platform yöneticisi olmayan" berber hesapları için yapılabilir. Aksi hâlde bir sahip, başka birinin
 * e-postasını kendi berberine bağlayıp şifresini değiştirerek o hesabı ele geçirebilirdi.
 */
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { findAuthUserIdByEmail } from "@/lib/auth-users";
import { isOwnAssetUrl } from "@/lib/panel/assets";
import { DEMO_ACCOUNT_LOCKED_MESSAGE, requireOwner, type PanelUser } from "@/lib/panel/auth";
import { generateTempPassword } from "@/lib/panel/passwords";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type Result = { ok: true; message: string; tempPassword?: string } | { ok: false; error: string };

const barberSchema = z.object({
  id: z.uuid().optional(),
  name: z.string().trim().min(2, "Berber adını yazın.").max(60),
  title: z.string().trim().max(40).optional().or(z.literal("")),
  bio: z.string().trim().max(300).optional().or(z.literal("")),
  photoUrl: z.union([z.literal(""), z.url()]).optional(),
  isActive: z.boolean(),
  serviceIds: z.array(z.uuid()),
});

export async function saveBarberAction(slug: string, input: unknown): Promise<Result> {
  const user = await requireOwner(slug);
  const parsed = barberSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const d = parsed.data;
  if (d.photoUrl && !isOwnAssetUrl(user, d.photoUrl)) return { ok: false, error: "Geçersiz fotoğraf adresi." };
  const supabase = await createClient();
  const values = { name: d.name, title: d.title || null, bio: d.bio || null, photo_url: d.photoUrl || null, is_active: d.isActive };

  let barberId = d.id;
  if (barberId) {
    const { error } = await supabase.from("barbers").update(values).eq("id", barberId).eq("shop_id", user.shop.id);
    if (error) return { ok: false, error: "Berber kaydedilemedi." };
  } else {
    const { count } = await supabase.from("barbers").select("id", { count: "exact", head: true }).eq("shop_id", user.shop.id);
    const { data, error } = await supabase
      .from("barbers")
      .insert({ ...values, shop_id: user.shop.id, sort_order: (count ?? 0) + 1 })
      .select("id")
      .single();
    if (error) return { ok: false, error: "Berber eklenemedi." };
    barberId = data.id;
  }

  const { error: delError } = await supabase.from("barber_services").delete().eq("barber_id", barberId).eq("shop_id", user.shop.id);
  if (delError) return { ok: false, error: "Hizmet seçimi kaydedilemedi." };
  if (d.serviceIds.length) {
    const { error } = await supabase
      .from("barber_services")
      .insert(d.serviceIds.map((serviceId) => ({ shop_id: user.shop.id, barber_id: barberId!, service_id: serviceId })));
    if (error) return { ok: false, error: "Hizmet seçimi kaydedilemedi." };
  }

  revalidatePath("/sites/[slug]", "layout");
  return { ok: true, message: d.id ? "Berber güncellendi." : "Berber eklendi." };
}

export async function deleteBarberAction(slug: string, id: string): Promise<Result> {
  const user = await requireOwner(slug);
  if (!z.uuid().safeParse(id).success) return { ok: false, error: "Geçersiz istek." };
  const supabase = await createClient();
  const { count } = await supabase
    .from("appointments")
    .select("id", { count: "exact", head: true })
    .eq("barber_id", id)
    .eq("shop_id", user.shop.id);
  if ((count ?? 0) > 0) return { ok: false, error: "Bu berberin randevuları olduğu için silinemez. Bunun yerine pasif yapın." };

  const { data: barber } = await supabase.from("barbers").select("user_id").eq("id", id).eq("shop_id", user.shop.id).maybeSingle();
  if (barber?.user_id) return { ok: false, error: "Önce berberin giriş hesabını kaldırın." };

  const { error } = await supabase.from("barbers").delete().eq("id", id).eq("shop_id", user.shop.id);
  if (error) return { ok: false, error: "Berber silinemedi." };
  revalidatePath("/sites/[slug]", "layout");
  return { ok: true, message: "Berber silindi." };
}

/** Berberin bu dükkana ait olduğunu doğrular ve kaydını döndürür */
async function loadOwnBarber(user: PanelUser, barberId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("barbers")
    .select("id, name, user_id")
    .eq("id", barberId)
    .eq("shop_id", user.shop.id)
    .maybeSingle();
  return data;
}

/** Hesabın şifresi bu sahip tarafından değiştirilebilir mi? (bkz. dosya başındaki güvenlik notu) */
async function isResettableBarberAccount(shopId: string, userId: string): Promise<boolean> {
  const admin = createAdminClient();
  const [{ data: memberships }, { data: platformAdmin }] = await Promise.all([
    admin.from("shop_members").select("shop_id, role").eq("user_id", userId),
    admin.from("platform_admins").select("id").eq("user_id", userId).maybeSingle(),
  ]);
  if (platformAdmin) return false;
  return memberships?.length === 1 && memberships[0].shop_id === shopId && memberships[0].role === "barber";
}

/** Berbere giriş hesabı açar (veya mevcut hesabı bağlar). Yeni hesapta geçici şifre döner. */
export async function createBarberAccountAction(slug: string, barberId: string, emailInput: string): Promise<Result> {
  const user = await requireOwner(slug);
  if (user.shop.isDemo) return { ok: false, error: DEMO_ACCOUNT_LOCKED_MESSAGE };
  const email = z.email().safeParse(String(emailInput).trim().toLowerCase());
  if (!email.success) return { ok: false, error: "Geçerli bir e-posta adresi yazın." };
  const barber = await loadOwnBarber(user, barberId);
  if (!barber) return { ok: false, error: "Berber bulunamadı." };
  if (barber.user_id) return { ok: false, error: "Bu berberin zaten bir giriş hesabı var." };

  const admin = createAdminClient();
  let userId = await findAuthUserIdByEmail(email.data);
  let tempPassword: string | undefined;

  if (!userId) {
    tempPassword = generateTempPassword();
    const { data, error } = await admin.auth.admin.createUser({ email: email.data, password: tempPassword, email_confirm: true });
    if (error) return { ok: false, error: "Hesap oluşturulamadı." };
    userId = data.user.id;
  }

  // Üyelik: zaten üyeyse (ör. sahip kendini berber olarak bağlıyorsa) rolüne dokunma
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("shop_members")
    .select("role")
    .eq("shop_id", user.shop.id)
    .eq("user_id", userId)
    .maybeSingle();
  if (!existing) {
    const { error } = await supabase.from("shop_members").insert({ shop_id: user.shop.id, user_id: userId, role: "barber" });
    if (error) return { ok: false, error: "Hesap dükkana bağlanamadı." };
  }
  const { error: linkError } = await supabase.from("barbers").update({ user_id: userId }).eq("id", barberId).eq("shop_id", user.shop.id);
  if (linkError) return { ok: false, error: "Hesap berbere bağlanamadı (bu kullanıcı başka bir berbere bağlı olabilir)." };

  revalidatePath("/sites/[slug]/panel", "layout");
  return tempPassword
    ? { ok: true, message: `${barber.name} için hesap açıldı. Geçici şifreyi berbere iletin; ilk girişte değiştirmesi gerekir.`, tempPassword }
    : { ok: true, message: `Mevcut hesap (${email.data}) ${barber.name} kaydına bağlandı. Bu kişi kendi şifresiyle giriş yapar.` };
}

/** Berber hesabına yeni geçici şifre verir ("şifremi unuttum" için ücretsiz yol) */
export async function resetBarberPasswordAction(slug: string, barberId: string): Promise<Result> {
  const user = await requireOwner(slug);
  if (user.shop.isDemo) return { ok: false, error: DEMO_ACCOUNT_LOCKED_MESSAGE };
  const barber = await loadOwnBarber(user, barberId);
  if (!barber?.user_id) return { ok: false, error: "Bu berberin giriş hesabı yok." };
  if (!(await isResettableBarberAccount(user.shop.id, barber.user_id))) {
    return { ok: false, error: "Bu hesabın şifresi buradan değiştirilemez (başka bir dükkanda da kullanılıyor). Platform yöneticisine başvurun." };
  }
  const tempPassword = generateTempPassword();
  const { error } = await createAdminClient().auth.admin.updateUserById(barber.user_id, { password: tempPassword });
  if (error) return { ok: false, error: "Şifre değiştirilemedi." };
  return { ok: true, message: `${barber.name} için yeni geçici şifre oluşturuldu. Berbere iletin.`, tempPassword };
}

/** Berberin giriş hesabını bu dükkandan kaldırır (berber kaydı kalır) */
export async function removeBarberAccountAction(slug: string, barberId: string): Promise<Result> {
  const user = await requireOwner(slug);
  if (user.shop.isDemo) return { ok: false, error: DEMO_ACCOUNT_LOCKED_MESSAGE };
  const barber = await loadOwnBarber(user, barberId);
  if (!barber?.user_id) return { ok: false, error: "Bu berberin giriş hesabı yok." };
  if (barber.user_id === user.userId) return { ok: false, error: "Kendi hesabınızı buradan kaldıramazsınız." };
  const accountUserId = barber.user_id;
  const deletable = await isResettableBarberAccount(user.shop.id, accountUserId);

  const supabase = await createClient();
  await supabase.from("barbers").update({ user_id: null }).eq("id", barberId).eq("shop_id", user.shop.id);
  await supabase.from("shop_members").delete().eq("shop_id", user.shop.id).eq("user_id", accountUserId).eq("role", "barber");

  // Hesap sadece bu dükkanda kullanılıyorduysa tamamen silinir. Açık bir oturumu kalsa bile
  // panel her istekte dükkan üyeliğini kontrol ettiği için artık hiçbir sayfaya erişemez.
  if (deletable) await createAdminClient().auth.admin.deleteUser(accountUserId);
  revalidatePath("/sites/[slug]/panel", "layout");
  return { ok: true, message: `${barber.name} artık panele giriş yapamaz.` };
}
