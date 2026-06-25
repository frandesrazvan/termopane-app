import { Archive, ArrowLeft, ChevronRight, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { catalogSections } from "../catalog-config";

type CatalogHomeProps = {
  canManage: boolean;
  tenantName: string;
};

export function CatalogHome({ canManage, tenantName }: CatalogHomeProps) {
  return (
    <main className="min-h-screen bg-stone-50 px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-6xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 text-sm font-medium text-zinc-600 hover:text-zinc-950"
            >
              <ArrowLeft aria-hidden="true" size={16} />
              Panou
            </Link>
            <h1 className="mt-3 text-2xl font-semibold text-zinc-950 sm:text-3xl">
              Catalog
            </h1>
            <p className="mt-1 text-sm text-zinc-600">{tenantName}</p>
          </div>
          <span className="inline-flex min-h-10 items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-700 shadow-sm">
            <ShieldCheck aria-hidden="true" size={16} className="text-emerald-600" />
            {canManage ? "administrare" : "citire"}
          </span>
        </div>

        <section className="mt-5 rounded-md border border-zinc-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-teal-50 text-teal-800">
              <Archive aria-hidden="true" size={19} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-zinc-950">Administrare catalog</h2>
              <p className="mt-1 text-sm leading-6 text-zinc-600">
                Inregistrarile sunt separate pe tenant. Arhivarea nu sterge definitiv randurile.
              </p>
            </div>
          </div>
        </section>

        <nav className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-label="Sectiuni catalog">
          {catalogSections.map((section) => (
            <Link
              key={section.entity}
              href={section.href}
              className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm hover:border-zinc-300"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-zinc-950">{section.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-zinc-600">{section.description}</p>
                </div>
                <ChevronRight aria-hidden="true" size={18} className="mt-1 shrink-0 text-zinc-400" />
              </div>
            </Link>
          ))}
        </nav>
      </div>
    </main>
  );
}
