/**
 * Süper yönetici girişi (admin.PLATFORM_DOMAIN/giris)
 */
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/panel/auth-forms";
import { AuthShell } from "@/components/panel/auth-shell";
import { getAdminUser } from "@/lib/admin/auth";
import { PLATFORM_NAME } from "@/lib/constants";
import { adminPath } from "@/lib/links";
import { adminLoginAction } from "../auth-actions";

export const metadata: Metadata = { title: "Yönetici girişi", robots: { index: false } };

export default async function AdminLoginPage() {
  if (await getAdminUser()) redirect(adminPath("/"));
  return (
    <AuthShell shopName={PLATFORM_NAME} title="Süper yönetici">
      <LoginForm action={adminLoginAction} />
    </AuthShell>
  );
}
