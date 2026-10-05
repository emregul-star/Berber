/**
 * Dükkanın müşteri sitesi ana sayfası ({slug}.PLATFORM_DOMAIN).
 * Tek sayfa, kaydırmalı: üst bölüm, hizmetler, ekip, galeri, yorumlar, iletişim (Bölüm 7.1).
 */
import { notFound } from "next/navigation";
import { ContactSection } from "@/components/site/contact-section";
import { GallerySection } from "@/components/site/gallery-section";
import { HeroSection } from "@/components/site/hero-section";
import { MobileBookingBar } from "@/components/site/mobile-booking-bar";
import { ServicesSection } from "@/components/site/services-section";
import { TeamSection } from "@/components/site/team-section";
import { TestimonialsSection } from "@/components/site/testimonials-section";
import { getShopSiteData } from "@/lib/site-data";
import { istanbulWeekday } from "@/lib/time";

export default async function ShopHomePage({ params }: PageProps<"/sites/[slug]">) {
  const { slug } = await params;
  const data = await getShopSiteData(slug);
  if (!data) notFound();

  const { shop } = data;
  const todayWeekday = istanbulWeekday();

  return (
    // Mobilde alttaki sabit buton içeriği örtmesin diye alt boşluk
    <main className="pb-24 md:pb-0">
      <HeroSection
        name={shop.name}
        description={shop.description}
        logoUrl={shop.logo_url}
        coverImageUrl={shop.cover_image_url}
        today={data.openingHours[todayWeekday]}
      />
      <ServicesSection services={data.services} />
      <TeamSection barbers={data.barbers} />
      <GallerySection images={data.gallery} />
      <TestimonialsSection testimonials={data.testimonials} googleReviewsUrl={shop.google_reviews_url} />
      <ContactSection shop={shop} openingHours={data.openingHours} todayWeekday={todayWeekday} />
      <MobileBookingBar />
    </main>
  );
}
