/**
 * Dükkanın kendi alan adından (ör. kralberber.com) slug'ını bulur.
 * İlk sürümde bu özelliğin arayüzü yok, sadece altyapısı hazır.
 *
 * Sadece proxy'den çağrılır. Proxy React sunucu ortamında çalışmadığı için burada
 * "server-only" kullanılamıyor; bu yüzden secret key'li istemci lib/supabase/admin.ts
 * yerine burada oluşturuluyor. SUPABASE_SECRET_KEY "NEXT_PUBLIC_" ile başlamadığı için
 * bu dosya yanlışlıkla tarayıcıya gitse bile anahtar pakete girmez (undefined olur).
 */
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./supabase/database.types";

export async function findSlugByCustomDomain(hostname: string): Promise<string | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secretKey) return null;

  const supabase = createClient<Database>(url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  // Hem "kralberber.com" hem "www.kralberber.com" aynı dükkana gitsin.
  const bare = hostname.replace(/^www\./, "");
  const { data, error } = await supabase
    .from("shops")
    .select("slug")
    .in("custom_domain", [bare, `www.${bare}`])
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Özel alan adı sorgulanamadı:", hostname, error.message);
    return null;
  }
  return data?.slug ?? null;
}
