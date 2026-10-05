import { describe, expect, it } from "vitest";
import { contrastRatio, MIN_CONTRAST_RATIO, readableTextOn } from "./color";
import { resolveTheme, THEME_PRESETS, themeToRootCss, type ThemePresetName } from "./themes";

describe("contrastRatio", () => {
  it("siyah-beyaz 21:1, aynı renk 1:1", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 0);
    expect(contrastRatio("#c9a227", "#c9a227")).toBeCloseTo(1, 5);
  });

  it("açık zeminde siyah, koyu zeminde beyaz yazı seçer", () => {
    expect(readableTextOn("#ffffff")).toBe("#111111");
    expect(readableTextOn("#111111")).toBe("#ffffff");
    expect(readableTextOn("#c9a227")).toBe("#111111"); // altın üzerinde koyu yazı
  });
});

describe("hazır temalar okunabilir", () => {
  const names = Object.keys(THEME_PRESETS) as ThemePresetName[];

  it.each(names)("%s: yazı, ikincil yazı ve butonlar yeterli kontrastta", (name) => {
    const theme = resolveTheme(name);
    expect(contrastRatio(theme.text, theme.bg)).toBeGreaterThanOrEqual(MIN_CONTRAST_RATIO);
    expect(contrastRatio(theme.text, theme.surface)).toBeGreaterThanOrEqual(MIN_CONTRAST_RATIO);
    expect(contrastRatio(theme.muted, theme.bg)).toBeGreaterThanOrEqual(MIN_CONTRAST_RATIO);
    expect(contrastRatio(theme.muted, theme.surface)).toBeGreaterThanOrEqual(MIN_CONTRAST_RATIO);
    expect(contrastRatio(theme.onPrimary, theme.primary)).toBeGreaterThanOrEqual(MIN_CONTRAST_RATIO);
    expect(contrastRatio(theme.onAccent, theme.accent)).toBeGreaterThanOrEqual(MIN_CONTRAST_RATIO);
  });
});

describe("resolveTheme", () => {
  it("bilinmeyen tema adında varsayılan (modern) tema kullanılır", () => {
    expect(resolveTheme("olmayan").name).toBe("modern");
    expect(resolveTheme(null).name).toBe("modern");
  });

  it("geçerli özel renkler temayı ezer, geçersizler yok sayılır", () => {
    const custom = resolveTheme("modern", "#2563eb", "javascript:alert(1)");
    expect(custom.primary).toBe("#2563eb");
    expect(custom.accent).toBe(THEME_PRESETS.modern.accent);
  });

  it("arka planda okunmayan ana renk, yazılarda normal yazı rengine düşer", () => {
    // Beyaz zemin üzerinde çok açık sarı okunmaz
    const theme = resolveTheme("modern", "#fff7a8");
    expect(theme.primaryText).toBe(THEME_PRESETS.modern.text);
    expect(theme.onPrimary).toBe("#111111");
  });

  it("CSS çıktısı sadece beklenen değişkenleri içerir", () => {
    const css = themeToRootCss(resolveTheme("luxury"));
    expect(css.startsWith(":root{")).toBe(true);
    expect(css).toContain("--color-primary:#c9a227");
    expect(css).not.toMatch(/[<>]/);
  });
});
