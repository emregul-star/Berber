import { PLATFORM_NAME } from "@/lib/constants";

/** Alt alan adına ait bir dükkan yoksa gösterilir (ör. olmayan-dukkan.PLATFORM_DOMAIN). */
export default function ShopNotFound() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-3 px-4 py-16 text-center">
      <p className="text-5xl" aria-hidden>
        💈
      </p>
      <h1 className="text-xl font-semibold">Dükkan bulunamadı</h1>
      <p className="text-neutral-600">
        Bu adreste kayıtlı bir berber dükkanı yok. Adresi doğru yazdığınızdan emin olun.
      </p>
      <p className="text-xs text-neutral-400">{PLATFORM_NAME}</p>
    </main>
  );
}
