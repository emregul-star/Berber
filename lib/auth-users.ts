/**
 * Supabase Auth kullanıcı işlemleri (secret key ile) — e-posta GÖNDERMEZ (ücretsiz kurulum).
 * Panel ve süper yönetici işlemleri ortak kullanır.
 */
import "server-only";
import { generateTempPassword } from "./panel/passwords";
import { createAdminClient } from "./supabase/admin";

export async function findAuthUserIdByEmail(email: string): Promise<string | null> {
  const admin = createAdminClient();
  const target = email.trim().toLowerCase();
  for (let page = 1; page < 50; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(error.message);
    const found = data.users.find((u) => u.email?.toLowerCase() === target);
    if (found) return found.id;
    if (data.users.length < 200) return null;
  }
  return null;
}

/**
 * E-postaya ait kullanıcıyı bulur, yoksa geçici şifreyle oluşturur.
 * created=true ise geçici şifre döner (bir kez gösterilip kullanıcıya iletilmeli).
 */
export async function findOrCreateUser(email: string): Promise<{ userId: string; created: boolean; tempPassword?: string }> {
  const existing = await findAuthUserIdByEmail(email);
  if (existing) return { userId: existing, created: false };
  const tempPassword = generateTempPassword();
  const { data, error } = await createAdminClient().auth.admin.createUser({
    email: email.trim().toLowerCase(),
    password: tempPassword,
    email_confirm: true,
  });
  if (error || !data.user) throw new Error(`Hesap oluşturulamadı: ${error?.message ?? "bilinmeyen hata"}`);
  return { userId: data.user.id, created: true, tempPassword };
}
