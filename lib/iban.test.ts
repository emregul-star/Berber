import { describe, expect, it } from "vitest";
import { formatIban, isValidTrIban, normalizeIban } from "./iban";

// Geçerli örnek IBAN (kontrol hanesi doğru; gerçek bir hesaba ait değildir)
const VALID = "TR330006100519786457841326";

describe("IBAN", () => {
  it("geçerli TR IBAN kabul edilir (boşluklu/küçük harfli yazım da)", () => {
    expect(isValidTrIban(VALID)).toBe(true);
    expect(isValidTrIban("tr33 0006 1005 1978 6457 8413 26")).toBe(true);
  });

  it("tek hanesi yanlış IBAN reddedilir (kontrol hanesi)", () => {
    expect(isValidTrIban("TR330006100519786457841327")).toBe(false);
    expect(isValidTrIban("TR330006100519786457841362")).toBe(false); // iki hane yer değiştirmiş
  });

  it("yanlış uzunluk / ülke reddedilir", () => {
    expect(isValidTrIban("TR3300061005197864578413")).toBe(false);
    expect(isValidTrIban("DE89370400440532013000")).toBe(false);
    expect(isValidTrIban("")).toBe(false);
  });

  it("biçimlendirme", () => {
    expect(normalizeIban(" tr33 0006 ")).toBe("TR330006");
    expect(formatIban(VALID)).toBe("TR33 0006 1005 1978 6457 8413 26");
  });
});
