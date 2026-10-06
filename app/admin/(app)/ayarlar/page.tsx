/**
 * Platform ayarları (Bölüm 11.1): IBAN ve alıcı adı (dükkan panelindeki Abonelik sayfasında gösterilir).
 * Not: Platform adı kodda tek bir sabitten (NEXT_PUBLIC_PLATFORM_NAME, lib/constants.ts) okunur;
 * her sayfada veritabanına gitmemek için ayardan değil ortam değişkeninden değiştirilir.
 */
import { PlatformSettingsForm } from "@/components/admin/platform-settings-form";
import { Card, PageHeader } from "@/components/panel/ui";
import { requireAdmin } from "@/lib/admin/auth";
import { PLATFORM_NAME } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";

export default async function PlatformSettingsPage() {
  await requireAdmin();
  const supabase = await createClient();
  const { data } = await supabase.from("platform_settings").select("iban, account_holder, bank_name, payment_note").eq("id", 1).maybeSingle();
  return (
    <>
      <PageHeader title="Platform ayarları" description={`Platform adı: ${PLATFORM_NAME} (.env.local içindeki NEXT_PUBLIC_PLATFORM_NAME ile değiştirilir)`} />
      <Card>
        <PlatformSettingsForm initial={data ?? { iban: null, account_holder: null, bank_name: null, payment_note: null }} />
      </Card>
    </>
  );
}
