/**
 * Dükkan yönetim paneli ({slug}.PLATFORM_DOMAIN/panel).
 * Aşama 1 yer tutucusu; giriş ve tüm panel sayfaları Aşama 7'de eklenecek.
 */
import { notFound } from "next/navigation";
import { getShopBySlug } from "@/lib/shops";

export default async function PanelHomePage({ params }: PageProps<"/sites/[slug]/panel">) {
  const { slug } = await params;
  const shop = await getShopBySlug(slug);
  if (!shop) notFound();

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-4 px-4 py-16">
      {shop.status === "suspended" && (
        <p className="rounded-md bg-red-50 p-3 text-sm text-red-800">
          Dükkanınızın sitesi ödeme yapılmadığı için askıya alındı. Lütfen aylık ödemenizi yapın.
        </p>
      )}
      <h1 className="text-2xl font-bold">{shop.name} — Yönetim Paneli</h1>
      <p className="text-neutral-600">Panel yapım aşamasında.</p>
    </main>
  );
}
