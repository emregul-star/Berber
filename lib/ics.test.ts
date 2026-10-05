import { describe, expect, it } from "vitest";
import { buildIcs } from "./ics";

describe("buildIcs", () => {
  const ics = buildIcs(
    {
      uid: "abc@berberplatform",
      start: new Date("2026-10-06T07:00:00Z"),
      end: new Date("2026-10-06T07:30:00Z"),
      summary: "Saç Kesimi — Demo Berber",
      description: "Berber: Ahmet\nLink: https://demo.example.com/randevu/x",
      location: "Bağdat Caddesi No: 1, Kadıköy; İstanbul",
    },
    new Date("2026-10-05T10:00:00Z"),
  );

  it("geçerli takvim yapısı ve UTC zamanlar", () => {
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics.trimEnd().endsWith("END:VCALENDAR")).toBe(true);
    expect(ics).toContain("DTSTART:20261006T070000Z");
    expect(ics).toContain("DTEND:20261006T073000Z");
    expect(ics).toContain("UID:abc@berberplatform");
  });

  it("özel karakterleri kaçırır, satır sonları CRLF", () => {
    expect(ics).toContain("Kadıköy\\; İstanbul");
    expect(ics).toContain("No: 1\\, Kadıköy");
    expect(ics).toContain("Berber: Ahmet\\nLink:");
    expect(ics.split("\r\n").every((line) => !line.includes("\n"))).toBe(true);
  });

  it("75 bayttan uzun satırlar katlanır", () => {
    const lines = ics.split("\r\n");
    for (const line of lines) {
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    }
  });
});
