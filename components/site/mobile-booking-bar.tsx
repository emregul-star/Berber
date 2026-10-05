import { BookingButton } from "./ui";

/**
 * Mobilde ekranın altında sabit duran "Randevu Al" butonu.
 * Masaüstünde gizlidir (orada üst menüde buton var).
 * pb-[env(safe-area-inset-bottom)]: iPhone'larda alttaki çizginin altında kalmasın.
 */
export function MobileBookingBar() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-bg/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur md:hidden">
      <BookingButton size="lg" className="w-full" />
    </div>
  );
}
