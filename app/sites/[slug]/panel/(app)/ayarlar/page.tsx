/**
 * Ayarlar (Bölüm 8.1, 9) — sadece dükkan sahibi.
 */
import { ImagesForm, InfoForm, LinksForm, RulesForm, ThemeForm } from "@/components/panel/settings-forms";
import { PageHeader } from "@/components/panel/ui";
import { requireOwner } from "@/lib/panel/auth";
import { createClient } from "@/lib/supabase/server";

export default async function SettingsPage({ params }: PageProps<"/sites/[slug]/panel/ayarlar">) {
  const { slug } = await params;
  const user = await requireOwner(slug);
  const supabase = await createClient();
  const [{ data: shop }, { data: rules }] = await Promise.all([
    supabase
      .from("shops")
      .select(
        "name, description, phone, whatsapp_number, email, address, logo_url, cover_image_url, theme_preset, primary_color, accent_color, google_maps_embed_url, google_reviews_url, instagram_url",
      )
      .eq("id", user.shop.id)
      .single(),
    supabase
      .from("shop_settings")
      .select("slot_interval_minutes, min_notice_minutes, max_advance_days, cancel_deadline_minutes, buffer_minutes, requires_approval, allow_any_barber")
      .eq("shop_id", user.shop.id)
      .single(),
  ]);
  if (!shop || !rules) throw new Error("Ayarlar okunamadı.");

  return (
    <>
      <PageHeader title="Ayarlar" description={`Site adresiniz: ${slug}`} />
      <nav aria-label="Ayar bölümleri" className="mb-4 flex flex-wrap gap-3 text-sm">
        {[
          ["#bilgiler", "Bilgiler"],
          ["#gorseller", "Görseller"],
          ["#tema", "Tema"],
          ["#linkler", "Linkler"],
          ["#kurallar", "Randevu kuralları"],
        ].map(([href, label]) => (
          <a key={href} href={href} className="text-neutral-600 underline hover:text-neutral-900">
            {label}
          </a>
        ))}
      </nav>
      <div className="grid gap-6">
        <InfoForm slug={slug} shop={shop} />
        <ImagesForm slug={slug} shopId={user.shop.id} logoUrl={shop.logo_url} coverUrl={shop.cover_image_url} />
        <ThemeForm slug={slug} shopName={shop.name} initial={{ preset: shop.theme_preset, primary: shop.primary_color, accent: shop.accent_color }} />
        <LinksForm slug={slug} links={{ maps: shop.google_maps_embed_url, reviews: shop.google_reviews_url, instagram: shop.instagram_url }} />
        <RulesForm slug={slug} rules={rules} />
      </div>
    </>
  );
}
