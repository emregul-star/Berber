import Link from "next/link";

/** Geçersiz veya başka dükkana ait yönetim linki */
export default function AppointmentNotFound() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-4 py-16 text-center">
      <h1 className="font-heading text-3xl font-semibold">Randevu bulunamadı</h1>
      <p className="mt-3 text-muted">
        Bu link geçersiz veya süresi dolmuş olabilir. Linki e-postanızdan veya onay ekranından tam olarak
        kopyaladığınızdan emin olun.
      </p>
      <Link href="/" className="mt-8 rounded-full bg-primary px-6 py-3 font-semibold text-on-primary">
        Ana sayfaya dön
      </Link>
    </main>
  );
}
