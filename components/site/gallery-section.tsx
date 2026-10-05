import type { ShopSiteData } from "@/lib/site-data";
import { GalleryGrid } from "./gallery-grid";
import { SectionHeading } from "./ui";

export function GallerySection({ images }: { images: ShopSiteData["gallery"] }) {
  if (images.length === 0) return null;

  return (
    <section id="galeri" className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
      <SectionHeading eyebrow="Galeri" title="İşlerimizden örnekler" />
      <GalleryGrid images={images} />
    </section>
  );
}
