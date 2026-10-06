"use client";

/**
 * Yorumlar sayfası: seçili yorum ekle/düzenle/gizle/sil, sırala.
 */
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteTestimonialAction, saveTestimonialAction, type Result } from "@/app/sites/[slug]/panel/(app)/yorumlar/actions";
import { SortableList } from "./sortable-list";
import { Badge, Button, Card, EmptyState, Field, inputClass, Notice } from "./ui";

type Item = { id: string; author_name: string; rating: number; content: string; source: string | null; is_visible: boolean };

function TestimonialForm({ slug, item, onDone }: { slug: string; item: Item | null; onDone: (r: Result) => void }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const idp = item?.id ?? "new";
  function submit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await saveTestimonialAction(slug, {
        id: item?.id,
        authorName: formData.get("authorName"),
        rating: formData.get("rating"),
        content: formData.get("content"),
        source: formData.get("source"),
        isVisible: formData.get("isVisible") === "on",
      }).catch(() => ({ ok: false as const, error: "Bağlantı hatası." }));
      if (res.ok) onDone(res);
      else setError(res.error);
    });
  }
  return (
    <form action={submit} className="grid gap-4">
      {error && <Notice tone="error">{error}</Notice>}
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Yorum sahibi" htmlFor={`a-${idp}`} hint='Ör. "Emre K."'>
          <input id={`a-${idp}`} name="authorName" required defaultValue={item?.author_name} className={inputClass} />
        </Field>
        <Field label="Puan" htmlFor={`r-${idp}`}>
          <select id={`r-${idp}`} name="rating" defaultValue={item?.rating ?? 5} className={inputClass}>
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={n}>
                {"★".repeat(n)} ({n})
              </option>
            ))}
          </select>
        </Field>
        <Field label="Kaynak" htmlFor={`s-${idp}`}>
          <input id={`s-${idp}`} name="source" maxLength={30} defaultValue={item?.source ?? "Google"} className={inputClass} />
        </Field>
      </div>
      <Field label="Yorum" htmlFor={`c-${idp}`}>
        <textarea id={`c-${idp}`} name="content" rows={3} required maxLength={600} defaultValue={item?.content} className={inputClass} />
      </Field>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="isVisible" className="size-4" defaultChecked={item?.is_visible ?? true} />
        Sitede göster
      </label>
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Kaydediliyor…" : "Kaydet"}
        </Button>
      </div>
    </form>
  );
}

export function TestimonialsManager({ slug, items }: { slug: string; items: Item[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [pending, startTransition] = useTransition();
  const handle = (r: Result) => {
    setResult(r);
    if (r.ok) {
      setEditing(null);
      router.refresh();
    }
  };

  return (
    <div className="grid gap-4">
      {result && <Notice tone={result.ok ? "success" : "error"}>{result.ok ? result.message : result.error}</Notice>}
      {editing === "new" ? (
        <Card>
          <h2 className="mb-4 font-bold">Yeni yorum</h2>
          <TestimonialForm slug={slug} item={null} onDone={handle} />
          <Button variant="ghost" className="mt-2" onClick={() => setEditing(null)}>
            Vazgeç
          </Button>
        </Card>
      ) : (
        <div>
          <Button onClick={() => setEditing("new")}>+ Yeni yorum</Button>
        </div>
      )}
      {items.length === 0 ? (
        <EmptyState>Henüz yorum yok. Google&apos;daki güzel yorumlarınızdan 3-5 tanesini ekleyin.</EmptyState>
      ) : (
        <SortableList
          slug={slug}
          table="testimonials"
          items={items}
          renderItem={(t) =>
            editing === t.id ? (
              <div>
                <TestimonialForm slug={slug} item={t} onDone={handle} />
                <Button variant="ghost" className="mt-2" onClick={() => setEditing(null)}>
                  Vazgeç
                </Button>
              </div>
            ) : (
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">
                    {t.author_name} <span className="text-amber-500">{"★".repeat(t.rating)}</span>{" "}
                    {!t.is_visible && <Badge>Gizli</Badge>}
                  </p>
                  <p className="text-sm text-neutral-600">{t.content}</p>
                  {t.source && <p className="text-xs text-neutral-500">{t.source}</p>}
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={() => setEditing(t.id)}>
                    Düzenle
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={pending}
                    onClick={() => {
                      if (confirm("Bu yorumu silmek istiyor musunuz?")) startTransition(async () => handle(await deleteTestimonialAction(slug, t.id)));
                    }}
                  >
                    Sil
                  </Button>
                </div>
              </div>
            )
          }
        />
      )}
    </div>
  );
}
