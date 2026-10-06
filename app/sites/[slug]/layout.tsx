/**
 * Tüm dükkan sayfalarının (müşteri sitesi + panel) ortak çerçevesi.
 * Proxy, {slug}.PLATFORM_DOMAIN isteklerini buraya yönlendirir.
 * Dükkan yoksa "Dükkan bulunamadı" (app/sites/not-found.tsx) gösterilir.
 */
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { PLATFORM_DOMAIN, PLATFORM_NAME, SHOP_PARAM_ALLOWED, SINGLE_DOMAIN_MODE } from "@/lib/constants";
import { getShopBySlug } from "@/lib/shops";
import { resolveTenant } from "@/lib/tenant";

export default async function ShopLayout({ children, params }: LayoutProps<"/sites/[slug]">) {
  const { slug } = await params;
  const shop = await getShopBySlug(slug);
  if (!shop) notFound();

  // Dükkana alt alan adı yerine ?shop= ile gelindiyse (tek adres modu, geliştirme veya
  // Vercel önizlemesi) bunu açıklayan ve platform sayfasına dönüş linki veren bir bant göster.
  const host = (await headers()).get("host") ?? "";
  const viaShopParam = SHOP_PARAM_ALLOWED && resolveTenant(host, PLATFORM_DOMAIN).kind === "platform";

  return (
    <>
      {viaShopParam && (
        <div className="bg-neutral-900 px-4 py-1.5 text-center text-xs text-neutral-200">
          {SINGLE_DOMAIN_MODE ? (
            <>
              <strong className="text-white">{PLATFORM_NAME}</strong> ile hazırlanmış bir dükkan sitesi.{" "}
              <span className="hidden sm:inline">Gerçek kullanımda her dükkanın kendi adresi olur. </span>
            </>
          ) : (
            <>
              Önizleme: <strong className="text-white">{shop.slug}</strong> dükkanı ?shop= ile seçildi.{" "}
            </>
          )}
          {/* Bilerek <a>: proxy'nin çerezi silmesi için sayfa tamamen yeniden yüklenmeli. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a className="font-semibold text-white underline" href="/?shop=">
            Platform sayfasına dön
          </a>
        </div>
      )}
      {children}
    </>
  );
}
