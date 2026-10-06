-- =============================================================================
-- Demo dükkana "bugünün" randevuları (Aşama 10)
--
-- Herkese açık demo panelinde ziyaretçinin ilk gördüğü ekran "Bugün" sayfasıdır; önceki
-- sürümde sadece geçmiş ve gelecek günlere randevu konuyordu. Mevcut sıfırlama fonksiyonu
-- olduğu gibi private.reset_demo_shop_base adıyla saklanır; public.reset_demo_shop onu
-- çağırıp bugüne randevu ekler. Saati geçmiş olanlar "tamamlandı", gelecektekiler "onaylı".
-- =============================================================================

alter function public.reset_demo_shop() rename to reset_demo_shop_base;
alter function public.reset_demo_shop_base() set schema private;
revoke execute on function private.reset_demo_shop_base() from public, anon, authenticated;

create or replace function public.reset_demo_shop()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_shop uuid := private.reset_demo_shop_base();
  v_today date := (now() at time zone 'Europe/Istanbul')::date;
begin
  -- Pazar günü dükkan kapalı: bugüne randevu konmaz
  if extract(isodow from v_today) = 7 then
    return v_shop;
  end if;

  insert into public.appointments (
    shop_id, barber_id, service_id, starts_at, ends_at, blocked_until, status,
    customer_name, customer_phone, customer_email, price_at_booking,
    manage_token_hash, kvkk_consent_at, source
  )
  select
    v_shop, b.id, s.id,
    st.starts_at,
    st.starts_at + make_interval(mins => s.duration_minutes),
    st.starts_at + make_interval(mins => s.duration_minutes),
    case
      when st.starts_at + make_interval(mins => s.duration_minutes) <= now() then a.past_status
      else a.future_status
    end,
    a.customer_name, a.customer_phone, null, s.price,
    encode(sha256(convert_to(gen_random_uuid()::text, 'UTF8')), 'hex'),
    case when a.source = 'web' then st.starts_at - interval '1 day' end,
    a.source
  from (values
    -- Mola 13:00-14:00; Can 12:00'den sonra çalışıyor
    ('Ahmet Yılmaz', 'Saç Kesimi',   '09:30'::time, 'completed', 'confirmed', 'Hüseyin Aslan', '905341110001', 'web'),
    ('Mehmet Demir', 'Saç + Sakal',  '10:00',       'completed', 'confirmed', 'Kadir Uysal',   '905341110002', 'panel'),
    ('Ahmet Yılmaz', 'Saç + Sakal',  '11:00',       'completed', 'confirmed', 'Ahmet Tan',     '905341110003', 'web'),
    ('Mehmet Demir', 'Saç Kesimi',   '12:00',       'no_show',   'confirmed', 'Engin Sevim',   '905341110004', 'web'),
    ('Can Kaya',     'Sakal Tıraşı', '12:15',       'completed', 'confirmed', 'Serdar Kaplan', '905341110005', 'web'),
    ('Mehmet Demir', 'Cilt Bakımı',  '14:30',       'completed', 'confirmed', 'Ufuk Ercan',    '905341110006', 'web'),
    ('Ahmet Yılmaz', 'Saç Kesimi',   '15:00',       'completed', 'confirmed', 'Nihat Bayram',  '905341110007', 'panel'),
    ('Can Kaya',     'Saç Kesimi',   '16:00',       'completed', 'confirmed', 'Doruk Ay',      '905341110008', 'web'),
    ('Ahmet Yılmaz', 'Sakal Tıraşı', '17:30',       'completed', 'confirmed', 'Halil Öztürk',  '905341110009', 'web'),
    ('Mehmet Demir', 'Saç Kesimi',   '18:00',       'completed', 'confirmed', 'Koray Şimşek',  '905341110010', 'web'),
    ('Can Kaya',     'Çocuk Tıraşı', '18:30',       'completed', 'pending',   'Aras Güler',    '905341110011', 'web')
  ) as a(barber_name, service_name, at_time, past_status, future_status, customer_name, customer_phone, source)
  join public.barbers b on b.shop_id = v_shop and b.name = a.barber_name
  join public.services s on s.shop_id = v_shop and s.name = a.service_name
  cross join lateral (
    select ((v_today + a.at_time) at time zone 'Europe/Istanbul') as starts_at
  ) st;

  return v_shop;
end;
$$;

revoke execute on function public.reset_demo_shop() from public, anon, authenticated;
grant execute on function public.reset_demo_shop() to service_role;
