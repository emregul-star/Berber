import Link from "next/link";
import { PLATFORM_NAME } from "@/lib/constants";
import { platformHomeUrl } from "@/lib/links";

export function SiteFooter({ name }: { name: string }) {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-4 py-8 text-sm text-muted sm:flex-row sm:justify-between">
        <p>
          © {year} {name}
        </p>
        <nav aria-label="Alt bilgi" className="flex items-center gap-5">
          <Link href="/kvkk" className="hover:text-text">
            KVKK Aydınlatma Metni
          </Link>
          {/* Platformun küçük reklamı */}
          <a href={platformHomeUrl()} className="text-xs hover:text-text">
            {PLATFORM_NAME} ile oluşturuldu
          </a>
        </nav>
      </div>
    </footer>
  );
}
