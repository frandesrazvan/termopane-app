import { ArrowLeft, CalendarDays, FileText, Lock, UserRound } from "lucide-react";
import { QuoteStatus, QuoteVersionStatus } from "@prisma/client";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireTenant } from "@/lib/auth";
import {
  getTenantCustomer,
  getTenantProject,
  getTenantQuote,
  listTenantQuoteVersions,
} from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function QuoteDetailPage({
  params,
}: {
  params: Promise<{ quoteId: string }>;
}) {
  const context = await requireTenant();
  const { quoteId } = await params;
  const quote = await getTenantQuote(context, quoteId);

  if (!quote) {
    notFound();
  }

  const [customer, project, versions] = await Promise.all([
    getTenantCustomer(context, quote.customerId),
    quote.projectId ? getTenantProject(context, quote.projectId) : null,
    listTenantQuoteVersions(context, quote.id),
  ]);

  if (!customer) {
    notFound();
  }

  const currentVersion = versions.find((version) => version.id === quote.currentVersionId) ?? versions[0];

  return (
    <main className="min-h-screen bg-stone-50 px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-5xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link
              href="/dashboard/quotes"
              className="inline-flex items-center gap-2 text-sm font-medium text-zinc-600 hover:text-zinc-950"
            >
              <ArrowLeft aria-hidden="true" size={16} />
              Saved offers
            </Link>
            <h1 className="mt-3 text-2xl font-semibold text-zinc-950 sm:text-3xl">
              {quote.quoteNumber}
            </h1>
            <p className="mt-1 text-sm text-zinc-600">
              {quote.title || "Draft quote"}
            </p>
          </div>
          <StatusBadge status={quote.status} />
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className="rounded-md border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-md bg-sky-50 text-sky-800">
                <FileText aria-hidden="true" size={19} />
              </div>
              <h2 className="text-base font-semibold text-zinc-950">Quote shell</h2>
            </div>

            <dl className="mt-4 grid gap-3 sm:grid-cols-2">
              <Detail label="Customer" value={customer.displayName} />
              <Detail label="Project" value={project?.name ?? "No project"} />
              <Detail label="Currency" value={quote.currency} />
              <Detail label="Author" value={quote.createdById ?? "Not set"} />
              <Detail
                label="Created"
                value={quote.createdAt.toLocaleDateString("ro-RO")}
              />
              <Detail
                label="Updated"
                value={quote.updatedAt.toLocaleDateString("ro-RO")}
              />
              <Detail
                className="sm:col-span-2"
                label="Current total"
                value={formatMinor(currentVersion?.totalMinor)}
              />
            </dl>
          </section>

          <aside className="rounded-md border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-zinc-950">Customer</h2>
            <Link
              href={`/dashboard/customers/${customer.id}`}
              className="mt-4 flex items-center gap-3 rounded-md bg-stone-100 p-3 text-sm font-semibold text-zinc-800 hover:bg-stone-200"
            >
              <UserRound aria-hidden="true" size={17} />
              <span className="min-w-0 truncate">{customer.displayName}</span>
            </Link>
            {project ? (
              <Link
                href={`/dashboard/customers/${customer.id}/projects/${project.id}`}
                className="mt-3 block rounded-md bg-stone-100 p-3 text-sm font-semibold text-zinc-800 hover:bg-stone-200"
              >
                {project.name}
              </Link>
            ) : null}
          </aside>
        </div>

        <section className="mt-6 rounded-md border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-zinc-950">Versions</h2>
            <span className="text-sm font-medium text-zinc-500">{versions.length}</span>
          </div>

          {versions.length > 0 ? (
            <div className="mt-4 grid gap-3">
              {versions.map((version) => (
                <div key={version.id} className="rounded-md bg-stone-100 p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-zinc-950">
                        Version {version.versionNumber}
                      </h3>
                      <p className="mt-1 flex items-center gap-1 text-xs font-medium text-zinc-600">
                        <CalendarDays aria-hidden="true" size={13} />
                        {version.createdAt.toLocaleDateString("ro-RO")}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <VersionBadge status={version.status} isLocked={version.isLocked} />
                      {version.isLocked ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-zinc-200 px-2 py-1 text-xs font-semibold text-zinc-800">
                          <Lock aria-hidden="true" size={13} />
                          Locked
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="mt-3 grid gap-2 text-sm text-zinc-700 sm:grid-cols-3">
                    <p className="rounded-md bg-white px-3 py-2">
                      Subtotal {formatMinor(version.subtotalMinor)}
                    </p>
                    <p className="rounded-md bg-white px-3 py-2">
                      VAT {formatMinor(version.vatMinor)}
                    </p>
                    <p className="rounded-md bg-white px-3 py-2">
                      Total {formatMinor(version.totalMinor)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 rounded-md bg-stone-100 p-4 text-sm text-zinc-700">
              No versions have been saved for this quote.
            </p>
          )}
        </section>
      </div>
    </main>
  );
}

function Detail({
  className = "",
  label,
  value,
}: {
  className?: string;
  label: string;
  value?: string | null;
}) {
  return (
    <div className={`rounded-md bg-stone-100 p-3 ${className}`}>
      <dt className="text-xs font-medium uppercase text-zinc-500">{label}</dt>
      <dd className="mt-2 break-words text-sm font-medium text-zinc-800">
        {value || "Not set"}
      </dd>
    </div>
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
    <span className={`inline-flex rounded-md px-3 py-2 text-sm font-semibold ${tone}`}>
      {formatStatus(status)}
    </span>
  );
}

function VersionBadge({
  status,
  isLocked,
}: {
  status: QuoteVersionStatus;
  isLocked: boolean;
}) {
  const tone =
    status === QuoteVersionStatus.DRAFT && !isLocked
      ? "bg-amber-100 text-amber-800"
      : status === QuoteVersionStatus.SENT
        ? "bg-sky-100 text-sky-800"
        : "bg-zinc-200 text-zinc-800";

  return (
    <span className={`inline-flex rounded-md px-2 py-1 text-xs font-semibold ${tone}`}>
      {formatStatus(status)}
    </span>
  );
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

function formatStatus(status: string) {
  return status
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
