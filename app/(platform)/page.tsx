/**
 * Platformun tanıtım sayfası (PLATFORM_DOMAIN) — berberlere yönelik (Bölüm 15, Aşama 10):
 * özellikler, ekran görüntüleri, nasıl çalışır, demo linkleri ve WhatsApp iletişim butonu.
 * Tamamen statik: veritabanına bağlanmaz, hızlı açılır.
 */
import type { Metadata } from "next";
import Image from "next/image";
import { PLATFORM_NAME, PLATFORM_SUPPORT_WHATSAPP } from "@/lib/constants";
import { shopBaseUrl, shopUrl } from "@/lib/links";
import { whatsappLink } from "@/lib/whatsapp";

const DEMO_SLUG = "demo";
const DESCRIPTION =
  "Berberler için uygulama gerektirmeyen online randevu sitesi. Müşterileriniz linkten 7/24 randevu alır, siz panelden yönetirsiniz.";

export const metadata: Metadata = {
  title: { absolute: `${PLATFORM_NAME} — Berberler için online randevu sitesi` },
  description: DESCRIPTION,
  openGraph: { type: "website", locale: "tr_TR", siteName: PLATFORM_NAME, title: PLATFORM_NAME, description: DESCRIPTION },
  twitter: { card: "summary_large_image", title: PLATFORM_NAME, description: DESCRIPTION },
};

const FEATURES = [
  {
    title: "Dükkanınıza özel web sitesi",
    text: "Hizmetler, fiyatlar, ekip, galeri, müşteri yorumları, harita ve çalışma saatleri tek sayfada. Dört hazır tema, renkler size göre.",
  },
  {
    title: "7/24 online randevu",
    text: "Müşteri hizmeti, berberi ve boş saati seçer. Molalar, izinler ve kapalı günler hesaba katılır; aynı saate iki randevu alınamaz.",
  },
  {
    title: "Uygulama ve üyelik yok",
    text: "Müşteri hiçbir şey indirmez, hesap açmaz. Randevu linkinden iptal eder veya saatini değiştirir.",
  },
  {
    title: "Bildirimler ve WhatsApp",
    text: "Randevu alındı, onaylandı, değişti veya iptal edildi bilgisi müşteriye ve dükkana e-postayla gider. Panelden müşteriye hazır WhatsApp mesajı tek tıkla açılır.",
  },
  {
    title: "Sahip ve berber hesapları",
    text: "Sahip her şeyi yönetir; her berber sadece kendi takvimini ve randevularını görür, kendi izinlerini girer.",
  },
  {
    title: "İstatistikler",
    text: "Randevu, gelmeyen müşteri ve tahmini kazanç; berbere, hizmete, güne ve saate göre dağılım.",
  },
] as const;

const STEPS = [
  { title: "Kurulumu biz yapalım", text: "Dükkan adınız, hizmetleriniz, fiyatlarınız ve fotoğraflarınızla sitenizi biz hazırlarız." },
  { title: "Linki paylaşın", text: "Instagram profilinize, Google İşletme sayfanıza ve WhatsApp durumunuza ekleyin." },
  { title: "Randevular panele düşsün", text: "Telefon trafiği azalır; günün programını telefondan tek bakışta görürsünüz." },
] as const;

const linkPrimary =
  "inline-flex items-center justify-center rounded-lg bg-amber-500 px-5 py-3 font-semibold text-neutral-950 transition hover:bg-amber-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300";
const linkSecondary =
  "inline-flex items-center justify-center rounded-lg border border-neutral-600 px-5 py-3 font-semibold text-white transition hover:border-neutral-400 hover:bg-neutral-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300";

export default function PlatformHomePage() {
  // Bilerek <a>: dükkan sitesi başka bir host'ta (veya tek adres modunda ?shop= ile) açılır.
  const demoSiteUrl = shopBaseUrl(DEMO_SLUG);
  const demoPanelUrl = shopUrl(DEMO_SLUG, "/panel/giris");
  const contactUrl = PLATFORM_SUPPORT_WHATSAPP
    ? whatsappLink(PLATFORM_SUPPORT_WHATSAPP, `Merhaba, ${PLATFORM_NAME} hakkında bilgi almak istiyorum.`)
    : null;

  return (
    <div className="overflow-x-clip bg-neutral-950 text-neutral-100">
      <a
        href="#icerik"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2 focus:text-neutral-900"
      >
        İçeriğe geç
      </a>

      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-5">
        <span className="font-serif text-xl font-bold tracking-tight">{PLATFORM_NAME}</span>
        <nav aria-label="Sayfa bölümleri" className="hidden gap-6 text-sm text-neutral-300 md:flex">
          <a href="#ozellikler" className="hover:text-white">Özellikler</a>
          <a href="#nasil-calisir" className="hover:text-white">Nasıl çalışır</a>
          <a href="#demo" className="hover:text-white">Demo</a>
          {contactUrl && <a href="#iletisim" className="hover:text-white">İletişim</a>}
        </nav>
        <a href={demoSiteUrl} className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-neutral-950 hover:bg-neutral-200">
          Demoyu gör
        </a>
      </header>

      <main id="icerik">
        {/* Üst bölüm */}
        <section className="mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-12 px-4 pt-10 pb-20 lg:grid-cols-[1.1fr_0.9fr] lg:pt-16">
          <div>
            <p className="mb-4 text-sm font-semibold tracking-widest text-amber-400 uppercase">Berberler için</p>
            <h1 className="font-serif text-4xl leading-tight font-bold text-balance sm:text-5xl">
              Telefonla randevu trafiğine son. Müşterileriniz linkten randevu alsın.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-pretty text-neutral-300">
              Dükkanınıza özel, uygulama gerektirmeyen bir randevu sitesi ve randevuları yönettiğiniz bir panel.
              Müşteri 7/24 boş saati görür, siz sadece makasınıza odaklanırsınız.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href={demoSiteUrl} className={linkPrimary}>
                Demo dükkan sitesini gör
              </a>
              <a href={demoPanelUrl} className={linkSecondary}>
                Yönetim panelini dene
              </a>
            </div>
            <p className="mt-4 text-sm text-neutral-400">Şifre gerekmez. Demo verileri her gece sıfırlanır.</p>
          </div>
          <div className="relative mx-auto w-full max-w-sm">
            <div className="absolute -inset-6 rounded-[3rem] bg-amber-500/10 blur-2xl" aria-hidden="true" />
            <Image
              src="/landing/site-mobile.png"
              alt="Demo berber sitesinin telefondaki görünümü: dükkan adı, randevu al butonu ve hizmetler"
              width={390}
              height={844}
              priority
              sizes="(min-width: 1024px) 384px, 90vw"
              className="relative rounded-4xl border-8 border-neutral-800 shadow-2xl"
            />
          </div>
        </section>

        {/* Özellikler */}
        <section id="ozellikler" className="border-t border-neutral-800 bg-neutral-900/50">
          <div className="mx-auto w-full max-w-6xl px-4 py-20">
            <h2 className="font-serif text-3xl font-bold">Dükkanınız için gereken her şey</h2>
            <p className="mt-3 max-w-2xl text-neutral-400">Kurulum, güncelleme ve barındırma bizde. Siz sadece randevulara bakın.</p>
            <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((f) => (
                <li key={f.title} className="rounded-xl border border-neutral-800 bg-neutral-950 p-6">
                  <h3 className="font-semibold text-white">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-neutral-400">{f.text}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Ekran görüntüleri */}
        <section aria-labelledby="ekranlar-baslik" className="mx-auto w-full max-w-6xl px-4 py-20">
          <h2 id="ekranlar-baslik" className="font-serif text-3xl font-bold">
            Müşteri için sade, sizin için pratik
          </h2>
          <div className="mt-10 grid grid-cols-1 items-start gap-8 lg:grid-cols-[0.45fr_1fr]">
            <figure>
              <Image
                src="/landing/booking-mobile.png"
                alt="Randevu alma ekranı: tarih ve boş saat seçimi"
                width={390}
                height={844}
                sizes="(min-width: 1024px) 30vw, 90vw"
                className="mx-auto w-full max-w-xs rounded-4xl border-8 border-neutral-800"
              />
              <figcaption className="mt-3 text-center text-sm text-neutral-400">Müşteri: hizmet, berber ve saat seçimi</figcaption>
            </figure>
            <figure>
              <Image
                src="/landing/panel-desktop.png"
                alt="Yönetim paneli: bugünün randevuları ve onay bekleyenler"
                width={1280}
                height={800}
                sizes="(min-width: 1024px) 60vw, 95vw"
                className="w-full rounded-xl border border-neutral-800"
              />
              <figcaption className="mt-3 text-center text-sm text-neutral-400">Panel: günün randevuları, takvim ve istatistikler</figcaption>
            </figure>
          </div>
        </section>

        {/* Nasıl çalışır */}
        <section id="nasil-calisir" className="border-t border-neutral-800 bg-neutral-900/50">
          <div className="mx-auto w-full max-w-6xl px-4 py-20">
            <h2 className="font-serif text-3xl font-bold">Nasıl çalışır?</h2>
            <ol className="mt-10 grid gap-6 md:grid-cols-3">
              {STEPS.map((s, i) => (
                <li key={s.title} className="flex gap-4">
                  <span
                    className="flex size-10 shrink-0 items-center justify-center rounded-full bg-amber-500 font-bold text-neutral-950"
                    aria-hidden="true"
                  >
                    {i + 1}
                  </span>
                  <div>
                    <h3 className="font-semibold text-white">{s.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-neutral-400">{s.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Demo */}
        <section id="demo" className="mx-auto w-full max-w-6xl px-4 py-20">
          <div className="rounded-2xl border border-amber-500/30 bg-linear-to-br from-amber-500/10 to-transparent p-8 md:p-12">
            <h2 className="font-serif text-3xl font-bold">Kendiniz deneyin</h2>
            <p className="mt-3 max-w-2xl text-neutral-300">
              Örnek bir berber dükkanında müşteri gibi randevu alın, sonra panele dükkan sahibi veya berber olarak girip
              randevuyu görün. Demo randevular gerçek değildir, kimseye e-posta gitmez.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a href={demoSiteUrl} className={linkPrimary}>
                Müşteri gibi randevu al
              </a>
              <a href={demoPanelUrl} className={linkSecondary}>
                Panele gir
              </a>
            </div>
          </div>
        </section>

        {/* İletişim */}
        {contactUrl && (
          <section id="iletisim" className="border-t border-neutral-800">
            <div className="mx-auto flex w-full max-w-6xl flex-col items-start gap-4 px-4 py-16 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="font-serif text-2xl font-bold">Dükkanınız için konuşalım</h2>
                <p className="mt-2 text-neutral-400">Fiyat ve kurulum için WhatsApp&apos;tan yazın.</p>
              </div>
              <a href={contactUrl} target="_blank" rel="noopener noreferrer" className={linkPrimary}>
                WhatsApp ile yazın
              </a>
            </div>
          </section>
        )}
      </main>

      <footer className="border-t border-neutral-800">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-6 text-sm text-neutral-400">
          <span>© {new Date().getFullYear()} {PLATFORM_NAME}</span>
          <span>Next.js ve Supabase ile geliştirildi</span>
        </div>
      </footer>
    </div>
  );
}
