/** Hiçbir sayfayla eşleşmeyen adresler için genel 404 sayfası. */
export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-3 px-4 py-16 text-center">
      <p className="text-5xl font-bold text-neutral-300">404</p>
      <h1 className="text-xl font-semibold">Sayfa bulunamadı</h1>
      <p className="text-neutral-600">Aradığınız sayfa taşınmış veya hiç var olmamış olabilir.</p>
    </main>
  );
}
