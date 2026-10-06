"use client";

/**
 * Yukarı/aşağı butonlarıyla sıralanabilen liste (sürükle-bırak yerine; telefonda daha kolay
 * ve klavyeyle de kullanılabilir). Sıra değişince reorderAction ile kaydedilir.
 */
import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { reorderAction } from "@/app/sites/[slug]/panel/(app)/shared-actions";

type Table = "services" | "barbers" | "gallery_images" | "testimonials";

export function SortableList<T extends { id: string }>({
  slug,
  table,
  items,
  renderItem,
}: {
  slug: string;
  table: Table;
  items: T[];
  renderItem: (item: T) => ReactNode;
}) {
  const router = useRouter();
  // Yerelde sadece SIRA (id listesi) tutulur; içerik her zaman sunucudan gelen güncel "items"tan
  // okunur. Böylece düzenleme sonrası (sıra değişmese de) ekranda güncel bilgi görünür.
  const [orderIds, setOrderIds] = useState(() => items.map((i) => i.id));
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Sunucudan farklı bir liste gelirse (ekleme/silme/sıralama sonrası) yerel sırayı ona eşitle
  const serverKey = items.map((i) => i.id).join(",");
  const [lastKey, setLastKey] = useState(serverKey);
  if (serverKey !== lastKey) {
    setLastKey(serverKey);
    setOrderIds(items.map((i) => i.id));
  }
  const byId = new Map(items.map((i) => [i.id, i]));
  const order = orderIds.map((id) => byId.get(id)).filter((i): i is T => Boolean(i));

  function move(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= order.length) return;
    const previous = orderIds;
    const next = [...orderIds];
    [next[index], next[target]] = [next[target], next[index]];
    setOrderIds(next);
    setError(null);
    startTransition(async () => {
      const res = await reorderAction(slug, { table, ids: next });
      if (!res.ok) {
        setError(res.error ?? "Sıralama kaydedilemedi.");
        setOrderIds(previous);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <>
      {error && (
        <p className="mb-2 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      <ul className="grid gap-2">
        {order.map((item, index) => (
          <li key={item.id} className="flex items-start gap-2 rounded-lg border border-neutral-200 bg-white p-3">
            <div className="flex shrink-0 flex-col gap-1">
              <button
                type="button"
                onClick={() => move(index, -1)}
                disabled={pending || index === 0}
                aria-label="Yukarı taşı"
                className="rounded border border-neutral-300 px-2 text-sm disabled:opacity-30"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => move(index, 1)}
                disabled={pending || index === order.length - 1}
                aria-label="Aşağı taşı"
                className="rounded border border-neutral-300 px-2 text-sm disabled:opacity-30"
              >
                ↓
              </button>
            </div>
            <div className="min-w-0 flex-1">{renderItem(item)}</div>
          </li>
        ))}
      </ul>
    </>
  );
}
