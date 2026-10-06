/**
 * Berberler (Bölüm 8.1) — sadece dükkan sahibi.
 */
import { BarbersManager } from "@/components/panel/barbers-manager";
import { PageHeader } from "@/components/panel/ui";
import { requireOwner } from "@/lib/panel/auth";
import { listBarbers, listServices } from "@/lib/panel/data";
import { createClient } from "@/lib/supabase/server";

export default async function BarbersPage({ params }: PageProps<"/sites/[slug]/panel/berberler">) {
  const { slug } = await params;
  const user = await requireOwner(slug);
  const supabase = await createClient();
  const [barbers, services, links] = await Promise.all([
    listBarbers(user),
    listServices(user),
    supabase.from("barber_services").select("barber_id, service_id").eq("shop_id", user.shop.id),
  ]);

  return (
    <>
      <PageHeader
        title="Berberler"
        description="Randevusu olan berber silinemez; pasif yapın. Giriş hesabı açılan berber kendi randevularını görür."
      />
      <BarbersManager
        slug={slug}
        shopId={user.shop.id}
        barbers={barbers.map((b) => ({
          id: b.id,
          name: b.name,
          title: b.title,
          bio: b.bio,
          photo_url: b.photo_url,
          is_active: b.is_active,
          hasAccount: Boolean(b.user_id),
          serviceIds: (links.data ?? []).filter((l) => l.barber_id === b.id).map((l) => l.service_id),
        }))}
        services={services.map((s) => ({ id: s.id, name: s.name, is_active: s.is_active }))}
      />
    </>
  );
}
