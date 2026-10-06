/**
 * Panel girişi ({slug}.PLATFORM_DOMAIN/panel/giris)
 */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { LoginForm } from "@/components/panel/auth-forms";
import { AuthShell } from "@/components/panel/auth-shell";
import { getPanelUser } from "@/lib/panel/auth";
import { getShopBySlug } from "@/lib/shops";
import { loginAction } from "../auth-actions";

export const metadata: Metadata = { title: "Panel girişi", robots: { index: false } };

export default async function LoginPage({ params }: PageProps<"/sites/[slug]/panel/giris">) {
  const { slug } = await params;
  const shop = await getShopBySlug(slug);
  if (!shop) notFound();
  // Zaten giriş yapmışsa doğrudan panele
  if (await getPanelUser(slug)) redirect("/panel");

  return (
    <AuthShell shopName={shop.name} title="Yönetim paneli">
      <LoginForm action={loginAction.bind(null, slug)} />
      <p className="mt-4 text-center text-sm">
        <Link href="/panel/sifremi-unuttum" className="text-neutral-600 underline hover:text-neutral-900">
          Şifremi unuttum
        </Link>
      </p>
    </AuthShell>
  );
}
