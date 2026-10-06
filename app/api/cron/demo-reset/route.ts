/**
 * Günlük demo sıfırlama: GET /api/cron/demo-reset (Vercel Cron, vercel.json'da her gün 01:00 UTC).
 *
 * - Demo dükkan herkese açık olduğu için ziyaretçilerin yaptığı değişiklikler her gece silinir ve
 *   örnek randevular bugüne göre yeniden oluşturulur.
 * - Yan faydası: Supabase'in ücretsiz projeleri bir hafta hiç kullanılmazsa duraklatılır; bu istek
 *   her gün veritabanını kullandığı için proje açık kalır.
 *
 * Vercel, CRON_SECRET tanımlıysa isteğe "Authorization: Bearer <CRON_SECRET>" ekler.
 * Bu anahtar olmadan uç nokta çalışmaz (herkes demoyu sıfırlayamasın).
 */
import { timingSafeEqual } from "node:crypto";
import { resetDemoShop } from "@/lib/demo";

export const dynamic = "force-dynamic";

function isAuthorized(header: string | null): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || !header) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(header);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export async function GET(request: Request) {
  if (!isAuthorized(request.headers.get("authorization"))) {
    return Response.json({ ok: false }, { status: 401 });
  }
  try {
    const { linkedAccounts } = await resetDemoShop();
    return Response.json({ ok: true, linkedAccounts: linkedAccounts.length });
  } catch (error) {
    console.error("Günlük demo sıfırlama başarısız:", error);
    return Response.json({ ok: false }, { status: 500 });
  }
}
