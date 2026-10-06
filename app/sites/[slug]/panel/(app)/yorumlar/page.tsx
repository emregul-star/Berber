/**
 * Yorumlar (Bölüm 8.1) — sadece dükkan sahibi. Google yorumları API ile çekilmez (kapsam dışı);
 * beğenilen yorumlar buradan elle eklenir.
 */
import { TestimonialsManager } from "@/components/panel/testimonials-manager";
import { PageHeader } from "@/components/panel/ui";
import { requireOwner } from "@/lib/panel/auth";
import { createClient } from "@/lib/supabase/server";

export default async function TestimonialsPage({ params }: PageProps<"/sites/[slug]/panel/yorumlar">) {
  const { slug } = await params;
  const user = await requireOwner(slug);
  const supabase = await createClient();
  const { data } = await supabase
    .from("testimonials")
    .select("id, author_name, rating, content, source, is_visible")
    .eq("shop_id", user.shop.id)
    .order("sort_order");
  return (
    <>
      <PageHeader title="Yorumlar" description="Müşteri sitesinde gösterilen seçili yorumlar." />
      <TestimonialsManager slug={slug} items={data ?? []} />
    </>
  );
}
