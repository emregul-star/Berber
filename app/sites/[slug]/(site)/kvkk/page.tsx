/**
 * KVKK Aydınlatma Metni ({slug}.PLATFORM_DOMAIN/kvkk) — Bölüm 7.5
 *
 * !!! HUKUKİ UYARI !!!
 * Bu metin bir TASLAKTIR ve hukuki danışmanlık yerine geçmez. Yayına almadan önce
 * mutlaka bir hukukçuya (KVKK alanında uzman bir avukata) kontrol ettirilmelidir.
 * Özellikle yurt dışına veri aktarımı (barındırma ve e-posta servisleri yurt dışında
 * olabilir; KVKK m.9) ve hukuki sebepler bölümleri gözden geçirilmelidir.
 *
 * Dükkan adı ve iletişim bilgileri veritabanından otomatik doldurulur.
 */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { DATA_RETENTION_MONTHS } from "@/lib/constants";
import { getShopSiteData } from "@/lib/site-data";

export const metadata: Metadata = { title: "KVKK Aydınlatma Metni" };

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="font-heading text-xl font-semibold">{title}</h2>
      <div className="mt-3 space-y-3 leading-relaxed text-muted">{children}</div>
    </section>
  );
}

export default async function KvkkPage({ params }: PageProps<"/sites/[slug]/kvkk">) {
  const { slug } = await params;
  const data = await getShopSiteData(slug);
  if (!data) notFound();

  const { shop } = data;
  const contact = [shop.address, shop.phone].filter(Boolean).join(" · ");

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-12 sm:py-16">
      <p className="text-xs font-semibold tracking-[0.2em] text-primary-text uppercase">Kişisel verilerin korunması</p>
      <h1 className="mt-2 font-heading text-3xl font-semibold sm:text-4xl">KVKK Aydınlatma Metni</h1>
      <p className="mt-4 leading-relaxed text-muted">
        6698 sayılı Kişisel Verilerin Korunması Kanunu (&quot;KVKK&quot;) uyarınca, online randevu
        sistemimiz aracılığıyla paylaştığınız kişisel verilerinizin nasıl işlendiği hakkında sizi
        bilgilendirmek isteriz.
      </p>

      <Section title="1. Veri sorumlusu">
        <p>
          Kişisel verileriniz, veri sorumlusu sıfatıyla <strong className="text-text">{shop.name}</strong>{" "}
          tarafından işlenmektedir.
          {contact && <> İletişim: {contact}.</>}
        </p>
      </Section>

      <Section title="2. İşlenen kişisel veriler">
        <p>Randevu oluştururken paylaştığınız şu veriler işlenir:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Kimlik bilgisi: ad ve soyad</li>
          <li>İletişim bilgisi: telefon numarası ve e-posta adresi</li>
          <li>Randevu bilgileri: seçilen hizmet, berber, tarih ve saat, varsa notunuz</li>
          <li>İşlem güvenliği bilgileri: onay zamanı ve kötüye kullanımı önlemek için IP adresi</li>
        </ul>
      </Section>

      <Section title="3. İşleme amaçları">
        <ul className="list-disc space-y-1 pl-5">
          <li>Randevunuzun oluşturulması, onaylanması, değiştirilmesi ve iptal edilmesi</li>
          <li>Randevunuzla ilgili size bilgilendirme (e-posta veya telefon) yapılması</li>
          <li>Hizmetin sunulması ve dükkan içi planlamanın yapılması</li>
          <li>Sahte veya kötü niyetli randevu taleplerinin önlenmesi</li>
        </ul>
      </Section>

      <Section title="4. Hukuki sebepler">
        <p>
          Kişisel verileriniz KVKK&apos;nın 5. maddesinin 2. fıkrasında yer alan; bir sözleşmenin
          kurulması veya ifasıyla doğrudan ilgili olması (c bendi), veri sorumlusunun hukuki
          yükümlülüğünü yerine getirmesi (ç bendi) ve ilgili kişinin temel hak ve özgürlüklerine
          zarar vermemek kaydıyla veri sorumlusunun meşru menfaati (f bendi) hukuki sebeplerine
          dayanılarak işlenir.
        </p>
      </Section>

      <Section title="5. Aktarım">
        <p>
          Kişisel verileriniz yalnızca yukarıdaki amaçlarla sınırlı olarak; randevu sisteminin
          çalışması için hizmet aldığımız yazılım, barındırma ve e-posta gönderim hizmeti
          sağlayıcılarına aktarılabilir. Bu hizmet sağlayıcıların sunucuları yurt dışında
          bulunabilir. Verileriniz, kanunen yetkili kamu kurum ve kuruluşlarının talebi dışında
          üçüncü kişilerle paylaşılmaz ve pazarlama amacıyla kullanılmaz.
        </p>
      </Section>

      <Section title="6. Saklama süresi">
        <p>
          Randevu kayıtlarındaki iletişim bilgileriniz, randevunun tamamlanmasından veya iptal
          edilmesinden itibaren en fazla {DATA_RETENTION_MONTHS} ay saklanır; bu sürenin sonunda
          anonim hâle getirilir.
        </p>
      </Section>

      <Section title="7. Haklarınız">
        <p>KVKK&apos;nın 11. maddesi uyarınca; kişisel verilerinizin</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>işlenip işlenmediğini öğrenme ve işlenmişse buna ilişkin bilgi talep etme,</li>
          <li>işlenme amacını ve amacına uygun kullanılıp kullanılmadığını öğrenme,</li>
          <li>aktarıldığı üçüncü kişileri bilme,</li>
          <li>eksik veya yanlış işlenmişse düzeltilmesini, şartları oluşmuşsa silinmesini isteme,</li>
          <li>otomatik sistemlerle analiz edilmesi sonucu aleyhinize bir sonuca itiraz etme,</li>
          <li>kanuna aykırı işlenmesi sebebiyle zarara uğramanız hâlinde zararın giderilmesini talep etme</li>
        </ul>
        <p>haklarına sahipsiniz.</p>
      </Section>

      <Section title="8. Başvuru">
        <p>
          Haklarınıza ilişkin taleplerinizi{contact ? <> yukarıdaki iletişim bilgileri ({contact}) üzerinden</> : null}{" "}
          {shop.name}&apos;a iletebilirsiniz. Başvurunuz en geç 30 gün içinde ücretsiz olarak
          sonuçlandırılır.
        </p>
      </Section>
    </main>
  );
}
