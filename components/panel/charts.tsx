/**
 * Basit, hafif grafikler (Bölüm 8.3). Grafik kütüphanesi kullanılmaz: sunucuda HTML/CSS olarak
 * çizilir, telefona ek JavaScript gitmez.
 *
 * Tasarım kuralları (dataviz):
 *  - Tek seri: tek renk, efsane yok (başlık neyin çizildiğini söyler).
 *  - Çubuk en fazla 24px kalın; uç 4px yuvarlak, taban köşesi düz; çubuklar arasında boşluk.
 *  - Yazılar seri renginde değil, metin renginde. Izgara/eksen ince ve silik.
 *  - Değerler: yatay çubukta uçta; sütunlarda sadece en yüksek sütunda, diğerleri fareyle
 *    üzerine gelince / klavyeyle odaklanınca. Her grafiğin altında tablo görünümü vardır.
 */
import type { ReactNode } from "react";

/** Grafik rengi (dataviz paleti, mavi; beyaz zeminde ≥3:1 kontrast doğrulandı) */
export const CHART_COLOR = "#2a78d6";

export type BarDatum = { key: string; label: string; value: number; display: string };

/** Yatay çubuk listesi: kategori karşılaştırması (berberler, hizmetler) */
export function BarList({ data, emptyText = "Veri yok." }: { data: BarDatum[]; emptyText?: string }) {
  const max = Math.max(0, ...data.map((d) => d.value));
  if (data.length === 0 || max === 0) return <p className="text-sm text-neutral-500">{emptyText}</p>;
  return (
    <ul className="grid gap-3">
      {data.map((d) => (
        <li key={d.key} className="grid grid-cols-[minmax(0,8rem)_1fr] items-center gap-3 sm:grid-cols-[minmax(0,11rem)_1fr]">
          <span className="truncate text-sm text-neutral-700" title={d.label}>
            {d.label}
          </span>
          <div className="flex items-center gap-2">
            {/* İz: çubuğun genişliği bu alana göre yüzde; değer etiketi izin dışında kalır */}
            <div className="min-w-0 flex-1">
              <div
                className="h-4 rounded-r-[4px]"
                style={{ width: `${Math.max((d.value / max) * 100, 1.5)}%`, background: CHART_COLOR }}
                role="img"
                aria-label={`${d.label}: ${d.display}`}
              />
            </div>
            <span className="w-16 shrink-0 text-sm font-semibold text-neutral-900 tabular-nums">{d.display}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}

export type ColumnDatum = { key: string; label: string; value: number; tooltip: string };

/** Dikey sütun grafiği: sıralı kategoriler (haftanın günleri, saatler) */
export function ColumnChart({ data, height = 160, ariaLabel }: { data: ColumnDatum[]; height?: number; ariaLabel: string }) {
  const max = Math.max(0, ...data.map((d) => d.value));
  if (max === 0) return <p className="text-sm text-neutral-500">Veri yok.</p>;
  const maxIndex = data.findIndex((d) => d.value === max);
  return (
    <div role="group" aria-label={ariaLabel}>
      <div className="flex items-end gap-[2px] border-b border-neutral-200" style={{ height }}>
        {data.map((d, i) => (
          <div key={d.key} className="group relative flex h-full min-w-0 flex-1 flex-col items-center justify-end">
            {/* Değer etiketi sadece en yüksek sütunda (seçici etiketleme) */}
            {i === maxIndex && <span className="mb-1 text-xs font-semibold text-neutral-900 tabular-nums">{d.value}</span>}
            <div
              tabIndex={0}
              role="img"
              aria-label={d.tooltip}
              className="w-full max-w-6 rounded-t-[4px] outline-none transition group-hover:brightness-110 focus-visible:ring-2 focus-visible:ring-neutral-900"
              style={{ height: `${(d.value / max) * (height - 22)}px`, minHeight: d.value > 0 ? 2 : 0, background: CHART_COLOR }}
            />
            {/* Fareyle üzerine gelince / odaklanınca değer */}
            <span
              role="tooltip"
              className="pointer-events-none absolute bottom-full z-10 mb-1 hidden rounded-md bg-neutral-900 px-2 py-1 text-xs whitespace-nowrap text-white group-focus-within:block group-hover:block"
            >
              {d.tooltip}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-1 flex gap-[2px]">
        {data.map((d) => (
          <span key={d.key} className="min-w-0 flex-1 truncate text-center text-[11px] text-neutral-500">
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Grafiğin altındaki tablo görünümü (değerler fareye/renge bağlı kalmasın) */
export function DataTable({ headers, rows }: { headers: string[]; rows: ReactNode[][] }) {
  return (
    <details className="mt-4 text-sm">
      <summary className="cursor-pointer text-neutral-600 hover:text-neutral-900">Tablo olarak göster</summary>
      <table className="mt-2 w-full">
        <thead>
          <tr className="border-b border-neutral-200 text-left text-xs text-neutral-500">
            {headers.map((h, i) => (
              <th key={h} scope="col" className={`py-1.5 font-medium ${i > 0 ? "text-right" : ""}`}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, r) => (
            <tr key={r} className="border-b border-neutral-100 last:border-0">
              {row.map((cell, c) => (
                <td key={c} className={`py-1.5 ${c > 0 ? "text-right tabular-nums" : ""}`}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}
