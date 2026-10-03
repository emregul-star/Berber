/**
 * Dükkanın kendi alan adından (ör. kralberber.com) slug'ını bulur.
 * Proxy'den çağrıldığı için "server-only" içermez (proxy, React sunucu ortamında çalışmaz).
 * İlk sürümde bu özelliğin arayüzü yok, sadece altyapısı hazır.
 */
export async function findSlugByCustomDomain(hostname: string): Promise<string | null> {
  // TODO(Aşama 2): shops.custom_domain alanından sorgulanacak.
  void hostname;
  return null;
}
