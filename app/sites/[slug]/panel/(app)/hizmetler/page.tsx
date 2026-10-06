/**
 * Hizmetler (Bölüm 8.1) — sadece dükkan sahibi.
 */
import { ServicesManager } from "@/components/panel/services-manager";
import { PageHeader } from "@/components/panel/ui";
import { requireOwner } from "@/lib/panel/auth";
import { listBarbers, listServices } from "@/lib/panel/data";
import { createClient } from "@/lib/supabase/server";

export default async function ServicesPage({ params }: PageProps<"/sites/[slug]/panel/hizmetler">) {
  const { slug } = await params;
  const user = await requireOwner(slug);
  const supabase = await createClient();
  const [services, barbers, links] = await Promise.all([
    listServices(user),
    listBarbers(user),
    supabase.from("barber_services").select("barber_id, service_id").eq("shop_id", user.shop.id),
  ]);

  return (
    <>
      <PageHeader
        title="Hizmetler"
        description="Sıralamayı oklarla değiştirin. Randevusu olan hizmet silinemez; pasif yapın."
      />
      <ServicesManager
        slug={slug}
        services={services.map((s) => ({
          ...s,
          price: Number(s.price),
          barberIds: (links.data ?? []).filter((l) => l.service_id === s.id).map((l) => l.barber_id),
        }))}
        barbers={barbers.map((b) => ({ id: b.id, name: b.name, is_active: b.is_active }))}
      />
    </>
  );
}
