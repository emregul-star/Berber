import type { ReactNode } from "react";
import { PLATFORM_NAME } from "@/lib/constants";

/** Giriş / şifre sayfalarının ortak çerçevesi (menüsüz, ortalanmış kart) */
export function AuthShell({ shopName, title, children }: { shopName: string; title: string; children: ReactNode }) {
  return (
    <main className="flex flex-1 items-center justify-center bg-neutral-100 px-4 py-12">
      <div className="w-full max-w-sm">
        <p className="text-center text-sm font-semibold text-neutral-600">{shopName}</p>
        <h1 className="mt-1 text-center text-2xl font-bold text-neutral-900">{title}</h1>
        <div className="mt-6 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">{children}</div>
        <p className="mt-6 text-center text-xs text-neutral-600">{PLATFORM_NAME} yönetim paneli</p>
      </div>
    </main>
  );
}
