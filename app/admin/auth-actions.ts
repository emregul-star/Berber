"use server";

/**
 * Süper yönetici girişi / çıkışı.
 */
import { redirect } from "next/navigation";
import { z } from "zod";
import { getAdminUser, ADMIN_LOGIN_PATH } from "@/lib/admin/auth";
import { LOGIN_LIMITS } from "@/lib/constants";
import { adminPath } from "@/lib/links";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";

export type FormState = { error?: string; success?: string; redirectTo?: string } | undefined;

export async function adminLoginAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = z
    .object({ email: z.email("Geçerli bir e-posta adresi yazın."), password: z.string().min(1, "Şifrenizi yazın.") })
    .safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const ip = await getClientIp();
  if (!(await checkRateLimit(`admin-login:ip:${ip}`, LOGIN_LIMITS.perIp.max, LOGIN_LIMITS.perIp.windowSeconds))) {
    return { error: "Çok fazla deneme yaptınız. Lütfen birkaç dakika sonra tekrar deneyin." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email.trim().toLowerCase(),
    password: parsed.data.password,
  });
  if (error) return { error: "E-posta veya şifre hatalı." };

  if (!(await getAdminUser())) {
    await supabase.auth.signOut();
    return { error: "Bu hesabın yönetici yetkisi yok." };
  }
  // DİKKAT: Burada redirect("/") KULLANILMAZ. Server Action içindeki yönlendirmede Next hedef sayfayı
  // aynı istekte çizer ve proxy'nin adres yeniden yazmasını atlar; admin alt alan adında "/" yerine
  // platform ana sayfası açılırdı. Bunun yerine tarayıcı sayfayı baştan yükler (bkz. LoginForm).
  return { redirectTo: adminPath("/") };
}

export async function adminLogoutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect(ADMIN_LOGIN_PATH);
}
