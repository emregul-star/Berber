-- =============================================================================
-- Güvenlik sıkılaştırması (güvenlik denetimi, 2026-10-07)
--
-- 1) Herkese açık demo: "…olarak dene" ile giren bir ziyaretçi, uygulamayı atlayıp Supabase
--    API'sine doğrudan istek atarak demo dükkanın üyeliklerini silebiliyor veya berber kaydının
--    giriş hesabını değiştirebiliyordu (demo diğer ziyaretçilere kapanıyordu). Uygulamadaki kilit
--    (DEMO_ACCOUNT_LOCKED_MESSAGE) artık veritabanında da uygulanır.
-- 2) Dosya yükleme: uygulama her zaman WebP yükler; çalıştırılabilir içerik barındırabilen
--    SVG'ye (ve GIF'e) izin verilmez.
-- 3) İzinler (time_off): bir dükkanın üyeleri başka dükkanların izin kayıtlarını (sebep alanı dahil)
--    okuyabiliyordu. Artık sadece kendi dükkanı ve platform yöneticisi okur. Randevu motoru bu
--    tabloyu sunucuda yönetici bağlantısıyla okuduğu için müşteri tarafı etkilenmez.
-- =============================================================================

-- ---------------------------------------------------------------- 1) Demo hesap kilidi

create or replace function private.is_demo_shop(p_shop_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.shops s where s.id = p_shop_id and s.is_demo);
$$;

revoke execute on function private.is_demo_shop(uuid) from public, anon;
grant execute on function private.is_demo_shop(uuid) to authenticated;

-- Demo dükkanda giriş hesabı bağlantılarını (üyelikler, berber kaydının user_id'si) sadece
-- platform yöneticisi ve sunucu (reset_demo_shop, demo:reset) değiştirebilir.
create or replace function private.guard_demo_accounts()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user <> 'authenticated' or (select private.is_platform_admin()) then
    return coalesce(new, old);
  end if;

  if tg_table_name = 'shop_members' then
    if (tg_op <> 'INSERT' and private.is_demo_shop(old.shop_id))
       or (tg_op <> 'DELETE' and private.is_demo_shop(new.shop_id)) then
      raise exception 'Demo dükkanda giriş hesapları değiştirilemez.' using errcode = '42501';
    end if;
  elsif tg_table_name = 'barbers' then
    if new.user_id is distinct from old.user_id and private.is_demo_shop(old.shop_id) then
      raise exception 'Demo dükkanda giriş hesapları değiştirilemez.' using errcode = '42501';
    end if;
  end if;

  return coalesce(new, old);
end;
$$;

create trigger shop_members_guard_demo_accounts
  before insert or update or delete on public.shop_members
  for each row execute function private.guard_demo_accounts();

create trigger barbers_guard_demo_accounts
  before update of user_id on public.barbers
  for each row execute function private.guard_demo_accounts();

-- ---------------------------------------------------------------- 2) Yüklenebilir dosya türleri

update storage.buckets
set allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id = 'shop-assets';

-- ---------------------------------------------------------------- 3) time_off okuma kuralı

-- anon rolünün bu tabloda yetkisi (GRANT) yok; kural hiç kullanılmıyordu.
drop policy "time_off: public can read" on public.time_off;

drop policy "time_off: members and admins can read" on public.time_off;
create policy "time_off: members and admins can read"
  on public.time_off for select to authenticated
  using (private.is_shop_member(shop_id) or (select private.is_platform_admin()));
