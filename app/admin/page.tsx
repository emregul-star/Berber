/**
 * Süper yönetici paneli (admin.PLATFORM_DOMAIN).
 * Aşama 1 yer tutucusu; giriş kontrolü ve tüm sayfalar Aşama 9'da eklenecek.
 */
import { PLATFORM_NAME } from "@/lib/constants";

export default function AdminHomePage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-4 px-4 py-16">
      <h1 className="text-2xl font-bold">{PLATFORM_NAME} — Süper Yönetici</h1>
      <p className="text-neutral-600">Yönetim paneli yapım aşamasında.</p>
    </main>
  );
}
