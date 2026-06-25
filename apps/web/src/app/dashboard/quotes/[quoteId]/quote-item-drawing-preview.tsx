import type { QuoteItem } from "@prisma/client";
import { quoteItemDrawingSnapshot } from "../../../../lib/drawing/quote-item-drawings";

export function QuoteItemDrawingPreview({ item }: { item: QuoteItem }) {
  const drawing = quoteItemDrawingSnapshot(item);

  return (
    <div className="rounded-md border border-zinc-200 bg-stone-50 p-2">
      <div
        aria-label="Previzualizare schemă poziție"
        className="mx-auto max-w-[260px] overflow-hidden rounded-sm"
        dangerouslySetInnerHTML={{ __html: drawing.svg }}
      />
    </div>
  );
}
