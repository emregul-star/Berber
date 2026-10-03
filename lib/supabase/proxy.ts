/**
 * Proxy (proxy.ts) içinde Supabase oturumunu yenileyen yardımcı.
 *
 * Neden gerekli? Server Component'ler çerez yazamaz. Süresi dolan giriş token'ını
 * her istekte burada yeniliyoruz ki panel kullanıcıları rastgele oturumdan düşmesin.
 */
import { createServerClient } from "@supabase/ssr";
import { type NextRequest, type NextResponse } from "next/server";

/**
 * @param request Gelen istek
 * @param createResponse Dönülecek yanıtı üreten fonksiyon (ör. dükkan sayfasına rewrite).
 *   Supabase çerezleri güncellerse yanıt yeniden üretilip çerezler ona eklenir; bu yüzden
 *   hazır bir nesne değil, fonksiyon alıyoruz.
 */
export async function updateSession(
  request: NextRequest,
  createResponse: () => NextResponse,
): Promise<NextResponse> {
  let response = createResponse();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  // Ortam değişkenleri yoksa (ör. ilk kurulum) oturum yenilemeyi atla.
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        // Yeni çerezleri hem isteğe (sayfalar görsün) hem yanıta (tarayıcı saklasın) yaz.
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = createResponse();
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // ÖNEMLİ: createServerClient ile getClaims() arasına kod eklemeyin.
  // getClaims() token'ın imzasını doğrular ve gerekirse yeniler. Sunucuda asla
  // getSession()'a güvenmeyin; o, çerezi doğrulamadan okur.
  await supabase.auth.getClaims();

  return response;
}
