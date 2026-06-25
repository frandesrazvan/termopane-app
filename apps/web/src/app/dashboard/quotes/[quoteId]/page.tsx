import {
  ArrowLeft,
  CalendarDays,
  FileText,
  Lock,
  Pencil,
  Plus,
  Ruler,
  Trash2,
  UserRound,
} from "lucide-react";
import { QuoteItemType, QuoteStatus, QuoteVersionStatus, type QuoteItem } from "@prisma/client";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireTenant } from "@/lib/auth";
import {
  getTenantCustomer,
  getTenantProject,
  getTenantQuoteWithCurrentVersion,
  listTenantQuoteItems,
  listTenantQuoteVersions,
} from "@/lib/data";
import {
  addCustomLineItemAction,
  addFixedWindowItemAction,
  deleteQuoteItemAction,
  updateQuoteItemAction,
} from "./actions";

export const dynamic = "force-dynamic";

export default async function QuoteDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ quoteId: string }>;
  searchParams: Promise<{ itemError?: string }>;
}) {
  const context = await requireTenant();
  const { quoteId } = await params;
  const paramsValue = await searchParams;
  const quoteState = await getTenantQuoteWithCurrentVersion(context, quoteId);

  if (!quoteState) {
    notFound();
  }

  const { quote } = quoteState;
  const [customer, project, versions] = await Promise.all([
    getTenantCustomer(context, quote.customerId),
    quote.projectId ? getTenantProject(context, quote.projectId) : null,
    listTenantQuoteVersions(context, quote.id),
  ]);

  if (!customer) {
    notFound();
  }

  const currentVersion =
    quoteState.currentVersion ??
    versions.find((version) => version.id === quote.currentVersionId) ??
    versions[0] ??
    null;
  const items = currentVersion ? await listTenantQuoteItems(context, currentVersion.id) : [];
  const canEditItems = currentVersion ? isDraftVersionMutable(currentVersion) : false;

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

        <section id="items" className="mt-6 rounded-md border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-zinc-950">Quote items</h2>
              <p className="mt-1 text-sm text-zinc-600">
                Version {currentVersion?.versionNumber ?? "-"} draft contents
              </p>
            </div>
            <span className="inline-flex w-fit rounded-md bg-stone-100 px-2 py-1 text-sm font-medium text-zinc-600">
              {items.length} {items.length === 1 ? "item" : "items"}
            </span>
          </div>

          {paramsValue.itemError ? (
            <p className="mt-4 rounded-md bg-rose-50 px-3 py-2 text-sm font-medium text-rose-800">
              {paramsValue.itemError === "locked"
                ? "This quote version is locked or sent, so items cannot be edited."
                : "Check the item fields and try again."}
            </p>
          ) : null}

          {canEditItems ? (
            <AddItemForms quoteId={quote.id} currency={quote.currency} />
          ) : (
            <p className="mt-4 rounded-md bg-stone-100 p-4 text-sm text-zinc-700">
              Items are read-only because the current quote version is locked, sent, or missing.
            </p>
          )}

          {items.length > 0 ? (
            <div className="mt-5 grid gap-3">
              {items.map((item) => (
                <QuoteItemCard
                  key={item.id}
                  item={item}
                  quoteId={quote.id}
                  currency={quote.currency}
                  canEdit={canEditItems}
                />
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-md border border-dashed border-zinc-300 bg-stone-50 p-5 text-center">
              <div className="mx-auto flex size-11 items-center justify-center rounded-md bg-white text-zinc-700">
                <FileText aria-hidden="true" size={20} />
              </div>
              <h3 className="mt-4 text-base font-semibold text-zinc-950">No quote items yet</h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-600">
                Add a fixed-window draft item or a custom manual line to start building this quote.
              </p>
            </div>
          )}
        </section>

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

function AddItemForms({ quoteId, currency }: { quoteId: string; currency: string }) {
  return (
    <div className="mt-5 grid gap-3 lg:grid-cols-2">
      <details className="rounded-md border border-zinc-200 bg-stone-50 p-4">
        <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-zinc-950">
          <Plus aria-hidden="true" size={17} />
          Fixed window
        </summary>
        <form action={addFixedWindowItemAction.bind(null, quoteId)} className="mt-4 grid gap-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <NumberField label="Quantity" name="quantity" min={1} defaultValue="1" />
            <NumberField label="Width mm" name="widthMm" min={1} />
            <NumberField label="Height mm" name="heightMm" min={1} />
          </div>
          <TextField
            label="Customer description"
            name="customerDescription"
            placeholder="Fixed window 1200 x 1000"
            required
          />
          <TextAreaField label="Internal notes" name="internalNotes" />
          <SubmitButton label="Add fixed window" />
        </form>
      </details>

      <details className="rounded-md border border-zinc-200 bg-stone-50 p-4">
        <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-zinc-950">
          <Plus aria-hidden="true" size={17} />
          Custom line
        </summary>
        <form action={addCustomLineItemAction.bind(null, quoteId)} className="mt-4 grid gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <NumberField label="Quantity" name="quantity" min={1} defaultValue="1" />
            <TextField
              label={`Unit price (${currency})`}
              name="unitPrice"
              inputMode="decimal"
              placeholder="0.00"
              required
            />
          </div>
          <TextField
            label="Customer description"
            name="customerDescription"
            placeholder="Manual service or custom product line"
            required
          />
          <TextAreaField label="Internal notes" name="internalNotes" />
          <SubmitButton label="Add custom line" />
        </form>
      </details>
    </div>
  );
}

function QuoteItemCard({
  canEdit,
  currency,
  item,
  quoteId,
}: {
  canEdit: boolean;
  currency: string;
  item: QuoteItem;
  quoteId: string;
}) {
  const manualUnitPriceMinor = manualUnitPriceFromItem(item);

  return (
    <article className="rounded-md border border-zinc-200 bg-white p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase text-zinc-500">
            {item.type === QuoteItemType.WINDOW ? "Fixed window" : "Custom line"}
          </p>
          <h3 className="mt-1 break-words text-base font-semibold text-zinc-950">
            {item.customerDescription || "Untitled item"}
          </h3>
        </div>
        <span className="inline-flex w-fit rounded-md bg-stone-100 px-2 py-1 text-xs font-semibold text-zinc-700">
          Qty {item.quantity}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-xs font-medium text-zinc-600">
        {item.widthMm && item.heightMm ? (
          <span className="inline-flex items-center gap-1 rounded-md bg-stone-100 px-2 py-1">
            <Ruler aria-hidden="true" size={13} />
            {item.widthMm} x {item.heightMm} mm
          </span>
        ) : null}
        {manualUnitPriceMinor !== null ? (
          <span className="rounded-md bg-stone-100 px-2 py-1">
            Manual unit {formatMinor(manualUnitPriceMinor, currency)}
          </span>
        ) : null}
        <span className="rounded-md bg-stone-100 px-2 py-1">Totals pending</span>
      </div>

      {item.internalNotes ? (
        <p className="mt-3 break-words rounded-md bg-stone-50 px-3 py-2 text-sm text-zinc-700">
          {item.internalNotes}
        </p>
      ) : null}

      {canEdit ? (
        <div className="mt-4 grid gap-3">
          <details className="rounded-md bg-stone-50 p-3">
            <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-zinc-900">
              <Pencil aria-hidden="true" size={15} />
              Edit item
            </summary>
            <QuoteItemEditForm
              currency={currency}
              item={item}
              manualUnitPriceMinor={manualUnitPriceMinor}
              quoteId={quoteId}
            />
          </details>
          <form action={deleteQuoteItemAction.bind(null, quoteId, item.id)}>
            <button className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-rose-200 bg-white px-3 text-sm font-semibold text-rose-800 shadow-sm hover:bg-rose-50 sm:w-auto">
              <Trash2 aria-hidden="true" size={15} />
              Delete item
            </button>
          </form>
        </div>
      ) : null}
    </article>
  );
}

function QuoteItemEditForm({
  currency,
  item,
  manualUnitPriceMinor,
  quoteId,
}: {
  currency: string;
  item: QuoteItem;
  manualUnitPriceMinor: number | null;
  quoteId: string;
}) {
  return (
    <form action={updateQuoteItemAction.bind(null, quoteId, item.id)} className="mt-4 grid gap-3">
      <input type="hidden" name="itemType" value={item.type} />
      <div className="grid gap-3 sm:grid-cols-3">
        <NumberField label="Quantity" name="quantity" min={1} defaultValue={String(item.quantity)} />
        {item.type === QuoteItemType.WINDOW ? (
          <>
            <NumberField
              label="Width mm"
              name="widthMm"
              min={1}
              defaultValue={item.widthMm ? String(item.widthMm) : ""}
            />
            <NumberField
              label="Height mm"
              name="heightMm"
              min={1}
              defaultValue={item.heightMm ? String(item.heightMm) : ""}
            />
          </>
        ) : (
          <TextField
            label={`Unit price (${currency})`}
            name="unitPrice"
            inputMode="decimal"
            defaultValue={manualUnitPriceMinor === null ? "" : minorInput(manualUnitPriceMinor)}
            required
          />
        )}
      </div>
      <TextField
        label="Customer description"
        name="customerDescription"
        defaultValue={item.customerDescription ?? ""}
        required
      />
      <TextAreaField label="Internal notes" name="internalNotes" defaultValue={item.internalNotes ?? ""} />
      <SubmitButton label="Save item" />
    </form>
  );
}

function NumberField({
  defaultValue,
  label,
  min,
  name,
}: {
  defaultValue?: string;
  label: string;
  min?: number;
  name: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-zinc-800">{label}</span>
      <input
        name={name}
        type="number"
        min={min}
        required
        defaultValue={defaultValue}
        inputMode="numeric"
        className="mt-2 h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-950 outline-none focus:border-zinc-900"
      />
    </label>
  );
}

function TextField({
  defaultValue,
  inputMode,
  label,
  name,
  placeholder,
  required = false,
}: {
  defaultValue?: string;
  inputMode?: "decimal" | "numeric" | "search" | "text";
  label: string;
  name: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-zinc-800">{label}</span>
      <input
        name={name}
        required={required}
        defaultValue={defaultValue}
        inputMode={inputMode}
        placeholder={placeholder}
        className="mt-2 h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-950 outline-none focus:border-zinc-900"
      />
    </label>
  );
}

function TextAreaField({
  defaultValue,
  label,
  name,
}: {
  defaultValue?: string;
  label: string;
  name: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-zinc-800">{label}</span>
      <textarea
        name={name}
        defaultValue={defaultValue}
        rows={3}
        className="mt-2 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 outline-none focus:border-zinc-900"
      />
    </label>
  );
}

function SubmitButton({ label }: { label: string }) {
  return (
    <button className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white shadow-sm hover:bg-zinc-800 sm:w-fit">
      <Plus aria-hidden="true" size={16} />
      {label}
    </button>
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

function isDraftVersionMutable(quoteVersion: {
  status: QuoteVersionStatus;
  isLocked: boolean;
  lockedAt: Date | null;
  sentAt: Date | null;
}) {
  return (
    quoteVersion.status === QuoteVersionStatus.DRAFT &&
    !quoteVersion.isLocked &&
    !quoteVersion.lockedAt &&
    !quoteVersion.sentAt
  );
}

function manualUnitPriceFromItem(item: QuoteItem) {
  const configuration = asRecord(item.configurationSnapshot);
  const manualPricing = asRecord(configuration?.manualPricing);
  const unitPriceMinor = manualPricing?.unitPriceMinor;

  return typeof unitPriceMinor === "number" && Number.isFinite(unitPriceMinor)
    ? unitPriceMinor
    : null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function minorInput(value: number) {
  return (value / 100).toFixed(2);
}

function formatMinor(value: bigint | number | null | undefined, currency = "RON") {
  if (value === null || value === undefined) {
    return "Total pending";
  }

  const total = typeof value === "bigint" ? Number(value) : value;

  return new Intl.NumberFormat("ro-RO", {
    style: "currency",
    currency,
  }).format(total / 100);
}

function formatStatus(status: string) {
  return status
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
