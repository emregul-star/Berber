/**
 * Yeni dükkan sihirbazı (Bölüm 11.1)
 */
import { NewShopWizard } from "@/components/admin/new-shop-wizard";
import { PageHeader } from "@/components/panel/ui";
import { requireAdmin } from "@/lib/admin/auth";

export default async function NewShopPage() {
  await requireAdmin();
  return (
    <>
      <PageHeader title="Yeni dükkan" description="Dükkan, sahip hesabı, abonelik, varsayılan çalışma saatleri ve hizmetler tek seferde oluşturulur." />
      <NewShopWizard />
    </>
  );
}
