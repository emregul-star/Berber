import { describe, expect, it } from "vitest";
import { computeAppointmentTimes } from "./appointments";
import { formatTrPhone, normalizeTrMobile } from "./phone";
import { generateManageToken, hashManageToken, isWellFormedToken } from "./tokens";

describe("normalizeTrMobile", () => {
  it.each([
    ["0532 123 45 67", "905321234567"],
    ["532 123 4567", "905321234567"],
    ["+90 (532) 123-45-67", "905321234567"],
    ["905321234567", "905321234567"],
    ["0090 532 123 45 67", "905321234567"],
  ])("%s -> %s", (raw, expected) => {
    expect(normalizeTrMobile(raw)).toBe(expected);
  });

  it.each(["0212 555 00 00", "12345", "0532 123 45", "abc", "+1 555 123 4567", ""])(
    "%s geçersiz",
    (raw) => {
      expect(normalizeTrMobile(raw)).toBeNull();
    },
  );

  it("ekranda okunur biçim", () => {
    expect(formatTrPhone("905321234567")).toBe("0532 123 45 67");
  });
});

describe("yönetim token'ı", () => {
  it("her seferinde farklı, URL'de kullanılabilir, 43 karakter", () => {
    const a = generateManageToken();
    const b = generateManageToken();
    expect(a).not.toBe(b);
    expect(isWellFormedToken(a)).toBe(true);
    expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it("hash sabit ve 64 hex karakter; token'ı içermez", () => {
    const token = generateManageToken();
    const hash = hashManageToken(token);
    expect(hash).toBe(hashManageToken(token));
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).not.toContain(token);
  });

  it("bozuk token'lar elenir", () => {
    expect(isWellFormedToken("../../etc")).toBe(false);
    expect(isWellFormedToken("kisa")).toBe(false);
  });
});

describe("computeAppointmentTimes (buffer tek yerde)", () => {
  it("ends_at = başlangıç + süre, blocked_until = ends_at + buffer", () => {
    const start = new Date("2026-10-06T07:00:00Z");
    const t = computeAppointmentTimes(start, 45, 10);
    expect(t.endsAt.toISOString()).toBe("2026-10-06T07:45:00.000Z");
    expect(t.blockedUntil.toISOString()).toBe("2026-10-06T07:55:00.000Z");
  });
});
