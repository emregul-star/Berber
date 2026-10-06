/**
 * İzinler (Bölüm 8.1): tarih aralığıyla izin / kapalı gün. Berber sadece kendi izinlerini yönetir.
 */
import { formatInTimeZone } from "date-fns-tz";
import { tr } from "date-fns/locale";
import { TimeOffManager } from "@/components/panel/time-off-manager";
import { EmptyState, PageHeader } from "@/components/panel/ui";
import { TIME_ZONE } from "@/lib/constants";
import { canManageBarber, requirePanelUser } from "@/lib/panel/auth";
import { listBarbers, todayRange } from "@/lib/panel/data";
import { createClient } from "@/lib/supabase/server";

function rangeLabel(startsAt: Date, endsAt: Date): string {
  const f = (d: Date, p: string) => formatInTimeZone(d, TIME_ZONE, p, { locale: tr });
  const allDay = f(startsAt, "HH:mm") === "00:00" && f(endsAt, "HH:mm") === "00:00";
  if (allDay) {
    const lastDay = new Date(endsAt.getTime() - 1);
    const same = f(startsAt, "yyyy-MM-dd") === f(lastDay, "yyyy-MM-dd");
    return same ? `${f(startsAt, "d MMMM EEEE")} (tüm gün)` : `${f(startsAt, "d MMMM")} – ${f(lastDay, "d MMMM yyyy")} (tüm gün)`;
  }
  return `${f(startsAt, "d MMMM HH:mm")} – ${f(endsAt, "d MMMM HH:mm")}`;
}

export default async function TimeOffPage({ params }: PageProps<"/sites/[slug]/panel/izinler">) {
  const { slug } = await params;
  const user = await requirePanelUser(slug);
  const isOwner = user.role === "owner";
  const supabase = await createClient();

  const [{ data }, barbers] = await Promise.all([
    supabase
      .from("time_off")
      .select("id, barber_id, starts_at, ends_at, reason")
      .eq("shop_id", user.shop.id)
      .gt("ends_at", new Date().toISOString())
      .order("starts_at"),
    listBarbers(user),
  ]);
  const name = (id: string | null) => (id ? (barbers.find((b) => b.id === id)?.name ?? "Berber") : "Tüm dükkan");

  // Berber: sadece kendi izinleri ve tüm dükkan kapanışları gösterilir
  const visible = (data ?? []).filter((t) => isOwner || t.barber_id === null || t.barber_id === user.barberId);

  if (!isOwner && !user.barberId) {
    return (
      <>
        <PageHeader title="İzinler" />
        <EmptyState>Hesabınız bir berber kaydına bağlı değil.</EmptyState>
      </>
    );
  }

  return (
    <>
      <PageHeader title="İzinler" description="İzinli zamanlarda müşteri sitesinden randevu alınamaz." />
      <TimeOffManager
        slug={slug}
        isOwner={isOwner}
        ownBarberId={user.barberId}
        today={todayRange().today}
        barbers={barbers.filter((b) => b.is_active).map((b) => ({ id: b.id, name: b.name }))}
        items={visible.map((t) => ({
          id: t.id,
          who: name(t.barber_id),
          label: rangeLabel(new Date(t.starts_at), new Date(t.ends_at)),
          // Sebep sadece sahibe ve iznin sahibine gösterilir
          reason: isOwner || t.barber_id === user.barberId ? t.reason : null,
          canDelete: t.barber_id === null ? isOwner : canManageBarber(user, t.barber_id),
        }))}
      />
    </>
  );
}
