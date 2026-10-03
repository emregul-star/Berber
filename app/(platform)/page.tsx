import { PLATFORM_NAME } from "@/lib/constants";

/**
 * Platformun tanıtım sayfası (PLATFORM_DOMAIN).
 * Aşama 1 yer tutucusu; berberlere yönelik asıl içerik Aşama 10'da hazırlanacak.
 */
export default function PlatformHomePage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-4 px-4 py-16">
      <h1 className="text-3xl font-bold">{PLATFORM_NAME}</h1>
      <p className="text-lg text-neutral-600">
        Berberler için uygulama gerektirmeyen online randevu sitesi.
      </p>
      <p className="text-sm text-neutral-500">Tanıtım sayfası yapım aşamasında.</p>
    </main>
  );
}
