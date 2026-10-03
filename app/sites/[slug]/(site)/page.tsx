/**
 * Dükkanın müşteri sitesi ana sayfası ({slug}.PLATFORM_DOMAIN).
 * Aşama 1 yer tutucusu; tüm bölümler (hizmetler, ekip, galeri...) Aşama 3'te eklenecek.
 */
import { notFound } from "next/navigation";
import { getShopBySlug } from "@/lib/shops";

export default async function ShopHomePage({ params }: PageProps<"/sites/[slug]">) {
  const { slug } = await params;
  const shop = await getShopBySlug(slug);
  if (!shop) notFound();

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-4 px-4 py-16">
      <h1 className="text-3xl font-bold">{shop.name}</h1>
      <p className="text-neutral-600">Dükkan sitesi yapım aşamasında.</p>
      <p className="text-sm text-neutral-500">
        Slug: <code>{shop.slug}</code>
      </p>
    </main>
  );
}
