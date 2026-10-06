import { describe, expect, it } from "vitest";
import { addMonthsClamped, advancePaidUntil, daysOverdue, nextPeriod, subscriptionStatusFor } from "./billing";

describe("addMonthsClamped", () => {
  it("ay sonu taşmaz, yıl döner", () => {
    expect(addMonthsClamped("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMonthsClamped("2028-01-31", 1)).toBe("2028-02-29"); // artık yıl
    expect(addMonthsClamped("2026-12-15", 1)).toBe("2027-01-15");
    expect(addMonthsClamped("2026-10-07", 12)).toBe("2027-10-07");
  });
});

describe("nextPeriod — ödeme eklenince kapsanacak dönem", () => {
  it("hiç ödeme yoksa bugünden başlar, bir ay sürer", () => {
    expect(nextPeriod(null, "2026-10-07")).toEqual({ start: "2026-10-07", end: "2026-11-06" });
  });
  it("ödeme varsa kesintisiz devam eder (paid_until'in ertesi günü)", () => {
    expect(nextPeriod("2026-10-31", "2026-10-07")).toEqual({ start: "2026-11-01", end: "2026-11-30" });
  });
  it("az geciken ödeme yine kaldığı yerden devam eder", () => {
    expect(nextPeriod("2026-09-30", "2026-10-07")).toEqual({ start: "2026-10-01", end: "2026-10-31" });
  });
  it("çok eski (31 günden fazla) ödemede bugünden başlar", () => {
    expect(nextPeriod("2026-06-30", "2026-10-07").start).toBe("2026-10-07");
  });
  it("birden fazla ay", () => {
    expect(nextPeriod("2026-10-31", "2026-10-07", 3)).toEqual({ start: "2026-11-01", end: "2027-01-31" });
  });
});

describe("advancePaidUntil", () => {
  it("paid_until ilerler, asla geri gitmez", () => {
    expect(advancePaidUntil(null, "2026-11-06")).toBe("2026-11-06");
    expect(advancePaidUntil("2026-10-31", "2026-11-30")).toBe("2026-11-30");
    expect(advancePaidUntil("2026-12-31", "2026-11-30")).toBe("2026-12-31");
    expect(advancePaidUntil("2026-10-31", null)).toBe("2026-10-31"); // kurulum ücreti dönemi etkilemez
  });
});

describe("durum ve gecikme", () => {
  it("süresi geçince gecikti", () => {
    expect(subscriptionStatusFor("2026-10-06", "2026-10-07")).toBe("overdue");
    expect(subscriptionStatusFor("2026-10-07", "2026-10-07")).toBe("active");
    expect(subscriptionStatusFor(null, "2026-10-07")).toBe("active");
  });
  it("gecikme gün sayısı", () => {
    expect(daysOverdue("2026-09-30", "2026-10-07")).toBe(7);
    expect(daysOverdue("2026-10-07", "2026-10-07")).toBe(0);
    expect(daysOverdue(null, "2026-10-07")).toBe(0);
  });
});
