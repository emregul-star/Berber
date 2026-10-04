-- =============================================================================
-- BerberPlatform — Çekirdek şema (Bölüm 5)
--
-- Bu migration tabloları, kısıtları ve indeksleri oluşturur.
-- Güvenlik (RLS, yetkiler, yardımcı fonksiyonlar) bir sonraki migration'dadır.
--
-- Genel kurallar:
--  * Her tabloda id (uuid) ve created_at bulunur.
--  * Dükkana ait her tabloda shop_id bulunur; RLS bu alana göre çalışır.
--  * Durum alanları text + check kısıtıyla tutulur (enum yerine; değiştirmesi kolay).
--  * Berber/hizmet referansları (id, shop_id) ikilisiyle bileşik foreign key kullanır.
--    Böylece bir dükkanın kaydı yanlışlıkla başka dükkanın berberine bağlanamaz.
-- =============================================================================

-- Çakışan randevu engeli (exclusion constraint) için gerekli eklenti.
create extension if not exists btree_gist with schema extensions;

-- -----------------------------------------------------------------------------
-- 5.1 shops — Dükkanlar
-- -----------------------------------------------------------------------------
create table public.shops (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  slug text not null unique
    constraint shops_slug_format check (slug ~ '^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$'),
  name text not null check (length(trim(name)) > 0),
  description text,
  phone text,
  -- Uluslararası format, başında + olmadan: 905xxxxxxxxx
  whatsapp_number text check (whatsapp_number ~ '^90[0-9]{10}$'),
  email text,
  address text,
  google_maps_embed_url text,
  google_reviews_url text,
  instagram_url text,
  logo_url text,
  cover_image_url text,
  theme_preset text not null default 'modern'
    check (theme_preset in ('luxury', 'modern', 'classic', 'fresh')),
  primary_color text check (primary_color ~ '^#[0-9a-fA-F]{6}$'),
  accent_color text check (accent_color ~ '^#[0-9a-fA-F]{6}$'),
  status text not null default 'active' check (status in ('active', 'suspended', 'demo')),
  is_demo boolean not null default false,
  -- İleride: dükkanın kendi alan adı (ör. kralberber.com). Küçük harf tutulur.
  custom_domain text unique check (custom_domain = lower(custom_domain)),
  created_by uuid references auth.users (id) on delete set null
);

comment on table public.shops is 'Berber dükkanları (kiracılar). slug = alt alan adı.';

create index shops_created_by_idx on public.shops (created_by);

-- -----------------------------------------------------------------------------
-- 5.2 shop_settings — Randevu kuralları (shops ile 1'e 1)
-- -----------------------------------------------------------------------------
create table public.shop_settings (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  shop_id uuid not null unique references public.shops (id) on delete cascade,
  slot_interval_minutes int not null default 15 check (slot_interval_minutes between 5 and 120),
  min_notice_minutes int not null default 60 check (min_notice_minutes between 0 and 10080),
  max_advance_days int not null default 14 check (max_advance_days between 1 and 365),
  cancel_deadline_minutes int not null default 120 check (cancel_deadline_minutes between 0 and 10080),
  requires_approval boolean not null default false,
  buffer_minutes int not null default 0 check (buffer_minutes between 0 and 120),
  allow_any_barber boolean not null default true
);

-- -----------------------------------------------------------------------------
-- 5.3 shop_members — Panel kullanıcıları
-- -----------------------------------------------------------------------------
create table public.shop_members (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  shop_id uuid not null references public.shops (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('owner', 'barber')),
  unique (shop_id, user_id)
);

-- (shop_id, user_id) unique indeksi shop_id ile başlayan aramaları karşılar;
-- "bu kullanıcı hangi dükkanların üyesi" sorgusu için ayrıca user_id indeksi.
create index shop_members_user_id_idx on public.shop_members (user_id);

-- -----------------------------------------------------------------------------
-- 5.4 platform_admins — Süper yöneticiler
-- -----------------------------------------------------------------------------
create table public.platform_admins (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid not null unique references auth.users (id) on delete cascade
);

-- -----------------------------------------------------------------------------
-- 5.5 barbers — Berberler
-- -----------------------------------------------------------------------------
create table public.barbers (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  shop_id uuid not null references public.shops (id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  title text,
  photo_url text,
  bio text,
  is_active boolean not null default true,
  sort_order int not null default 0,
  -- Berberin giriş hesabı varsa (zorunlu değil)
  user_id uuid references auth.users (id) on delete set null,
  -- Bileşik foreign key'lerin hedefi olabilmesi için
  unique (id, shop_id),
  -- Bir kullanıcı aynı dükkanda en fazla bir berber kaydına bağlanabilir
  unique (shop_id, user_id)
);

create index barbers_shop_id_idx on public.barbers (shop_id, sort_order);
create index barbers_user_id_idx on public.barbers (user_id);

-- -----------------------------------------------------------------------------
-- 5.6 services — Hizmetler
-- -----------------------------------------------------------------------------
create table public.services (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  shop_id uuid not null references public.shops (id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  description text,
  duration_minutes int not null check (duration_minutes between 5 and 600),
  price numeric(10, 2) not null check (price >= 0),
  is_active boolean not null default true,
  sort_order int not null default 0,
  unique (id, shop_id)
);

create index services_shop_id_idx on public.services (shop_id, sort_order);

-- -----------------------------------------------------------------------------
-- 5.7 barber_services — Hangi berber hangi hizmeti veriyor
-- Not: Dokümandaki alanlara ek olarak shop_id tutulur; hem RLS'i basitleştirir
-- hem de berber ile hizmetin aynı dükkana ait olmasını veritabanı garanti eder.
-- -----------------------------------------------------------------------------
create table public.barber_services (
  shop_id uuid not null references public.shops (id) on delete cascade,
  barber_id uuid not null,
  service_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (barber_id, service_id),
  foreign key (barber_id, shop_id) references public.barbers (id, shop_id) on delete cascade,
  foreign key (service_id, shop_id) references public.services (id, shop_id) on delete cascade
);

create index barber_services_shop_id_idx on public.barber_services (shop_id);
create index barber_services_service_id_idx on public.barber_services (service_id, shop_id);
create index barber_services_barber_shop_idx on public.barber_services (barber_id, shop_id);

-- -----------------------------------------------------------------------------
-- 5.8 working_hours — Haftalık çalışma saatleri
-- barber_id boşsa dükkanın genel saati, doluysa berbere özel saat.
-- weekday: 0 = Pazartesi ... 6 = Pazar
-- -----------------------------------------------------------------------------
create table public.working_hours (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  shop_id uuid not null references public.shops (id) on delete cascade,
  barber_id uuid,
  weekday smallint not null check (weekday between 0 and 6),
  start_time time,
  end_time time,
  break_start time,
  break_end time,
  is_closed boolean not null default false,
  foreign key (barber_id, shop_id) references public.barbers (id, shop_id) on delete cascade,
  -- Açık günlerde başlangıç < bitiş olmalı
  constraint working_hours_open_times check (
    is_closed or (start_time is not null and end_time is not null and start_time < end_time)
  ),
  -- Mola ya hiç yok ya da çalışma saatinin içinde
  constraint working_hours_break_times check (
    (break_start is null and break_end is null)
    or (
      break_start is not null and break_end is not null and break_start < break_end
      and (is_closed or (break_start >= start_time and break_end <= end_time))
    )
  ),
  -- Her gün için dükkan başına tek genel kayıt, berber başına tek özel kayıt
  constraint working_hours_one_per_day unique nulls not distinct (shop_id, barber_id, weekday)
);

create index working_hours_barber_shop_idx on public.working_hours (barber_id, shop_id);

-- -----------------------------------------------------------------------------
-- 5.9 time_off — İzinler ve kapalı zamanlar
-- barber_id boşsa tüm dükkan kapalı (ör. bayram).
-- -----------------------------------------------------------------------------
create table public.time_off (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  shop_id uuid not null references public.shops (id) on delete cascade,
  barber_id uuid,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reason text,
  foreign key (barber_id, shop_id) references public.barbers (id, shop_id) on delete cascade,
  check (ends_at > starts_at)
);

create index time_off_shop_starts_idx on public.time_off (shop_id, starts_at);
create index time_off_barber_shop_idx on public.time_off (barber_id, shop_id);

-- -----------------------------------------------------------------------------
-- 5.10 appointments — Randevular
-- -----------------------------------------------------------------------------
create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  shop_id uuid not null references public.shops (id) on delete cascade,
  -- Geçmiş randevusu olan berber/hizmet silinemez (pasif yapılır); bu yüzden
  -- bu foreign key'lerde "on delete cascade" yok.
  barber_id uuid not null,
  service_id uuid not null,
  starts_at timestamptz not null,
  -- Gerçek hizmet bitişi (müşteriye gösterilen)
  ends_at timestamptz not null,
  -- ends_at + buffer_minutes. Çakışma kontrolü bu alanla yapılır (Bölüm 5.10).
  blocked_until timestamptz not null,
  status text not null default 'pending' check (
    status in ('pending', 'confirmed', 'cancelled_by_customer', 'cancelled_by_shop', 'completed', 'no_show')
  ),
  customer_name text not null check (length(trim(customer_name)) > 0),
  -- Normalize edilmiş: 905xxxxxxxxx
  customer_phone text not null check (customer_phone ~ '^90[0-9]{10}$'),
  customer_email text,
  customer_note text,
  -- Fiyat sonradan değişse de istatistik bozulmasın
  price_at_booking numeric(10, 2) not null check (price_at_booking >= 0),
  -- Yönetim linki token'ının SHA-256 hash'i (token düz saklanmaz)
  manage_token_hash text unique,
  kvkk_consent_at timestamptz,
  cancelled_at timestamptz,
  source text not null default 'web' check (source in ('web', 'panel')),
  foreign key (barber_id, shop_id) references public.barbers (id, shop_id),
  foreign key (service_id, shop_id) references public.services (id, shop_id),
  check (ends_at > starts_at),
  check (blocked_until >= ends_at)
);

-- Çift randevu engeli (zorunlu): aynı berberin aktif (pending/confirmed)
-- randevuları zaman olarak çakışamaz. '[)' = başlangıç dahil, bitiş hariç;
-- böylece 10:00-10:30 ile 10:30-11:00 yan yana alınabilir.
alter table public.appointments
  add constraint appointments_no_overlap
  exclude using gist (
    barber_id with =,
    tstzrange(starts_at, blocked_until, '[)') with &&
  )
  where (status in ('pending', 'confirmed'));

create index appointments_shop_starts_idx on public.appointments (shop_id, starts_at);
create index appointments_barber_starts_idx on public.appointments (barber_id, starts_at);
create index appointments_service_shop_idx on public.appointments (service_id, shop_id);

-- -----------------------------------------------------------------------------
-- 5.11 gallery_images — Galeri
-- -----------------------------------------------------------------------------
create table public.gallery_images (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  shop_id uuid not null references public.shops (id) on delete cascade,
  image_url text not null,
  caption text,
  sort_order int not null default 0
);

create index gallery_images_shop_id_idx on public.gallery_images (shop_id, sort_order);

-- -----------------------------------------------------------------------------
-- 5.12 testimonials — Seçili yorumlar (elle eklenir)
-- -----------------------------------------------------------------------------
create table public.testimonials (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  shop_id uuid not null references public.shops (id) on delete cascade,
  author_name text not null check (length(trim(author_name)) > 0),
  rating int not null check (rating between 1 and 5),
  content text not null,
  source text,
  is_visible boolean not null default true,
  sort_order int not null default 0
);

create index testimonials_shop_id_idx on public.testimonials (shop_id, sort_order);

-- -----------------------------------------------------------------------------
-- 5.13 subscriptions — Dükkanın platform aboneliği (shops ile 1'e 1)
-- -----------------------------------------------------------------------------
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  shop_id uuid not null unique references public.shops (id) on delete cascade,
  setup_fee numeric(10, 2) not null default 0 check (setup_fee >= 0),
  monthly_fee numeric(10, 2) not null default 0 check (monthly_fee >= 0),
  -- 29-31 her ay olmadığı için 1-28 arası
  billing_day int not null default 1 check (billing_day between 1 and 28),
  paid_until date,
  status text not null default 'active' check (status in ('active', 'overdue', 'suspended', 'cancelled')),
  -- DİKKAT: Dükkan sahibi kendi aboneliğini okuyabildiği için bu notu da görür.
  notes text
);

-- -----------------------------------------------------------------------------
-- 5.14 payments — Alınan ödemeler
-- -----------------------------------------------------------------------------
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  shop_id uuid not null references public.shops (id) on delete cascade,
  amount numeric(10, 2) not null check (amount > 0),
  type text not null check (type in ('setup', 'monthly')),
  period_start date,
  period_end date,
  method text not null check (method in ('iban', 'cash', 'online')),
  -- İleride online ödeme sağlayıcısı
  provider text,
  provider_ref text,
  paid_at timestamptz not null default now(),
  recorded_by uuid references auth.users (id) on delete set null,
  check (period_end is null or period_start is null or period_end >= period_start)
);

create index payments_shop_paid_idx on public.payments (shop_id, paid_at desc);
create index payments_recorded_by_idx on public.payments (recorded_by);

-- -----------------------------------------------------------------------------
-- 5.15 rate_limits — Basit hız sınırı (sadece sunucu kullanır)
-- -----------------------------------------------------------------------------
create table public.rate_limits (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  -- ör. 'booking:ip:1.2.3.4' veya 'booking:phone:905...'
  key text not null,
  window_start timestamptz not null,
  count int not null default 0 check (count >= 0),
  unique (key, window_start)
);

create index rate_limits_window_start_idx on public.rate_limits (window_start);
