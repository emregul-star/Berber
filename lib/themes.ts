/**
 * Dükkan sitesi tema sistemi (Bölüm 9).
 *
 * Her dükkan bir hazır tema (preset) seçer; isterse ana rengi ve vurgu rengini ezer.
 * Sonuç, dükkan sitesinin kök elemanına CSS değişkeni olarak basılır
 * (--color-bg, --color-primary ...). Tailwind sınıfları (bg-bg, text-primary ...)
 * bu değişkenleri okuduğu için tema değişince tüm site renkleri değişir.
 */
import type { CSSProperties } from "react";
import { contrastRatio, isHexColor, readableTextOn } from "./color";

export type ThemePresetName = "luxury" | "modern" | "classic" | "fresh";

type ThemePreset = {
  /** Panelde gösterilecek Türkçe ad */
  label: string;
  bg: string;
  /** Kartlar, bölüm arka planları */
  surface: string;
  text: string;
  /** İkincil yazılar (açıklama, süre vb.) */
  muted: string;
  border: string;
  primary: string;
  accent: string;
  /** Başlık yazı tipi: serif (klasik/şık) veya sans (modern) */
  headingFont: "serif" | "sans";
};

export const THEME_PRESETS: Record<ThemePresetName, ThemePreset> = {
  luxury: {
    label: "Lüks (koyu, altın)",
    bg: "#0e0e0f",
    surface: "#19191c",
    text: "#f4efe6",
    muted: "#b3aca2",
    border: "#2f2b25",
    primary: "#c9a227",
    accent: "#e8d5a3",
    headingFont: "serif",
  },
  modern: {
    label: "Modern (beyaz, siyah)",
    bg: "#ffffff",
    surface: "#f4f4f5",
    text: "#111111",
    muted: "#52525b",
    border: "#e4e4e7",
    primary: "#111111",
    accent: "#3f3f46",
    headingFont: "sans",
  },
  classic: {
    label: "Klasik (krem, kırmızı-lacivert)",
    bg: "#f8f1e4",
    surface: "#fffaf0",
    text: "#1c2433",
    muted: "#5f5442",
    border: "#e3d4b8",
    primary: "#a4161a",
    accent: "#1f3a5f",
    headingFont: "serif",
  },
  fresh: {
    label: "Ferah (açık gri, yeşil)",
    bg: "#f3f4f6",
    surface: "#ffffff",
    text: "#111827",
    muted: "#4b5563",
    border: "#e5e7eb",
    primary: "#15803d",
    accent: "#0f766e",
    headingFont: "sans",
  },
};

export const DEFAULT_THEME: ThemePresetName = "modern";

export function isThemePresetName(value: string | null | undefined): value is ThemePresetName {
  return typeof value === "string" && value in THEME_PRESETS;
}

export type ResolvedTheme = ThemePreset & {
  name: ThemePresetName;
  /** Ana renkli buton üzerindeki yazı rengi (otomatik siyah/beyaz) */
  onPrimary: string;
  /** Vurgu renkli alan üzerindeki yazı rengi */
  onAccent: string;
  /**
   * Arka plan üzerinde ana renkle yazılan yazılar (fiyat, link) için güvenli renk.
   * Seçilen ana renk arka planda okunmuyorsa normal yazı rengine düşer.
   */
  primaryText: string;
};

/** Dükkanın tema ayarlarını (preset + isteğe bağlı renkler) son renklere çevirir. */
export function resolveTheme(
  presetName: string | null | undefined,
  primaryOverride?: string | null,
  accentOverride?: string | null,
): ResolvedTheme {
  const name = isThemePresetName(presetName) ? presetName : DEFAULT_THEME;
  const preset = THEME_PRESETS[name];
  const primary = isHexColor(primaryOverride) ? primaryOverride : preset.primary;
  const accent = isHexColor(accentOverride) ? accentOverride : preset.accent;

  return {
    ...preset,
    name,
    primary,
    accent,
    onPrimary: readableTextOn(primary),
    onAccent: readableTextOn(accent),
    // Büyük/kalın yazılar için 3:1 yeterli kabul edilir (WCAG AA - büyük metin)
    primaryText: contrastRatio(primary, preset.bg) >= 3 ? primary : preset.text,
  };
}

/**
 * Temayı sayfanın köküne (:root) basılacak CSS metnine çevirir.
 * Güvenli: değerler ya sabit preset renkleri ya da isHexColor ile doğrulanmış #rrggbb renklerdir.
 */
export function themeToRootCss(theme: ResolvedTheme): string {
  const declarations = Object.entries(themeToCssVars(theme))
    .map(([key, value]) => `${key}:${value}`)
    .join(";");
  return `:root{${declarations}}`;
}

/** Temayı bir elemanın style özelliğine verilecek CSS değişkenlerine çevirir (ör. canlı önizleme). */
export function themeToCssVars(theme: ResolvedTheme): CSSProperties {
  return {
    "--color-bg": theme.bg,
    "--color-surface": theme.surface,
    "--color-text": theme.text,
    "--color-muted": theme.muted,
    "--color-border": theme.border,
    "--color-primary": theme.primary,
    "--color-on-primary": theme.onPrimary,
    "--color-primary-text": theme.primaryText,
    "--color-accent": theme.accent,
    "--color-on-accent": theme.onAccent,
    "--heading-font": theme.headingFont === "serif" ? "var(--font-serif)" : "var(--font-geist-sans)",
  } as CSSProperties;
}
