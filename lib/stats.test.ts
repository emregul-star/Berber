/**
 * İstatistik hesabı — elle kontrol edilebilir küçük test senaryosu (Aşama 8 kabul kriteri).
 *
 * Senaryo (İstanbul saatiyle, Ekim 2026):
 *   #  Gün            Saat   Berber  Hizmet       Fiyat   Durum
 *   1  5 Eki Pzt      10:00  Ali     Kesim        350     tamamlandı
 *   2  5 Eki Pzt      10:30  Ali     Sakal        200     tamamlandı
 *   3  5 Eki Pzt      14:00  Veli    Kesim        350     gelmedi
 *   4  6 Eki Salı     10:00  Veli    Kesim        349.90  tamamlandı
 *   5  6 Eki Salı     11:00  Ali     Kesim        350     müşteri iptal
 *   6  7 Eki Çarş     23:30  Veli    Sakal        200     onaylı (gelecek)
 *   7  8 Eki Perş     00:15  Ali     Kesim        350     bekliyor
 *
 * Beklenen (elle hesaplandı):
 *   Toplam 7 · Tamamlanan 3 · İptal 1 · Gelmeyen 1 · Gelecek (bekleyen+onaylı) 2
 *   Kazanç = 350 + 200 + 349.90 = 899.90 ₺ · Planlanan = 200 + 350 = 550 ₺
 *   Gelme oranı = 3 / (3 + 1) = 0.75
 *   Berber (iptaller hariç): Ali 3 randevu / 550 ₺, Veli 3 randevu / 349.90 ₺
 *   Hizmet: Kesim 4 (1,3,4,7), Sakal 2 (2,6)
 *   Günler: Pzt 3, Salı 1 (iptal sayılmaz), Çarş 1, Perş 1
 *   Saatler: 10:00'da 3 (1,2,4), 14'te 1, 23'te 1, 00'da 1
 */
import { describe, expect, it } from "vitest";
import { resolvePeriod } from "./periods";
import { computeStats, type StatAppointment } from "./stats";

// İstanbul = UTC+3: "10:00 İstanbul" = 07:00Z
const a = (n: number, startsAtUtc: string, barber: "Ali" | "Veli", service: "Kesim" | "Sakal", price: number, status: string): StatAppointment => ({
  status,
  starts_at: startsAtUtc,
  price_at_booking: price,
  barber_id: `b-${barber}`,
  barber_name: barber,
  service_id: `s-${service}`,
  service_name: service,
});

const scenario: StatAppointment[] = [
  a(1, "2026-10-05T07:00:00Z", "Ali", "Kesim", 350, "completed"),
  a(2, "2026-10-05T07:30:00Z", "Ali", "Sakal", 200, "completed"),
  a(3, "2026-10-05T11:00:00Z", "Veli", "Kesim", 350, "no_show"),
  a(4, "2026-10-06T07:00:00Z", "Veli", "Kesim", 349.9, "completed"),
  a(5, "2026-10-06T08:00:00Z", "Ali", "Kesim", 350, "cancelled_by_customer"),
  a(6, "2026-10-07T20:30:00Z", "Veli", "Sakal", 200, "confirmed"), // 23:30 İstanbul
  a(7, "2026-10-07T21:15:00Z", "Ali", "Kesim", 350, "pending"), // 8 Eki 00:15 İstanbul
];

describe("computeStats — elle kontrol edilebilir senaryo", () => {
  const s = computeStats(scenario);

  it("sayılar", () => {
    expect(s).toMatchObject({ total: 7, completed: 3, cancelled: 1, noShow: 1, upcoming: 2 });
  });

  it("kazanç kuruş hatasız (350 + 200 + 349,90)", () => {
    expect(s.earnings).toBe(899.9);
    expect(s.plannedEarnings).toBe(550);
    expect(s.showRate).toBe(0.75);
  });

  it("berbere göre (iptaller hariç)", () => {
    expect(s.byBarber).toEqual([
      { id: "b-Ali", name: "Ali", count: 3, earnings: 550 },
      { id: "b-Veli", name: "Veli", count: 3, earnings: 349.9 },
    ]);
  });

  it("hizmete göre", () => {
    expect(s.byService.map((x) => [x.name, x.count])).toEqual([
      ["Kesim", 4],
      ["Sakal", 2],
    ]);
  });

  it("günlere göre (İstanbul takvimi; gece yarısını geçen randevu ertesi güne sayılır)", () => {
    expect(s.byWeekday).toEqual([3, 1, 1, 1, 0, 0, 0]);
  });

  it("saatlere göre", () => {
    expect(s.byHour[10]).toBe(3);
    expect(s.byHour[14]).toBe(1);
    expect(s.byHour[23]).toBe(1);
    expect(s.byHour[0]).toBe(1);
    expect(s.byHour.reduce((x, y) => x + y, 0)).toBe(6); // iptal hariç
  });

  it("boş liste", () => {
    const empty = computeStats([]);
    expect(empty).toMatchObject({ total: 0, earnings: 0, showRate: null, byBarber: [], byService: [] });
  });
});

describe("resolvePeriod", () => {
  const today = "2026-10-07"; // Çarşamba

  it("bugün / bu hafta (Pazartesi başlar) / bu ay / geçen ay", () => {
    expect(resolvePeriod("bugun", today)).toEqual({ key: "bugun", from: "2026-10-07", toExclusive: "2026-10-08" });
    expect(resolvePeriod("hafta", today)).toEqual({ key: "hafta", from: "2026-10-05", toExclusive: "2026-10-12" });
    expect(resolvePeriod("ay", today)).toEqual({ key: "ay", from: "2026-10-01", toExclusive: "2026-11-01" });
    expect(resolvePeriod("gecen-ay", today)).toEqual({ key: "gecen-ay", from: "2026-09-01", toExclusive: "2026-10-01" });
  });

  it("yıl dönümleri", () => {
    expect(resolvePeriod("gecen-ay", "2026-01-15")).toEqual({ key: "gecen-ay", from: "2025-12-01", toExclusive: "2026-01-01" });
    expect(resolvePeriod("ay", "2026-12-31")).toEqual({ key: "ay", from: "2026-12-01", toExclusive: "2027-01-01" });
    expect(resolvePeriod("hafta", "2026-01-01").from).toBe("2025-12-29");
  });

  it("özel aralık: bitiş günü dahil; geçersizse bu ay", () => {
    expect(resolvePeriod("ozel", today, "2026-10-01", "2026-10-15")).toEqual({ key: "ozel", from: "2026-10-01", toExclusive: "2026-10-16" });
    expect(resolvePeriod("ozel", today, "2026-10-15", "2026-10-01").key).toBe("ay");
    expect(resolvePeriod("ozel", today, "bozuk", "2026-10-01").key).toBe("ay");
    expect(resolvePeriod("ozel", today, "2024-01-01", "2026-10-01").key).toBe("ay"); // 366 günden uzun
    expect(resolvePeriod(undefined, today).key).toBe("ay");
  });
});
