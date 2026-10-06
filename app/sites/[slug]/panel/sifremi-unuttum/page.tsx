/**
 * Şifremi unuttum ({slug}.PLATFORM_DOMAIN/panel/sifremi-unuttum)
 *
 * İki mod:
 *  - AUTH_EMAILS_ENABLED=true (Supabase'e özel SMTP tanımlı): e-posta ile sıfırlama linki
 *  - Kapalı (varsayılan, ücretsiz kurulum): kullanıcı yöneticiye yönlendirilir. Berber için
 *    dükkan sahibi, sahip için platform yöneticisi panelden yeni geçici şifre belirler.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ResetRequestForm } from "@/components/panel/auth-forms";
import { AuthShell } from "@/components/panel/auth-shell";
import { AUTH_EMAILS_ENABLED, PLATFORM_SUPPORT_WHATSAPP } from "@/lib/constants";
import { getShopBySlug } from "@/lib/shops";
import { whatsappLink } from "@/lib/whatsapp";
import { requestPasswordResetAction } from "../auth-actions";

export const metadata: Metadata = { title: "Şifremi unuttum", robots: { index: false } };

export default async function ForgotPasswordPage({ params }: PageProps<"/sites/[slug]/panel/sifremi-unuttum">) {
  const { slug } = await params;
  const shop = await getShopBySlug(slug);
  if (!shop) notFound();

  return (
    <AuthShell shopName={shop.name} title="Şifremi unuttum">
      {AUTH_EMAILS_ENABLED ? (
        <>
          <p className="mb-4 text-sm text-neutral-600">E-posta adresinizi yazın, size şifre sıfırlama linki gönderelim.</p>
          <ResetRequestForm action={requestPasswordResetAction} />
        </>
      ) : (
        <div className="grid gap-3 text-sm text-neutral-700">
          <p>Şifrenizi sıfırlamak için:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong>Berberseniz:</strong> dükkan sahibinden panelden size yeni bir geçici şifre vermesini isteyin.
            </li>
            <li>
              <strong>Dükkan sahibiyseniz:</strong> platform yöneticisiyle iletişime geçin.
            </li>
          </ul>
          {PLATFORM_SUPPORT_WHATSAPP && (
            <a
              href={whatsappLink(PLATFORM_SUPPORT_WHATSAPP, `Merhaba, ${shop.name} panel şifremi unuttum.`)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 rounded-lg bg-[#25D366] px-4 py-2.5 text-center font-semibold text-[#0b3d1f]"
            >
              Platform yöneticisine WhatsApp&apos;tan yaz
            </a>
          )}
        </div>
      )}
      <p className="mt-6 text-center text-sm">
        <Link href="/panel/giris" className="text-neutral-600 underline hover:text-neutral-900">
          Girişe dön
        </Link>
      </p>
    </AuthShell>
  );
}
