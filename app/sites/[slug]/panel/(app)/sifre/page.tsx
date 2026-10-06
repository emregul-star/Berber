/**
 * Şifre değiştir: giriş yapmış kullanıcı kendi şifresini değiştirir (e-posta gerekmez).
 * Yönetici/sahip tarafından verilen geçici şifreden sonra ilk iş bu sayfa kullanılmalı.
 */
import { ChangePasswordForm } from "@/components/panel/auth-forms";
import { Card, PageHeader } from "@/components/panel/ui";
import { requirePanelUser } from "@/lib/panel/auth";
import { changePasswordAction } from "../../auth-actions";

export default async function ChangePasswordPage({ params }: PageProps<"/sites/[slug]/panel/sifre">) {
  const { slug } = await params;
  const user = await requirePanelUser(slug);
  return (
    <>
      <PageHeader title="Şifre değiştir" description={user.email ?? undefined} />
      <Card>
        <ChangePasswordForm action={changePasswordAction.bind(null, slug)} />
      </Card>
    </>
  );
}
