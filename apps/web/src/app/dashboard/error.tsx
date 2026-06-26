"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";

export default function DashboardError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-2xl">
        <section className="rounded-md border border-rose-200 bg-white p-5 text-center shadow-sm">
          <div className="mx-auto flex size-11 items-center justify-center rounded-md bg-rose-50 text-rose-800">
            <AlertTriangle aria-hidden="true" size={20} />
          </div>
          <h1 className="mt-4 text-base font-semibold text-zinc-950">
            Nu am putut încărca acest ecran
          </h1>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-600">
            Reîncearcă încărcarea. Dacă eroarea persistă, verifică sesiunea și conexiunea înainte de
            a continua oferta.
          </p>
          <button
            className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white shadow-sm active:bg-zinc-800"
            onClick={() => reset()}
            type="button"
          >
            <RefreshCw aria-hidden="true" size={17} />
            Reîncarcă
          </button>
        </section>
      </div>
    </main>
  );
}
