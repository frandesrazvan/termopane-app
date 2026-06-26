"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";

export default function RootError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="grid min-h-screen place-items-center bg-stone-50 px-4 py-8">
      <section className="w-full max-w-md rounded-md border border-rose-200 bg-white p-5 text-center shadow-sm">
        <div className="mx-auto flex size-11 items-center justify-center rounded-md bg-rose-50 text-rose-800">
          <AlertTriangle aria-hidden="true" size={20} />
        </div>
        <h1 className="mt-4 text-base font-semibold text-zinc-950">
          Aplicația nu a putut continua
        </h1>
        <p className="mt-2 text-sm leading-6 text-zinc-600">
          Reîncarcă ecranul și verifică sesiunea dacă problema apare din nou.
        </p>
        <button
          className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white shadow-sm active:bg-zinc-800"
          onClick={() => reset()}
          type="button"
        >
          <RefreshCw aria-hidden="true" size={17} />
          Reîncarcă
        </button>
      </section>
    </main>
  );
}
