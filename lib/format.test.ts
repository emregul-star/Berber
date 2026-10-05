import { describe, expect, it } from "vitest";
import { formatDuration, formatPrice, formatTimeOfDay, initials } from "./format";
import { safeExternalUrl, safeGoogleMapsEmbedUrl, telHref } from "./links";
import { istanbulWeekday } from "./time";
import { whatsappLink } from "./whatsapp";

// Intl bazı ortamlarda boşluk olarak "dar boşluk" (U+00A0/U+202F) kullanır; karşılaştırmada normalleştir.
const plain = (s: string) => s.replace(/[  ]/g, " ");

describe("format", () => {
  it("fiyatı ₺ ile, gereksiz kuruş olmadan yazar", () => {
    expect(plain(formatPrice(350))).toBe("₺350");
    expect(plain(formatPrice("1500.00"))).toBe("₺1.500");
    expect(plain(formatPrice(349.5))).toBe("₺349,5");
  });

  it("süreyi Türkçe yazar", () => {
    expect(formatDuration(30)).toBe("30 dk");
    expect(formatDuration(60)).toBe("1 sa");
    expect(formatDuration(90)).toBe("1 sa 30 dk");
  });

  it("saat ve baş harfler", () => {
    expect(formatTimeOfDay("09:00:00")).toBe("09:00");
    expect(formatTimeOfDay(null)).toBe("");
    expect(initials("ahmet yılmaz")).toBe("AY");
    expect(initials("ismail")).toBe("İ"); // Türkçe büyük İ
  });
});

describe("links", () => {
  it("telefon linki", () => {
    expect(telHref("0216 555 00 00")).toBe("tel:02165550000");
  });

  it("sadece http(s) linklerine izin verir", () => {
    expect(safeExternalUrl("https://instagram.com/x")).toBe("https://instagram.com/x");
    expect(safeExternalUrl("javascript:alert(1)")).toBeNull();
    expect(safeExternalUrl("bozuk link")).toBeNull();
    expect(safeExternalUrl(null)).toBeNull();
  });

  it("sadece Google Haritalar gömme linklerine izin verir", () => {
    expect(safeGoogleMapsEmbedUrl("https://www.google.com/maps/embed?pb=!1m18")).not.toBeNull();
    expect(safeGoogleMapsEmbedUrl("https://www.google.com/maps?q=Kadikoy&output=embed")).not.toBeNull();
    expect(safeGoogleMapsEmbedUrl("https://www.google.com/maps?q=Kadikoy")).toBeNull(); // gömme değil
    expect(safeGoogleMapsEmbedUrl("https://evil.com/maps/embed")).toBeNull();
    expect(safeGoogleMapsEmbedUrl("http://www.google.com/maps/embed?pb=1")).toBeNull(); // https değil
  });

  it("WhatsApp linki mesajı kodlar", () => {
    expect(whatsappLink("905550000000")).toBe("https://wa.me/905550000000");
    expect(whatsappLink("+90 555 000 00 00", "Merhaba, randevu?")).toBe(
      "https://wa.me/905550000000?text=Merhaba%2C%20randevu%3F",
    );
  });
});

describe("time", () => {
  it("haftanın gününü İstanbul saatine göre hesaplar", () => {
    // 2026-10-04 Pazar 22:30 UTC = İstanbul'da 5 Ekim Pazartesi 01:30
    expect(istanbulWeekday(new Date("2026-10-04T22:30:00Z"))).toBe(0);
    // 2026-10-04 Pazar 20:00 UTC = İstanbul'da hâlâ Pazar 23:00
    expect(istanbulWeekday(new Date("2026-10-04T20:00:00Z"))).toBe(6);
  });
});
