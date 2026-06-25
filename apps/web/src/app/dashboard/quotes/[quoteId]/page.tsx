import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  Calculator,
  FileText,
  Lock,
  Pencil,
  Plus,
  RefreshCw,
  Ruler,
  Trash2,
  UserRound,
} from "lucide-react";
import {
  QuoteItemType,
  QuoteStatus,
  QuoteVersionStatus,
  type QuoteCalculationResult,
  type QuoteItem,
  type QuoteVersion,
} from "@prisma/client";
import Link from "next/link";
import { notFound } from "next/navigation";
import { canViewInternalCosts, requireTenant } from "@/lib/auth";
import {
  getTenantCustomer,
  getTenantProject,
  getTenantQuoteCalculationResult,
  getTenantQuoteWithCurrentVersion,
  listTenantQuoteItems,
  listTenantQuoteVersions,
} from "@/lib/data";
import {
  addCustomLineItemAction,
  addFixedWindowItemAction,
  createQuoteRevisionAction,
  deleteQuoteItemAction,
  lockCurrentQuoteVersionAction,
  recalculateCurrentQuoteVersionAction,
  updateQuoteItemAction,
} from "./actions";
import { QuoteItemDrawingPreview } from "./quote-item-drawing-preview";

export const dynamic = "force-dynamic";

export default async function QuoteDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ quoteId: string }>;
  searchParams: Promise<{
    calculated?: string;
    calculationError?: string;
    itemError?: string;
    versionError?: string;
    versionEvent?: string;
  }>;
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
  let items: QuoteItem[] = [];
  let calculationResult: QuoteCalculationResult | null = null;

  if (currentVersion) {
    [items, calculationResult] = await Promise.all([
      listTenantQuoteItems(context, currentVersion.id),
      getTenantQuoteCalculationResult(context, currentVersion.id),
    ]);
  }

  const canEditItems = currentVersion ? isDraftVersionMutable(currentVersion) : false;
  const canCreateRevision = currentVersion ? isLockedOrSentVersion(currentVersion) : false;
  const canViewInternalTrace = canViewInternalCosts(context.membership);

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
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            <Link
              href={`/dashboard/quotes/${quote.id}/preview`}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-white px-3 text-sm font-semibold text-zinc-800 shadow-sm ring-1 ring-zinc-200 hover:bg-stone-100"
            >
              <FileText aria-hidden="true" size={15} />
              Preview offer
            </Link>
            <StatusBadge status={quote.status} />
          </div>
        </div>

        <VersionLifecyclePanel
          canCreateRevision={canCreateRevision}
          canLockVersion={canEditItems}
          currentVersion={currentVersion}
          quoteId={quote.id}
          versionError={paramsValue.versionError}
          versionEvent={paramsValue.versionEvent}
        />

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

        <CalculationReviewCard
          calculationError={paramsValue.calculationError}
          calculationResult={calculationResult}
          canRecalculate={canEditItems}
          canViewInternalTrace={canViewInternalTrace}
          currency={quote.currency}
          currentVersion={currentVersion}
          quoteId={quote.id}
          wasCalculated={paramsValue.calculated === "1"}
        />

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

function VersionLifecyclePanel({
  canCreateRevision,
  canLockVersion,
  currentVersion,
  quoteId,
  versionError,
  versionEvent,
}: {
  canCreateRevision: boolean;
  canLockVersion: boolean;
  currentVersion: QuoteVersion | null;
  quoteId: string;
  versionError?: string;
  versionEvent?: string;
}) {
  if (!currentVersion) {
    return null;
  }

  return (
    <section className="mt-6 rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
      {versionEvent ? (
        <p className="mb-3 rounded-md bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">
          {versionEvent === "locked"
            ? "Current version was locked for document generation."
            : "A new draft revision was created from the locked version."}
        </p>
      ) : null}
      {versionError ? (
        <p className="mb-3 rounded-md bg-rose-50 px-3 py-2 text-sm font-medium text-rose-800">
          {versionError === "lock"
            ? "This version could not be locked. Refresh and check whether it is still a draft."
            : "A revision could not be created from this version."}
        </p>
      ) : null}

      {canLockVersion ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-zinc-950">
              Version {currentVersion.versionNumber} is editable
            </h2>
            <p className="mt-1 text-sm text-zinc-600">
              Lock this draft before generating customer-facing documents.
            </p>
          </div>
          <form action={lockCurrentQuoteVersionAction.bind(null, quoteId)}>
            <button className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-zinc-950 px-3 text-sm font-semibold text-white shadow-sm hover:bg-zinc-800 sm:w-auto">
              <Lock aria-hidden="true" size={15} />
              Lock version
            </button>
          </form>
        </div>
      ) : null}

      {canCreateRevision ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-zinc-950">
              Version {currentVersion.versionNumber} is locked
            </h2>
            <p className="mt-1 text-sm text-zinc-600">
              Create a revision before editing items, totals, or calculation snapshots.
            </p>
          </div>
          <form action={createQuoteRevisionAction.bind(null, quoteId)}>
            <button className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-zinc-950 px-3 text-sm font-semibold text-white shadow-sm hover:bg-zinc-800 sm:w-auto">
              <Plus aria-hidden="true" size={15} />
              Create revision
            </button>
          </form>
        </div>
      ) : null}
    </section>
  );
}

function CalculationReviewCard({
  calculationError,
  calculationResult,
  canRecalculate,
  canViewInternalTrace,
  currency,
  currentVersion,
  quoteId,
  wasCalculated,
}: {
  calculationError?: string;
  calculationResult: QuoteCalculationResult | null;
  canRecalculate: boolean;
  canViewInternalTrace: boolean;
  currency: string;
  currentVersion: QuoteVersion | null;
  quoteId: string;
  wasCalculated: boolean;
}) {
  const output = asRecord(calculationResult?.outputSnapshot);
  const metrics = calculationMetrics(output);
  const warnings = calculationWarnings(currentVersion, calculationResult, output);
  const traceSummary = asRecord(currentVersion?.traceSummary);
  const traceCount = numberFrom(traceSummary?.traceEntryCount) ?? arrayLength(calculationResult?.trace);
  const traceSteps = traceStepNames(calculationResult);

  return (
    <section id="calculation" className="mt-6 rounded-md border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-emerald-50 text-emerald-800">
            <Calculator aria-hidden="true" size={19} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-zinc-950">Calculation review</h2>
            <p className="mt-1 text-sm text-zinc-600">
              Version {currentVersion?.versionNumber ?? "-"} stored totals and warnings
            </p>
          </div>
        </div>
        {canRecalculate ? (
          <form action={recalculateCurrentQuoteVersionAction.bind(null, quoteId)}>
            <button className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-zinc-950 px-3 text-sm font-semibold text-white shadow-sm hover:bg-zinc-800 sm:w-auto">
              <RefreshCw aria-hidden="true" size={15} />
              Recalculate
            </button>
          </form>
        ) : (
          <span className="inline-flex w-fit rounded-md bg-stone-100 px-2 py-1 text-sm font-medium text-zinc-600">
            Read-only
          </span>
        )}
      </div>

      {calculationError ? (
        <p className="mt-4 rounded-md bg-rose-50 px-3 py-2 text-sm font-medium text-rose-800">
          This quote version is locked or sent, so it cannot be recalculated in place.
        </p>
      ) : null}
      {wasCalculated ? (
        <p className="mt-4 rounded-md bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">
          Calculation snapshots were refreshed.
        </p>
      ) : null}

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <Metric label="Subtotal" value={formatMinor(currentVersion?.subtotalMinor, currency)} />
        <Metric label="VAT" value={formatMinor(currentVersion?.vatMinor, currency)} />
        <Metric label="Total" value={formatMinor(currentVersion?.totalMinor, currency)} emphasized />
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <Metric label="Material requirements" value={String(metrics.materialRequirementsCount)} />
        <Metric label="Glass cuts" value={String(metrics.glassCutsCount)} />
        <Metric label="Profile meters" value={`${formatMeasurement(metrics.profileMeters)} m`} />
      </div>

      {!calculationResult ? (
        <p className="mt-4 rounded-md bg-stone-100 p-4 text-sm text-zinc-700">
          No calculation has been stored for this version yet.
        </p>
      ) : null}

      {warnings.length > 0 ? (
        <div className="mt-5 rounded-md border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-amber-900">
            <AlertTriangle aria-hidden="true" size={16} />
            Warnings
          </div>
          <ul className="mt-3 grid gap-2">
            {warnings.map((warning, index) => (
              <li key={`${warning.code}-${warning.path ?? index}`} className="text-sm text-amber-900">
                <span className="font-semibold">{warning.code}</span>
                {warning.message ? ` - ${warning.message}` : ""}
              </li>
            ))}
          </ul>
        </div>
      ) : calculationResult ? (
        <p className="mt-4 rounded-md bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">
          No calculation warnings are stored for this version.
        </p>
      ) : null}

      {traceCount > 0 ? (
        canViewInternalTrace ? (
          <div className="mt-4 rounded-md bg-stone-100 p-4 text-sm text-zinc-700">
            <p className="font-semibold text-zinc-900">Trace entries: {traceCount}</p>
            {traceSteps.length > 0 ? (
              <p className="mt-2 break-words">
                Steps: {traceSteps.slice(0, 8).join(", ")}
              </p>
            ) : null}
          </div>
        ) : (
          <p className="mt-4 rounded-md bg-stone-100 p-4 text-sm text-zinc-700">
            Internal calculation trace is restricted for this role.
          </p>
        )
      ) : null}
    </section>
  );
}

function Metric({
  emphasized = false,
  label,
  value,
}: {
  emphasized?: boolean;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md bg-stone-100 p-3">
      <p className="text-xs font-medium uppercase text-zinc-500">{label}</p>
      <p className={`mt-2 break-words text-sm font-semibold ${emphasized ? "text-zinc-950" : "text-zinc-800"}`}>
        {value}
      </p>
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
  const itemTotals = totalsFromItem(item);

  return (
    <article className="rounded-md border border-zinc-200 bg-white p-4">
      <div className="grid gap-4 md:grid-cols-[minmax(0,260px)_minmax(0,1fr)]">
        <QuoteItemDrawingPreview item={item} />
        <div className="min-w-0">
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
            <span className="rounded-md bg-stone-100 px-2 py-1">
              {itemTotals ? `Total ${formatMinor(itemTotals.totalMinor, currency)}` : "Totals pending"}
            </span>
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
        </div>
      </div>
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

function isLockedOrSentVersion(quoteVersion: {
  status: QuoteVersionStatus;
  isLocked: boolean;
  lockedAt: Date | null;
  sentAt: Date | null;
}) {
  return (
    quoteVersion.isLocked ||
    quoteVersion.status === QuoteVersionStatus.LOCKED ||
    quoteVersion.status === QuoteVersionStatus.SENT ||
    Boolean(quoteVersion.lockedAt) ||
    Boolean(quoteVersion.sentAt)
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

type CalculationWarningView = {
  code: string;
  message?: string;
  path?: string;
};

function calculationMetrics(output: Record<string, unknown> | null) {
  const profileMeters = recordsFromArray(output?.profileLinearMeters).reduce(
    (sum, profileGroup) => sum + (numberFrom(profileGroup.totalLinearMeters) ?? 0),
    0,
  );

  return {
    materialRequirementsCount: arrayLength(output?.materialRequirements),
    glassCutsCount: arrayLength(output?.glassCuts),
    profileMeters,
  };
}

function calculationWarnings(
  currentVersion: QuoteVersion | null,
  calculationResult: QuoteCalculationResult | null,
  output: Record<string, unknown> | null,
) {
  const versionWarnings = warningRecords(currentVersion?.warningsSnapshot);

  if (versionWarnings.length > 0) {
    return versionWarnings;
  }

  const resultWarnings = warningRecords(calculationResult?.warnings);

  if (resultWarnings.length > 0) {
    return resultWarnings;
  }

  return warningRecords(output?.warnings);
}

function warningRecords(value: unknown): CalculationWarningView[] {
  return recordsFromArray(value).flatMap((warning) => {
    const code = stringFrom(warning.code);

    if (!code) {
      return [];
    }

    return [
      {
        code,
        message: stringFrom(warning.message),
        path: stringFrom(warning.path),
      },
    ];
  });
}

function traceStepNames(calculationResult: QuoteCalculationResult | null) {
  const steps = recordsFromArray(calculationResult?.trace).flatMap((entry) => {
    const step = stringFrom(entry.step);

    return step ? [step] : [];
  });

  return Array.from(new Set(steps));
}

function totalsFromItem(item: QuoteItem) {
  const totals = asRecord(item.totalsSnapshot);
  const totalMinor = numberFrom(totals?.totalMinor);

  if (!totals || totals.pendingCalculation === true || totalMinor === undefined) {
    return null;
  }

  return {
    totalMinor,
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function recordsFromArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.flatMap((entry) => {
        const record = asRecord(entry);

        return record ? [record] : [];
      })
    : [];
}

function arrayLength(value: unknown) {
  return Array.isArray(value) ? value.length : 0;
}

function numberFrom(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "bigint") {
    return Number(value);
  }

  return undefined;
}

function stringFrom(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function minorInput(value: number) {
  return (value / 100).toFixed(2);
}

function formatMeasurement(value: number) {
  return new Intl.NumberFormat("ro-RO", {
    maximumFractionDigits: 3,
  }).format(value);
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
