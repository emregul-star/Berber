import type { Metadata } from "next";
import { Geist, Playfair_Display } from "next/font/google";
import { PLATFORM_NAME } from "@/lib/constants";
import { platformOrigin } from "@/lib/links";
import "./globals.css";

// "latin-ext" alt kümesi Türkçe karakterler (ğ, ş, ı, İ ...) için gerekli.
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "latin-ext"],
});

// Lüks ve klasik temalarda başlıklar için serif yazı tipi
const playfair = Playfair_Display({
  variable: "--font-serif",
  subsets: ["latin", "latin-ext"],
});

export const metadata: Metadata = {
  // Göreli görsel/link adresleri (ör. platformun paylaşım görseli) bu adrese göre tamamlanır
  metadataBase: new URL(platformOrigin()),
  title: { default: PLATFORM_NAME, template: `%s | ${PLATFORM_NAME}` },
  description: "Berberler için online randevu sitesi",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="tr" className={`${geistSans.variable} ${playfair.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
