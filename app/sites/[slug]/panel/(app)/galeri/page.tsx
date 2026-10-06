/**
 * Galeri (Bölüm 8.1) — sadece dükkan sahibi.
 */
import { GalleryManager } from "@/components/panel/gallery-manager";
import { PageHeader } from "@/components/panel/ui";
import { requireOwner } from "@/lib/panel/auth";
import { createClient } from "@/lib/supabase/server";

export default async function GalleryPage({ params }: PageProps<"/sites/[slug]/panel/galeri">) {
  const { slug } = await params;
  const user = await requireOwner(slug);
  const supabase = await createClient();
  const { data } = await supabase
    .from("gallery_images")
    .select("id, image_url, caption")
    .eq("shop_id", user.shop.id)
    .order("sort_order");

  return (
    <>
      <PageHeader title="Galeri" description="Müşteri sitesindeki galeri. Sıralamayı oklarla değiştirin." />
      <GalleryManager slug={slug} shopId={user.shop.id} items={data ?? []} />
    </>
  );
}
