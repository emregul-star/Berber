/**
 * Elle randevu ekle (Bölüm 8.1): telefonla gelen randevuyu sisteme girme (source = panel).
 * Sahip tüm aktif berberler için, berber sadece kendisi için ekleyebilir.
 */
import { ManualAppointmentForm } from "@/components/panel/manual-appointment-form";
import { Card, EmptyState, PageHeader } from "@/components/panel/ui";
import { requirePanelUser } from "@/lib/panel/auth";
import { listBarbers, listServices, todayRange } from "@/lib/panel/data";
import { createClient } from "@/lib/supabase/server";

export default async function NewAppointmentPage({ params }: PageProps<"/sites/[slug]/panel/randevular/yeni">) {
  const { slug } = await params;
  const user = await requirePanelUser(slug);
  const supabase = await createClient();

  const [barbers, services, links, settings] = await Promise.all([
    listBarbers(user),
    listServices(user),
    supabase.from("barber_services").select("barber_id, service_id").eq("shop_id", user.shop.id),
    supabase.from("shop_settings").select("slot_interval_minutes").eq("shop_id", user.shop.id).maybeSingle(),
  ]);

  const selectableBarbers = barbers
    .filter((b) => b.is_active && (user.role === "owner" || b.id === user.barberId))
    .map((b) => ({ id: b.id, name: b.name }));
  const barberServices: Record<string, string[]> = {};
  for (const link of links.data ?? []) (barberServices[link.barber_id] ??= []).push(link.service_id);

  return (
    <>
      <PageHeader title="Randevu ekle" description="Telefonla veya dükkanda alınan randevuyu sisteme girin." />
      <Card>
        {selectableBarbers.length === 0 ? (
          <EmptyState>
            {user.role === "owner"
              ? "Önce Berberler sayfasından en az bir aktif berber ekleyin."
              : "Hesabınız bir berber kaydına bağlı değil. Dükkan sahibiyle iletişime geçin."}
          </EmptyState>
        ) : (
          <ManualAppointmentForm
            slug={slug}
            barbers={selectableBarbers}
            services={services.filter((s) => s.is_active).map((s) => ({ id: s.id, name: s.name, durationMinutes: s.duration_minutes }))}
            barberServices={barberServices}
            defaultDate={todayRange().today}
            slotIntervalMinutes={settings.data?.slot_interval_minutes ?? 15}
          />
        )}
      </Card>
    </>
  );
}
