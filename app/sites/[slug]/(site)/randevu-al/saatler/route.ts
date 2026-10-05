/**
 * Boş saatler uç noktası: GET {slug}.PLATFORM_DOMAIN/randevu-al/saatler?serviceId=..&barberId=..&date=YYYY-MM-DD
 *
 * Randevu sihirbazı gün seçildiğinde bunu çağırır. Sadece boş başlangıç saatlerini döndürür;
 * başkalarının randevuları hakkında hiçbir bilgi göndermez (Bölüm 6.3).
 */
import { formatInTimeZone } from "date-fns-tz";
import { getAvailableSlots } from "@/lib/booking";
import { slotsQuerySchema } from "@/lib/booking-schema";
import { TIME_ZONE } from "@/lib/constants";

export async function GET(request: Request, { params }: RouteContext<"/sites/[slug]/randevu-al/saatler">) {
  const { slug } = await params;
  const query = slotsQuerySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!query.success) {
    return Response.json({ error: "Geçersiz istek." }, { status: 400 });
  }

  const slots = await getAvailableSlots(slug, query.data.serviceId, query.data.barberId, query.data.date);
  if (slots === null) {
    return Response.json({ error: "Dükkan bulunamadı." }, { status: 404 });
  }

  return Response.json(
    {
      slots: slots.map((startsAt) => ({
        startsAt,
        label: formatInTimeZone(new Date(startsAt), TIME_ZONE, "HH:mm"),
      })),
    },
    // Boş saatler her an değişebilir; tarayıcı veya ara sunucular önbelleğe almasın.
    { headers: { "Cache-Control": "no-store" } },
  );
}
