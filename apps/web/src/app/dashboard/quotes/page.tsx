import { ArrowLeft, CalendarDays, FileText, Plus, Search } from "lucide-react";
import { QuoteStatus } from "@prisma/client";
import Link from "next/link";
import { requireTenant } from "@/lib/auth";
import {
  getTenantProject,
  getTenantQuoteVersion,
  listTenantCustomers,
  listTenantProjects,
  listTenantQuotes,
} from "@/lib/data";

const quoteStatuses = Object.values(QuoteStatus);

export const dynamic = "force-dynamic";

export default async function QuotesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const context = await requireTenant();
  const params = await searchParams;
  const customerId = params.customerId?.trim() || null;
  const status = quoteStatuses.includes(params.status as QuoteStatus)
    ? (params.status as QuoteStatus)
    : null;
  const authorId = params.authorId?.trim() || null;
  const createdFrom = parseDateStart(params.createdFrom);
  const createdTo = parseDateEnd(params.createdTo);
  const totalMinMinor = parseMinor(params.totalMinMinor);
  const totalMaxMinor = parseMinor(params.totalMaxMinor);
  const [customers, projects, quotes] = await Promise.all([
    listTenantCustomers(context),
    listTenantProjects(context),
    listTenantQuotes(context, {
      customerId,
      status,
      createdById: authorId,
      createdFrom,
      createdTo,
    }),
  ]);
  const customerNames = new Map(customers.map((customer) => [customer.id, customer.displayName]));
  const projectNames = new Map(projects.map((project) => [project.id, project.name]));
  const rows = await Promise.all(
    quotes.map(async (quote) => ({
      quote,
      currentVersion: quote.currentVersionId
        ? await getTenantQuoteVersion(context, quote.currentVersionId)
        : null,
      project: quote.projectId ? await getTenantProject(context, quote.projectId) : null,
    })),
  );
  const filteredRows = rows.filter(({ currentVersion }) =>
    matchesTotalRange(currentVersion?.totalMinor, totalMinMinor, totalMaxMinor),
  );
  const hasFilters = Boolean(
    customerId || status || authorId || createdFrom || createdTo || totalMinMinor || totalMaxMinor,
  );

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
              Dashboard
            </Link>
            <h1 className="mt-3 text-2xl font-semibold text-zinc-950 sm:text-3xl">
              Saved offers
            </h1>
            <p className="mt-1 text-sm text-zinc-600">{context.tenant.name}</p>
          </div>
          <Link
            href="/dashboard/quotes/new"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white shadow-sm hover:bg-zinc-800"
          >
            <Plus aria-hidden="true" size={17} />
            New quote
          </Link>
        </div>

        <form action="/dashboard/quotes" className="mt-6 rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label className="block">
              <span className="text-sm font-medium text-zinc-800">Customer</span>
              <select
                name="customerId"
                defaultValue={customerId ?? ""}
                className="mt-2 h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-950 outline-none focus:border-zinc-900"
              >
                <option value="">All customers</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.displayName}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-medium text-zinc-800">Status</span>
              <select
                name="status"
                defaultValue={status ?? ""}
                className="mt-2 h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-950 outline-none focus:border-zinc-900"
              >
                <option value="">All statuses</option>
                {quoteStatuses.map((quoteStatus) => (
                  <option key={quoteStatus} value={quoteStatus}>
                    {formatStatus(quoteStatus)}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-medium text-zinc-800">Author</span>
              <input
                name="authorId"
                defaultValue={authorId ?? ""}
                placeholder="User id"
                className="mt-2 h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-950 outline-none focus:border-zinc-900"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-zinc-800">From</span>
              <input
                name="createdFrom"
                type="date"
                defaultValue={params.createdFrom ?? ""}
                className="mt-2 h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-950 outline-none focus:border-zinc-900"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-zinc-800">To</span>
              <input
                name="createdTo"
                type="date"
                defaultValue={params.createdTo ?? ""}
                className="mt-2 h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-950 outline-none focus:border-zinc-900"
              />
            </label>

            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className="text-sm font-medium text-zinc-800">Total min</span>
                <input
                  name="totalMinMinor"
                  type="number"
                  min="0"
                  step="1"
                  defaultValue={params.totalMinMinor ?? ""}
                  placeholder="minor"
                  className="mt-2 h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-950 outline-none focus:border-zinc-900"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-zinc-800">Total max</span>
                <input
                  name="totalMaxMinor"
                  type="number"
                  min="0"
                  step="1"
                  defaultValue={params.totalMaxMinor ?? ""}
                  placeholder="minor"
                  className="mt-2 h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-950 outline-none focus:border-zinc-900"
                />
              </label>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
            {hasFilters ? (
              <Link
                href="/dashboard/quotes"
                className="inline-flex h-11 items-center justify-center rounded-md border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-800 shadow-sm hover:bg-zinc-50"
              >
                Clear
              </Link>
            ) : null}
            <button className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white shadow-sm hover:bg-zinc-800">
              <Search aria-hidden="true" size={17} />
              Filter offers
            </button>
          </div>
        </form>

        <section className="mt-6">
          {filteredRows.length > 0 ? (
            <div className="grid gap-3">
              {filteredRows.map(({ quote, currentVersion, project }) => {
                const projectLabel = quote.projectId
                  ? (project?.name ?? projectNames.get(quote.projectId) ?? "Project")
                  : null;

                return (
                  <Link
                    key={quote.id}
                    href={`/dashboard/quotes/${quote.id}`}
                    className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm hover:border-zinc-300"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-sky-50 text-sky-800">
                        <FileText aria-hidden="true" size={19} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <h2 className="truncate text-base font-semibold text-zinc-950">
                              {quote.quoteNumber}
                              {quote.title ? ` · ${quote.title}` : ""}
                            </h2>
                            <p className="mt-1 truncate text-sm text-zinc-600">
                              {customerNames.get(quote.customerId) ?? "Unknown customer"}
                              {projectLabel ? ` · ${projectLabel}` : ""}
                            </p>
                          </div>
                          <StatusBadge status={quote.status} />
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2 text-xs font-medium text-zinc-600">
                          <span className="inline-flex items-center gap-1 rounded-md bg-stone-100 px-2 py-1">
                            <CalendarDays aria-hidden="true" size={13} />
                            {quote.createdAt.toLocaleDateString("ro-RO")}
                          </span>
                          <span className="rounded-md bg-stone-100 px-2 py-1">
                            Version {currentVersion?.versionNumber ?? "-"}
                          </span>
                          <span className="rounded-md bg-stone-100 px-2 py-1">
                            {formatMinor(currentVersion?.totalMinor)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="rounded-md border border-dashed border-zinc-300 bg-white p-6 text-center">
              <div className="mx-auto flex size-11 items-center justify-center rounded-md bg-stone-100 text-zinc-700">
                <FileText aria-hidden="true" size={20} />
              </div>
              <h2 className="mt-4 text-base font-semibold text-zinc-950">
                {hasFilters ? "No matching offers" : "No saved offers yet"}
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-600">
                {hasFilters
                  ? "Try a different customer, status, date, total, or author filter."
                  : "Create a draft quote shell for an existing customer."}
              </p>
              {!hasFilters ? (
                <Link
                  href="/dashboard/quotes/new"
                  className="mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white shadow-sm hover:bg-zinc-800"
                >
                  <Plus aria-hidden="true" size={17} />
                  New quote
                </Link>
              ) : null}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function StatusBadge({ status }: { status: QuoteStatus }) {
  const tone =
    status === QuoteStatus.DRAFT
      ? "bg-amber-100 text-amber-800"
      : status === QuoteStatus.ACCEPTED
        ? "bg-emerald-100 text-emerald-800"
        : status === QuoteStatus.REJECTED || status === QuoteStatus.ARCHIVED
          ? "bg-zinc-100 text-zinc-700"
          : "bg-sky-100 text-sky-800";

  return (
    <span className={`inline-flex rounded-md px-2 py-1 text-xs font-semibold ${tone}`}>
      {formatStatus(status)}
    </span>
  );
}

function parseDateStart(value: string | undefined) {
  if (!value) {
    return null;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  return Number.isNaN(date.getTime()) ? null : date;
}

function parseDateEnd(value: string | undefined) {
  if (!value) {
    return null;
  }

  const date = new Date(`${value}T23:59:59.999Z`);

  return Number.isNaN(date.getTime()) ? null : date;
}

function parseMinor(value: string | undefined) {
  if (!value) {
    return null;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed) : null;
}

function matchesTotalRange(value: bigint | number | null | undefined, min: number | null, max: number | null) {
  if (min === null && max === null) {
    return true;
  }

  if (value === null || value === undefined) {
    return false;
  }

  const total = typeof value === "bigint" ? Number(value) : value;

  return (min === null || total >= min) && (max === null || total <= max);
}

function formatMinor(value: bigint | number | null | undefined) {
  if (value === null || value === undefined) {
    return "Total pending";
  }

  const total = typeof value === "bigint" ? Number(value) : value;

  return new Intl.NumberFormat("ro-RO", {
    style: "currency",
    currency: "RON",
  }).format(total / 100);
}

function formatStatus(status: QuoteStatus) {
  return status
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
