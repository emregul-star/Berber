/**
 * Tüm dükkan sayfalarının (müşteri sitesi + panel) ortak çerçevesi.
 * Proxy, {slug}.PLATFORM_DOMAIN isteklerini buraya yönlendirir.
 * Dükkan yoksa "Dükkan bulunamadı" (app/sites/not-found.tsx) gösterilir.
 */
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { PLATFORM_DOMAIN } from "@/lib/constants";
import { getShopBySlug } from "@/lib/shops";
import { normalizeHostname } from "@/lib/tenant";

export default async function ShopLayout({ children, params }: LayoutProps<"/sites/[slug]">) {
  const { slug } = await params;
  const shop = await getShopBySlug(slug);
  if (!shop) notFound();

  // Geliştirmede dükkana ?shop= ile (ana alan adından) gelindiyse bunu hatırlatan bir bant göster.
  const host = normalizeHostname((await headers()).get("host") ?? "");
  const viaDevParam =
    process.env.NODE_ENV === "development" && host === normalizeHostname(PLATFORM_DOMAIN);

  return (
    <>
      {viaDevParam && (
        <div className="bg-amber-100 px-4 py-1 text-center text-xs text-amber-900">
          Geliştirme modu: <strong>{shop.slug}</strong> dükkanı ?shop= ile seçildi.{" "}
          {/* Bilerek <a>: proxy'nin çerezi silmesi için sayfa tamamen yeniden yüklenmeli. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a className="underline" href="/?shop=">
            Platform sayfasına dön
          </a>
        </div>
      )}
      {children}
    </>
  );
}
