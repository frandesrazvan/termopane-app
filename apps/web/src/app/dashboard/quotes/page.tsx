import { ArrowLeft, Bookmark, CalendarDays, FileText, Filter, Plus, Save, Search } from "lucide-react";
import { QuoteStatus, QuoteVersionStatus } from "@prisma/client";
import Link from "next/link";
import { requireTenant } from "@/lib/auth";
import {
  getTenantProject,
  getTenantQuoteCalculationResult,
  getTenantQuoteVersion,
  listTenantCustomers,
  listTenantProjects,
  listTenantQuoteDocuments,
  listTenantQuotes,
  listTenantSavedFilters,
} from "@/lib/data";
import {
  formatMoneyMinorRo,
  quoteStatusLabel,
  quoteVersionStatusLabel,
} from "@/lib/i18n";
import {
  hasSavedOfferFilter,
  matchesSavedOfferWorkflowFilter,
  quoteListOptionsFromSavedOfferFilter,
  savedOfferFilterFromJson,
  savedOfferFilterFromSearchParams,
  savedOfferFilterToSearchParams,
  savedOfferQuickFilters,
  warningCount,
  type SavedOfferFilter,
  type SavedOfferQuickFilterKey,
} from "@/lib/quotes/saved-offer-filters";
import { saveQuoteFilterAction } from "./actions";

const quoteStatuses = Object.values(QuoteStatus);

export const dynamic = "force-dynamic";

export default async function QuotesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const context = await requireTenant();
  const params = await searchParams;
  const savedFilters = await listTenantSavedFilters(context, {
    entityType: "Quote",
    userId: context.user.id,
  });
  const activeSavedFilter =
    savedFilters.find((filter) => filter.id === params.savedFilterId) ?? null;
  const activeFilter = activeSavedFilter
    ? savedOfferFilterFromJson(activeSavedFilter.filter)
    : savedOfferFilterFromSearchParams(params);
  const quoteListOptions = quoteListOptionsFromSavedOfferFilter(activeFilter);
  const [customers, projects, quotes] = await Promise.all([
    listTenantCustomers(context),
    listTenantProjects(context),
    listTenantQuotes(context, quoteListOptions),
  ]);
  const customerNames = new Map(customers.map((customer) => [customer.id, customer.displayName]));
  const projectNames = new Map(projects.map((project) => [project.id, project.name]));
  const rows = await Promise.all(
    quotes.map(async (quote) => {
      const currentVersion = quote.currentVersionId
        ? await getTenantQuoteVersion(context, quote.currentVersionId)
        : null;
      const [project, calculationResult, documents] = await Promise.all([
        quote.projectId ? getTenantProject(context, quote.projectId) : null,
        currentVersion ? getTenantQuoteCalculationResult(context, currentVersion.id) : null,
        currentVersion ? listTenantQuoteDocuments(context, currentVersion.id) : [],
      ]);

      return {
        quote,
        currentVersion,
        project,
        documentCount: documents.length,
        hasCalculation: Boolean(calculationResult),
        calculationWarningCount: warningCount(calculationResult?.warnings),
      };
    }),
  );
  const filteredRows = rows.filter((row) =>
    matchesSavedOfferWorkflowFilter(row, activeFilter),
  );
  const hasFilters = hasSavedOfferFilter(activeFilter);

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
              Oferte salvate
            </h1>
            <p className="mt-1 text-sm text-zinc-600">{context.tenant.name}</p>
          </div>
          <Link
            href="/dashboard/quotes/new"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white shadow-sm hover:bg-zinc-800"
          >
            <Plus aria-hidden="true" size={17} />
            Ofertă nouă
          </Link>
        </div>

        {params.saved === "1" ? (
          <p className="mt-5 rounded-md bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">
            Filtrul a fost salvat pentru ofertele tale.
          </p>
        ) : null}
        {params.filterError ? (
          <p className="mt-5 rounded-md bg-rose-50 px-3 py-2 text-sm font-medium text-rose-800">
            Completează un nume și cel puțin un criteriu înainte de salvare.
          </p>
        ) : null}

        <section className="mt-6 rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-zinc-950">
            <Filter aria-hidden="true" size={17} />
            Filtre rapide
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {savedOfferQuickFilters.map((filter) => (
              <QuickFilterLink
                active={activeFilter.quickFilter === filter.key}
                filterKey={filter.key}
                key={filter.key}
                label={filter.label}
              />
            ))}
          </div>
        </section>

        {savedFilters.length > 0 ? (
          <section className="mt-4 rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-zinc-950">
              <Bookmark aria-hidden="true" size={17} />
              Filtre salvate
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {savedFilters.map((filter) => (
                <Link
                  aria-current={activeSavedFilter?.id === filter.id ? "page" : undefined}
                  className={
                    activeSavedFilter?.id === filter.id
                      ? "inline-flex h-9 items-center rounded-md bg-zinc-950 px-3 text-sm font-semibold text-white"
                      : "inline-flex h-9 items-center rounded-md border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-700 hover:bg-stone-50"
                  }
                  href={`/dashboard/quotes?savedFilterId=${filter.id}`}
                  key={filter.id}
                >
                  {filter.name}
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        <form action="/dashboard/quotes" className="mt-6 rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label className="block">
              <span className="text-sm font-medium text-zinc-800">Client</span>
              <select
                name="customerId"
                defaultValue={activeFilter.customerId ?? ""}
                className="mt-2 h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-950 outline-none focus:border-zinc-900"
              >
                <option value="">Toți clienții</option>
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
                defaultValue={activeFilter.status ?? ""}
                className="mt-2 h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-950 outline-none focus:border-zinc-900"
              >
                <option value="">Toate statusurile</option>
                {quoteStatuses.map((quoteStatus) => (
                  <option key={quoteStatus} value={quoteStatus}>
                    {quoteStatusLabel(quoteStatus)}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-medium text-zinc-800">Autor</span>
              <input
                name="authorId"
                defaultValue={activeFilter.createdById ?? ""}
                placeholder="ID utilizator"
                className="mt-2 h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-950 outline-none focus:border-zinc-900"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-zinc-800">De la</span>
              <input
                name="createdFrom"
                type="date"
                defaultValue={activeFilter.createdFrom ?? ""}
                className="mt-2 h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-950 outline-none focus:border-zinc-900"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-zinc-800">Până la</span>
              <input
                name="createdTo"
                type="date"
                defaultValue={activeFilter.createdTo ?? ""}
                className="mt-2 h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-950 outline-none focus:border-zinc-900"
              />
            </label>

            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className="text-sm font-medium text-zinc-800">Total minim</span>
                <input
                  name="totalMinMinor"
                  type="number"
                  min="0"
                  step="1"
                  defaultValue={activeFilter.totalMinMinor ?? ""}
                  placeholder="bani"
                  className="mt-2 h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-950 outline-none focus:border-zinc-900"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-zinc-800">Total maxim</span>
                <input
                  name="totalMaxMinor"
                  type="number"
                  min="0"
                  step="1"
                  defaultValue={activeFilter.totalMaxMinor ?? ""}
                  placeholder="bani"
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
                Șterge filtrele
              </Link>
            ) : null}
            <button className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white shadow-sm hover:bg-zinc-800">
              <Search aria-hidden="true" size={17} />
              Filtrează ofertele
            </button>
          </div>
        </form>

        {hasFilters ? (
          <form
            action={saveQuoteFilterAction}
            className="mt-3 rounded-md border border-zinc-200 bg-white p-4 shadow-sm"
          >
            <SavedFilterHiddenInputs filter={activeFilter} />
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <label className="block flex-1">
                <span className="text-sm font-medium text-zinc-800">Nume filtru salvat</span>
                <input
                  className="mt-2 h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-950 outline-none focus:border-zinc-900"
                  defaultValue={activeSavedFilter?.name ?? ""}
                  maxLength={80}
                  name="filterName"
                  placeholder="Ex. Oferte cu avertizări"
                  required
                />
              </label>
              <button className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-teal-700 px-4 text-sm font-semibold text-white shadow-sm hover:bg-teal-800">
                <Save aria-hidden="true" size={17} />
                Salvează filtrul
              </button>
            </div>
          </form>
        ) : null}

        <section className="mt-6">
          {filteredRows.length > 0 ? (
            <div className="grid gap-3">
              {filteredRows.map(
                ({
                  quote,
                  currentVersion,
                  project,
                  documentCount,
                  hasCalculation,
                  calculationWarningCount,
                }) => {
                const projectLabel = quote.projectId
                  ? (project?.name ?? projectNames.get(quote.projectId) ?? "Proiect")
                  : null;
                const warnings =
                  warningCount(currentVersion?.warningsSnapshot) + calculationWarningCount;

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
                              {customerNames.get(quote.customerId) ?? "Client necunoscut"}
                              {projectLabel ? ` · ${projectLabel}` : ""}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <StatusBadge status={quote.status} />
                            {currentVersion ? (
                              <VersionStatusBadge status={currentVersion.status} />
                            ) : null}
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2 text-xs font-medium text-zinc-600">
                          <span className="inline-flex items-center gap-1 rounded-md bg-stone-100 px-2 py-1">
                            <CalendarDays aria-hidden="true" size={13} />
                            {quote.createdAt.toLocaleDateString("ro-RO")}
                          </span>
                          <span className="rounded-md bg-stone-100 px-2 py-1">
                            Versiunea {currentVersion?.versionNumber ?? "-"}
                          </span>
                          <span className="rounded-md bg-stone-100 px-2 py-1">
                            {formatMinor(currentVersion?.totalMinor)}
                          </span>
                          {documentCount > 0 ? (
                            <span className="rounded-md bg-emerald-50 px-2 py-1 text-emerald-800">
                              PDF generat
                            </span>
                          ) : null}
                          {!hasCalculation ? (
                            <span className="rounded-md bg-amber-50 px-2 py-1 text-amber-800">
                              Fără calcul
                            </span>
                          ) : null}
                          {warnings > 0 ? (
                            <span className="rounded-md bg-rose-50 px-2 py-1 text-rose-800">
                              {warnings} avertizări
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              },
              )}
            </div>
          ) : (
            <div className="rounded-md border border-dashed border-zinc-300 bg-white p-6 text-center">
              <div className="mx-auto flex size-11 items-center justify-center rounded-md bg-stone-100 text-zinc-700">
                <FileText aria-hidden="true" size={20} />
              </div>
              <h2 className="mt-4 text-base font-semibold text-zinc-950">
                {hasFilters ? "Nu există oferte potrivite" : "Nu există oferte salvate încă"}
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-600">
                {hasFilters
                  ? "Încearcă alt client, status, interval, total sau autor."
                  : "Creează o ciornă de ofertă pentru un client existent."}
              </p>
              {!hasFilters ? (
                <Link
                  href="/dashboard/quotes/new"
                  className="mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white shadow-sm hover:bg-zinc-800"
                >
                  <Plus aria-hidden="true" size={17} />
                  Ofertă nouă
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
      {quoteStatusLabel(status)}
    </span>
  );
}

function VersionStatusBadge({ status }: { status: QuoteVersionStatus }) {
  const tone =
    status === QuoteVersionStatus.DRAFT
      ? "bg-amber-50 text-amber-800"
      : status === QuoteVersionStatus.SENT
        ? "bg-emerald-50 text-emerald-800"
        : status === QuoteVersionStatus.SUPERSEDED
          ? "bg-zinc-100 text-zinc-700"
          : "bg-sky-50 text-sky-800";

  return (
    <span className={`inline-flex rounded-md px-2 py-1 text-xs font-semibold ${tone}`}>
      Versiune {quoteVersionStatusLabel(status)}
    </span>
  );
}

function QuickFilterLink({
  active,
  filterKey,
  label,
}: {
  active: boolean;
  filterKey: SavedOfferQuickFilterKey;
  label: string;
}) {
  const params = savedOfferFilterToSearchParams({ quickFilter: filterKey });

  return (
    <Link
      aria-current={active ? "page" : undefined}
      className={
        active
          ? "inline-flex h-9 items-center rounded-md bg-zinc-950 px-3 text-sm font-semibold text-white"
          : "inline-flex h-9 items-center rounded-md border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-700 hover:bg-stone-50"
      }
      href={`/dashboard/quotes?${params.toString()}`}
    >
      {label}
    </Link>
  );
}

function SavedFilterHiddenInputs({ filter }: { filter: SavedOfferFilter }) {
  return (
    <>
      <input name="quickFilter" type="hidden" value={filter.quickFilter ?? ""} />
      <input name="customerId" type="hidden" value={filter.customerId ?? ""} />
      <input name="status" type="hidden" value={filter.status ?? ""} />
      <input name="createdById" type="hidden" value={filter.createdById ?? ""} />
      <input name="createdFrom" type="hidden" value={filter.createdFrom ?? ""} />
      <input name="createdTo" type="hidden" value={filter.createdTo ?? ""} />
      <input
        name="totalMinMinor"
        type="hidden"
        value={filter.totalMinMinor ?? ""}
      />
      <input
        name="totalMaxMinor"
        type="hidden"
        value={filter.totalMaxMinor ?? ""}
      />
    </>
  );
}

function formatMinor(value: bigint | number | null | undefined) {
  if (value === null || value === undefined) {
    return "Total în așteptare";
  }

  const total = typeof value === "bigint" ? Number(value) : value;

  return formatMoneyMinorRo(total, "RON");
}
