import { describe, expect, it } from "vitest";
import {
  addDaysToDate,
  computeAvailableSlots,
  localDateOf,
  weekdayOfDate,
  zonedDateTime,
  type AvailabilityInput,
} from "./availability";

// Testler için sabit "şimdi": 5 Ekim 2026 Pazartesi 08:00 İstanbul (05:00 UTC)
const NOW = new Date("2026-10-05T05:00:00Z");
const DAY = "2026-10-06"; // Salı (yarın)

/** Varsayılan girdi: 09:00-12:00, 30 dk hizmet, 30 dk aralık, kısıt yok */
function input(overrides: Partial<AvailabilityInput> = {}): AvailabilityInput {
  return {
    date: DAY,
    now: NOW,
    hours: { start: "09:00", end: "12:00" },
    serviceDurationMinutes: 30,
    slotIntervalMinutes: 30,
    minNoticeMinutes: 0,
    maxAdvanceDays: 14,
    bufferMinutes: 0,
    busy: [],
    ...overrides,
  };
}

/** Sonuçları İstanbul saatiyle "HH:mm" listesine çevir (okunabilir karşılaştırma için) */
function times(slots: Date[], tz = "Europe/Istanbul"): string[] {
  return slots.map((d) =>
    new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit" }).format(d),
  );
}

const at = (time: string, date = DAY) => zonedDateTime(date, time);

describe("tarih yardımcıları", () => {
  it("haftanın günü (0 = Pazartesi)", () => {
    expect(weekdayOfDate("2026-10-05")).toBe(0);
    expect(weekdayOfDate("2026-10-11")).toBe(6);
  });

  it("İstanbul yerel tarihi ve saat çevirisi", () => {
    expect(at("09:00").toISOString()).toBe("2026-10-06T06:00:00.000Z"); // UTC+3
    expect(localDateOf(new Date("2026-10-05T21:30:00Z"))).toBe("2026-10-06"); // gece yarısını geçti
    expect(addDaysToDate("2026-12-31", 1)).toBe("2027-01-01");
  });
});

describe("computeAvailableSlots", () => {
  it("temel durum: çalışma saati boyunca adım adım saatler", () => {
    expect(times(computeAvailableSlots(input()))).toEqual(["09:00", "09:30", "10:00", "10:30", "11:00", "11:30"]);
  });

  it("kapalı günde boş saat çıkmıyor", () => {
    expect(computeAvailableSlots(input({ hours: null }))).toEqual([]);
  });

  it("molaya denk gelen saatler çıkmıyor", () => {
    const slots = computeAvailableSlots(
      input({ hours: { start: "09:00", end: "12:00", breakStart: "10:00", breakEnd: "11:00" } }),
    );
    expect(times(slots)).toEqual(["09:00", "09:30", "11:00", "11:30"]);
  });

  it("molaya taşacak uzun hizmet o saatte başlayamaz", () => {
    const slots = computeAvailableSlots(
      input({
        serviceDurationMinutes: 45,
        slotIntervalMinutes: 15,
        hours: { start: "09:00", end: "12:00", breakStart: "10:00", breakEnd: "11:00" },
      }),
    );
    // 09:15 + 45 dk = 10:00 sığar; 09:30 + 45 dk = 10:15 molaya taşar
    expect(times(slots)).toEqual(["09:00", "09:15", "11:00", "11:15"]);
  });

  it("hizmet süresi kapanış saatini aşacaksa o saat çıkmıyor", () => {
    const slots = computeAvailableSlots(input({ serviceDurationMinutes: 90 }));
    expect(times(slots)).toEqual(["09:00", "09:30", "10:00", "10:30"]); // 10:30 + 90 = 12:00 tam sığar
  });

  it("berber izindeyken saat çıkmıyor (kısmi izin)", () => {
    const slots = computeAvailableSlots(input({ busy: [{ start: at("09:30"), end: at("11:00") }] }));
    expect(times(slots)).toEqual(["09:00", "11:00", "11:30"]);
  });

  it("tüm gün izin / dükkan kapalıyken hiç saat çıkmıyor", () => {
    const slots = computeAvailableSlots(
      input({ busy: [{ start: zonedDateTime(DAY, "00:00"), end: zonedDateTime("2026-10-07", "00:00") }] }),
    );
    expect(slots).toEqual([]);
  });

  it("mevcut randevunun saati dolu", () => {
    const slots = computeAvailableSlots(input({ busy: [{ start: at("10:00"), end: at("10:30") }] }));
    expect(times(slots)).toEqual(["09:00", "09:30", "10:30", "11:00", "11:30"]);
  });

  it("buffer: yeni randevunun temizlik payı sonraki randevuya taşamaz", () => {
    // 10:00'da randevu var. 10 dk buffer ile 09:30 başlangıç 10:10'a kadar meşgul eder -> olmaz
    const slots = computeAvailableSlots(
      input({ bufferMinutes: 10, busy: [{ start: at("10:00"), end: at("10:40") }] }),
    );
    expect(times(slots)).toEqual(["09:00", "11:00", "11:30"]);
  });

  it("buffer kapanış saatinde sığmak zorunda değil", () => {
    const slots = computeAvailableSlots(input({ bufferMinutes: 15 }));
    expect(times(slots)).toContain("11:30"); // 11:30-12:00 hizmet, buffer kapanıştan sonra
  });

  it("şimdiki zamandan min_notice_minutes öncesi çıkmıyor", () => {
    // Bugün 08:00, 90 dk minimum süre -> en erken 09:30
    const slots = computeAvailableSlots(input({ date: "2026-10-05", minNoticeMinutes: 90 }));
    expect(times(slots)).toEqual(["09:30", "10:00", "10:30", "11:00", "11:30"]);
  });

  it("geçmiş gün ve max_advance_days sonrası seçilemiyor", () => {
    expect(computeAvailableSlots(input({ date: "2026-10-04" }))).toEqual([]);
    expect(computeAvailableSlots(input({ date: "2026-10-19", maxAdvanceDays: 14 }))).not.toEqual([]); // tam 14. gün
    expect(computeAvailableSlots(input({ date: "2026-10-20", maxAdvanceDays: 14 }))).toEqual([]);
  });

  it("gece yarısı sınırı: UTC'de önceki gün olan İstanbul sabahı doğru hesaplanır", () => {
    // İstanbul 00:00-02:00 açık bir gün (UTC'de önceki günün 21:00-23:00'ı)
    const slots = computeAvailableSlots(input({ hours: { start: "00:00", end: "01:00" } }));
    expect(slots.map((d) => d.toISOString())).toEqual([
      "2026-10-05T21:00:00.000Z",
      "2026-10-05T21:30:00.000Z",
    ]);
  });

  it("yaz/kış saati geçişi olan bir saat diliminde saatler kaymaz", () => {
    // Türkiye yaz saati uygulamıyor; kodun saat dilimi kütüphanesiyle doğru çalıştığını
    // Berlin'in 25 Ekim 2026 kış saatine geçişiyle deniyoruz.
    const tz = "Europe/Berlin";
    const before = computeAvailableSlots(
      input({ date: "2026-10-24", now: new Date("2026-10-20T00:00:00Z"), timeZone: tz }),
    );
    const after = computeAvailableSlots(
      input({ date: "2026-10-26", now: new Date("2026-10-20T00:00:00Z"), timeZone: tz }),
    );
    expect(times(before, tz)[0]).toBe("09:00");
    expect(times(after, tz)[0]).toBe("09:00");
    expect(before[0].toISOString()).toBe("2026-10-24T07:00:00.000Z"); // yaz saati UTC+2
    expect(after[0].toISOString()).toBe("2026-10-26T08:00:00.000Z"); // kış saati UTC+1
  });

  it("15 dakikalık aralıkla saatler", () => {
    const slots = computeAvailableSlots(
      input({ hours: { start: "09:00", end: "10:00" }, slotIntervalMinutes: 15, serviceDurationMinutes: 30 }),
    );
    expect(times(slots)).toEqual(["09:00", "09:15", "09:30"]);
  });
});
