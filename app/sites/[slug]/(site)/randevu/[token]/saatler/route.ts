/**
 * Saat değiştirme için boş saatler: GET {slug}.PLATFORM_DOMAIN/randevu/{token}/saatler?date=YYYY-MM-DD
 * Sadece geçerli token'ı olan ve değişiklik süresi dolmamış randevular için çalışır.
 */
import { formatInTimeZone } from "date-fns-tz";
import { z } from "zod";
import { TIME_ZONE } from "@/lib/constants";
import { slotsForReschedule } from "@/lib/manage";

const querySchema = z.object({ date: z.iso.date() });

export async function GET(request: Request, { params }: RouteContext<"/sites/[slug]/randevu/[token]/saatler">) {
  const { slug, token } = await params;
  const query = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!query.success) return Response.json({ error: "Geçersiz istek." }, { status: 400 });

  const slots = await slotsForReschedule(slug, token, query.data.date);
  if (slots === null) return Response.json({ error: "Randevu bulunamadı veya değiştirilemez." }, { status: 404 });

  return Response.json(
    { slots: slots.map((startsAt) => ({ startsAt, label: formatInTimeZone(new Date(startsAt), TIME_ZONE, "HH:mm") })) },
    { headers: { "Cache-Control": "no-store" } },
  );
}
