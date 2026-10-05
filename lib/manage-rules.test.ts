import { describe, expect, it } from "vitest";
import { getModifyBlockReason, modifyDeadline } from "./manage-rules";

const startsAt = new Date("2026-10-10T10:00:00Z");
const rule = (status: string, now: string, cancelDeadlineMinutes = 120) =>
  getModifyBlockReason({ status, startsAt, now: new Date(now), cancelDeadlineMinutes });

describe("getModifyBlockReason", () => {
  it("süre dolmadan aktif randevu değiştirilebilir", () => {
    expect(rule("confirmed", "2026-10-10T07:59:00Z")).toBeNull();
    expect(rule("pending", "2026-10-09T10:00:00Z")).toBeNull();
  });

  it("tam son dakikada hâlâ değiştirilebilir, sonrasında değiştirilemez", () => {
    expect(rule("confirmed", "2026-10-10T08:00:00Z")).toBeNull(); // tam 120 dk önce
    expect(rule("confirmed", "2026-10-10T08:00:01Z")).toBe("deadline");
  });

  it("randevu saati geçtiyse değiştirilemez", () => {
    expect(rule("confirmed", "2026-10-10T10:00:00Z")).toBe("past");
    expect(rule("confirmed", "2026-10-10T11:00:00Z", 0)).toBe("past");
  });

  it("iptal edilmiş / tamamlanmış randevu değiştirilemez", () => {
    for (const status of ["cancelled_by_customer", "cancelled_by_shop", "completed", "no_show"]) {
      expect(rule(status, "2026-10-01T00:00:00Z")).toBe("not_active");
    }
  });

  it("süre sınırı 0 ise randevu saatine kadar değiştirilebilir", () => {
    expect(rule("confirmed", "2026-10-10T09:59:00Z", 0)).toBeNull();
  });

  it("son değişiklik anı", () => {
    expect(modifyDeadline(startsAt, 90).toISOString()).toBe("2026-10-10T08:30:00.000Z");
  });
});
