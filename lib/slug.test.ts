import { describe, expect, it } from "vitest";
import { SLUG_PATTERN } from "./constants";
import { slugify } from "./slug";

describe("slugify", () => {
  it.each([
    ["Kral Berber Şişli", "kral-berber-sisli"],
    ["Ahmet'in Yeri", "ahmet-in-yeri"],
    ["İSTANBUL ÇIRAK & USTA", "istanbul-cirak-ve-usta"],
    ["  Öz Güzel   Berber!! ", "oz-guzel-berber"],
    ["Barber 34", "barber-34"],
  ])("%s -> %s", (input, expected) => {
    expect(slugify(input)).toBe(expected);
    expect(SLUG_PATTERN.test(expected)).toBe(true);
  });

  it("çok uzun adlar 63 karakterde kesilir ve tireyle bitmez", () => {
    const s = slugify("a ".repeat(60));
    expect(s.length).toBeLessThanOrEqual(63);
    expect(s.endsWith("-")).toBe(false);
  });
});
