# Berber Randevu Platformu — Proje Dokümanı

> Bu doküman, projeyi sıfırdan kuracak yapay zekâ kodlama ajanı (Antigravity) ve geliştirici için hazırlanmıştır. Projenin tamamı bu dokümana göre geliştirilmelidir. Bir konu belirsizse varsayım yapmadan önce geliştiriciye sorulmalıdır.

---

## 0. Ajan İçin Çalışma Kuralları

1. Proje **aşamalar halinde** geliştirilecek (bkz. Bölüm 15). Bir aşama bitmeden ve kabul kriterleri sağlanmadan sonrakine geçilmeyecek.
2. Her aşamanın sonunda: ne yapıldığı, nasıl test edileceği ve geliştiricinin elle yapması gereken adımlar (ör. Supabase panelinde bir ayar) kısa bir özetle bildirilecek.
3. **Ücretli hiçbir servis** geliştiriciye sorulmadan eklenmeyecek. Proje ücretsiz katmanlarla çalışacak şekilde tasarlandı.
4. Supabase **Row Level Security (RLS) hiçbir tabloda kapatılmayacak.** Güvenlik kuralları atlanarak "şimdilik çalışsın" çözümü yapılmayacak.
5. Gizli anahtarlar (service role key, e-posta API anahtarı) **asla** istemci tarafı koduna veya git deposuna girmeyecek.
6. Kullanıcıya görünen tüm metinler **Türkçe** olacak. Kod, değişken ve tablo isimleri **İngilizce** olacak.
7. Saat dilimi her yerde **Europe/Istanbul**. Veritabanında zamanlar `timestamptz` olarak saklanacak, ekranda İstanbul saatiyle gösterilecek.
8. Kod TypeScript ile, okunabilir ve yorumlu yazılacak. Geliştirici bu alanda yeni; karmaşık kısımlara kısa Türkçe açıklama yorumları eklenecek.
9. Her aşamada uygulama hatasız derlenmeli (`npm run build`) ve lint hatası olmamalı.

---

## 1. Proje Özeti

Erkek berberlerine satılacak, **çok kiracılı (multi-tenant)** bir randevu web sitesi platformu.

- Tek bir kod tabanı ve tek bir Supabase projesi üzerinde birden fazla berber dükkanı çalışır.
- Her dükkanın kendi alt alan adı olur: `ahmet.PLATFORM_DOMAIN`, `kral-berber.PLATFORM_DOMAIN`
- Müşteriler **uygulama indirmeden ve hesap açmadan** web sitesinden randevu alır.
- Dükkan sahibi kendi panelinden randevuları, hizmetleri, berberleri, çalışma saatlerini, galeriyi ve yorumları yönetir.
- Platform sahibi (geliştirici) kendi **süper yönetici panelinden** yeni dükkan ekler, aylık ödemeleri takip eder, ödemeyen dükkanı askıya alır.

**İş modeli:** Her dükkandan bir kurulum ücreti + düşük aylık bakım ücreti alınır. Aylık ücret başlangıçta elle (IBAN) takip edilir; ileride online ödeme eklenebilecek şekilde altyapı hazırlanır.

**Geçici platform adı:** `BerberPlatform` (ileride değişecek; tek bir sabitten okunmalı, kodun içine dağıtılmamalı).

---

## 2. Teknoloji Yığını

| Katman | Seçim | Not |
|---|---|---|
| Framework | Next.js (güncel kararlı sürüm), **App Router**, TypeScript | |
| Stil | Tailwind CSS | Tema renkleri CSS değişkenleriyle |
| UI bileşenleri | shadcn/ui (isteğe bağlı) | Ücretsiz, kod projeye kopyalanır |
| Veritabanı | Supabase Postgres | Tek proje, tüm dükkanlar |
| Kimlik doğrulama | Supabase Auth (e-posta + şifre) | Sadece panel kullanıcıları için |
| Dosya depolama | Supabase Storage | Logo, galeri görselleri |
| Supabase istemcisi | `@supabase/ssr` | Sunucu ve istemci için ayrı istemciler |
| E-posta | Ücretsiz katmanı olan bir servis (ör. Resend) | Sağlayıcı soyutlanmış olmalı |
| Barındırma | Vercel (ücretsiz plan) | Wildcard alt alan adı |
| Tarih/saat | `date-fns` + `date-fns-tz` | Europe/Istanbul |
| Form doğrulama | `zod` + `react-hook-form` | |
| Spam koruması | Honeypot alanı + basit hız sınırı; isteğe bağlı Cloudflare Turnstile (ücretsiz) | |

---

## 3. Roller ve Yetkiler

| Rol | Kim | Ne yapabilir |
|---|---|---|
| `super_admin` | Platform sahibi (geliştirici) | Tüm dükkanları görür, dükkan ekler/askıya alır, ödemeleri yönetir |
| `owner` | Dükkan sahibi | Kendi dükkanının her şeyini yönetir, berberlerine hesap açabilir |
| `barber` | Dükkanda çalışan berber (isteğe bağlı hesap) | Sadece kendi randevularını görür, kendi randevusunu onaylar/iptal eder |
| Müşteri | Hesapsız ziyaretçi | Randevu alır, kendisine gönderilen özel linkle randevusunu iptal eder/değiştirir |

Notlar:
- Tek kişilik dükkanlarda sadece `owner` hesabı olur; berber hesabı açmak zorunlu değildir.
- Bir berber kaydının (`barbers` tablosu) giriş hesabı olmak zorunda değildir. Hesap açılırsa `barbers.user_id` alanı doldurulur.

---

## 4. Çok Kiracılı Mimari ve Alan Adı Yönlendirme

### 4.1 Adres yapısı

| Adres | İçerik |
|---|---|
| `PLATFORM_DOMAIN` | Platformun tanıtım sayfası (berberlere satış amaçlı, basit) |
| `admin.PLATFORM_DOMAIN` | Süper yönetici paneli |
| `{slug}.PLATFORM_DOMAIN` | Dükkanın müşteri sitesi |
| `{slug}.PLATFORM_DOMAIN/panel` | Dükkanın yönetim paneli |
| `{slug}.PLATFORM_DOMAIN/randevu/{token}` | Müşterinin randevu yönetim sayfası |

### 4.2 Proxy (eski adıyla Middleware)

> Not: Next.js 16 ile `middleware.ts` dosyasının adı `proxy.ts` olarak değişti (dışa aktarılan fonksiyonun adı da `proxy`). Bu dokümanda "proxy" geçen her yer bu dosyayı ifade eder. Proje Next.js 15 veya öncesiyle kurulursa dosya adı `middleware.ts` olarak kalır.

- `proxy.ts` gelen isteğin host bilgisinden alt alan adını (slug) çıkarır.
- İsteği dahili olarak `app/sites/[slug]/...` yoluna yeniden yazar (rewrite). Kullanıcı adres çubuğunda değişiklik görmez.
- `admin` alt alan adı dahili olarak `app/admin/...` yoluna yeniden yazılır.
- **Önemli:** Bu klasörlerin adı `_` ile başlamamalıdır. App Router'da `_` ile başlayan klasörler "private folder" sayılır, yönlendirmeye dahil edilmez ve rewrite 404 döner.
- `/sites/...` ve `/admin/...` yollarına dışarıdan doğrudan erişim (ör. `PLATFORM_DOMAIN/sites/demo`) proxy tarafından engellenmeli (404); bu yollara yalnızca rewrite ile ulaşılmalı.
- Alt alan adı yoksa platform tanıtım sayfası gösterilir.
- Slug veritabanında yoksa özel bir "Dükkan bulunamadı" sayfası gösterilir.
- Dükkan `suspended` durumundaysa müşteri sitesinde "Bu sayfa geçici olarak hizmet dışıdır" gösterilir; panel girişinde de sahibine ödeme hatırlatması gösterilir.

### 4.3 Yerel geliştirme

- `ahmet.localhost:3000` şeklinde alt alan adı çalışmalı (modern tarayıcılar `*.localhost` adreslerini destekler).
- Ek olarak geliştirme modunda `?shop=slug` sorgu parametresiyle dükkan seçilebilmeli.

### 4.4 İleride

- Bir dükkan kendi alan adını (ör. `kralberber.com`) bağlamak isterse `shops.custom_domain` alanı kullanılacak. Proxy önce `custom_domain` eşleşmesine bakmalı. Bu özellik ilk sürümde **arayüzü olmadan**, sadece veritabanı alanı ve proxy desteği olarak hazırlanacak.

---

## 5. Veritabanı Şeması

Tüm tablolarda `id uuid primary key default gen_random_uuid()` ve `created_at timestamptz default now()` bulunur (aşağıda tekrar yazılmadı). Dükkana ait her tabloda `shop_id` bulunur ve RLS bu alana göre çalışır.

### 5.1 `shops` — Dükkanlar
| Alan | Tip | Açıklama |
|---|---|---|
| slug | text unique not null | Alt alan adı (küçük harf, rakam, tire) |
| name | text not null | Dükkan adı |
| description | text | Kısa tanıtım |
| phone | text | Dükkan telefonu |
| whatsapp_number | text | Uluslararası formatta (905xxxxxxxxx) |
| email | text | Bildirimlerin gideceği e-posta |
| address | text | Açık adres |
| google_maps_embed_url | text | Haritanın gömme adresi |
| google_reviews_url | text | "Google'da yorumlarımız" butonu linki |
| instagram_url | text | |
| logo_url | text | Storage'daki logo |
| cover_image_url | text | Ana sayfa kapak görseli |
| theme_preset | text | Hazır tema adı (bkz. Bölüm 9) |
| primary_color | text | Hex renk, tema ön ayarını ezer |
| accent_color | text | Hex renk |
| status | text | `active` / `suspended` / `demo` |
| is_demo | boolean default false | Demo dükkan mı |
| custom_domain | text unique | İleride kullanılacak |
| created_by | uuid | Süper yönetici |

### 5.2 `shop_settings` — Randevu kuralları (shops ile 1'e 1)
| Alan | Tip | Varsayılan | Açıklama |
|---|---|---|---|
| shop_id | uuid unique | | |
| slot_interval_minutes | int | 15 | Randevu başlangıç saatleri kaç dakikada bir |
| min_notice_minutes | int | 60 | En az kaç dakika sonrasına randevu alınabilir |
| max_advance_days | int | 14 | En fazla kaç gün ilerisine randevu alınabilir |
| cancel_deadline_minutes | int | 120 | Müşteri randevudan en geç kaç dk önce iptal/değişiklik yapabilir |
| requires_approval | boolean | false | Randevular onay mı bekler, otomatik mi onaylanır |
| buffer_minutes | int | 0 | Randevular arası temizlik/hazırlık payı |
| allow_any_barber | boolean | true | Müşteri "Fark etmez" seçeneğini görebilir mi |

### 5.3 `shop_members` — Panel kullanıcıları
| Alan | Tip | Açıklama |
|---|---|---|
| shop_id | uuid | |
| user_id | uuid | `auth.users` referansı |
| role | text | `owner` / `barber` |
| unique(shop_id, user_id) | | |

### 5.4 `platform_admins` — Süper yöneticiler
| Alan | Tip |
|---|---|
| user_id | uuid unique |

### 5.5 `barbers` — Berberler
| Alan | Tip | Açıklama |
|---|---|---|
| shop_id | uuid | |
| name | text | |
| title | text | Ör. "Usta", "Kalfa" |
| photo_url | text | |
| bio | text | |
| is_active | boolean default true | Pasifse randevu alınamaz |
| sort_order | int | Sıralama |
| user_id | uuid nullable | Giriş hesabı varsa |

### 5.6 `services` — Hizmetler
| Alan | Tip | Açıklama |
|---|---|---|
| shop_id | uuid | |
| name | text | Ör. "Saç Kesimi", "Sakal Tıraşı" |
| description | text | |
| duration_minutes | int | |
| price | numeric(10,2) | TL |
| is_active | boolean default true | |
| sort_order | int | |

### 5.7 `barber_services` — Hangi berber hangi hizmeti veriyor
| Alan | Tip |
|---|---|
| shop_id | uuid |
| barber_id | uuid |
| service_id | uuid |
| primary key (barber_id, service_id) | |

**Uygulama notu (Aşama 2):** `shop_id` sonradan eklendi. Berber ve hizmet referansları tüm tablolarda (`barber_services`, `working_hours`, `time_off`, `appointments`) `(id, shop_id)` ikilisiyle bileşik foreign key kullanır; böylece bir dükkanın kaydı başka dükkanın berberine/hizmetine bağlanamaz. Yeni dükkan eklendiğinde varsayılan `shop_settings` satırı bir trigger ile otomatik oluşturulur.

### 5.8 `working_hours` — Haftalık çalışma saatleri
| Alan | Tip | Açıklama |
|---|---|---|
| shop_id | uuid | |
| barber_id | uuid nullable | Boşsa dükkanın genel saati; doluysa berbere özel |
| weekday | int | 0 = Pazartesi ... 6 = Pazar |
| start_time | time | |
| end_time | time | |
| break_start | time nullable | Öğle arası |
| break_end | time nullable | |
| is_closed | boolean default false | O gün kapalı |

Kural: Berbere özel kayıt varsa o kullanılır, yoksa dükkanın genel saati kullanılır.

### 5.9 `time_off` — İzin günleri ve kapalı zamanlar
| Alan | Tip | Açıklama |
|---|---|---|
| shop_id | uuid | |
| barber_id | uuid nullable | Boşsa tüm dükkan kapalı (ör. bayram) |
| starts_at | timestamptz | |
| ends_at | timestamptz | |
| reason | text | |

### 5.10 `appointments` — Randevular
| Alan | Tip | Açıklama |
|---|---|---|
| shop_id | uuid | |
| barber_id | uuid | |
| service_id | uuid | |
| starts_at | timestamptz | |
| ends_at | timestamptz | starts_at + hizmet süresi (müşteriye gösterilen gerçek bitiş) |
| blocked_until | timestamptz | ends_at + `buffer_minutes` (berberin bir sonraki randevuya hazır olduğu an; çakışma kontrolü bu alanla yapılır) |
| status | text | `pending` / `confirmed` / `cancelled_by_customer` / `cancelled_by_shop` / `completed` / `no_show` |
| customer_name | text | |
| customer_phone | text | Normalize edilmiş (905xxxxxxxxx) |
| customer_email | text | |
| customer_note | text | |
| price_at_booking | numeric(10,2) | Fiyat sonradan değişse de istatistik bozulmasın |
| manage_token_hash | text | Yönetim linki token'ının hash'i (token düz saklanmaz) |
| kvkk_consent_at | timestamptz | Onay kutusunun işaretlendiği zaman |
| cancelled_at | timestamptz | |
| source | text | `web` / `panel` (sahibin telefonla aldığı randevuyu elle girmesi) |

**Çift randevu engelleme (zorunlu):** Veritabanı seviyesinde exclusion constraint kullanılacak:

```sql
create extension if not exists btree_gist;

alter table appointments
  add constraint appointments_no_overlap
  exclude using gist (
    barber_id with =,
    tstzrange(starts_at, blocked_until, '[)') with &&
  )
  where (status in ('pending', 'confirmed'));
```

Böylece iki müşteri aynı saniyede aynı saate randevu almaya çalışsa bile biri reddedilir. Uygulama bu hatayı yakalayıp müşteriye "Bu saat az önce doldu, lütfen başka bir saat seçin" mesajı göstermeli.

**Buffer kuralı (karar verildi):** `ends_at` her zaman gerçek hizmet bitişidir ve ekranda/e-postada/.ics dosyasında bu gösterilir. Buffer yalnızca `blocked_until` alanına eklenir. `blocked_until` randevu oluşturulurken, saat değiştirilirken ve panelden elle eklenirken **tek bir yardımcı fonksiyonla** (ör. `lib/appointments.ts`) hesaplanır; `blocked_until >= ends_at` kontrolü veritabanında `check` kısıtıyla da güvenceye alınır. Sonradan `buffer_minutes` değişirse mevcut randevular güncellenmez, sadece yeni randevular yeni değeri kullanır.

### 5.11 `gallery_images` — Galeri
| Alan | Tip |
|---|---|
| shop_id | uuid |
| image_url | text |
| caption | text |
| sort_order | int |

### 5.12 `testimonials` — Seçili yorumlar (elle eklenir)
| Alan | Tip | Açıklama |
|---|---|---|
| shop_id | uuid | |
| author_name | text | |
| rating | int | 1-5 |
| content | text | |
| source | text | Ör. "Google" |
| is_visible | boolean default true | |
| sort_order | int | |

### 5.13 `subscriptions` — Dükkanın platform aboneliği (shops ile 1'e 1)
| Alan | Tip | Açıklama |
|---|---|---|
| shop_id | uuid unique | |
| setup_fee | numeric(10,2) | Kurulum ücreti |
| monthly_fee | numeric(10,2) | Aylık bakım ücreti |
| billing_day | int | Ayın kaçında ödenir |
| paid_until | date | Bu tarihe kadar ödenmiş |
| status | text | `active` / `overdue` / `suspended` / `cancelled` |
| notes | text | |

### 5.14 `payments` — Alınan ödemeler
| Alan | Tip | Açıklama |
|---|---|---|
| shop_id | uuid | |
| amount | numeric(10,2) | |
| type | text | `setup` / `monthly` |
| period_start | date | Hangi dönemi kapsıyor |
| period_end | date | |
| method | text | `iban` / `cash` / `online` |
| provider | text nullable | İleride online ödeme sağlayıcısı |
| provider_ref | text nullable | |
| paid_at | timestamptz | |
| recorded_by | uuid | Kaydı giren süper yönetici |

### 5.15 `rate_limits` — Basit hız sınırı
| Alan | Tip |
|---|---|
| key | text | (ör. `booking:ip:1.2.3.4` veya `booking:phone:905...`) |
| window_start | timestamptz |
| count | int |

### 5.16 İndeksler
- `appointments (shop_id, starts_at)`, `appointments (barber_id, starts_at)`
- `shops (slug)`, `shops (custom_domain)`
- Dükkana ait tüm tablolarda `shop_id` indeksi

---

## 6. Güvenlik (RLS ve Sunucu Mantığı)

### 6.1 Yardımcı SQL fonksiyonları
- `is_platform_admin()` → çağıran kullanıcı `platform_admins` içinde mi
- `is_shop_member(shop uuid)` → kullanıcı o dükkanın üyesi mi
- `is_shop_owner(shop uuid)` → kullanıcı o dükkanın sahibi mi
- `current_barber_id(shop uuid)` → kullanıcının o dükkandaki berber kaydı

Bu fonksiyonlar `security definer` ve `stable` olarak yazılmalı, `search_path` sabitlenmeli.

**Önemli:** `security definer` fonksiyonlar RLS'i atlar ve `public` şemasında olurlarsa Data API üzerinden herkes (anonim kullanıcılar dahil) tarafından çağrılabilir. Bu yüzden bu yardımcılar dışarıya açık olmayan ayrı bir şemaya (ör. `private`) konulmalı, `public`'ten `execute` yetkisi geri alınmalı ve içlerinde `auth.uid()` kullanılmalı.

### 6.1.1 Data API erişimi (GRANT)
Supabase'de (2026 itibarıyla) `public` şemasında yeni oluşturulan tablolar Data API'ye **otomatik açılmaz.** Her tablo için `anon` / `authenticated` rollerine gereken yetkiler (`grant select ...` vb.) migration'da açıkça verilmeli ve aynı tabloda RLS mutlaka açık olmalı. Sadece sunucunun (secret key) erişeceği tablolara (ör. `rate_limits`, `platform_admins`) `anon` yetkisi verilmez.

### 6.2 RLS kuralları (özet)
| Tablo | Herkese açık okuma | Sahip | Berber | Süper yönetici |
|---|---|---|---|---|
| shops | Sadece aktif/demo dükkanların herkese açık alanları | Kendi dükkanını okur/günceller (status hariç) | Okur | Tümü |
| shop_settings, services, barbers, barber_services, working_hours, gallery_images | Aktif dükkanlar için okunur | Tam yetki | Okur | Tümü |
| testimonials | Sadece `is_visible = true` | Tam yetki | Okur | Tümü |
| time_off | Okunur (müsaitlik hesabı için, `reason` hariç tercih edilir) | Tam yetki | Kendi izinlerini yönetir | Tümü |
| appointments | **Okunamaz** | Kendi dükkanı, tam yetki | Sadece kendi randevuları; durum güncelleyebilir | Tümü |
| shop_members | Okunamaz | Kendi dükkanı | Kendi kaydı | Tümü |
| subscriptions, payments | Okunamaz | Kendi aboneliğini **sadece okur** | Okunamaz | Tümü |
| platform_admins, rate_limits | Okunamaz | Okunamaz | Okunamaz | Tümü / sadece sunucu |

### 6.3 Müşteri işlemleri sunucuda yapılır
- Müşteri randevu oluşturma, iptal ve değiştirme işlemleri **doğrudan istemciden Supabase'e yazılmaz.**
- Bunlar Next.js Server Action veya Route Handler içinde, sunucuda doğrulama yapıldıktan sonra **service role** istemcisiyle yapılır.
- Müsaitlik (boş saatler) hesabı da sunucuda yapılır; müşteriye başkalarının randevu bilgileri asla gönderilmez, sadece boş saat listesi gönderilir.

### 6.4 Randevu yönetim linki
- Randevu oluşturulunca kriptografik olarak güvenli rastgele bir token üretilir (en az 32 bayt).
- Veritabanına sadece token'ın SHA-256 hash'i yazılır.
- Müşteriye `https://{slug}.PLATFORM_DOMAIN/randevu/{token}` linki e-postayla ve onay ekranında gösterilir.
- Link tahmin edilemez olmalı; randevu ID'si linkte açıkça kullanılmamalı.

### 6.5 Spam ve kötüye kullanım koruması
- Randevu formunda görünmez honeypot alanı; doluysa istek sessizce reddedilir.
- Hız sınırı: aynı IP'den 10 dakikada en fazla 5, aynı telefon numarasından günde en fazla 3 aktif gelecek randevu (değerler sabit dosyasında ayarlanabilir).
  - **Uygulama notu (Aşama 4):** IP sınırı veritabanındaki `rate_limit_hit` fonksiyonuyla (sabit pencere) uygulanır. Telefon sınırı "aynı telefonun aynı dükkanda aynı anda en fazla 3 aktif (pending/confirmed) gelecek randevusu" olarak yorumlandı (`BOOKING_LIMITS`, `lib/constants.ts`). Müşteri telefonu olarak sadece cep numarası (5xx) kabul edilir.
- Telefon numarası Türkiye formatına göre doğrulanıp normalize edilir.
- Cloudflare Turnstile entegrasyonu ortam değişkeni varsa açılır, yoksa devre dışı kalır.

---

## 7. Müşteri Sitesi (Herkese Açık)

Mobil öncelikli tasarlanmalı. Ziyaretçilerin büyük kısmı telefondan gelecek.

### 7.1 Ana sayfa bölümleri (tek sayfa, kaydırmalı)
1. **Üst bölüm:** Logo, dükkan adı, kısa tanıtım, kapak görseli, büyük "Randevu Al" butonu
2. **Hizmetler:** Ad, süre, fiyat
3. **Ekibimiz:** Berberlerin fotoğraf, isim ve unvanları
4. **Galeri:** Izgara görünüm, tıklayınca büyüyen görsel (lightbox)
5. **Yorumlar:** Panelden eklenen seçili yorumlar (yıldız + metin) ve "Google'daki tüm yorumlarımız" butonu (`google_reviews_url`)
6. **Konum ve iletişim:** Gömülü Google Harita (iframe, API anahtarı gerektirmeyen gömme yöntemi), adres, çalışma saatleri tablosu, telefon (tıklayınca arama), WhatsApp butonu, Instagram
7. **Alt bilgi:** KVKK aydınlatma metni linki, "BerberPlatform ile oluşturuldu" küçük yazısı (platformun reklamı)

Mobilde ekranın altında sabit bir "Randevu Al" butonu olmalı.

### 7.2 Randevu alma sihirbazı (`/randevu-al`)
Adımlar, üstte ilerleme göstergesiyle:

1. **Hizmet seçimi**
2. **Berber seçimi** — o hizmeti veren aktif berberler + (ayar açıksa) "Fark etmez"
3. **Tarih ve saat seçimi** — yatay kaydırılabilir gün listesi (bugünden `max_advance_days` gün ilerisine), seçilen gün için boş saatler buton olarak. Boş saat yoksa "Bu gün için boş saat yok" mesajı.
4. **Bilgiler** — ad soyad, telefon, e-posta, not (isteğe bağlı), KVKK onay kutusu (zorunlu, aydınlatma metnine link)
5. **Onay ekranı** — randevu özeti, yönetim linki, "Takvime ekle" (.ics dosyası), "WhatsApp'tan dükkana bildir" butonu

"Fark etmez" seçilirse sistem o saatte müsait olan berberlerden birini atar (en az randevusu olan veya sıradaki berber).

### 7.3 Müsaitlik hesaplama algoritması (sunucuda)
Girdi: dükkan, hizmet, berber (veya hepsi), tarih.

1. O gün için berberin çalışma saatini bul (berbere özel yoksa dükkanın genel saati). Kapalıysa boş liste.
2. Mola aralığını çıkar.
3. O güne denk gelen `time_off` kayıtlarını (berbere özel + tüm dükkan) çıkar.
4. O berberin `pending` ve `confirmed` randevularını çıkar (`starts_at` – `blocked_until` aralığı, yani buffer dahil).
5. Kalan aralıklarda `slot_interval_minutes` adımlarıyla başlangıç saatleri üret; hizmet süresi + buffer sığmayanları ele.
6. Şu andan `min_notice_minutes` sonrasından önceki saatleri ele.
7. Tüm hesaplar Europe/Istanbul saatine göre yapılır.

**Uygulama notu (Aşama 4):** Kapanış saatinde buffer'ın sığması gerekmez; hizmetin kapanıştan önce bitmesi yeterlidir (temizlik payı bir sonraki randevu içindir). Mola sadece hizmet süresiyle, mevcut randevu ve izinler ise buffer dahil meşgul aralıkla karşılaştırılır. Sunucu, müşterinin seçtiği saati kaydetmeden önce aynı algoritmayla yeniden doğrular.

Bu algoritma ayrı bir modülde (`lib/availability.ts`) saf fonksiyon olarak yazılmalı ve birim testleri olmalı.

### 7.4 Randevu yönetim sayfası (`/randevu/[token]`)
- Randevu özeti ve durumu
- **İptal et** butonu (onay penceresiyle)
- **Saati değiştir** butonu → aynı hizmet ve berber için yeni tarih/saat seçimi
- İptal/değişiklik süresi (`cancel_deadline_minutes`) geçtiyse butonlar kapalı ve "Değişiklik için lütfen dükkanı arayın" mesajı + telefon/WhatsApp butonu
- Geçersiz token → "Randevu bulunamadı" sayfası

### 7.5 KVKK
- `/kvkk` sayfasında aydınlatma metni (dükkan adı ve iletişim bilgileri otomatik doldurulan bir şablon). Metnin taslak olduğu, kullanılmadan önce bir hukukçuya kontrol ettirilmesi gerektiği kod yorumunda ve README'de belirtilmeli.
- Randevu formunda zorunlu onay kutusu; onay zamanı `kvkk_consent_at` alanına yazılır.
- Kişisel veri saklama süresi: tamamlanmış/iptal randevulardaki müşteri iletişim bilgileri belirli bir süre sonra (varsayılan 24 ay, sabit dosyasında ayarlanabilir) anonimleştirilecek. Bunun için bir SQL fonksiyonu yazılmalı; zamanlanmış çalıştırma için Supabase'in ücretsiz `pg_cron` eklentisi veya Vercel Cron kullanılabilir.

---

## 8. Dükkan Yönetim Paneli (`/panel`)

Giriş: Supabase Auth, e-posta + şifre. "Şifremi unuttum" akışı olmalı. Panel de mobil uyumlu olmalı (berber telefondan bakacak).

### 8.1 Sayfalar
| Sayfa | İçerik | Sahip | Berber |
|---|---|---|---|
| Ana sayfa (Bugün) | Bugünkü randevular zaman sırasıyla, bekleyen onaylar, hızlı işlemler | ✔ | Sadece kendi |
| Takvim | Günlük ve haftalık görünüm, berbere göre filtre, randevuya tıklayınca detay | ✔ | Sadece kendi |
| Randevu detayı | Onayla, iptal et (sebep isteğe bağlı), "geldi/tamamlandı", "gelmedi" işaretle, müşteriyi ara, WhatsApp'tan yaz | ✔ | Sadece kendi |
| Elle randevu ekle | Telefonla gelen randevuyu sisteme girme (`source = panel`) | ✔ | ✔ |
| Hizmetler | Ekle, düzenle, sırala, pasif yap; hangi berberin verdiğini seç | ✔ | ✖ |
| Berberler | Ekle, düzenle, fotoğraf, pasif yap; isterse berbere giriş hesabı açma (davet e-postası) | ✔ | ✖ |
| Çalışma saatleri | Dükkanın haftalık saatleri, berbere özel saatler, mola | ✔ | Kendi saatleri (okuma) |
| İzinler | Tarih aralığıyla izin/kapalı gün ekleme | ✔ | Kendi izinleri |
| Galeri | Görsel yükleme, açıklama, sıralama, silme | ✔ | ✖ |
| Yorumlar | Seçili yorum ekle/düzenle/gizle | ✔ | ✖ |
| İstatistikler | Bkz. 8.3 | ✔ | Sadece kendi |
| Ayarlar | Dükkan bilgileri, logo, kapak, tema ve renkler, harita/Google/Instagram linkleri, randevu kuralları | ✔ | ✖ |
| Abonelik | Aylık ücret, son ödeme, sonraki ödeme tarihi, IBAN bilgisi (sadece okuma) | ✔ | ✖ |

### 8.2 Önemli davranışlar
- Yeni randevu geldiğinde dükkanın e-postasına bildirim gider.
- Sahip randevuyu iptal ederse müşteriye e-posta gider; panelde müşteriye hazır WhatsApp mesajı gönderme butonu çıkar.
- Bir hizmet veya berber silinmez, **pasif yapılır** (geçmiş randevular ve istatistikler bozulmasın). Hiç randevusu olmayanlar silinebilir.
- Panelde bekleyen onay sayısı menüde rozet olarak görünür.

**Uygulama notları (Aşama 7):**
- **Ücretsiz kurulum kararı:** Supabase'in yerleşik e-posta servisi sadece proje ekibine ve saatte 2 e-posta gönderir. Bu yüzden panel hesapları e-posta gönderilmeden **geçici şifreyle** açılır (berber hesapları sahip tarafından panelden, sahip hesapları `npm run panel:user` ile). "Şifremi unuttum" e-posta akışı kodda hazırdır ancak `AUTH_EMAILS_ENABLED=true` yapılana (alan adı + özel SMTP) kadar kapalıdır; kapalıyken kullanıcı sahibe/platform yöneticisine yönlendirilir.
- **Güvenlik:** Sahip, sadece başka hiçbir dükkanda üyeliği olmayan ve platform yöneticisi olmayan berber hesaplarının şifresini sıfırlayabilir (başka bir kullanıcının e-postasını bağlayıp hesabını ele geçirmeyi önlemek için).
- Randevu iptalinde isteğe bağlı sebep için `appointments.cancel_reason` alanı eklendi; müşteriye giden iptal e-postasında ve WhatsApp mesajında gösterilir.
- Görseller tarayıcıda küçültülüp WebP olarak doğrudan Storage'a yüklenir (Bölüm 15, Aşama 10'daki performans maddesi bu aşamada yapıldı).

### 8.3 İstatistikler
- Seçilebilir dönem: bugün, bu hafta, bu ay, geçen ay, özel aralık
- Toplam randevu, tamamlanan, iptal edilen, gelmeyen (no-show) sayıları
- Tahmini kazanç: tamamlanan randevuların `price_at_booking` toplamı
- Berbere göre randevu ve kazanç dağılımı
- En çok tercih edilen hizmetler
- En yoğun gün ve saatler
- Basit grafikler (ör. Recharts). Hesaplamalar sunucuda yapılmalı.

**Uygulama notları (Aşama 8):**
- Grafikler kütüphanesiz, sunucuda HTML/CSS olarak çizilir (telefona ek JavaScript gitmez); her grafiğin altında "Tablo olarak göster" vardır.
- Tanımlar (`lib/stats.ts`): *Toplam* = dönemde başlayan tüm randevular (iptaller dahil); *Tahmini kazanç* = tamamlanan randevuların `price_at_booking` toplamı (kuruş hassasiyetinde); *Planlanan* = bekleyen + onaylı randevuların toplamı; berber/hizmet/gün/saat dağılımları iptal edilmemiş randevular üzerinden; gün ve saat İstanbul saatine göre.
- Doğrulama: `lib/stats.test.ts` içinde elle hesaplanmış küçük senaryo + demo verisinde panel sonuçları bağımsız bir SQL sorgusuyla karşılaştırıldı.

---

## 9. Tema Sistemi

- Hazır tema ön ayarları (`lib/themes.ts`):
  - `luxury` — koyu arka plan, altın vurgu
  - `modern` — beyaz arka plan, siyah vurgu
  - `classic` — krem arka plan, kırmızı-lacivert vurgu
  - `fresh` — açık gri, yeşil vurgu
- Sahip panelden bir ön ayar seçer, isterse ana rengi ve vurgu rengini renk seçiciyle değiştirir.
- Renkler, dükkan sitesinin kök elemanına CSS değişkeni olarak basılır (`--color-primary`, `--color-accent`, `--color-bg`, `--color-text` ...). Tailwind bu değişkenleri kullanır.
- Kontrast kontrolü: seçilen renk ile yazı rengi arasında okunabilirlik düşükse ayarlar sayfasında uyarı gösterilir.
- Ayarlar sayfasında değişiklik kaydedilmeden önce canlı önizleme olmalı.

---

## 10. Bildirimler

### 10.1 Sağlayıcı soyutlaması
`lib/notifications/` altında ortak bir arayüz:

```ts
interface NotificationProvider {
  sendAppointmentCreated(data): Promise<void>
  sendAppointmentCancelled(data): Promise<void>
  sendAppointmentRescheduled(data): Promise<void>
}
```

- İlk sürümde sadece **e-posta** sağlayıcısı uygulanır.
- **SMS** için boş bir sağlayıcı iskeleti bırakılır (ileride Türk SMS servisleri eklenebilir). Ortam değişkeni yoksa devre dışı kalır.
- Bildirim gönderimi başarısız olursa randevu işlemi **iptal olmaz**; hata loglanır.

### 10.2 E-postalar
| Olay | Müşteriye | Dükkana |
|---|---|---|
| Randevu oluşturuldu | Özet + yönetim linki + .ics eki | Yeni randevu bildirimi |
| Randevu onaylandı (onay gerekiyorsa) | Onay bildirimi | — |
| Müşteri iptal etti | İptal onayı | İptal bildirimi |
| Dükkan iptal etti | İptal bildirimi + dükkan iletişim bilgileri | — |
| Saat değişti | Yeni saat + yönetim linki | Değişiklik bildirimi |

E-postalar Türkçe, sade HTML, dükkanın logosu ve rengiyle.

### 10.3 WhatsApp (ücretsiz, link tabanlı)
- `https://wa.me/{numara}?text={kodlanmış mesaj}` formatında linkler.
- Müşteri onay ekranında: "Dükkana WhatsApp'tan bildir" (hazır mesaj: randevu bilgileri).
- Panelde randevu detayında: "Müşteriye WhatsApp'tan yaz" (hazır hatırlatma, iptal veya onay mesajı şablonları).
- Mesaj şablonları tek bir dosyada toplanmalı.

---

## 11. Süper Yönetici Paneli (`admin.PLATFORM_DOMAIN`)

Sadece `platform_admins` tablosundaki kullanıcılar girebilir.

### 11.1 Sayfalar
- **Pano:** Toplam aktif dükkan, bu ayki beklenen gelir, gecikmiş ödemeler listesi, bu ay alınan ödemeler
- **Dükkanlar listesi:** Ad, slug, durum, abonelik durumu, `paid_until`, sitesine ve paneline hızlı link
- **Yeni dükkan sihirbazı:**
  1. Dükkan adı ve slug (uygunluk kontrolü)
  2. Sahibin e-postası → Supabase Auth ile davet/şifre belirleme e-postası
  3. Kurulum ücreti, aylık ücret, ödeme günü
  4. Tema seçimi
  5. Varsayılan veriler oluşturulur: genel çalışma saatleri (Pzt-Cmt 09:00-20:00, Pazar kapalı), örnek hizmetler (Saç Kesimi, Sakal Tıraşı, Saç + Sakal, Çocuk Tıraşı; süre ve fiyatlar düzenlenebilir), varsayılan `shop_settings`
- **Dükkan detayı:** Bilgiler, abonelik, ödeme geçmişi, notlar; "Ödeme ekle", "Askıya al", "Aktif et" butonları
- **Ödeme ekle:** Tutar, tür, dönem, yöntem; kaydedilince `paid_until` otomatik ileri alınır
- **Platform ayarları:** IBAN ve alıcı adı (dükkan panelindeki abonelik sayfasında gösterilir), platform adı

### 11.2 Otomatik durum güncelleme
- Her gün bir kez çalışan bir iş (Vercel Cron veya `pg_cron`):
  - `paid_until` geçmiş aboneliği `overdue` yapar
  - `overdue` olalı X gün (varsayılan 7, ayarlanabilir) geçen dükkanı **otomatik askıya almaz**, sadece süper yönetici panosunda "askıya alınmalı" olarak işaretler. Askıya alma kararı elle verilir.
- Ödeme günü yaklaşan dükkan sahibine panelde bilgi bandı gösterilir.

### 11.3 İleride online ödeme
- `payments.provider` ve `provider_ref` alanları hazır. İlk sürümde online ödeme **uygulanmayacak.**

**Uygulama notları (Aşama 9):**
- **Platform ayarları:** Tek satırlık `platform_settings` tablosu (IBAN, alıcı adı, banka, ödeme notu). IBAN kayıttan önce TR formatı + mod-97 kontrol hanesiyle doğrulanır (`lib/iban.ts`). Giriş yapmış panel kullanıcıları okuyabilir, sadece süper yönetici değiştirebilir.
- **Yeni dükkan sihirbazı:** Dükkan, abonelik, sahip üyeliği, varsayılan çalışma saatleri (Pzt-Cmt 09-20, Pazar kapalı), varsayılan hizmetler ve isteğe bağlı ilk berber tek bir veritabanı işleminde oluşturulur (`create_shop_with_defaults`, sadece sunucu anahtarı çağırabilir). Sahip hesabı yeni açılıyorsa geçici şifre ekranda bir kez gösterilir; işlem başarısız olursa yeni açılan hesap geri silinir.
- **Ödeme ekleme:** Aylık ödeme `paid_until`'ı ileri alır (son ödeme tarihinden devam eder, 31 günden fazla gecikmişse bugünden başlar; tarih asla geri gitmez). Kurulum ücreti `paid_until`'ı değiştirmez. Kurallar `lib/billing.ts` içinde, birim testli.
- **Günlük iş:** `pg_cron` (Supabase ücretsiz planında mevcut) her gün 00:00 UTC (03:00 İstanbul) `private.daily_maintenance()` çalıştırır: süresi geçen abonelikleri `overdue` yapar, 24 aydan eski tamamlanmış/iptal randevuların müşteri bilgilerini anonimleştirir (KVKK, Bölüm 13), eski hız sınırı kayıtlarını siler. Vercel Cron kullanılmadı.
- **Demo sıfırlama:** Eski seed içeriği `reset_demo_shop()` fonksiyonuna taşındı; `npm run demo:reset` ve yönetici panosundaki buton bunu çağırıp demo hesaplarını yeniden bağlar.
- **Yönlendirme notu:** Giriş sonrası Server Action içinde `redirect()` kullanılmaz; Next.js hedef sayfayı aynı istekte çizip `proxy.ts` yeniden yazmasını atladığı için admin alt alan adında platform ana sayfası açılıyordu. Bunun yerine tarayıcı sayfayı baştan yükler.
- **Komutlar:** İlk süper yönetici `npm run admin:create -- --email ...` ile açılır (e-posta gönderilmez).
- **Maliyet notu:** Supabase'in "sızdırılmış şifre koruması" sadece Pro planda (ücretli) olduğu için açılmadı.

---

## 12. Demo Dükkan

- Slug: `demo` → `demo.PLATFORM_DOMAIN`
- `shops.is_demo = true`, `status = demo`
- Seed verisi (`supabase/seed.sql` veya bir script):
  - 3 berber (fotoğraf yerine baş harfli avatar veya lisanssız görsel)
  - 6 hizmet, gerçekçi süre ve TL fiyatlarıyla
  - Çalışma saatleri ve bir mola
  - 8-12 galeri görseli (lisans sorunu olmayan görseller veya yer tutucular)
  - 5 örnek yorum
  - Önümüzdeki günlere dağılmış 15-20 örnek randevu (takvim ve istatistik dolu görünsün)
  - Harita linki: herhangi bir örnek konum
- Demo dükkandan alınan randevularda **gerçek e-posta gönderilmez**, ekranda "Bu bir demodur" bandı görünür.
- Demo panel için ayrı bir demo sahibi hesabı olur; giriş bilgileri sadece geliştiricide kalır (satışta tablet/telefonda gösterilecek).
- Demo verilerini sıfırlayan bir script olmalı (`npm run demo:reset`), çünkü satış gösterimlerinde veri karışacak.

---

## 13. Klasör Yapısı (Öneri)

```
/
├── app/
│   ├── (platform)/            # Platform tanıtım sayfası
│   ├── sites/[slug]/          # Dükkan müşteri sitesi (proxy buraya yönlendirir; "_" ile başlamamalı)
│   │   ├── page.tsx
│   │   ├── randevu-al/
│   │   ├── randevu/[token]/
│   │   ├── kvkk/
│   │   └── panel/             # Dükkan yönetim paneli
│   ├── admin/                 # Süper yönetici paneli (proxy buraya yönlendirir)
│   └── api/                   # Route handler'lar (cron, ics vb.)
├── components/
│   ├── site/                  # Müşteri sitesi bileşenleri
│   ├── panel/
│   ├── admin/
│   └── ui/
├── lib/
│   ├── supabase/              # server, client, admin (secret key) istemcileri + proxy oturum yenileme
│   ├── tenant.ts              # Host -> platform/admin/dükkan çözümleme (saf fonksiyon + testleri)
│   ├── shops.ts               # Dükkan okuma yardımcıları
│   ├── availability.ts        # Müsaitlik algoritması
│   ├── availability.test.ts
│   ├── themes.ts
│   ├── notifications/
│   ├── whatsapp.ts            # Link ve mesaj şablonları
│   ├── phone.ts               # Telefon doğrulama/normalize
│   ├── tokens.ts              # Yönetim token'ı üretme/hash
│   ├── rate-limit.ts
│   └── constants.ts           # Platform adı, limitler, varsayılanlar
├── supabase/
│   ├── migrations/            # Tüm şema, RLS, fonksiyonlar
│   └── seed.sql               # Demo dükkan
├── scripts/
│   └── demo-reset.ts
├── proxy.ts                   # Next.js 16+ (eski sürümlerde middleware.ts)
├── .env.example
└── README.md                  # Türkçe kurulum rehberi
```

---

## 14. Ortam Değişkenleri (`.env.example`)

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=   # sb_publishable_... (eski adıyla anon key)
SUPABASE_SECRET_KEY=                    # sb_secret_... (eski adıyla service role key) — sadece sunucuda
NEXT_PUBLIC_PLATFORM_DOMAIN=            # Ör. berberplatform.com (yerelde localhost:3000)
NEXT_PUBLIC_PLATFORM_NAME=BerberPlatform
EMAIL_PROVIDER_API_KEY=
EMAIL_FROM=                             # Ör. randevu@PLATFORM_DOMAIN
NEXT_PUBLIC_TURNSTILE_SITE_KEY=         # İsteğe bağlı (tarayıcıda kullanıldığı için NEXT_PUBLIC_)
TURNSTILE_SECRET_KEY=                   # İsteğe bağlı
CRON_SECRET=                            # Cron uç noktalarını korumak için
```

Not: Supabase yeni anahtar sistemine geçti. Bu dokümanda geçen "service role" ifadeleri `SUPABASE_SECRET_KEY` ile oluşturulan yönetici istemcisini (`lib/supabase/admin.ts`) ifade eder.

---

## 15. Geliştirme Aşamaları

Her aşama sonunda kabul kriterleri kontrol edilecek.

### Aşama 1 — Temel kurulum
- Next.js + TypeScript + Tailwind projesi, klasör yapısı, `.env.example`
- Supabase istemcileri (server, client, admin)
- Proxy (`proxy.ts`) ile alt alan adı yönlendirmesi, "Dükkan bulunamadı" sayfası
- **Kabul:** `demo.localhost:3000` ve `?shop=demo` farklı sayfaya gidiyor; olmayan slug hata sayfası gösteriyor; build hatasız.

### Aşama 2 — Veritabanı ve güvenlik
- Bölüm 5'teki tüm tablolar, indeksler, exclusion constraint
- Bölüm 6'daki yardımcı fonksiyonlar ve tüm RLS kuralları (migration dosyaları olarak)
- Demo seed verisi
- **Kabul:** Anonim kullanıcı randevuları okuyamıyor; bir dükkan sahibi başka dükkanın verisini göremiyor; aynı berbere çakışan iki randevu veritabanına yazılamıyor. Bu senaryolar için test veya SQL kontrol scripti var.

### Aşama 3 — Müşteri sitesi (vitrin)
- Ana sayfanın tüm bölümleri, tema sistemi, mobil sabit buton, KVKK sayfası
- **Kabul:** Demo dükkan sitesi telefonda ve masaüstünde düzgün görünüyor; tema değişince renkler değişiyor.

### Aşama 4 — Randevu alma
- Müsaitlik algoritması + birim testleri
- Randevu sihirbazı, sunucu tarafı oluşturma, honeypot, hız sınırı, telefon doğrulama
- Onay ekranı, yönetim token'ı, .ics dosyası, WhatsApp linki
- **Kabul:** Boş saatler doğru hesaplanıyor (mola, izin, mevcut randevu, min. süre testleri geçiyor); aynı saate iki randevu alınamıyor ve kullanıcı dostu hata çıkıyor.

### Aşama 5 — Randevu yönetimi (müşteri)
- `/randevu/[token]` sayfası, iptal, saat değiştirme, süre sınırı
- **Kabul:** Süre geçince değişiklik yapılamıyor; geçersiz token hata sayfası gösteriyor.

### Aşama 6 — Bildirimler
- E-posta sağlayıcısı, tüm e-posta şablonları, SMS iskeleti
- **Kabul:** Randevu oluşturma/iptal/değişiklikte doğru e-postalar gidiyor; demo dükkanda e-posta gitmiyor; e-posta servisi hata verse de randevu kaydediliyor.

### Aşama 7 — Dükkan paneli
- Giriş, şifre sıfırlama, rol bazlı menü
- Bölüm 8'deki tüm sayfalar
- **Kabul:** Sahip her şeyi yönetebiliyor; berber hesabı sadece kendi randevularını görüyor; panel telefonda kullanılabilir.

### Aşama 8 — İstatistikler
- **Kabul:** Demo verileriyle istatistikler doğru hesaplanıyor (elle kontrol edilebilir küçük bir test senaryosu).

### Aşama 9 — Süper yönetici paneli
- Bölüm 11'in tamamı, cron işleri, demo sıfırlama scripti
- **Kabul:** Sihirbazla yeni dükkan 5 dakikadan kısa sürede açılabiliyor; ödeme eklenince `paid_until` ilerliyor; askıya alınan dükkanın sitesi hizmet dışı sayfası gösteriyor.

### Aşama 10 — Yayına alma ve cilalama
- Platform tanıtım sayfası (berberlere yönelik: özellikler, demo linki, iletişim/WhatsApp butonu)
- SEO: her dükkan sayfasında dükkan adına göre başlık, açıklama, Open Graph görseli
- Performans: görseller optimize (Next.js Image), Storage'a yüklenen görseller boyut sınırlı (ör. 5 MB) ve yükleme öncesi istemcide küçültülüyor
- Erişilebilirlik: buton ve form etiketleri, klavye ile kullanılabilirlik
- Türkçe README
- **Kabul:** Bölüm 17'deki test listesinin tamamı geçiyor.

**Uygulama notları (Aşama 10):**
- **Ücretsiz yayın kararı (2026-10-07):** Proje şimdilik portföy projesi; maliyet olmayacak. Alan adı alınmadı, Vercel Hobby + Supabase Free kullanılır. `*.vercel.app` adresinde alt alan adı açılamadığı için **tek adres modu** eklendi (`NEXT_PUBLIC_SINGLE_DOMAIN_MODE=true`): dükkanlar `?shop=slug` ile seçilir (seçim çerezde hatırlanır), süper yönetici paneli `/admin` yolundadır. Tüm linkler (`lib/links.ts`: `shopBaseUrl`, `shopUrl`, `withPath`, `adminPath`) iki moda göre üretilir; e-postalardaki ve onay ekranındaki randevu yönetim linkleri tek adres modunda `?shop=` içerir. Alan adı alınınca mod kapatılır, kod değişmez.
- **Herkese açık demo:** Demo panel giriş sayfasında "Dükkan sahibi / Berber olarak dene" butonları vardır (şifreler sunucudaki ortam değişkenlerinde, sayfada gösterilmez). Demo dükkanda giriş hesapları ve şifreler değiştirilemez. Vercel Cron her gece demo dükkanı sıfırlar (`/api/cron/demo-reset`, `CRON_SECRET` ile korunur); bu düzenli istek Supabase ücretsiz projesinin duraklatılmasını da önler. Demo verisine "bugünün" randevuları eklendi (panelin ilk ekranı boş görünmesin).
- **SEO:** Dükkan sayfalarında dükkan adına göre başlık şablonu, açıklama, Open Graph/Twitter kartı; paylaşım görseli `/api/og/{slug}` (dükkan temasıyla, `next/og`). Platform sayfasının görseli derlemede üretilir. `robots.txt` panelleri, kişiye özel randevu sayfalarını ve cron uç noktasını kapatır.
- **Erişilebilirlik:** axe-core ile WCAG 2.1 AA taraması (tanıtım, dükkan sitesi, randevu sihirbazı adımları, KVKK, giriş sayfaları, 13 panel sayfası): bulunan kontrast ve ARIA sorunları düzeltildi, sonuç temiz. Tanıtım sayfasında "İçeriğe geç" linki var.
- **Tanıtım sayfası:** Özellikler, ekran görüntüleri (`public/landing/`, demo dükkandan alındı), nasıl çalışır, demo linkleri; `NEXT_PUBLIC_PLATFORM_SUPPORT_WHATSAPP` tanımlıysa WhatsApp iletişim butonu.

**Güvenlik denetimi (2026-10-07, yayından sonra):**
- Kontrol edilenler: tüm tablolarda RLS ve kuralların içeriği; canlı API'ye giriş yapmamış ziyaretçi, demo berber ve demo sahibi olarak 46 saldırı denemesi (başka berberin/dükkanın randevusunu okuma, değiştirme, silme, aktarma; abonelik/ödeme/IBAN/yönetici yetkisi; başka dükkanın dosya klasörü); git geçmişi ve canlı sitenin JS dosyalarında gizli anahtar taraması. Hepsi engellendi / temiz.
- Bulunan ve düzeltilen: (1) Herkese açık demoda ziyaretçi, Supabase API'sini doğrudan kullanarak demo hesabının şifresini değiştirebiliyor ve demo üyeliklerini silebiliyordu (demo kalıcı olarak kapanabilirdi) → üyelik/berber bağlantısı değişikliği veritabanında engellendi, demo girişi bozulmuş hesabı kendiliğinden onarır, gece sıfırlaması şifreleri geri alır. (2) Dosya deposu SVG kabul ediyordu → sadece jpeg/png/webp. (3) Bir dükkanın üyeleri başka dükkanların izin sebeplerini okuyabiliyordu → sadece kendi dükkanı. (4) Güvenlik başlıkları eklendi (iframe'e gömme engeli, nosniff, referrer ve izin politikaları).
- Bilinen, kabul edilen: "sızdırılmış şifre koruması" sadece Supabase Pro'da (ücretli). Demo sahibi olarak giren ziyaretçi demo içeriğini (ad, açıklama, görseller) değiştirebilir; her gece sıfırlanır.

---

## 16. Yayına Alma Rehberi (README'ye de eklenecek)

> **Not (Aşama 10):** Şu anki yayın alan adı olmadan, ücretsiz yapılır (README → "Ücretsiz yayına alma"). Aşağıdaki adımlar alan adı alındığında geçerlidir; 5. adım ücretlidir. Cron, Vercel Cron yerine veritabanı bakımı için `pg_cron`, demo sıfırlama için `vercel.json` ile kuruldu.

1. Supabase'de yeni proje oluştur, migration'ları çalıştır, seed'i yükle.
2. Supabase Auth ayarlarında site adresini ve yönlendirme adreslerini (`https://*.PLATFORM_DOMAIN/**`) tanımla.
3. Supabase Storage'da `shop-assets` adlı bucket oluştur; herkese açık okuma, yazma sadece ilgili dükkan üyelerine (storage RLS kuralları migration'da olmalı).
4. Kodu GitHub'a yükle, Vercel'e bağla, ortam değişkenlerini gir.
5. Alan adını satın al. Vercel'de wildcard alt alan adı (`*.PLATFORM_DOMAIN`) için alan adının nameserver'larını Vercel'e yönlendir; ana alan adını ve `*.PLATFORM_DOMAIN`'i projeye ekle.
6. E-posta servisinde alan adını doğrula (SPF/DKIM kayıtları), aksi halde e-postalar spam'e düşebilir.
7. Cron işlerini (`vercel.json`) tanımla ve `CRON_SECRET` ile koru.
8. Kendi kullanıcını oluşturup `platform_admins` tablosuna ekle.
9. Demo dükkanı kontrol et.

---

## 17. Test Kontrol Listesi

**Randevu**
- [ ] Kapalı günde boş saat çıkmıyor
- [ ] Molaya denk gelen saatler çıkmıyor
- [ ] Hizmet süresi kapanış saatini aşacaksa o saat çıkmıyor
- [ ] Berber izindeyken saat çıkmıyor; tüm dükkan kapalıyken hiçbir berberde çıkmıyor
- [ ] Şimdiki zamandan `min_notice_minutes` öncesi çıkmıyor
- [ ] `max_advance_days` sonrası seçilemiyor
- [ ] İki tarayıcıdan aynı anda aynı saate randevu → sadece biri başarılı
- [ ] "Fark etmez" seçildiğinde müsait bir berber atanıyor
- [ ] KVKK kutusu işaretlenmeden randevu gönderilemiyor
- [ ] Honeypot doluysa randevu oluşmuyor
- [ ] Hız sınırı aşılınca anlaşılır mesaj çıkıyor
- [ ] Gece yarısı ve yaz/kış saati gibi sınır durumlarında saatler doğru (Türkiye sabit UTC+3 kullanıyor ama kod saat dilimi kütüphanesiyle çalışmalı)

**Yönetim linki**
- [ ] İptal çalışıyor, iptal sonrası saat tekrar boşa çıkıyor
- [ ] Saat değiştirme çalışıyor
- [ ] Süre sınırı geçince butonlar kapalı
- [ ] Rastgele token ile erişim mümkün değil

**Panel ve güvenlik**
- [ ] Başka dükkanın verileri hiçbir şekilde görünmüyor (API üzerinden de denenmeli)
- [ ] Berber başka berberin randevusunu göremiyor
- [ ] Sahip abonelik bilgisini değiştiremiyor
- [ ] Pasif hizmet/berber müşteri sitesinde görünmüyor
- [ ] Secret key (service role) istemci paketinde yok (build çıktısında, ör. `.next/static` içinde `sb_secret_` aranmalı)

**Süper yönetici**
- [ ] Yeni dükkan sihirbazı varsayılan verileri oluşturuyor
- [ ] Askıya alınan dükkan sitesi hizmet dışı
- [ ] Ödeme ekleme `paid_until`'i doğru ilerletiyor

**Genel**
- [ ] Tüm sayfalar 360 px genişlikte düzgün
- [ ] Tüm metinler Türkçe, para birimi "₺" ve Türkçe tarih formatı (ör. "12 Ekim Pazartesi, 14:30")

---

## 18. Yeni Bir Berbere Kurulum Rehberi (Satış Sonrası)

1. Süper yönetici panelinde "Yeni dükkan" sihirbazını aç.
2. Dükkan adını ve slug'ı gir (ör. `kral-berber`).
3. Sahibin e-postasını gir; davet e-postası gider.
4. Kurulum ve aylık ücreti, ödeme gününü gir.
5. Tema seç.
6. Dükkan sahibiyle birlikte (veya onun yerine) panelden: logo, kapak fotoğrafı, hizmet ve fiyatlar, berberler, çalışma saatleri, adres, Google Harita ve Google yorum linkleri, Instagram, WhatsApp numarası.
7. Galeriye dükkandan 6-10 fotoğraf yükle, Google'dan 3-5 güzel yorumu elle ekle.
8. Test randevusu alıp iptal et.
9. Sahibe kısa kullanım eğitimi ver; site linkini Instagram profiline ve Google İşletme profiline eklemesini öner.
10. Kurulum ödemesini süper yönetici panelinden kaydet.

---

## 19. Kapsam Dışı (İlk Sürümde Yapılmayacak)

- Online ödeme (müşteriden kapora veya dükkandan abonelik)
- SMS ve resmi WhatsApp API ile otomatik mesaj
- Google yorumlarının API ile otomatik çekilmesi
- Mobil uygulama
- Çoklu dil
- Dükkanların kendi alan adını bağlama arayüzü (sadece altyapısı hazır)
- Müşteri hesapları ve sadakat programı
- Otomatik randevu hatırlatma e-postaları (ileride cron ile eklenebilir; altyapı buna uygun bırakılmalı)
