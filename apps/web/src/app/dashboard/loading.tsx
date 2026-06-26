import { FileText, Loader2 } from "lucide-react";

export default function DashboardLoading() {
  return (
    <main className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-6xl">
        <div className="rounded-md border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-stone-100 text-zinc-700">
              <Loader2 aria-hidden="true" size={19} className="animate-spin" />
            </div>
            <div>
              <h1 className="text-base font-semibold text-zinc-950">
                Se încarcă spațiul de lucru
              </h1>
              <p className="mt-1 text-sm text-zinc-600">
                Pregătim ofertele, clienții și acțiunile pentru ecranul mobil.
              </p>
            </div>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((item) => (
              <div
                aria-hidden="true"
                className="h-24 animate-pulse rounded-md bg-stone-100"
                key={item}
              />
            ))}
          </div>
          <div className="mt-5 flex items-center gap-2 rounded-md bg-stone-100 px-3 py-2 text-sm font-medium text-zinc-700">
            <FileText aria-hidden="true" size={16} />
            Datele tenantului rămân încărcate server-side.
          </div>
        </div>
      </div>
    </main>
  );
}
