/**
 * Panelde "randevu ekle" formu için boş saat önerileri:
 * GET /panel/randevular/saatler?barberId=..&serviceId=..&date=YYYY-MM-DD
 *
 * Müşteri sitesinden farklı olarak min_notice ve max_advance sınırları uygulanmaz
 * (dükkan telefonla gelen randevuyu her zaman girebilmeli). Sadece panel kullanıcısı çağırabilir;
 * berber sadece kendisi için sorgulayabilir.
 */
import { formatInTimeZone } from "date-fns-tz";
import { z } from "zod";
import { computeSlotsForDay, loadBookingContext } from "@/lib/booking";
import { TIME_ZONE } from "@/lib/constants";
import { canManageBarber, getPanelUser } from "@/lib/panel/auth";
import { createAdminClient } from "@/lib/supabase/admin";

const querySchema = z.object({ barberId: z.uuid(), serviceId: z.uuid(), date: z.iso.date() });

export async function GET(request: Request, { params }: RouteContext<"/sites/[slug]/panel/randevular/saatler">) {
  const { slug } = await params;
  const user = await getPanelUser(slug);
  if (!user) return Response.json({ error: "Giriş gerekli." }, { status: 401 });

  const query = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!query.success) return Response.json({ error: "Geçersiz istek." }, { status: 400 });
  if (!canManageBarber(user, query.data.barberId)) return Response.json({ error: "Yetki yok." }, { status: 403 });

  const supabase = createAdminClient();
  const ctx = await loadBookingContext(slug, supabase);
  if (!ctx) return Response.json({ slots: [] });
  const panelCtx = { ...ctx, settings: { ...ctx.settings, min_notice_minutes: 0, max_advance_days: 365 } };

  const slots = await computeSlotsForDay(supabase, panelCtx, query.data.serviceId, [query.data.barberId], query.data.date, new Date());
  return Response.json(
    { slots: [...slots.keys()].map((iso) => formatInTimeZone(new Date(iso), TIME_ZONE, "HH:mm")) },
    { headers: { "Cache-Control": "no-store" } },
  );
}
