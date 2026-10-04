-- =============================================================================
-- BerberPlatform — Dosya depolama: shop-assets bucket'ı (Bölüm 16, madde 3)
--
-- Logo, kapak, berber fotoğrafı ve galeri görselleri burada durur.
--  * Okuma herkese açık (public bucket: görseller herkese açık URL ile gösterilir).
--  * Yazma sadece ilgili dükkanın sahibine ve süper yöneticiye açık.
--  * Dosya yolu kuralı: {shop_id}/{klasör}/{dosya}  ör. 3f2c.../gallery/abc.webp
--    İlk klasör adı dükkanın id'sidir; yetki kontrolü buna göre yapılır.
--  * En fazla 5 MB, sadece görsel türleri.
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'shop-assets',
  'shop-assets',
  true,
  5 * 1024 * 1024,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Yolun ilk klasörü geçerli bir uuid ise ve çağıran kullanıcı o dükkanın sahibiyse true.
-- Geçersiz bir klasör adı uuid'ye çevrilirken hata vermesin diye önce biçim kontrol edilir.
create or replace function private.can_manage_shop_asset(object_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  folder text := (storage.foldername(object_name))[1];
begin
  if (select private.is_platform_admin()) then
    return true;
  end if;
  if folder is null
     or folder !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return false;
  end if;
  return private.is_shop_owner(folder::uuid);
end;
$$;

revoke execute on function private.can_manage_shop_asset(text) from public;
grant execute on function private.can_manage_shop_asset(text) to authenticated, service_role;

-- Not: Dosya değiştirme (upsert) için INSERT + SELECT + UPDATE politikalarının üçü de gerekir.
create policy "shop-assets: owners and admins can list"
  on storage.objects for select to authenticated
  using (bucket_id = 'shop-assets' and private.can_manage_shop_asset(name));

create policy "shop-assets: owners and admins can upload"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'shop-assets' and private.can_manage_shop_asset(name));

create policy "shop-assets: owners and admins can update"
  on storage.objects for update to authenticated
  using (bucket_id = 'shop-assets' and private.can_manage_shop_asset(name))
  with check (bucket_id = 'shop-assets' and private.can_manage_shop_asset(name));

create policy "shop-assets: owners and admins can delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'shop-assets' and private.can_manage_shop_asset(name));
