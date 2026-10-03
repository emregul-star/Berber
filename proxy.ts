/**
 * Proxy (Next.js 16'da middleware'in yeni adı) — her istekten önce sunucuda çalışır.
 *
 * Görevleri:
 * 1. Host'a bakarak isteğin kime ait olduğunu bulur (platform / süper yönetici / dükkan).
 * 2. İsteği dahili olarak doğru klasöre yeniden yazar (rewrite). Adres çubuğu değişmez:
 *      demo.PLATFORM_DOMAIN/randevu-al  ->  app/sites/demo/randevu-al
 *      admin.PLATFORM_DOMAIN/dukkanlar  ->  app/admin/dukkanlar
 * 3. /sites ve /admin yollarına dışarıdan doğrudan erişimi engeller.
 * 4. Panel kullanıcılarının Supabase oturumunu yeniler.
 *
 * Not: Proxy bir güvenlik sınırı DEĞİLDİR. Yetki kontrolleri her sayfada ve her
 * Server Action'da ayrıca yapılmalıdır.
 */
import { NextResponse, type NextRequest } from "next/server";
import { DEV_SHOP_COOKIE, PLATFORM_DOMAIN } from "@/lib/constants";
import { findSlugByCustomDomain } from "@/lib/custom-domain";
import { updateSession } from "@/lib/supabase/proxy";
import { isValidSlug, resolveTenant, type TenantRoute } from "@/lib/tenant";

/** Dükkan sitelerinin dahili klasörü: app/sites/[slug] */
const SHOP_ROUTE_PREFIX = "/sites";
/** Süper yönetici panelinin dahili klasörü: app/admin */
const ADMIN_ROUTE_PREFIX = "/admin";
/** Hiçbir kiracıya ait olmayan genel uç noktalar (cron, .ics vb.) */
const API_ROUTE_PREFIX = "/api";
/** Geçersiz slug: dükkan sorgusu bulamaz ve "Dükkan bulunamadı" sayfası gösterilir. */
const UNKNOWN_SHOP_SLUG = "_";
/** Var olmayan bir yol: Next.js genel 404 sayfasını gösterir. */
const NOT_FOUND_PATH = "/__not-found";

function isUnder(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export async function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  let tenant: TenantRoute = resolveTenant(request.headers.get("host") ?? "", PLATFORM_DOMAIN);

  // --- Geliştirme kolaylığı: localhost:3000/?shop=demo ---
  // Seçilen dükkan bir çerezde hatırlanır ki sitedeki linkler de çalışsın.
  // "?shop=" (boş) çerezi siler ve platform sayfasına döner. Yayında devre dışıdır.
  let devShopCookie: string | null | undefined; // undefined = çereze dokunma
  if (process.env.NODE_ENV === "development" && tenant.kind === "platform") {
    const param = searchParams.get("shop");
    const selected =
      param !== null ? param.trim().toLowerCase() : request.cookies.get(DEV_SHOP_COOKIE)?.value;
    if (param !== null) devShopCookie = selected || null;
    if (selected) tenant = { kind: "shop", slug: selected };
  }

  // Dükkanın kendi alan adı (ileride): önce custom_domain eşleşmesine bakılır.
  if (tenant.kind === "custom-domain") {
    const slug = await findSlugByCustomDomain(tenant.hostname);
    tenant = { kind: "shop", slug: slug ?? UNKNOWN_SHOP_SLUG };
  }

  // İsteğin dahili olarak gideceği yol; null ise olduğu gibi bırakılır.
  const rest = pathname === "/" ? "" : pathname;
  let target: string | null = null;
  if (isUnder(pathname, API_ROUTE_PREFIX)) {
    target = null;
  } else if (tenant.kind === "shop") {
    // Slug doğrulaması "../" gibi hilelerle başka klasörlere sıçramayı da engeller.
    const slug = isValidSlug(tenant.slug) ? tenant.slug : UNKNOWN_SHOP_SLUG;
    target = `${SHOP_ROUTE_PREFIX}/${slug}${rest}`;
  } else if (tenant.kind === "admin") {
    target = `${ADMIN_ROUTE_PREFIX}${rest}`;
  } else if (isUnder(pathname, SHOP_ROUTE_PREFIX) || isUnder(pathname, ADMIN_ROUTE_PREFIX)) {
    // Ana alan adından /sites/... veya /admin/... doğrudan açılamaz.
    target = NOT_FOUND_PATH;
  }

  const createResponse = () => {
    if (target === null) return NextResponse.next({ request });
    const url = request.nextUrl.clone();
    url.pathname = target;
    return NextResponse.rewrite(url, { request });
  };

  const response = await updateSession(request, createResponse);

  if (devShopCookie) {
    response.cookies.set(DEV_SHOP_COOKIE, devShopCookie, { path: "/", httpOnly: true, sameSite: "lax" });
  } else if (devShopCookie === null) {
    response.cookies.delete(DEV_SHOP_COOKIE);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Şunlar hariç tüm yollar:
     * - _next/static, _next/image (Next.js'in kendi dosyaları)
     * - favicon.ico ve public/ içindeki görseller
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
