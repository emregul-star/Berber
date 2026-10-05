import { safeExternalUrl } from "@/lib/links";
import type { ShopSiteData } from "@/lib/site-data";
import { ExternalIcon, StarIcon } from "./icons";
import { SectionHeading } from "./ui";

function Stars({ rating }: { rating: number }) {
  return (
    <p className="flex gap-0.5 text-primary-text" aria-label={`5 üzerinden ${rating} yıldız`}>
      {Array.from({ length: 5 }, (_, i) => (
        <StarIcon key={i} filled={i < rating} />
      ))}
    </p>
  );
}

export function TestimonialsSection({
  testimonials,
  googleReviewsUrl,
}: {
  testimonials: ShopSiteData["testimonials"];
  googleReviewsUrl: string | null;
}) {
  const reviewsUrl = safeExternalUrl(googleReviewsUrl);
  if (testimonials.length === 0 && !reviewsUrl) return null;

  return (
    <section id="yorumlar" className="border-y border-border bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
        <SectionHeading eyebrow="Yorumlar" title="Müşterilerimiz ne diyor?" />

        {testimonials.length > 0 && (
          <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {testimonials.map((t) => (
              <li key={t.id}>
                <figure className="flex h-full flex-col rounded-2xl bg-bg p-6">
                  <Stars rating={t.rating} />
                  <blockquote className="mt-4 flex-1 leading-relaxed">“{t.content}”</blockquote>
                  <figcaption className="mt-4 text-sm text-muted">
                    <span className="font-semibold text-text">{t.author_name}</span>
                    {t.source && <> · {t.source}</>}
                  </figcaption>
                </figure>
              </li>
            ))}
          </ul>
        )}

        {reviewsUrl && (
          <a
            href={reviewsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-8 inline-flex items-center gap-2 rounded-full border border-border bg-bg px-5 py-2.5 text-sm font-semibold transition hover:border-primary"
          >
            Google&apos;daki tüm yorumlarımız
            <ExternalIcon />
          </a>
        )}
      </div>
    </section>
  );
}
