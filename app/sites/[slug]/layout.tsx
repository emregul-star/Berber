/**
 * Tüm dükkan sayfalarının (müşteri sitesi + panel) ortak çerçevesi.
 * Proxy, {slug}.PLATFORM_DOMAIN isteklerini buraya yönlendirir.
 * Dükkan yoksa "Dükkan bulunamadı" (app/sites/not-found.tsx) gösterilir.
 */
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { PLATFORM_DOMAIN } from "@/lib/constants";
import { getShopBySlug } from "@/lib/shops";
import { resolveTenant } from "@/lib/tenant";

export default async function ShopLayout({ children, params }: LayoutProps<"/sites/[slug]">) {
  const { slug } = await params;
  const shop = await getShopBySlug(slug);
  if (!shop) notFound();

  // Dükkana alt alan adı yerine ?shop= ile (geliştirmede veya Vercel önizlemesinde)
  // gelindiyse bunu hatırlatan bir bant göster.
  const host = (await headers()).get("host") ?? "";
  const shopParamAllowed =
    process.env.NODE_ENV === "development" || process.env.VERCEL_ENV === "preview";
  const viaShopParam = shopParamAllowed && resolveTenant(host, PLATFORM_DOMAIN).kind === "platform";

  return (
    <>
      {viaShopParam && (
        <div className="bg-amber-100 px-4 py-1 text-center text-xs text-amber-900">
          Önizleme: <strong>{shop.slug}</strong> dükkanı ?shop= ile seçildi.{" "}
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
