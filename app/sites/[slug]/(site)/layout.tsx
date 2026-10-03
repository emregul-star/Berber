/**
 * Müşteriye açık sayfaların (ana sayfa, randevu alma, KVKK...) çerçevesi.
 * "(site)" bir route group'tur; adrese yansımaz, sadece paneli bu kuraldan ayırmak için var.
 * Dükkan askıdaysa müşteri sayfaları yerine "hizmet dışı" mesajı gösterilir.
 */
import { getShopBySlug } from "@/lib/shops";

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

  return children;
}
