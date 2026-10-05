/**
 * Müşteriye açık sayfaların (ana sayfa, randevu alma, KVKK...) çerçevesi.
 * "(site)" bir route group'tur; adrese yansımaz, sadece paneli bu kuraldan ayırmak için var.
 *
 * - Dükkan askıdaysa müşteri sayfaları yerine "hizmet dışı" mesajı gösterilir.
 * - Dükkanın teması (renkler, yazı tipi) burada sayfaya uygulanır.
 */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader, type NavItem } from "@/components/site/site-header";
import { getShopBySlug } from "@/lib/shops";
import { getShopSiteData } from "@/lib/site-data";
import { resolveTheme, themeToRootCss } from "@/lib/themes";

const NAV_ITEMS: NavItem[] = [
  { href: "/#hizmetler", label: "Hizmetler" },
  { href: "/#ekibimiz", label: "Ekibimiz" },
  { href: "/#galeri", label: "Galeri" },
  { href: "/#yorumlar", label: "Yorumlar" },
  { href: "/#iletisim", label: "İletişim" },
];

export async function generateMetadata({ params }: LayoutProps<"/sites/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const data = await getShopSiteData(slug);
  if (!data) return {};
  return {
    title: data.shop.name,
    description: data.shop.description ?? `${data.shop.name} — online randevu`,
  };
}

export default async function ShopSiteLayout({ children, params }: LayoutProps<"/sites/[slug]">) {
  const { slug } = await params;
  // Üst layout dükkanın var olduğunu zaten kontrol etti; cache() sayesinde tekrar sorgulanmaz.
  const shop = await getShopBySlug(slug);

  if (shop?.status === "suspended") {
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-3 px-4 py-16 text-center">
        <h1 className="text-xl font-semibold">{shop.name}</h1>
        <p className="text-neutral-600">Bu sayfa geçici olarak hizmet dışıdır.</p>
      </main>
    );
  }

  const data = await getShopSiteData(slug);
  if (!data) notFound();

  const theme = resolveTheme(data.shop.theme_preset, data.shop.primary_color, data.shop.accent_color);

  return (
    <>
      {/* Tema renkleri tüm sayfaya uygulanır (değerler doğrulanmış hex renklerdir) */}
      <style>{themeToRootCss(theme)}</style>

      {data.shop.is_demo && (
        <p className="bg-primary px-4 py-1.5 text-center text-xs font-medium text-on-primary">
          Bu bir demo sitesidir. Alınan randevular gerçek değildir.
        </p>
      )}

      <SiteHeader name={data.shop.name} logoUrl={data.shop.logo_url} navItems={NAV_ITEMS} />
      <div className="flex flex-1 flex-col">{children}</div>
      <SiteFooter name={data.shop.name} />
    </>
  );
}
