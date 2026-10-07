"use server";

/**
 * Panel giriş/çıkış ve şifre işlemleri (Supabase Auth, e-posta + şifre).
 */
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { AUTH_EMAILS_ENABLED, LOGIN_LIMITS } from "@/lib/constants";
import { DEMO_ACCOUNT_LOCKED_MESSAGE, getPanelUser, LOGIN_PATH, requirePanelUser } from "@/lib/panel/auth";
import { demoCredentials, repairDemoAccount, type DemoRole } from "@/lib/demo";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { getShopBySlug } from "@/lib/shops";
import { createClient } from "@/lib/supabase/server";

export type FormState = { error?: string; success?: string; redirectTo?: string } | undefined;

const loginSchema = z.object({
  email: z.email("Geçerli bir e-posta adresi yazın."),
  password: z.string().min(1, "Şifrenizi yazın."),
});

export async function loginAction(slug: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const ip = await getClientIp();
  if (!(await checkRateLimit(`login:ip:${ip}`, LOGIN_LIMITS.perIp.max, LOGIN_LIMITS.perIp.windowSeconds))) {
    return { error: "Çok fazla deneme yaptınız. Lütfen birkaç dakika sonra tekrar deneyin." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email.trim().toLowerCase(),
    password: parsed.data.password,
  });
  // Hangi bilginin yanlış olduğunu söylemiyoruz (hesap var mı yok mu sızmasın)
  if (error) return { error: "E-posta veya şifre hatalı." };

  // Giriş başarılı ama bu dükkanın üyesi değilse oturumu kapat
  if (!(await getPanelUser(slug))) {
    await supabase.auth.signOut();
    return { error: "Bu dükkana ait bir panel hesabınız yok." };
  }

  redirect("/panel");
}

/**
 * Demo dükkanda tek tıkla giriş (portföy ziyaretçileri için). Sadece is_demo dükkanda çalışır;
 * hesap bilgileri sunucudaki ortam değişkenlerinden okunur.
 */
export async function demoLoginAction(slug: string, role: DemoRole): Promise<FormState> {
  const shop = await getShopBySlug(slug);
  const credentials = demoCredentials(role);
  if (!shop?.isDemo || !credentials) return { error: "Demo girişi kullanılamıyor." };

  const ip = await getClientIp();
  if (!(await checkRateLimit(`login:ip:${ip}`, LOGIN_LIMITS.perIp.max, LOGIN_LIMITS.perIp.windowSeconds))) {
    return { error: "Çok fazla deneme yaptınız. Lütfen birkaç dakika sonra tekrar deneyin." };
  }

  const supabase = await createClient();
  const signIn = async () => !(await supabase.auth.signInWithPassword(credentials)).error;
  // Bir ziyaretçi demo hesabının şifresini veya bağlantısını bozmuş olabilir: bir kez onarıp tekrar dene.
  // (getPanelUser istek boyunca önbelleğe alındığı için sadece ilk denemede sorulur; onarım üyeliği tamamlar.)
  let ok = (await signIn()) && !!(await getPanelUser(slug));
  if (!ok) {
    await repairDemoAccount(role, shop.id).catch((e) => console.error("Demo hesabı onarılamadı:", e));
    ok = await signIn();
  }
  if (!ok) {
    await supabase.auth.signOut();
    return { error: "Demo hesabı şu anda hazır değil. Lütfen daha sonra tekrar deneyin." };
  }
  return { redirectTo: "/panel" };
}

export async function logoutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect(LOGIN_PATH);
}

const passwordSchema = z
  .object({
    password: z.string().min(8, "Şifre en az 8 karakter olmalı.").max(72, "Şifre en fazla 72 karakter olabilir."),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { message: "Şifreler aynı değil.", path: ["confirm"] });

/** Giriş yapmış kullanıcının kendi şifresini değiştirmesi (e-posta gerekmez) */
export async function changePasswordAction(slug: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requirePanelUser(slug);
  if (user.shop.isDemo) return { error: DEMO_ACCOUNT_LOCKED_MESSAGE };
  const parsed = passwordSchema.safeParse({ password: formData.get("password"), confirm: formData.get("confirm") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    if (error.code === "same_password") return { error: "Yeni şifre eskisiyle aynı olamaz." };
    if (error.code === "weak_password") return { error: "Bu şifre çok zayıf, lütfen daha güçlü bir şifre seçin." };
    return { error: "Şifre değiştirilemedi. Lütfen tekrar deneyin." };
  }
  return { success: "Şifreniz değiştirildi." };
}

/**
 * "Şifremi unuttum": e-posta ile sıfırlama linki gönderir.
 * Sadece AUTH_EMAILS_ENABLED açıksa (Supabase'e özel SMTP tanımlıysa) çalışır.
 */
export async function requestPasswordResetAction(_prev: FormState, formData: FormData): Promise<FormState> {
  if (!AUTH_EMAILS_ENABLED) return { error: "E-posta ile şifre sıfırlama şu anda kapalı." };
  const parsed = z.email().safeParse(formData.get("email"));
  if (!parsed.success) return { error: "Geçerli bir e-posta adresi yazın." };

  const ip = await getClientIp();
  if (!(await checkRateLimit(`reset:ip:${ip}`, 5, 60 * 60))) {
    return { error: "Çok fazla deneme yaptınız. Lütfen daha sonra tekrar deneyin." };
  }

  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(parsed.data.toLowerCase(), {
    redirectTo: `${origin}/panel/auth/confirm?next=/panel/sifre`,
  });
  // Hesap olsun olmasın aynı mesaj (hangi e-postaların kayıtlı olduğu sızmasın)
  return { success: "Bu e-postaya ait bir hesap varsa şifre sıfırlama linki gönderildi." };
}
