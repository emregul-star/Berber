import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { PLATFORM_NAME } from "@/lib/constants";
import "./globals.css";

// "latin-ext" alt kümesi Türkçe karakterler (ğ, ş, ı, İ ...) için gerekli.
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "latin-ext"],
});

export const metadata: Metadata = {
  title: PLATFORM_NAME,
  description: "Berberler için online randevu sitesi",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="tr" className={`${geistSans.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
