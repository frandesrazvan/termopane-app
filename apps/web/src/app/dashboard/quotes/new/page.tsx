import { ArrowLeft, FileText, Save } from "lucide-react";
import Link from "next/link";
import { requireTenant } from "@/lib/auth";
import { listTenantCustomers, listTenantProjects } from "@/lib/data";
import { createQuoteAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function NewQuotePage({
  searchParams,
}: {
  searchParams: Promise<{ customerId?: string; projectId?: string; error?: string }>;
}) {
  const context = await requireTenant();
  const params = await searchParams;
  const [customers, projects] = await Promise.all([
    listTenantCustomers(context),
    listTenantProjects(context),
  ]);

  return (
    <main className="min-h-screen bg-stone-50 px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-3xl">
        <Link
          href="/dashboard/quotes"
          className="inline-flex items-center gap-2 text-sm font-medium text-zinc-600 hover:text-zinc-950"
        >
          <ArrowLeft aria-hidden="true" size={16} />
          Oferte salvate
        </Link>

        <section className="mt-5 rounded-md border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-md bg-sky-50 text-sky-800">
              <FileText aria-hidden="true" size={19} />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-zinc-950">Ciornă ofertă nouă</h1>
              <p className="mt-1 text-sm text-zinc-600">Structură de ofertă salvată</p>
            </div>
          </div>

          {params.error ? (
            <p className="mt-5 rounded-md bg-rose-50 px-3 py-2 text-sm font-medium text-rose-800">
              {params.error === "quote-number"
                ? "Numărul de ofertă nu a putut fi rezervat. Încearcă să creezi din nou ciorna."
                : "Selectează un client și verifică proiectul ales."}
            </p>
          ) : null}

          <form action={createQuoteAction} className="mt-6 space-y-5">
            <label className="block">
              <span className="text-sm font-medium text-zinc-800">Client</span>
              <select
                name="customerId"
                required
                defaultValue={params.customerId ?? ""}
                className="mt-2 h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-950 outline-none focus:border-zinc-900"
              >
                <option value="">Selectează client</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.displayName}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-medium text-zinc-800">Proiect</span>
              <select
                name="projectId"
                defaultValue={params.projectId ?? ""}
                className="mt-2 h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-950 outline-none focus:border-zinc-900"
              >
                <option value="">Fără proiect</option>
                {projects.map((project) => {
                  const customer = customers.find((candidate) => candidate.id === project.customerId);

                  return (
                    <option key={project.id} value={project.id}>
                      {project.name}
                      {customer ? ` · ${customer.displayName}` : ""}
                    </option>
                  );
                })}
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-medium text-zinc-800">Titlu</span>
              <input
                name="title"
                maxLength={160}
                placeholder="Titlu opțional pentru ofertă"
                className="mt-2 h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-950 outline-none focus:border-zinc-900"
              />
            </label>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Link
                href="/dashboard/quotes"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-800 shadow-sm hover:bg-zinc-50"
              >
                <ArrowLeft aria-hidden="true" size={17} />
                Anulează
              </Link>
              <button className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white shadow-sm hover:bg-zinc-800">
                <Save aria-hidden="true" size={17} />
                Creează ciornă
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
