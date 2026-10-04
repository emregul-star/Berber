-- =============================================================================
-- BerberPlatform — Güvenlik: yardımcı fonksiyonlar, RLS politikaları, yetkiler (Bölüm 6)
--
-- Katmanlar:
--  1. GRANT  : Bir rol (anon/authenticated) tabloya hiç erişebilir mi? Hangi kolonlara?
--  2. RLS    : Erişebiliyorsa HANGİ SATIRLARI görebilir/değiştirebilir?
--  3. Trigger: Satırı değiştirebilse bile korunan alanları (ör. dükkan durumu) değiştiremez.
--
-- Roller:
--  anon          = giriş yapmamış ziyaretçi (publishable key)
--  authenticated = giriş yapmış panel kullanıcısı (sahip, berber, süper yönetici)
--  service_role  = sunucudaki secret key; RLS'i atlar (müşteri randevusu, cron vb.)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Yardımcı fonksiyonlar (private şeması)
--
-- "security definer": fonksiyon, çağıranın değil sahibinin yetkisiyle çalışır ve
-- RLS'i atlar. Politikaların içinde başka tabloya bakarken sonsuz döngüye
-- (politika -> tablo -> politika ...) girmemek için gerekli.
-- private şeması Data API'ye açık DEĞİLDİR; bu fonksiyonlar dışarıdan çağrılamaz,
-- sadece politikaların içinden kullanılır. Hepsi çağıran kullanıcıyı auth.uid()
-- ile kontrol eder; başkası adına bilgi döndürmez.
-- -----------------------------------------------------------------------------
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated, service_role;

-- Çağıran kullanıcı süper yönetici mi?
create or replace function private.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.platform_admins pa
    where pa.user_id = (select auth.uid())
  );
$$;

-- Çağıran kullanıcı bu dükkanın üyesi mi (sahip veya berber)?
create or replace function private.is_shop_member(p_shop_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.shop_members sm
    where sm.shop_id = p_shop_id
      and sm.user_id = (select auth.uid())
  );
$$;

-- Çağıran kullanıcı bu dükkanın sahibi mi?
create or replace function private.is_shop_owner(p_shop_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.shop_members sm
    where sm.shop_id = p_shop_id
      and sm.user_id = (select auth.uid())
      and sm.role = 'owner'
  );
$$;

-- Çağıran kullanıcının bu dükkandaki berber kaydı (yoksa null).
-- Hem barbers.user_id bağlantısı hem de dükkan üyeliği gerekir.
create or replace function private.current_barber_id(p_shop_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select b.id
  from public.barbers b
  join public.shop_members sm
    on sm.shop_id = b.shop_id
   and sm.user_id = b.user_id
  where b.shop_id = p_shop_id
    and b.user_id = (select auth.uid())
  limit 1;
$$;

-- Dükkan herkese açık mı (aktif veya demo)? Askıdaki dükkanın verisi ziyaretçiye gösterilmez.
create or replace function private.is_shop_public(p_shop_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.shops s
    where s.id = p_shop_id
      and s.status in ('active', 'demo')
  );
$$;

-- Yeni fonksiyonlarda Postgres varsayılan olarak herkese (PUBLIC) çalıştırma yetkisi verir;
-- geri alıp sadece politikaların çalıştığı rollere veriyoruz.
revoke execute on all functions in schema private from public;
grant execute on function
  private.is_platform_admin(),
  private.is_shop_member(uuid),
  private.is_shop_owner(uuid),
  private.current_barber_id(uuid),
  private.is_shop_public(uuid)
to anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 2. Korunan alanlar için trigger'lar
-- -----------------------------------------------------------------------------

-- Dükkan sahibi kendi dükkanını güncelleyebilir ama slug, durum (askıya alma),
-- demo bayrağı, özel alan adı ve oluşturan alanlarını sadece süper yönetici değiştirebilir.
-- current_user = 'authenticated' sadece panel kullanıcılarında doğrudur; sunucudaki
-- secret key (service_role) ve migration'lar (postgres) bu kontrolden etkilenmez.
create or replace function private.guard_shop_protected_columns()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user = 'authenticated' and not private.is_platform_admin() then
    if new.slug is distinct from old.slug
       or new.status is distinct from old.status
       or new.is_demo is distinct from old.is_demo
       or new.custom_domain is distinct from old.custom_domain
       or new.created_by is distinct from old.created_by then
      raise exception 'Bu alanları sadece platform yöneticisi değiştirebilir.'
        using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

create trigger shops_guard_protected_columns
  before update on public.shops
  for each row execute function private.guard_shop_protected_columns();

-- Berber (sahip olmayan üye) kendi randevusunda sadece durumu değiştirebilir
-- (onayla, iptal et, geldi, gelmedi). Saat, müşteri bilgisi vb. değiştiremez.
create or replace function private.guard_appointment_barber_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user = 'authenticated'
     and not private.is_platform_admin()
     and not private.is_shop_owner(old.shop_id) then
    if (to_jsonb(new) - array['status', 'cancelled_at'])
       is distinct from (to_jsonb(old) - array['status', 'cancelled_at']) then
      raise exception 'Berberler randevuda sadece durumu değiştirebilir.'
        using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

create trigger appointments_guard_barber_update
  before update on public.appointments
  for each row execute function private.guard_appointment_barber_update();

-- Her yeni dükkana varsayılan randevu kuralları (shop_settings) otomatik eklenir.
create or replace function private.create_default_shop_settings()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.shop_settings (shop_id) values (new.id)
  on conflict (shop_id) do nothing;
  return new;
end;
$$;

revoke execute on function private.create_default_shop_settings() from public;

create trigger shops_create_default_settings
  after insert on public.shops
  for each row execute function private.create_default_shop_settings();

-- -----------------------------------------------------------------------------
-- 3. RLS'i tüm tablolarda aç (Bölüm 0, kural 4: hiçbir tabloda kapatılmaz)
-- -----------------------------------------------------------------------------
alter table public.shops            enable row level security;
alter table public.shop_settings    enable row level security;
alter table public.shop_members     enable row level security;
alter table public.platform_admins  enable row level security;
alter table public.barbers          enable row level security;
alter table public.services         enable row level security;
alter table public.barber_services  enable row level security;
alter table public.working_hours    enable row level security;
alter table public.time_off         enable row level security;
alter table public.appointments     enable row level security;
alter table public.gallery_images   enable row level security;
alter table public.testimonials     enable row level security;
alter table public.subscriptions    enable row level security;
alter table public.payments         enable row level security;
alter table public.rate_limits      enable row level security;

-- -----------------------------------------------------------------------------
-- 4. Tablo yetkileri (GRANT)
-- Yeni tablolar Data API'ye otomatik açılmadığı için (Bölüm 6.1.1) yetkileri
-- açıkça veriyoruz. Önce hepsini geri alıp sonra sadece gerekenleri veriyoruz;
-- böylece projenin varsayılan ayarı ne olursa olsun sonuç aynı olur.
-- -----------------------------------------------------------------------------
revoke all on all tables in schema public from anon, authenticated;
grant all on all tables in schema public to service_role;

-- shops: ziyaretçi herkese açık kolonları okur (iletişim e-postası ve created_by hariç).
-- DİKKAT: anon için "select *" çalışmaz; uygulama kolonları tek tek seçmelidir.
grant select (
  id, created_at, slug, name, description, phone, whatsapp_number, address,
  google_maps_embed_url, google_reviews_url, instagram_url, logo_url, cover_image_url,
  theme_preset, primary_color, accent_color, status, is_demo, custom_domain
) on public.shops to anon;
grant select, insert, update, delete on public.shops to authenticated;

-- Müşteri sitesinin okuduğu tablolar
grant select on
  public.shop_settings, public.barbers, public.services, public.barber_services,
  public.working_hours, public.gallery_images, public.testimonials
to anon;

-- time_off: ziyaretçi izin sebebini (reason) göremez
grant select (id, created_at, shop_id, barber_id, starts_at, ends_at) on public.time_off to anon;

-- Panel kullanıcıları: satır bazlı sınırları RLS belirler
grant select, insert, update, delete on
  public.shop_settings, public.shop_members, public.barbers, public.services,
  public.barber_services, public.working_hours, public.time_off, public.appointments,
  public.gallery_images, public.testimonials, public.subscriptions, public.payments
to authenticated;

-- platform_admins: sadece okuma (ekleme/çıkarma SQL ile yapılır)
grant select on public.platform_admins to authenticated;

-- appointments: anon'a HİÇBİR yetki yok. Müşteri işlemleri sunucuda secret key ile yapılır.
-- rate_limits: anon/authenticated'a hiçbir yetki yok; sadece sunucu (service_role) kullanır.

-- -----------------------------------------------------------------------------
-- 5. RLS politikaları
-- Not: Argümansız fonksiyonlar "(select ...)" içine alınır; böylece her satır için
-- değil, sorgu başına bir kez çalışır (performans).
-- -----------------------------------------------------------------------------

-- ---------- shops ----------
create policy "shops: public can read active/demo shops"
  on public.shops for select to anon
  using (status in ('active', 'demo'));

create policy "shops: members and admins can read"
  on public.shops for select to authenticated
  using (
    status in ('active', 'demo')
    or private.is_shop_member(id)
    or (select private.is_platform_admin())
  );

create policy "shops: admins can insert"
  on public.shops for insert to authenticated
  with check ((select private.is_platform_admin()));

create policy "shops: owners and admins can update"
  on public.shops for update to authenticated
  using (private.is_shop_owner(id) or (select private.is_platform_admin()))
  with check (private.is_shop_owner(id) or (select private.is_platform_admin()));

create policy "shops: admins can delete"
  on public.shops for delete to authenticated
  using ((select private.is_platform_admin()));

-- ---------- Müşteri sitesinde görünen tablolar ----------
-- Desen: ziyaretçi sadece açık dükkanların (pasif olmayan) kayıtlarını okur;
-- üyeler kendi dükkanının tüm kayıtlarını okur; sahip ve süper yönetici yazar.

-- shop_settings
create policy "shop_settings: public can read"
  on public.shop_settings for select to anon
  using (private.is_shop_public(shop_id));
create policy "shop_settings: members and admins can read"
  on public.shop_settings for select to authenticated
  using (private.is_shop_public(shop_id) or private.is_shop_member(shop_id) or (select private.is_platform_admin()));
create policy "shop_settings: owners and admins can insert"
  on public.shop_settings for insert to authenticated
  with check (private.is_shop_owner(shop_id) or (select private.is_platform_admin()));
create policy "shop_settings: owners and admins can update"
  on public.shop_settings for update to authenticated
  using (private.is_shop_owner(shop_id) or (select private.is_platform_admin()))
  with check (private.is_shop_owner(shop_id) or (select private.is_platform_admin()));
create policy "shop_settings: owners and admins can delete"
  on public.shop_settings for delete to authenticated
  using (private.is_shop_owner(shop_id) or (select private.is_platform_admin()));

-- barbers (ziyaretçi pasif berberleri görmez)
create policy "barbers: public can read active"
  on public.barbers for select to anon
  using (is_active and private.is_shop_public(shop_id));
create policy "barbers: members and admins can read"
  on public.barbers for select to authenticated
  using ((is_active and private.is_shop_public(shop_id)) or private.is_shop_member(shop_id) or (select private.is_platform_admin()));
create policy "barbers: owners and admins can insert"
  on public.barbers for insert to authenticated
  with check (private.is_shop_owner(shop_id) or (select private.is_platform_admin()));
create policy "barbers: owners and admins can update"
  on public.barbers for update to authenticated
  using (private.is_shop_owner(shop_id) or (select private.is_platform_admin()))
  with check (private.is_shop_owner(shop_id) or (select private.is_platform_admin()));
create policy "barbers: owners and admins can delete"
  on public.barbers for delete to authenticated
  using (private.is_shop_owner(shop_id) or (select private.is_platform_admin()));

-- services (ziyaretçi pasif hizmetleri görmez)
create policy "services: public can read active"
  on public.services for select to anon
  using (is_active and private.is_shop_public(shop_id));
create policy "services: members and admins can read"
  on public.services for select to authenticated
  using ((is_active and private.is_shop_public(shop_id)) or private.is_shop_member(shop_id) or (select private.is_platform_admin()));
create policy "services: owners and admins can insert"
  on public.services for insert to authenticated
  with check (private.is_shop_owner(shop_id) or (select private.is_platform_admin()));
create policy "services: owners and admins can update"
  on public.services for update to authenticated
  using (private.is_shop_owner(shop_id) or (select private.is_platform_admin()))
  with check (private.is_shop_owner(shop_id) or (select private.is_platform_admin()));
create policy "services: owners and admins can delete"
  on public.services for delete to authenticated
  using (private.is_shop_owner(shop_id) or (select private.is_platform_admin()));

-- barber_services
create policy "barber_services: public can read"
  on public.barber_services for select to anon
  using (private.is_shop_public(shop_id));
create policy "barber_services: members and admins can read"
  on public.barber_services for select to authenticated
  using (private.is_shop_public(shop_id) or private.is_shop_member(shop_id) or (select private.is_platform_admin()));
create policy "barber_services: owners and admins can insert"
  on public.barber_services for insert to authenticated
  with check (private.is_shop_owner(shop_id) or (select private.is_platform_admin()));
create policy "barber_services: owners and admins can update"
  on public.barber_services for update to authenticated
  using (private.is_shop_owner(shop_id) or (select private.is_platform_admin()))
  with check (private.is_shop_owner(shop_id) or (select private.is_platform_admin()));
create policy "barber_services: owners and admins can delete"
  on public.barber_services for delete to authenticated
  using (private.is_shop_owner(shop_id) or (select private.is_platform_admin()));

-- working_hours (berber kendi saatlerini okur; düzenleme sahipte)
create policy "working_hours: public can read"
  on public.working_hours for select to anon
  using (private.is_shop_public(shop_id));
create policy "working_hours: members and admins can read"
  on public.working_hours for select to authenticated
  using (private.is_shop_public(shop_id) or private.is_shop_member(shop_id) or (select private.is_platform_admin()));
create policy "working_hours: owners and admins can insert"
  on public.working_hours for insert to authenticated
  with check (private.is_shop_owner(shop_id) or (select private.is_platform_admin()));
create policy "working_hours: owners and admins can update"
  on public.working_hours for update to authenticated
  using (private.is_shop_owner(shop_id) or (select private.is_platform_admin()))
  with check (private.is_shop_owner(shop_id) or (select private.is_platform_admin()));
create policy "working_hours: owners and admins can delete"
  on public.working_hours for delete to authenticated
  using (private.is_shop_owner(shop_id) or (select private.is_platform_admin()));

-- gallery_images
create policy "gallery_images: public can read"
  on public.gallery_images for select to anon
  using (private.is_shop_public(shop_id));
create policy "gallery_images: members and admins can read"
  on public.gallery_images for select to authenticated
  using (private.is_shop_public(shop_id) or private.is_shop_member(shop_id) or (select private.is_platform_admin()));
create policy "gallery_images: owners and admins can insert"
  on public.gallery_images for insert to authenticated
  with check (private.is_shop_owner(shop_id) or (select private.is_platform_admin()));
create policy "gallery_images: owners and admins can update"
  on public.gallery_images for update to authenticated
  using (private.is_shop_owner(shop_id) or (select private.is_platform_admin()))
  with check (private.is_shop_owner(shop_id) or (select private.is_platform_admin()));
create policy "gallery_images: owners and admins can delete"
  on public.gallery_images for delete to authenticated
  using (private.is_shop_owner(shop_id) or (select private.is_platform_admin()));

-- testimonials (ziyaretçi sadece görünür yorumları okur)
create policy "testimonials: public can read visible"
  on public.testimonials for select to anon
  using (is_visible and private.is_shop_public(shop_id));
create policy "testimonials: members and admins can read"
  on public.testimonials for select to authenticated
  using ((is_visible and private.is_shop_public(shop_id)) or private.is_shop_member(shop_id) or (select private.is_platform_admin()));
create policy "testimonials: owners and admins can insert"
  on public.testimonials for insert to authenticated
  with check (private.is_shop_owner(shop_id) or (select private.is_platform_admin()));
create policy "testimonials: owners and admins can update"
  on public.testimonials for update to authenticated
  using (private.is_shop_owner(shop_id) or (select private.is_platform_admin()))
  with check (private.is_shop_owner(shop_id) or (select private.is_platform_admin()));
create policy "testimonials: owners and admins can delete"
  on public.testimonials for delete to authenticated
  using (private.is_shop_owner(shop_id) or (select private.is_platform_admin()));

-- ---------- time_off ----------
-- Sahip tüm izinleri yönetir; berber sadece kendi izinlerini (barber_id = kendisi).
-- Tüm dükkanı kapatan kayıtları (barber_id boş) sadece sahip ekleyebilir.
create policy "time_off: public can read"
  on public.time_off for select to anon
  using (private.is_shop_public(shop_id));
create policy "time_off: members and admins can read"
  on public.time_off for select to authenticated
  using (private.is_shop_public(shop_id) or private.is_shop_member(shop_id) or (select private.is_platform_admin()));
create policy "time_off: owners, own barber and admins can insert"
  on public.time_off for insert to authenticated
  with check (
    private.is_shop_owner(shop_id)
    or barber_id = private.current_barber_id(shop_id)
    or (select private.is_platform_admin())
  );
create policy "time_off: owners, own barber and admins can update"
  on public.time_off for update to authenticated
  using (
    private.is_shop_owner(shop_id)
    or barber_id = private.current_barber_id(shop_id)
    or (select private.is_platform_admin())
  )
  with check (
    private.is_shop_owner(shop_id)
    or barber_id = private.current_barber_id(shop_id)
    or (select private.is_platform_admin())
  );
create policy "time_off: owners, own barber and admins can delete"
  on public.time_off for delete to authenticated
  using (
    private.is_shop_owner(shop_id)
    or barber_id = private.current_barber_id(shop_id)
    or (select private.is_platform_admin())
  );

-- ---------- appointments ----------
-- Ziyaretçi (anon) için politika YOK ve yetki YOK: randevular asla okunamaz.
-- Sahip kendi dükkanının tüm randevularını yönetir; berber sadece kendi randevularını
-- görür, ekler (elle randevu) ve durumunu günceller (trigger diğer alanları korur).
create policy "appointments: owners, own barber and admins can read"
  on public.appointments for select to authenticated
  using (
    private.is_shop_owner(shop_id)
    or barber_id = private.current_barber_id(shop_id)
    or (select private.is_platform_admin())
  );
create policy "appointments: owners, own barber and admins can insert"
  on public.appointments for insert to authenticated
  with check (
    private.is_shop_owner(shop_id)
    or barber_id = private.current_barber_id(shop_id)
    or (select private.is_platform_admin())
  );
create policy "appointments: owners, own barber and admins can update"
  on public.appointments for update to authenticated
  using (
    private.is_shop_owner(shop_id)
    or barber_id = private.current_barber_id(shop_id)
    or (select private.is_platform_admin())
  )
  with check (
    private.is_shop_owner(shop_id)
    or barber_id = private.current_barber_id(shop_id)
    or (select private.is_platform_admin())
  );
create policy "appointments: owners and admins can delete"
  on public.appointments for delete to authenticated
  using (private.is_shop_owner(shop_id) or (select private.is_platform_admin()));

-- ---------- shop_members ----------
create policy "shop_members: own row, owners and admins can read"
  on public.shop_members for select to authenticated
  using (
    user_id = (select auth.uid())
    or private.is_shop_owner(shop_id)
    or (select private.is_platform_admin())
  );
create policy "shop_members: owners and admins can insert"
  on public.shop_members for insert to authenticated
  with check (private.is_shop_owner(shop_id) or (select private.is_platform_admin()));
create policy "shop_members: owners and admins can update"
  on public.shop_members for update to authenticated
  using (private.is_shop_owner(shop_id) or (select private.is_platform_admin()))
  with check (private.is_shop_owner(shop_id) or (select private.is_platform_admin()));
create policy "shop_members: owners and admins can delete"
  on public.shop_members for delete to authenticated
  using (private.is_shop_owner(shop_id) or (select private.is_platform_admin()));

-- ---------- platform_admins ----------
create policy "platform_admins: own row and admins can read"
  on public.platform_admins for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_platform_admin()));

-- ---------- subscriptions & payments ----------
-- Sahip kendi aboneliğini ve ödemelerini SADECE okur; yazma süper yöneticide.
create policy "subscriptions: owners and admins can read"
  on public.subscriptions for select to authenticated
  using (private.is_shop_owner(shop_id) or (select private.is_platform_admin()));
create policy "subscriptions: admins can insert"
  on public.subscriptions for insert to authenticated
  with check ((select private.is_platform_admin()));
create policy "subscriptions: admins can update"
  on public.subscriptions for update to authenticated
  using ((select private.is_platform_admin()))
  with check ((select private.is_platform_admin()));
create policy "subscriptions: admins can delete"
  on public.subscriptions for delete to authenticated
  using ((select private.is_platform_admin()));

create policy "payments: owners and admins can read"
  on public.payments for select to authenticated
  using (private.is_shop_owner(shop_id) or (select private.is_platform_admin()));
create policy "payments: admins can insert"
  on public.payments for insert to authenticated
  with check ((select private.is_platform_admin()));
create policy "payments: admins can update"
  on public.payments for update to authenticated
  using ((select private.is_platform_admin()))
  with check ((select private.is_platform_admin()));
create policy "payments: admins can delete"
  on public.payments for delete to authenticated
  using ((select private.is_platform_admin()));

-- ---------- rate_limits ----------
-- Politika yok: RLS açık + politika yok = anon/authenticated için tamamen kapalı.
-- Sadece sunucu (service_role, RLS'i atlar) kullanır.
