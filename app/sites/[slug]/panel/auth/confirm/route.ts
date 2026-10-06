/**
 * E-postadaki şifre sıfırlama linkinin döndüğü adres: /panel/auth/confirm
 * (Sadece AUTH_EMAILS_ENABLED açıkken kullanılır.)
 *
 * Supabase linki iki biçimde gönderebilir:
 *  - ?code=...                     (PKCE akışı, varsayılan şablon)
 *  - ?token_hash=...&type=recovery (özelleştirilmiş e-posta şablonu)
 * İkisinde de oturum açılır ve kullanıcı yeni şifre belirlemesi için /panel/sifre'ye gider.
 */
import type { EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  // Sadece panel içi yollara yönlendir (açık yönlendirme açığını önler)
  const nextParam = url.searchParams.get("next") ?? "/panel/sifre";
  const next = nextParam.startsWith("/panel") ? nextParam : "/panel/sifre";

  const supabase = await createClient();
  let ok = false;
  if (code) {
    ok = !(await supabase.auth.exchangeCodeForSession(code)).error;
  } else if (tokenHash && type) {
    ok = !(await supabase.auth.verifyOtp({ type, token_hash: tokenHash })).error;
  }

  redirect(ok ? next : "/panel/giris?hata=link");
}
