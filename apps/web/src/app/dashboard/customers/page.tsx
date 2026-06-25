import { ArrowLeft, Mail, Phone, Plus, Search, UserRound } from "lucide-react";
import Link from "next/link";
import { requireTenant } from "@/lib/auth";
import { listTenantCustomers } from "@/lib/data";
import { formatDateRo } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const context = await requireTenant();
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q.trim() : "";
  const customers = await listTenantCustomers(context, { search: query });
  const hasSearch = query.length > 0;

  return (
    <main className="min-h-screen bg-stone-50 px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-5xl">
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
              Clienți
            </h1>
            <p className="mt-1 text-sm text-zinc-600">{context.tenant.name}</p>
          </div>
          <Link
            href="/dashboard/customers/new"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white shadow-sm hover:bg-zinc-800"
          >
            <Plus aria-hidden="true" size={17} />
            Client nou
          </Link>
        </div>

        <form action="/dashboard/customers" className="mt-6 flex flex-col gap-3 sm:flex-row">
          <label className="block flex-1">
            <span className="sr-only">Caută clienți</span>
            <input
              name="q"
              defaultValue={query}
              placeholder="Caută după nume, contact, email sau telefon"
              className="h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-950 outline-none focus:border-zinc-900"
            />
          </label>
          <button className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-800 shadow-sm hover:bg-zinc-50">
            <Search aria-hidden="true" size={17} />
            Caută
          </button>
        </form>

        <section className="mt-6">
          {customers.length > 0 ? (
            <div className="grid gap-3">
              {customers.map((customer) => (
                <Link
                  key={customer.id}
                  href={`/dashboard/customers/${customer.id}`}
                  className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm hover:border-zinc-300"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-teal-50 text-teal-800">
                      <UserRound aria-hidden="true" size={19} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                        <h2 className="truncate text-base font-semibold text-zinc-950">
                          {customer.displayName}
                        </h2>
                        <span className="text-xs font-medium text-zinc-500">
                          Actualizat {formatDateRo(customer.updatedAt)}
                        </span>
                      </div>
                      {customer.companyName ? (
                        <p className="mt-1 truncate text-sm text-zinc-600">
                          {customer.companyName}
                        </p>
                      ) : null}
                      <div className="mt-3 flex flex-wrap gap-2 text-xs font-medium text-zinc-600">
                        {customer.email ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-stone-100 px-2 py-1">
                            <Mail aria-hidden="true" size={13} />
                            {customer.email}
                          </span>
                        ) : null}
                        {customer.phone ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-stone-100 px-2 py-1">
                            <Phone aria-hidden="true" size={13} />
                            {customer.phone}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-md border border-dashed border-zinc-300 bg-white p-6 text-center">
              <div className="mx-auto flex size-11 items-center justify-center rounded-md bg-stone-100 text-zinc-700">
                <UserRound aria-hidden="true" size={20} />
              </div>
              <h2 className="mt-4 text-base font-semibold text-zinc-950">
                {hasSearch ? "Nu există clienți potriviți" : "Nu există clienți încă"}
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-600">
                {hasSearch
                  ? "Încearcă alt nume sau alt câmp de contact."
                  : "Creează primul client înainte de a adăuga proiecte sau oferte."}
              </p>
              {!hasSearch ? (
                <Link
                  href="/dashboard/customers/new"
                  className="mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white shadow-sm hover:bg-zinc-800"
                >
                  <Plus aria-hidden="true" size={17} />
                  Client nou
                </Link>
              ) : null}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
