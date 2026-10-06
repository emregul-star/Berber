-- =============================================================================
-- BerberPlatform — Demo dükkan seed verisi (Bölüm 12)
--
-- Demo verisinin kendisi public.reset_demo_shop() fonksiyonundadır
-- (supabase/migrations/20261006213542_platform_admin_features.sql). Bu dosya,
-- npm run demo:reset ve yönetici panelindeki "Demo'yu sıfırla" butonu aynı fonksiyonu kullanır.
--
-- Not: Demo panel hesaplarını (sahip/berber) yeniden bağlamak için npm run demo:reset kullanın;
-- sadece bu dosyayı çalıştırmak üyelikleri geri getirmez.
-- =============================================================================

select public.reset_demo_shop();
