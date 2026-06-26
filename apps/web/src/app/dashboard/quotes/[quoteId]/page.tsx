import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  Calculator,
  CheckCircle2,
  Download,
  FileText,
  Lock,
  Mail,
  Pencil,
  Plus,
  RefreshCw,
  Ruler,
  Send,
  Trash2,
  UserRound,
} from "lucide-react";
import {
  ProfileItemType,
  QuoteItemType,
  QuoteStatus,
  QuoteVersionStatus,
  type Accessory,
  type ColorFinish,
  type QuoteCalculationResult,
  type Document,
  type GlassPackage,
  type HardwareKit,
  type ProfileItem,
  type ProfileSystem,
  type QuoteItem,
  type QuoteVersion,
  type ServiceItem,
} from "@prisma/client";
import type { QuotePdfTemplateKey } from "@termopane/pdf";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  canApplyCommercialOverrides,
  canGeneratePdf,
  canViewInternalCosts,
  requireTenant,
} from "@/lib/auth";
import {
  isSelectableCatalogRecord,
  selectActiveCatalogPriceList,
} from "@/lib/catalog/quote-item-catalog-snapshot";
import {
  getTenantCustomer,
  getTenantProject,
  getTenantQuoteCalculationResult,
  getTenantQuoteWithCurrentVersion,
  listTenantAccessories,
  listTenantColorFinishes,
  listTenantGlassPackages,
  listTenantHardwareKits,
  listTenantPriceLists,
  listTenantProfileItems,
  listTenantProfileSystems,
  listTenantQuoteDocuments,
  listTenantQuoteItems,
  listTenantQuoteVersions,
  listTenantServiceItems,
} from "@/lib/data";
import {
  commonLabel,
  formatDateRo,
  formatDateTimeRo,
  formatMoneyMinorRo,
  quoteItemTypeLabel,
  quoteStatusLabel,
  quoteVersionStatusLabel,
} from "@/lib/i18n";
import { defaultQuotePdfTemplateKeyFromVersion } from "@/lib/pdf/template-a-snapshot";
import {
  addAccessoryLineItemAction,
  addDoorItemAction,
  addCustomLineItemAction,
  addFixedWindowItemAction,
  addInstallationLineItemAction,
  addServiceLineItemAction,
  addTransportLineItemAction,
  applyItemManualOverrideAction,
  applyQuoteDiscountAction,
  createQuoteRevisionAction,
  deleteQuoteItemAction,
  generateQuotePdfAction,
  lockCurrentQuoteVersionAction,
  recalculateCurrentQuoteVersionAction,
  sendQuoteToCustomerAction,
  updateQuoteItemAction,
} from "./actions";
import {
  AccessoryLineCatalogFields,
  DoorCatalogFields,
  emptyFixedWindowCatalogFormOptions,
  FixedWindowCatalogFields,
  ServiceLineCatalogFields,
  type CatalogLineFieldDefaults,
  type FixedWindowCatalogFieldDefaults,
  type FixedWindowCatalogFormOptions,
} from "./quote-item-catalog-fields";
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
    commercialError?: string;
    commercialEvent?: string;
    itemError?: string;
    documentError?: string;
    documentEvent?: string;
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
  let documents: Document[] = [];

  if (currentVersion) {
    [items, calculationResult, documents] = await Promise.all([
      listTenantQuoteItems(context, currentVersion.id),
      getTenantQuoteCalculationResult(context, currentVersion.id),
      listTenantQuoteDocuments(context, currentVersion.id),
    ]);
  }

  const canEditItems = currentVersion
    ? isDraftVersionMutable(currentVersion)
    : false;
  const canCreateRevision = currentVersion
    ? isLockedOrSentVersion(currentVersion)
    : false;
  const canGenerateDocuments = canGeneratePdf(context.membership);
  const canViewInternalTrace = canViewInternalCosts(context.membership);
  const canApplyCommercialAdjustments =
    canEditItems && canApplyCommercialOverrides(context.membership);
  const defaultTemplateKey = currentVersion
    ? defaultQuotePdfTemplateKeyFromVersion(currentVersion)
    : "template-a";
  const catalogOptions = canEditItems
    ? await loadFixedWindowCatalogOptions(context, quote.currency)
    : emptyFixedWindowCatalogFormOptions();

  return (
    <main className="min-h-screen bg-stone-50 px-4 pt-5 pb-44 sm:px-6 lg:px-8 lg:pb-8">
      <div className="mx-auto w-full max-w-5xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link
              href="/dashboard/quotes"
              className="inline-flex items-center gap-2 text-sm font-medium text-zinc-600 hover:text-zinc-950"
            >
              <ArrowLeft aria-hidden="true" size={16} />
              Oferte salvate
            </Link>
            <h1 className="mt-3 text-2xl font-semibold text-zinc-950 sm:text-3xl">
              {quote.quoteNumber}
            </h1>
            <p className="mt-1 text-sm text-zinc-600">
              {quote.title || "Ciornă ofertă"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            <Link
              href={`/dashboard/quotes/${quote.id}/preview`}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-white px-3 text-sm font-semibold text-zinc-800 shadow-sm ring-1 ring-zinc-200 hover:bg-stone-100"
            >
              <FileText aria-hidden="true" size={15} />
              Previzualizare ofertă
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
              <h2 className="text-base font-semibold text-zinc-950">
                Structură ofertă
              </h2>
            </div>

            <dl className="mt-4 grid gap-3 sm:grid-cols-2">
              <Detail label="Client" value={customer.displayName} />
              <Detail label="Proiect" value={project?.name ?? "Fără proiect"} />
              <Detail label="Monedă" value={quote.currency} />
              <Detail
                label="Autor"
                value={quote.createdById ?? commonLabel("notSet")}
              />
              <Detail label="Creată" value={formatDateRo(quote.createdAt)} />
              <Detail
                label="Actualizată"
                value={formatDateRo(quote.updatedAt)}
              />
              <Detail
                className="sm:col-span-2"
                label="Total curent"
                value={formatMinor(currentVersion?.totalMinor)}
              />
            </dl>
          </section>

          <aside className="rounded-md border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-zinc-950">Client</h2>
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

        <section
          id="items"
          className="mt-6 rounded-md border border-zinc-200 bg-white p-5 shadow-sm"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-zinc-950">
                Poziții ofertă
              </h2>
              <p className="mt-1 text-sm text-zinc-600">
                Conținutul ciornei pentru versiunea{" "}
                {currentVersion?.versionNumber ?? "-"}
              </p>
            </div>
            <span className="inline-flex w-fit rounded-md bg-stone-100 px-2 py-1 text-sm font-medium text-zinc-600">
              {items.length} {items.length === 1 ? "poziție" : "poziții"}
            </span>
          </div>

          {paramsValue.itemError ? (
            <p className="mt-4 rounded-md bg-rose-50 px-3 py-2 text-sm font-medium text-rose-800">
              {paramsValue.itemError === "locked"
                ? "Această versiune este blocată sau trimisă, deci pozițiile nu pot fi editate."
                : "Verifică datele poziției și încearcă din nou."}
            </p>
          ) : null}
          {paramsValue.commercialError ? (
            <p className="mt-4 rounded-md bg-rose-50 px-3 py-2 text-sm font-medium text-rose-800">
              {paramsValue.commercialError === "locked"
                ? "Ajustarea comercială nu poate fi aplicată pe o versiune blocată sau trimisă."
                : "Completează valoarea și motivul ajustării comerciale."}
            </p>
          ) : null}
          {paramsValue.commercialEvent === "item-override" ? (
            <p className="mt-4 rounded-md bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">
              Ajustarea manuală a poziției a fost auditată și recalculată.
            </p>
          ) : null}

          {canEditItems ? (
            <AddItemForms
              quoteId={quote.id}
              currency={quote.currency}
              catalogOptions={catalogOptions}
            />
          ) : (
            <p className="mt-4 rounded-md bg-stone-100 p-4 text-sm text-zinc-700">
              Pozițiile sunt doar pentru citire deoarece versiunea curentă este
              blocată, trimisă sau lipsește.
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
                  canApplyCommercialAdjustments={canApplyCommercialAdjustments}
                  catalogOptions={catalogOptions}
                />
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-md border border-dashed border-zinc-300 bg-stone-50 p-5 text-center">
              <div className="mx-auto flex size-11 items-center justify-center rounded-md bg-white text-zinc-700">
                <FileText aria-hidden="true" size={20} />
              </div>
              <h3 className="mt-4 text-base font-semibold text-zinc-950">
                Nu există poziții încă
              </h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-600">
                Adaugă o fereastră fixă, o ușă sau o poziție personalizată
                pentru a începe oferta.
              </p>
            </div>
          )}
        </section>

        <CalculationReviewCard
          calculationError={paramsValue.calculationError}
          calculationResult={calculationResult}
          commercialError={paramsValue.commercialError}
          commercialEvent={paramsValue.commercialEvent}
          canApplyCommercialAdjustments={canApplyCommercialAdjustments}
          canRecalculate={canEditItems}
          canViewInternalTrace={canViewInternalTrace}
          currency={quote.currency}
          currentVersion={currentVersion}
          quoteId={quote.id}
          wasCalculated={paramsValue.calculated === "1"}
        />

        <QuoteDocumentsCard
          currentVersion={currentVersion}
          documentError={paramsValue.documentError}
          documentEvent={paramsValue.documentEvent}
          documents={documents}
          canGenerateDocuments={canGenerateDocuments}
          defaultTemplateKey={defaultTemplateKey}
          quoteId={quote.id}
        />

        <section className="mt-6 rounded-md border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-zinc-950">Versiuni</h2>
            <span className="text-sm font-medium text-zinc-500">
              {versions.length}
            </span>
          </div>

          {versions.length > 0 ? (
            <div className="mt-4 grid gap-3">
              {versions.map((version) => (
                <div key={version.id} className="rounded-md bg-stone-100 p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-zinc-950">
                        Versiunea {version.versionNumber}
                      </h3>
                      <p className="mt-1 flex items-center gap-1 text-xs font-medium text-zinc-600">
                        <CalendarDays aria-hidden="true" size={13} />
                        {formatDateRo(version.createdAt)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <VersionBadge
                        status={version.status}
                        isLocked={version.isLocked}
                      />
                      {version.isLocked ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-zinc-200 px-2 py-1 text-xs font-semibold text-zinc-800">
                          <Lock aria-hidden="true" size={13} />
                          Blocată
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="mt-3 grid gap-2 text-sm text-zinc-700 sm:grid-cols-3">
                    <p className="rounded-md bg-white px-3 py-2">
                      Subtotal {formatMinor(version.subtotalMinor)}
                    </p>
                    <p className="rounded-md bg-white px-3 py-2">
                      TVA {formatMinor(version.vatMinor)}
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
              Nu există versiuni salvate pentru această ofertă.
            </p>
          )}
        </section>

        <QuoteMobileActionBar
          canCreateRevision={canCreateRevision}
          canGenerateDocuments={canGenerateDocuments}
          canRecalculate={canEditItems}
          currentVersion={currentVersion}
          currency={quote.currency}
          defaultTemplateKey={defaultTemplateKey}
          quoteId={quote.id}
        />
      </div>
    </main>
  );
}

type TenantPageContext = Awaited<ReturnType<typeof requireTenant>>;

async function loadFixedWindowCatalogOptions(
  context: TenantPageContext,
  currency: string,
): Promise<FixedWindowCatalogFormOptions> {
  const [
    accessories,
    profileSystems,
    profileItems,
    glassPackages,
    colorFinishes,
    hardwareKits,
    serviceItems,
    priceLists,
  ] = await Promise.all([
    listTenantAccessories(context),
    listTenantProfileSystems(context),
    listTenantProfileItems(context),
    listTenantGlassPackages(context),
    listTenantColorFinishes(context),
    listTenantHardwareKits(context),
    listTenantServiceItems(context),
    listTenantPriceLists(context),
  ]);

  const selectableProfileSystems = profileSystems.filter(
    isSelectableProfileSystem,
  );

  return {
    profileSystems: selectableProfileSystems,
    frameProfiles: profileItems.filter(
      (profileItem): profileItem is ProfileItem =>
        isSelectableCatalogRecord(profileItem) &&
        profileItem.type === ProfileItemType.FRAME &&
        selectableProfileSystems.some(
          (profileSystem) => profileSystem.id === profileItem.profileSystemId,
        ),
    ),
    thresholdProfiles: profileItems.filter(
      (profileItem): profileItem is ProfileItem =>
        isSelectableCatalogRecord(profileItem) &&
        profileItem.type === ProfileItemType.THRESHOLD &&
        selectableProfileSystems.some(
          (profileSystem) => profileSystem.id === profileItem.profileSystemId,
        ),
    ),
    glassPackages: glassPackages.filter(isSelectableGlassPackage),
    colorFinishes: colorFinishes.filter(
      (colorFinish): colorFinish is ColorFinish =>
        isSelectableCatalogRecord(colorFinish) &&
        (!colorFinish.profileSystemId ||
          selectableProfileSystems.some(
            (profileSystem) => profileSystem.id === colorFinish.profileSystemId,
          )),
    ),
    hardwareKits: hardwareKits.filter(isSelectableHardwareKit),
    accessories: accessories.filter(isSelectableAccessory),
    serviceItems: serviceItems.filter(isSelectableServiceItem),
    activePriceList: selectActiveCatalogPriceList(priceLists, currency),
  };
}

function AddItemForms({
  catalogOptions,
  currency,
  quoteId,
}: {
  catalogOptions: FixedWindowCatalogFormOptions;
  currency: string;
  quoteId: string;
}) {
  return (
    <div className="mt-5 grid gap-3 lg:grid-cols-4">
      <details className="rounded-md border border-zinc-200 bg-stone-50 p-4">
        <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-zinc-950">
          <Plus aria-hidden="true" size={17} />
          Fereastră fixă
        </summary>
        <form
          action={addFixedWindowItemAction.bind(null, quoteId)}
          className="mt-4 grid gap-3"
        >
          <div className="grid gap-3 sm:grid-cols-3">
            <NumberField
              label="Cantitate"
              name="quantity"
              min={1}
              defaultValue="1"
            />
            <NumberField label="Lățime mm" name="widthMm" min={1} />
            <NumberField label="Înălțime mm" name="heightMm" min={1} />
          </div>
          <TextField
            label="Descriere pentru client"
            name="customerDescription"
            placeholder="Fereastră fixă 1200 x 1000"
            required
          />
          <TextAreaField label="Note interne" name="internalNotes" />
          <FixedWindowCatalogFields
            currency={currency}
            options={catalogOptions}
          />
          <SubmitButton label="Adaugă fereastră fixă" />
        </form>
      </details>

      <details className="rounded-md border border-zinc-200 bg-stone-50 p-4">
        <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-zinc-950">
          <Plus aria-hidden="true" size={17} />
          Ușă
        </summary>
        <form
          action={addDoorItemAction.bind(null, quoteId)}
          className="mt-4 grid gap-3"
        >
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            <NumberField
              label="Cantitate"
              name="quantity"
              min={1}
              defaultValue="1"
            />
            <NumberField label="Lățime mm" name="widthMm" min={1} />
            <NumberField label="Înălțime mm" name="heightMm" min={1} />
          </div>
          <TextField
            label="Descriere pentru client"
            name="customerDescription"
            placeholder="Ușă intrare 900 x 2100"
            required
          />
          <DoorCatalogFields currency={currency} options={catalogOptions} />
          <TextAreaField
            label="Descriere panou/manual"
            name="panelDescription"
          />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            <TextField
              label={`Preț manual panou (${currency})`}
              name="manualPanelPrice"
              inputMode="decimal"
              placeholder="0.00"
            />
            <TextField
              label="Feronerie placeholder"
              name="hardwareDescription"
              placeholder="Mâner, yală, balamale"
            />
          </div>
          <TextAreaField label="Note interne" name="internalNotes" />
          <SubmitButton label="Adaugă ușă" />
        </form>
      </details>

      <details className="rounded-md border border-zinc-200 bg-stone-50 p-4">
        <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-zinc-950">
          <Plus aria-hidden="true" size={17} />
          Poziție personalizată
        </summary>
        <form
          action={addCustomLineItemAction.bind(null, quoteId)}
          className="mt-4 grid gap-3"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <NumberField
              label="Cantitate"
              name="quantity"
              min={1}
              defaultValue="1"
            />
            <TextField
              label={`Preț unitar (${currency})`}
              name="unitPrice"
              inputMode="decimal"
              placeholder="0.00"
              required
            />
          </div>
          <TextField
            label="Descriere pentru client"
            name="customerDescription"
            placeholder="Serviciu manual sau produs personalizat"
            required
          />
          <TextAreaField label="Note interne" name="internalNotes" />
          <SubmitButton label="Adaugă poziție personalizată" />
        </form>
      </details>
      <details className="rounded-md border border-zinc-200 bg-stone-50 p-4">
        <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-zinc-950">
          <Plus aria-hidden="true" size={17} />
          Accesoriu
        </summary>
        <form
          action={addAccessoryLineItemAction.bind(null, quoteId)}
          className="mt-4 grid gap-3"
        >
          <CatalogLinePriceNotice
            activePriceList={catalogOptions.activePriceList}
            currency={currency}
          />
          <AccessoryLineCatalogFields options={catalogOptions} />
          <NumberField
            defaultValue="1"
            inputMode="decimal"
            label="Cantitate"
            min={0.01}
            name="quantity"
            step="0.01"
          />
          <TextField
            label="Descriere pentru client"
            name="customerDescription"
            placeholder="Implicit: denumirea din catalog"
          />
          <TextAreaField label="Note interne" name="internalNotes" />
          <SubmitButton label="Adaugă accesoriu" />
        </form>
      </details>

      <details className="rounded-md border border-zinc-200 bg-stone-50 p-4">
        <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-zinc-950">
          <Plus aria-hidden="true" size={17} />
          Serviciu
        </summary>
        <form
          action={addServiceLineItemAction.bind(null, quoteId)}
          className="mt-4 grid gap-3"
        >
          <CatalogLinePriceNotice
            activePriceList={catalogOptions.activePriceList}
            currency={currency}
          />
          <ServiceLineCatalogFields options={catalogOptions} />
          <NumberField
            defaultValue="1"
            inputMode="decimal"
            label="Cantitate"
            min={0.01}
            name="quantity"
            step="0.01"
          />
          <TextField
            label="Descriere pentru client"
            name="customerDescription"
            placeholder="Implicit: denumirea din catalog"
          />
          <TextAreaField label="Note interne" name="internalNotes" />
          <SubmitButton label="Adaugă serviciu" />
        </form>
      </details>

      <details className="rounded-md border border-zinc-200 bg-stone-50 p-4">
        <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-zinc-950">
          <Plus aria-hidden="true" size={17} />
          Transport
        </summary>
        <form
          action={addTransportLineItemAction.bind(null, quoteId)}
          className="mt-4 grid gap-3"
        >
          <CatalogLinePriceNotice
            activePriceList={catalogOptions.activePriceList}
            currency={currency}
          />
          <ServiceLineCatalogFields
            label="Serviciu transport"
            options={catalogOptions}
            placeholder="Alege serviciul de transport"
          />
          <NumberField
            defaultValue="1"
            inputMode="decimal"
            label="Cantitate"
            min={0.01}
            name="quantity"
            step="0.01"
          />
          <TextField
            label="Descriere pentru client"
            name="customerDescription"
            placeholder="Transport"
          />
          <TextAreaField label="Note interne" name="internalNotes" />
          <SubmitButton label="Adaugă transport" />
        </form>
      </details>

      <details className="rounded-md border border-zinc-200 bg-stone-50 p-4">
        <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-zinc-950">
          <Plus aria-hidden="true" size={17} />
          Montaj
        </summary>
        <form
          action={addInstallationLineItemAction.bind(null, quoteId)}
          className="mt-4 grid gap-3"
        >
          <CatalogLinePriceNotice
            activePriceList={catalogOptions.activePriceList}
            currency={currency}
          />
          <ServiceLineCatalogFields
            label="Serviciu montaj"
            options={catalogOptions}
            placeholder="Alege serviciul de montaj"
          />
          <NumberField
            defaultValue="1"
            inputMode="decimal"
            label="Cantitate"
            min={0.01}
            name="quantity"
            step="0.01"
          />
          <TextField
            label="Descriere pentru client"
            name="customerDescription"
            placeholder="Montaj"
          />
          <TextAreaField label="Note interne" name="internalNotes" />
          <SubmitButton label="Adaugă montaj" />
        </form>
      </details>
    </div>
  );
}

function CatalogLinePriceNotice({
  activePriceList,
  currency,
}: {
  activePriceList: FixedWindowCatalogFormOptions["activePriceList"];
  currency: string;
}) {
  if (activePriceList) {
    return (
      <p className="rounded-md bg-stone-100 px-3 py-2 text-sm font-medium text-zinc-700">
        Listă activă: {activePriceList.name} / {activePriceList.version}
      </p>
    );
  }

  return (
    <p className="rounded-md bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900">
      Nu există listă de prețuri activă pentru {currency}; calculul va marca
      preț lipsă.
    </p>
  );
}

function QuoteDocumentsCard({
  canGenerateDocuments,
  currentVersion,
  defaultTemplateKey,
  documentError,
  documentEvent,
  documents,
  quoteId,
}: {
  canGenerateDocuments: boolean;
  currentVersion: QuoteVersion | null;
  defaultTemplateKey: QuotePdfTemplateKey;
  documentError?: string;
  documentEvent?: string;
  documents: Document[];
  quoteId: string;
}) {
  const canGeneratePdfForVersion =
    canGenerateDocuments && currentVersion
      ? isLockedOrSentVersion(currentVersion)
      : false;
  const canSendDocuments =
    canGenerateDocuments && currentVersion
      ? isLockedVersionReadyForSend(currentVersion)
      : false;
  const sentAt = currentVersion?.sentAt;

  return (
    <section
      id="documents"
      className="mt-6 rounded-md border border-zinc-200 bg-white p-5 shadow-sm"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-zinc-950">Documente</h2>
          <p className="mt-1 text-sm text-zinc-600">
            PDF-uri imutabile Template A/B pentru versiunea{" "}
            {currentVersion?.versionNumber ?? "-"}
          </p>
        </div>
        {currentVersion && canGeneratePdfForVersion ? (
          <form
            action={generateQuotePdfAction.bind(
              null,
              quoteId,
              currentVersion.id,
            )}
            className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center"
          >
            <label className="sr-only" htmlFor="quote-template-key">
              Șablon PDF
            </label>
            <select
              className="h-10 rounded-md border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-800 shadow-sm"
              defaultValue={defaultTemplateKey}
              id="quote-template-key"
              name="templateKey"
            >
              <option value="template-a">Template A - ofertă detaliată</option>
              <option value="template-b">
                Template B - propunere compactă
              </option>
            </select>
            <button className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-zinc-950 px-3 text-sm font-semibold text-white shadow-sm hover:bg-zinc-800 sm:w-auto">
              <FileText aria-hidden="true" size={15} />
              Generează PDF
            </button>
          </form>
        ) : (
          <span className="inline-flex w-fit rounded-md bg-stone-100 px-2 py-1 text-sm font-medium text-zinc-600">
            {canGenerateDocuments
              ? "Blochează versiunea întâi"
              : "Generare PDF nepermisă"}
          </span>
        )}
      </div>

      {documentEvent ? (
        <p className="mt-4 rounded-md bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">
          Documentul PDF a fost generat și stocat pentru această versiune.
        </p>
      ) : null}
      {sentAt ? (
        <p className="mt-4 flex items-start gap-2 rounded-md bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">
          <CheckCircle2
            className="mt-0.5 shrink-0"
            aria-hidden="true"
            size={16}
          />
          <span>
            Oferta a fost marcată ca trimisă la {formatDateTimeRo(sentAt)}.
            Orice schimbare se face printr-o revizie nouă.
          </span>
        </p>
      ) : null}
      {documentError ? (
        <p className="mt-4 rounded-md bg-rose-50 px-3 py-2 text-sm font-medium text-rose-800">
          {documentError === "locked"
            ? "Blochează versiunea înainte de a genera un PDF pentru client."
            : documentError === "recipient"
              ? "Completează o adresă email validă sau lasă câmpul gol pentru confirmare fără email."
              : documentError === "send"
                ? "Oferta nu a putut fi trimisă. Verifică dacă versiunea este blocată și PDF-ul aparține acestei oferte."
                : "PDF-ul nu a putut fi generat. Verifică versiunea ofertei și stocarea locală."}
        </p>
      ) : null}

      {documents.length > 0 ? (
        <div className="mt-5 grid gap-3">
          {documents.map((document) => (
            <div
              key={document.id}
              className="rounded-md border border-zinc-200 bg-stone-50 p-4"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <h3 className="break-words text-sm font-semibold text-zinc-950">
                    {document.fileName ?? "quote.pdf"}
                  </h3>
                  <p className="mt-1 text-xs font-medium text-zinc-600">
                    {formatDateTimeRo(document.createdAt)}
                  </p>
                  <p className="mt-1 text-xs font-medium text-zinc-600">
                    {documentTemplateLabel(document.templateKey)}
                  </p>
                  {document.checksum ? (
                    <p className="mt-2 break-all text-xs text-zinc-500">
                      SHA-256 {document.checksum.slice(0, 16)}...
                    </p>
                  ) : null}
                </div>
                <Link
                  href={`/dashboard/quotes/${quoteId}/documents/${document.id}`}
                  className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-800 shadow-sm hover:bg-stone-100 sm:w-auto"
                >
                  <Download aria-hidden="true" size={15} />
                  Descarcă
                </Link>
              </div>
              {canSendDocuments ? (
                <form
                  action={sendQuoteToCustomerAction.bind(null, quoteId)}
                  className="mt-4 grid gap-3 border-t border-zinc-200 pt-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"
                >
                  <input name="documentId" type="hidden" value={document.id} />
                  <label className="grid gap-1 text-xs font-semibold text-zinc-700">
                    Email destinatar (opțional)
                    <span className="relative">
                      <Mail
                        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
                        aria-hidden="true"
                        size={14}
                      />
                      <input
                        className="h-10 w-full rounded-md border border-zinc-200 bg-white pl-9 pr-3 text-sm font-medium text-zinc-900 shadow-sm"
                        name="intendedRecipientEmail"
                        placeholder="client@example.test"
                        type="email"
                      />
                    </span>
                  </label>
                  <label className="grid gap-1 text-xs font-semibold text-zinc-700">
                    Nume destinatar (opțional)
                    <input
                      className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-900 shadow-sm"
                      name="intendedRecipientName"
                      placeholder="Contact client"
                    />
                  </label>
                  <button className="inline-flex h-10 w-full items-center justify-center gap-2 self-end rounded-md bg-zinc-950 px-3 text-sm font-semibold text-white shadow-sm hover:bg-zinc-800 sm:w-auto">
                    <Send aria-hidden="true" size={15} />
                    Trimite către client
                  </button>
                  <p className="text-xs text-zinc-500 sm:col-span-3">
                    Stub email: se înregistrează destinatarul intenționat și
                    documentul; nu se trimite email real.
                  </p>
                </form>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-4 rounded-md bg-stone-100 p-4 text-sm text-zinc-700">
          Nu există PDF-uri generate pentru această versiune.
        </p>
      )}
    </section>
  );
}

function documentTemplateLabel(templateKey: string | null) {
  if (templateKey === "template-b") {
    return "Template B - propunere compactă";
  }

  if (templateKey === "template-a") {
    return "Template A - ofertă detaliată";
  }

  return "Template nespecificat";
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
            ? "Versiunea curentă a fost blocată pentru generarea documentelor."
            : "O revizie nouă a fost creată din versiunea blocată."}
        </p>
      ) : null}
      {versionError ? (
        <p className="mb-3 rounded-md bg-rose-50 px-3 py-2 text-sm font-medium text-rose-800">
          {versionError === "lock"
            ? "Versiunea nu a putut fi blocată. Reîmprospătează pagina și verifică dacă este încă o ciornă."
            : "Nu s-a putut crea o revizie din această versiune."}
        </p>
      ) : null}

      {canLockVersion ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-zinc-950">
              Versiunea {currentVersion.versionNumber} este editabilă
            </h2>
            <p className="mt-1 text-sm text-zinc-600">
              Blochează ciorna înainte de generarea documentelor pentru client.
            </p>
          </div>
          <form action={lockCurrentQuoteVersionAction.bind(null, quoteId)}>
            <button className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-zinc-950 px-3 text-sm font-semibold text-white shadow-sm hover:bg-zinc-800 sm:w-auto">
              <Lock aria-hidden="true" size={15} />
              Blochează versiunea
            </button>
          </form>
        </div>
      ) : null}

      {canCreateRevision ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-zinc-950">
              Versiunea {currentVersion.versionNumber} este{" "}
              {currentVersion.status === QuoteVersionStatus.SENT ||
              currentVersion.sentAt
                ? "trimisă"
                : "blocată"}
            </h2>
            <p className="mt-1 text-sm text-zinc-600">
              Revizia este singura cale de a edita poziții, totaluri sau
              snapshot-uri de calcul după blocare sau trimitere.
            </p>
          </div>
          <form action={createQuoteRevisionAction.bind(null, quoteId)}>
            <button className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-zinc-950 px-3 text-sm font-semibold text-white shadow-sm hover:bg-zinc-800 sm:w-auto">
              <Plus aria-hidden="true" size={15} />
              Creează revizie
            </button>
          </form>
        </div>
      ) : null}
    </section>
  );
}

function QuoteMobileActionBar({
  canCreateRevision,
  canGenerateDocuments,
  canRecalculate,
  currentVersion,
  currency,
  defaultTemplateKey,
  quoteId,
}: {
  canCreateRevision: boolean;
  canGenerateDocuments: boolean;
  canRecalculate: boolean;
  currentVersion: QuoteVersion | null;
  currency: string;
  defaultTemplateKey: QuotePdfTemplateKey;
  quoteId: string;
}) {
  const canGeneratePdfForVersion =
    canGenerateDocuments && currentVersion
      ? isLockedOrSentVersion(currentVersion)
      : false;

  return (
    <div className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+4.75rem)] z-30 lg:hidden">
      <div className="mx-auto max-w-md rounded-md border border-zinc-200 bg-white/95 p-3 shadow-[0_12px_36px_rgba(24,24,27,0.18)] backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase text-zinc-500">
              Total curent
            </p>
            <p className="mt-1 truncate text-base font-semibold text-zinc-950">
              {formatMinor(currentVersion?.totalMinor, currency)}
            </p>
          </div>
          <span className="shrink-0 rounded-md bg-stone-100 px-2 py-1 text-xs font-semibold text-zinc-700">
            Vers. {currentVersion?.versionNumber ?? "-"}
          </span>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <Link
            href={`/dashboard/quotes/${quoteId}/preview`}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-800 shadow-sm active:bg-stone-100"
          >
            <FileText aria-hidden="true" size={15} />
            Previzualizare
          </Link>
          <QuoteMobilePrimaryAction
            canCreateRevision={canCreateRevision}
            canGeneratePdfForVersion={canGeneratePdfForVersion}
            canRecalculate={canRecalculate}
            currentVersion={currentVersion}
            defaultTemplateKey={defaultTemplateKey}
            quoteId={quoteId}
          />
        </div>
      </div>
    </div>
  );
}

function QuoteMobilePrimaryAction({
  canCreateRevision,
  canGeneratePdfForVersion,
  canRecalculate,
  currentVersion,
  defaultTemplateKey,
  quoteId,
}: {
  canCreateRevision: boolean;
  canGeneratePdfForVersion: boolean;
  canRecalculate: boolean;
  currentVersion: QuoteVersion | null;
  defaultTemplateKey: QuotePdfTemplateKey;
  quoteId: string;
}) {
  if (canRecalculate) {
    return (
      <form action={recalculateCurrentQuoteVersionAction.bind(null, quoteId)}>
        <button className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-zinc-950 px-3 text-sm font-semibold text-white shadow-sm active:bg-zinc-800">
          <RefreshCw aria-hidden="true" size={15} />
          Recalculează
        </button>
      </form>
    );
  }

  if (currentVersion && canGeneratePdfForVersion) {
    return (
      <form
        action={generateQuotePdfAction.bind(null, quoteId, currentVersion.id)}
      >
        <input name="templateKey" type="hidden" value={defaultTemplateKey} />
        <button className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-zinc-950 px-3 text-sm font-semibold text-white shadow-sm active:bg-zinc-800">
          <Download aria-hidden="true" size={15} />
          Generează PDF
        </button>
      </form>
    );
  }

  if (canCreateRevision) {
    return (
      <form action={createQuoteRevisionAction.bind(null, quoteId)}>
        <button className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-zinc-950 px-3 text-sm font-semibold text-white shadow-sm active:bg-zinc-800">
          <Plus aria-hidden="true" size={15} />
          Revizie
        </button>
      </form>
    );
  }

  return (
    <span className="inline-flex h-11 items-center justify-center rounded-md bg-stone-100 px-3 text-sm font-semibold text-zinc-600">
      Doar citire
    </span>
  );
}

function CalculationReviewCard({
  calculationError,
  calculationResult,
  commercialError,
  commercialEvent,
  canApplyCommercialAdjustments,
  canRecalculate,
  canViewInternalTrace,
  currency,
  currentVersion,
  quoteId,
  wasCalculated,
}: {
  calculationError?: string;
  calculationResult: QuoteCalculationResult | null;
  commercialError?: string;
  commercialEvent?: string;
  canApplyCommercialAdjustments: boolean;
  canRecalculate: boolean;
  canViewInternalTrace: boolean;
  currency: string;
  currentVersion: QuoteVersion | null;
  quoteId: string;
  wasCalculated: boolean;
}) {
  const output = asRecord(calculationResult?.outputSnapshot);
  const metrics = calculationMetrics(output);
  const warnings = calculationWarnings(
    currentVersion,
    calculationResult,
    output,
  );
  const traceSummary = asRecord(currentVersion?.traceSummary);
  const traceCount =
    numberFrom(traceSummary?.traceEntryCount) ??
    arrayLength(calculationResult?.trace);
  const traceSteps = traceStepNames(calculationResult);
  const commercialTotals = commercialTotalsFromVersion(currentVersion);
  const quoteDiscount = quoteDiscountFromVersion(currentVersion);

  return (
    <section
      id="calculation"
      className="mt-6 rounded-md border border-zinc-200 bg-white p-5 shadow-sm"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-emerald-50 text-emerald-800">
            <Calculator aria-hidden="true" size={19} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-zinc-950">
              Verificare calcul
            </h2>
            <p className="mt-1 text-sm text-zinc-600">
              Totaluri și avertizări stocate pentru versiunea{" "}
              {currentVersion?.versionNumber ?? "-"}
            </p>
          </div>
        </div>
        {canRecalculate ? (
          <form
            action={recalculateCurrentQuoteVersionAction.bind(null, quoteId)}
          >
            <button className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-zinc-950 px-3 text-sm font-semibold text-white shadow-sm hover:bg-zinc-800 sm:w-auto">
              <RefreshCw aria-hidden="true" size={15} />
              Recalculează
            </button>
          </form>
        ) : (
          <span className="inline-flex w-fit rounded-md bg-stone-100 px-2 py-1 text-sm font-medium text-zinc-600">
            Doar citire
          </span>
        )}
      </div>

      {calculationError ? (
        <p className="mt-4 rounded-md bg-rose-50 px-3 py-2 text-sm font-medium text-rose-800">
          Această versiune este blocată sau trimisă, deci nu poate fi
          recalculată în loc.
        </p>
      ) : null}
      {wasCalculated ? (
        <p className="mt-4 rounded-md bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">
          Snapshot-urile de calcul au fost actualizate.
        </p>
      ) : null}

      {commercialEvent === "quote-discount" ? (
        <p className="mt-4 rounded-md bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">
          Reducerea la nivel de ofertă a fost auditată și recalculată.
        </p>
      ) : null}
      {commercialError ? (
        <p className="mt-4 rounded-md bg-rose-50 px-3 py-2 text-sm font-medium text-rose-800">
          {commercialError === "locked"
            ? "Ajustările comerciale sunt disponibile doar pe ciorne editabile."
            : "Completează valoarea și motivul ajustării comerciale."}
        </p>
      ) : null}

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric
          label="Total calculat"
          value={formatMinor(commercialTotals.calculatedTotalMinor, currency)}
        />
        <Metric
          label="Reducere ofertă"
          value={formatMinor(commercialTotals.quoteDiscountMinor, currency)}
        />
        <Metric
          label="Ajustări manuale"
          value={formatSignedMinor(
            commercialTotals.manualAdjustmentMinor,
            currency,
          )}
        />
        <Metric
          label="Total"
          value={formatMinor(currentVersion?.totalMinor, currency)}
          emphasized
        />
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <Metric
          label="Subtotal"
          value={formatMinor(currentVersion?.subtotalMinor, currency)}
        />
        <Metric
          label="TVA"
          value={formatMinor(currentVersion?.vatMinor, currency)}
        />
        <Metric
          label="Total înainte de override"
          value={formatMinor(
            commercialTotals.totalBeforeManualOverrideMinor,
            currency,
          )}
        />
      </div>

      <QuoteDiscountControls
        canApply={canApplyCommercialAdjustments}
        canEditDraft={canRecalculate}
        currency={currency}
        quoteDiscount={quoteDiscount}
        quoteId={quoteId}
      />

      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <Metric
          label="Necesar materiale"
          value={String(metrics.materialRequirementsCount)}
        />
        <Metric label="Cote sticlă" value={String(metrics.glassCutsCount)} />
        <Metric
          label="Metri liniari profil"
          value={`${formatMeasurement(metrics.profileMeters)} m`}
        />
      </div>

      {!calculationResult ? (
        <p className="mt-4 rounded-md bg-stone-100 p-4 text-sm text-zinc-700">
          Nu există calcul stocat pentru această versiune.
        </p>
      ) : null}

      {warnings.length > 0 ? (
        <div className="mt-5 rounded-md border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-amber-900">
            <AlertTriangle aria-hidden="true" size={16} />
            Avertizări
          </div>
          <ul className="mt-3 grid gap-2">
            {warnings.map((warning, index) => (
              <li
                key={`${warning.code}-${warning.path ?? index}`}
                className="text-sm text-amber-900"
              >
                <span className="font-semibold">{warning.code}</span>
                {warning.message ? ` - ${warning.message}` : ""}
              </li>
            ))}
          </ul>
        </div>
      ) : calculationResult ? (
        <p className="mt-4 rounded-md bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">
          Nu există avertizări de calcul stocate pentru această versiune.
        </p>
      ) : null}

      {traceCount > 0 ? (
        canViewInternalTrace ? (
          <div className="mt-4 rounded-md bg-stone-100 p-4 text-sm text-zinc-700">
            <p className="font-semibold text-zinc-900">
              Intrări urmă calcul: {traceCount}
            </p>
            {traceSteps.length > 0 ? (
              <p className="mt-2 break-words">
                Pași: {traceSteps.slice(0, 8).join(", ")}
              </p>
            ) : null}
          </div>
        ) : (
          <p className="mt-4 rounded-md bg-stone-100 p-4 text-sm text-zinc-700">
            Urma internă de calcul este restricționată pentru acest rol.
          </p>
        )
      ) : null}
    </section>
  );
}

function QuoteDiscountControls({
  canApply,
  canEditDraft,
  currency,
  quoteDiscount,
  quoteId,
}: {
  canApply: boolean;
  canEditDraft: boolean;
  currency: string;
  quoteDiscount: ReturnType<typeof quoteDiscountFromVersion>;
  quoteId: string;
}) {
  if (!canEditDraft) {
    return null;
  }

  if (!canApply) {
    return (
      <p className="mt-4 rounded-md bg-stone-100 p-4 text-sm text-zinc-700">
        Ajustările comerciale sunt disponibile doar pentru roluri autorizate.
      </p>
    );
  }

  const defaultType = quoteDiscount?.basisPoints ? "percent" : "amount";
  const defaultValue =
    quoteDiscount?.basisPoints !== undefined
      ? formatBasisPointsInput(quoteDiscount.basisPoints)
      : quoteDiscount?.amountMinor !== undefined
        ? minorInput(quoteDiscount.amountMinor)
        : "";

  return (
    <details className="mt-4 rounded-md border border-zinc-200 bg-stone-50 p-4">
      <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-zinc-950">
        <Pencil aria-hidden="true" size={15} />
        Reducere ofertă
      </summary>
      {quoteDiscount ? (
        <p className="mt-3 rounded-md bg-white px-3 py-2 text-sm text-zinc-700">
          Reducere curentă:{" "}
          <span className="font-semibold text-zinc-950">
            {quoteDiscount.basisPoints !== undefined
              ? `${formatBasisPointsLabel(quoteDiscount.basisPoints)}`
              : formatMinor(quoteDiscount.amountMinor, currency)}
          </span>
          . Motiv: {quoteDiscount.reason}
        </p>
      ) : null}
      <form
        action={applyQuoteDiscountAction.bind(null, quoteId)}
        className="mt-4 grid gap-3"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <SelectField
            defaultValue={defaultType}
            label="Tip reducere"
            name="discountType"
            options={[
              { label: `Sumă (${currency})`, value: "amount" },
              { label: "Procent", value: "percent" },
            ]}
          />
          <TextField
            defaultValue={defaultValue}
            inputMode="decimal"
            label="Valoare reducere"
            name="discountValue"
            placeholder={defaultType === "percent" ? "10" : "100.00"}
            required
          />
        </div>
        <TextAreaField
          defaultValue={quoteDiscount?.reason ?? ""}
          label="Motiv reducere"
          name="discountReason"
          required
        />
        <SubmitButton label="Aplică reducerea" />
      </form>
    </details>
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
      <p
        className={`mt-2 break-words text-sm font-semibold ${emphasized ? "text-zinc-950" : "text-zinc-800"}`}
      >
        {value}
      </p>
    </div>
  );
}

function QuoteItemCard({
  canApplyCommercialAdjustments,
  canEdit,
  catalogOptions,
  currency,
  item,
  quoteId,
}: {
  canApplyCommercialAdjustments: boolean;
  canEdit: boolean;
  catalogOptions: FixedWindowCatalogFormOptions;
  currency: string;
  item: QuoteItem;
  quoteId: string;
}) {
  const manualUnitPriceMinor = manualUnitPriceFromItem(item);
  const itemTotals = totalsFromItem(item);
  const manualOverride = manualOverrideFromItem(item);
  const catalogSummary = catalogSummaryFromItem(item);
  const catalogNeedsValidation = catalogRequiresBusinessValidation(item);
  const catalogLineDetails = catalogLineDetailsFromItem(item);

  return (
    <article className="rounded-md border border-zinc-200 bg-white p-4">
      <div className="grid gap-4 md:grid-cols-[minmax(0,260px)_minmax(0,1fr)]">
        <QuoteItemDrawingPreview item={item} />
        <div className="min-w-0">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase text-zinc-500">
                {quoteItemDisplayTypeLabel(item)}
              </p>
              <h3 className="mt-1 break-words text-base font-semibold text-zinc-950">
                {item.customerDescription || "Poziție fără titlu"}
              </h3>
            </div>
            <span className="inline-flex w-fit rounded-md bg-stone-100 px-2 py-1 text-xs font-semibold text-zinc-700">
              Cant.{" "}
              {formatQuantity(catalogLineDetails?.quantity ?? item.quantity)}
              {catalogLineDetails?.unitLabel
                ? ` ${catalogLineDetails.unitLabel}`
                : ""}
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
                Preț unitar manual {formatMinor(manualUnitPriceMinor, currency)}
              </span>
            ) : null}
            {catalogLineDetails?.unitPriceMinor !== null &&
            catalogLineDetails?.unitPriceMinor !== undefined ? (
              <span className="rounded-md bg-stone-100 px-2 py-1">
                Preț catalog unitar{" "}
                {formatMinor(catalogLineDetails.unitPriceMinor, currency)}
              </span>
            ) : null}
            <span className="rounded-md bg-stone-100 px-2 py-1">
              {itemTotals
                ? `Total ${formatMinor(itemTotals.totalMinor, currency)}`
                : "Total în așteptare"}
            </span>
            {itemTotals ? (
              <span className="rounded-md bg-white px-2 py-1 ring-1 ring-zinc-200">
                Calculat{" "}
                {formatMinor(itemTotals.calculatedTotalMinor, currency)}
              </span>
            ) : null}
            {itemTotals?.hasManualOverride ? (
              <span className="rounded-md bg-emerald-50 px-2 py-1 text-emerald-800">
                Ajustat {formatMinor(itemTotals.totalMinor, currency)}
              </span>
            ) : null}
          </div>

          {manualOverride ? (
            <div className="mt-3 rounded-md border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
              <p className="font-semibold">
                Override manual:{" "}
                {formatMinor(manualOverride.amountMinor, currency)}
              </p>
              <p className="mt-1 break-words">Motiv: {manualOverride.reason}</p>
            </div>
          ) : null}

          {catalogNeedsValidation ? (
            <span className="mt-3 inline-flex w-fit rounded-md bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-900">
              necesită validare business
            </span>
          ) : null}

          {catalogSummary.length > 0 ? (
            <dl className="mt-3 grid gap-2 sm:grid-cols-2">
              {catalogSummary.map((entry) => (
                <div
                  key={entry.label}
                  className="rounded-md bg-stone-50 px-3 py-2"
                >
                  <dt className="text-xs font-semibold uppercase text-zinc-500">
                    {entry.label}
                  </dt>
                  <dd className="mt-1 break-words text-sm font-medium text-zinc-800">
                    {entry.value}
                  </dd>
                </div>
              ))}
            </dl>
          ) : null}

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
                  Editează poziția
                </summary>
                <QuoteItemEditForm
                  catalogOptions={catalogOptions}
                  currency={currency}
                  item={item}
                  manualUnitPriceMinor={manualUnitPriceMinor}
                  quoteId={quoteId}
                />
              </details>
              {canApplyCommercialAdjustments ? (
                <details className="rounded-md bg-stone-50 p-3">
                  <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-zinc-900">
                    <Pencil aria-hidden="true" size={15} />
                    Ajustare preț poziție
                  </summary>
                  <ItemManualOverrideForm
                    currency={currency}
                    item={item}
                    itemTotals={itemTotals}
                    manualOverride={manualOverride}
                    quoteId={quoteId}
                  />
                </details>
              ) : null}
              <form action={deleteQuoteItemAction.bind(null, quoteId, item.id)}>
                <button className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-rose-200 bg-white px-3 text-sm font-semibold text-rose-800 shadow-sm hover:bg-rose-50 sm:w-auto">
                  <Trash2 aria-hidden="true" size={15} />
                  Șterge poziția
                </button>
              </form>
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function ItemManualOverrideForm({
  currency,
  item,
  itemTotals,
  manualOverride,
  quoteId,
}: {
  currency: string;
  item: QuoteItem;
  itemTotals: ReturnType<typeof totalsFromItem>;
  manualOverride: ReturnType<typeof manualOverrideFromItem>;
  quoteId: string;
}) {
  const defaultTotalMinor =
    manualOverride?.amountMinor ??
    itemTotals?.totalMinor ??
    itemTotals?.calculatedTotalMinor ??
    0;

  return (
    <form
      action={applyItemManualOverrideAction.bind(null, quoteId, item.id)}
      className="mt-4 grid gap-3"
    >
      <p className="rounded-md bg-white px-3 py-2 text-sm text-zinc-700">
        Total calculat curent:{" "}
        <span className="font-semibold text-zinc-950">
          {itemTotals
            ? formatMinor(itemTotals.calculatedTotalMinor, currency)
            : commonLabel("totalPending")}
        </span>
      </p>
      <TextField
        defaultValue={defaultTotalMinor ? minorInput(defaultTotalMinor) : ""}
        inputMode="decimal"
        label={`Total final manual (${currency})`}
        name="overrideTotal"
        placeholder="0.00"
        required
      />
      <TextAreaField
        defaultValue={manualOverride?.reason ?? ""}
        label="Motiv override"
        name="overrideReason"
        required
      />
      <SubmitButton label="Aplică override" />
    </form>
  );
}

function QuoteItemEditForm({
  catalogOptions,
  currency,
  item,
  manualUnitPriceMinor,
  quoteId,
}: {
  catalogOptions: FixedWindowCatalogFormOptions;
  currency: string;
  item: QuoteItem;
  manualUnitPriceMinor: number | null;
  quoteId: string;
}) {
  const catalogDefaults = catalogFieldDefaultsFromItem(item);
  const doorDefaults = doorFieldDefaultsFromItem(item);
  const lineKind = catalogLineKindFromItem(item);
  const lineDetails = catalogLineDetailsFromItem(item);
  const lineDefaults = catalogLineFieldDefaultsFromItem(item);

  if (lineKind) {
    return (
      <form
        action={updateQuoteItemAction.bind(null, quoteId, item.id)}
        className="mt-4 grid gap-3"
      >
        <input type="hidden" name="itemType" value={item.type} />
        <NumberField
          defaultValue={formatQuantity(lineDetails?.quantity ?? item.quantity)}
          inputMode="decimal"
          label="Cantitate"
          min={0.01}
          name="quantity"
          step="0.01"
        />
        {lineKind === "accessory-line" ? (
          <AccessoryLineCatalogFields
            defaults={lineDefaults}
            options={catalogOptions}
          />
        ) : (
          <ServiceLineCatalogFields
            defaults={lineDefaults}
            label={catalogLineKindLabel(lineKind)}
            options={catalogOptions}
          />
        )}
        <TextField
          label="Descriere pentru client"
          name="customerDescription"
          defaultValue={item.customerDescription ?? ""}
        />
        <TextAreaField
          label="Note interne"
          name="internalNotes"
          defaultValue={item.internalNotes ?? ""}
        />
        <SubmitButton label="Salvează linia" />
      </form>
    );
  }

  return (
    <form
      action={updateQuoteItemAction.bind(null, quoteId, item.id)}
      className="mt-4 grid gap-3"
    >
      <input type="hidden" name="itemType" value={item.type} />
      <div className="grid gap-3 sm:grid-cols-3">
        <NumberField
          label="Cantitate"
          name="quantity"
          min={1}
          defaultValue={String(item.quantity)}
        />
        {item.type === QuoteItemType.WINDOW ||
        item.type === QuoteItemType.DOOR ? (
          <>
            <NumberField
              label="Lățime mm"
              name="widthMm"
              min={1}
              defaultValue={item.widthMm ? String(item.widthMm) : ""}
            />
            <NumberField
              label="Înălțime mm"
              name="heightMm"
              min={1}
              defaultValue={item.heightMm ? String(item.heightMm) : ""}
            />
          </>
        ) : item.type === QuoteItemType.CUSTOM ? (
          <TextField
            label={`Preț unitar (${currency})`}
            name="unitPrice"
            inputMode="decimal"
            defaultValue={
              manualUnitPriceMinor === null
                ? ""
                : minorInput(manualUnitPriceMinor)
            }
            required
          />
        ) : null}
      </div>
      <TextField
        label="Descriere pentru client"
        name="customerDescription"
        defaultValue={item.customerDescription ?? ""}
        required
      />
      <TextAreaField
        label="Note interne"
        name="internalNotes"
        defaultValue={item.internalNotes ?? ""}
      />
      {item.type === QuoteItemType.WINDOW ? (
        <FixedWindowCatalogFields
          currency={currency}
          defaults={catalogDefaults}
          options={catalogOptions}
        />
      ) : null}
      {item.type === QuoteItemType.DOOR ? (
        <>
          <DoorCatalogFields
            currency={currency}
            defaults={catalogDefaults}
            options={catalogOptions}
          />
          <TextAreaField
            label="Descriere panou/manual"
            name="panelDescription"
            defaultValue={doorDefaults.panelDescription}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField
              label={`Preț manual panou (${currency})`}
              name="manualPanelPrice"
              inputMode="decimal"
              defaultValue={
                doorDefaults.manualPanelPriceMinor === null
                  ? ""
                  : minorInput(doorDefaults.manualPanelPriceMinor)
              }
              placeholder="0.00"
            />
            <TextField
              label="Feronerie placeholder"
              name="hardwareDescription"
              defaultValue={doorDefaults.hardwareDescription}
            />
          </div>
        </>
      ) : null}
      <SubmitButton label="Salvează poziția" />
    </form>
  );
}

function NumberField({
  defaultValue,
  inputMode = "numeric",
  label,
  min,
  name,
  step,
}: {
  defaultValue?: string;
  inputMode?: "decimal" | "numeric";
  label: string;
  min?: number;
  name: string;
  step?: number | string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-zinc-800">{label}</span>
      <input
        name={name}
        type="number"
        min={min}
        step={step}
        required
        defaultValue={defaultValue}
        inputMode={inputMode}
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

function SelectField({
  defaultValue,
  label,
  name,
  options,
}: {
  defaultValue?: string;
  label: string;
  name: string;
  options: Array<{ label: string; value: string }>;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-zinc-800">{label}</span>
      <select
        name={name}
        defaultValue={defaultValue}
        className="mt-2 h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-950 outline-none focus:border-zinc-900"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function TextAreaField({
  defaultValue,
  label,
  name,
  required = false,
}: {
  defaultValue?: string;
  label: string;
  name: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-zinc-800">{label}</span>
      <textarea
        name={name}
        defaultValue={defaultValue}
        required={required}
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
        {value || commonLabel("notSet")}
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
    <span
      className={`inline-flex rounded-md px-3 py-2 text-sm font-semibold ${tone}`}
    >
      {quoteStatusLabel(status)}
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
    <span
      className={`inline-flex rounded-md px-2 py-1 text-xs font-semibold ${tone}`}
    >
      {quoteVersionStatusLabel(status)}
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

function isLockedVersionReadyForSend(quoteVersion: {
  status: QuoteVersionStatus;
  isLocked: boolean;
  lockedAt: Date | null;
  sentAt: Date | null;
}) {
  return (
    quoteVersion.status === QuoteVersionStatus.LOCKED &&
    quoteVersion.isLocked &&
    Boolean(quoteVersion.lockedAt) &&
    !quoteVersion.sentAt
  );
}

function isSelectableProfileSystem(
  record: ProfileSystem,
): record is ProfileSystem {
  return isSelectableCatalogRecord(record);
}

function isSelectableGlassPackage(
  record: GlassPackage,
): record is GlassPackage {
  return isSelectableCatalogRecord(record);
}

function isSelectableHardwareKit(record: HardwareKit): record is HardwareKit {
  return isSelectableCatalogRecord(record);
}

function isSelectableAccessory(record: Accessory): record is Accessory {
  return isSelectableCatalogRecord(record);
}

function isSelectableServiceItem(record: ServiceItem): record is ServiceItem {
  return isSelectableCatalogRecord(record);
}

function quoteItemDisplayTypeLabel(item: QuoteItem) {
  const lineKind = catalogLineKindFromItem(item);

  return lineKind
    ? catalogLineKindLabel(lineKind)
    : quoteItemTypeLabel(item.type);
}

type CatalogLineKind =
  | "accessory-line"
  | "service-line"
  | "transport-line"
  | "installation-line";

function catalogLineKindFromItem(item: QuoteItem): CatalogLineKind | null {
  const configuration = asRecord(item.configurationSnapshot);
  const kind = stringFrom(configuration?.kind);

  return isCatalogLineKind(kind) ? kind : null;
}

function isCatalogLineKind(
  value: string | undefined,
): value is CatalogLineKind {
  return (
    value === "accessory-line" ||
    value === "service-line" ||
    value === "transport-line" ||
    value === "installation-line"
  );
}

function catalogLineKindLabel(lineKind: CatalogLineKind) {
  switch (lineKind) {
    case "accessory-line":
      return "Accesoriu";
    case "service-line":
      return "Serviciu";
    case "transport-line":
      return "Transport";
    case "installation-line":
      return "Montaj";
  }
}

function catalogLineFieldDefaultsFromItem(
  item: QuoteItem,
): CatalogLineFieldDefaults {
  const catalog = asRecord(item.catalogSnapshot);
  const selectedCatalogIds = asRecord(catalog?.selectedCatalogIds);
  const line = firstRecord(
    catalog?.line,
    catalog?.accessory,
    catalog?.serviceItem,
  );

  return {
    accessoryId: stringFrom(selectedCatalogIds?.accessoryId, line?.id),
    serviceItemId: stringFrom(selectedCatalogIds?.serviceItemId, line?.id),
  };
}

function catalogLineDetailsFromItem(item: QuoteItem) {
  const lineKind = catalogLineKindFromItem(item);

  if (!lineKind) {
    return null;
  }

  const configuration = asRecord(item.configurationSnapshot);
  const catalog = asRecord(item.catalogSnapshot);
  const line = firstRecord(
    catalog?.line,
    catalog?.accessory,
    catalog?.serviceItem,
  );
  const priceListItem = firstRecord(line?.priceListItem);
  const quantity =
    numberFrom(configuration?.quantity, item.quantity) ?? item.quantity;
  const unit = stringFrom(
    line?.calculationUnit,
    line?.unit,
    priceListItem?.calculationUnit,
    priceListItem?.unit,
  );

  return {
    kind: lineKind,
    quantity,
    unitLabel: catalogUnitLabel(unit),
    unitPriceMinor: numberFrom(line?.unitPriceMinor, priceListItem?.saleMinor),
  };
}

function catalogFieldDefaultsFromItem(
  item: QuoteItem,
): FixedWindowCatalogFieldDefaults {
  const catalog = asRecord(item.catalogSnapshot);

  return {
    profileSystemId: stringFrom(asRecord(catalog?.profileSystem)?.id),
    frameProfileId: stringFrom(asRecord(catalog?.frameProfile)?.id),
    thresholdProfileId: stringFrom(asRecord(catalog?.thresholdProfile)?.id),
    glassPackageId: stringFrom(asRecord(catalog?.glassPackage)?.id),
    colorFinishId: stringFrom(asRecord(catalog?.colorFinish)?.id),
    hardwareKitId: stringFrom(asRecord(catalog?.hardwareKit)?.id),
  };
}

function doorFieldDefaultsFromItem(item: QuoteItem) {
  const configuration = asRecord(item.configurationSnapshot);
  const catalog = asRecord(item.catalogSnapshot);
  const panel = firstRecord(configuration?.panel, catalog?.panel);
  const hardware = firstRecord(configuration?.hardware, catalog?.hardwareKit);
  const panelPricing = firstRecord(panel?.manualPricing);
  const manualPanelPriceMinor = numberFrom(panelPricing?.unitPriceMinor);

  return {
    hardwareDescription: stringFrom(hardware?.description) ?? "",
    manualPanelPriceMinor: manualPanelPriceMinor ?? null,
    panelDescription: stringFrom(panel?.description) ?? "",
  };
}

function catalogSummaryFromItem(item: QuoteItem) {
  const catalog = asRecord(item.catalogSnapshot);
  const configuration = asRecord(item.configurationSnapshot);
  const panel = firstRecord(configuration?.panel, catalog?.panel);
  const hardwareConfiguration = firstRecord(configuration?.hardware);
  const lineKind = catalogLineKindFromItem(item);

  if (!catalog) {
    return [];
  }

  return [
    lineKind
      ? catalogSummaryEntry(catalogLineKindLabel(lineKind), catalog.line)
      : null,
    catalogSummaryEntry("Sistem", catalog.profileSystem),
    catalogSummaryEntry("Profil toc", catalog.frameProfile),
    catalogSummaryEntry("Profil prag", catalog.thresholdProfile),
    catalogSummaryEntry("Sticlă", catalog.glassPackage),
    textSummaryEntry("Panou", stringFrom(panel?.description)),
    catalogSummaryEntry("Culoare", catalog.colorFinish),
    catalogSummaryEntry("Feronerie", catalog.hardwareKit),
    textSummaryEntry(
      "Feronerie placeholder",
      stringFrom(hardwareConfiguration?.description),
    ),
  ].flatMap((entry) => (entry ? [entry] : []));
}

function catalogSummaryEntry(label: string, value: unknown) {
  const record = asRecord(value);
  const name = stringFrom(record?.name) ?? stringFrom(record?.label);

  if (!name) {
    return null;
  }

  const code = stringFrom(record?.code);

  return {
    label,
    value: code ? `${name} (${code})` : name,
  };
}

function textSummaryEntry(label: string, value: string | undefined) {
  return value ? { label, value } : null;
}

function catalogRequiresBusinessValidation(item: QuoteItem) {
  const catalog = asRecord(item.catalogSnapshot);

  return catalog?.requiresBusinessValidation === true;
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
    (sum, profileGroup) =>
      sum + (numberFrom(profileGroup.totalLinearMeters) ?? 0),
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
  const manualAdjustmentMinor = numberFrom(totals?.manualAdjustmentMinor) ?? 0;
  const totalBeforeManualOverrideMinor =
    numberFrom(totals?.totalBeforeManualOverrideMinor) ?? totalMinor;

  if (
    !totals ||
    totals.pendingCalculation === true ||
    totalMinor === undefined
  ) {
    return null;
  }

  return {
    calculatedTotalMinor:
      totalBeforeManualOverrideMinor ?? totalMinor - manualAdjustmentMinor,
    hasManualOverride: manualAdjustmentMinor !== 0,
    manualAdjustmentMinor,
    totalMinor,
    totalBeforeManualOverrideMinor,
  };
}

function manualOverrideFromItem(item: QuoteItem) {
  const configuration = asRecord(item.configurationSnapshot);
  const manualOverride = asRecord(configuration?.manualOverride);
  const amountMinor = numberFrom(manualOverride?.amountMinor);
  const reason = stringFrom(manualOverride?.reason);

  if (!manualOverride || amountMinor === undefined || !reason) {
    return null;
  }

  return {
    amountMinor,
    reason,
  };
}

function quoteDiscountFromVersion(quoteVersion: QuoteVersion | null) {
  const priceSnapshot = asRecord(quoteVersion?.priceSnapshot);
  const quoteDiscount = asRecord(priceSnapshot?.quoteDiscount);
  const amountMinor = numberFrom(quoteDiscount?.amountMinor);
  const basisPoints = numberFrom(quoteDiscount?.basisPoints);
  const reason = stringFrom(quoteDiscount?.reason);

  if (!quoteDiscount || !reason) {
    return null;
  }

  if (amountMinor === undefined && basisPoints === undefined) {
    return null;
  }

  return {
    amountMinor,
    basisPoints,
    reason,
  };
}

function commercialTotalsFromVersion(quoteVersion: QuoteVersion | null) {
  const totals = asRecord(quoteVersion?.totalsSnapshot);
  const totalMinor =
    numberFrom(quoteVersion?.totalMinor) ?? numberFrom(totals?.totalMinor);
  const manualAdjustmentMinor = numberFrom(totals?.manualAdjustmentMinor) ?? 0;
  const quoteDiscountMinor = numberFrom(totals?.quoteDiscountMinor) ?? 0;
  const totalBeforeManualOverrideMinor =
    numberFrom(totals?.totalBeforeManualOverrideMinor) ?? totalMinor;

  return {
    calculatedTotalMinor:
      totalMinor === undefined ? undefined : totalMinor - manualAdjustmentMinor,
    manualAdjustmentMinor,
    quoteDiscountMinor,
    totalBeforeManualOverrideMinor,
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function firstRecord(...values: unknown[]) {
  for (const value of values) {
    const record = asRecord(value);

    if (record) {
      return record;
    }
  }

  return null;
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

function numberFrom(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === "bigint") {
      return Number(value);
    }

    if (typeof value === "string" && value.trim().length > 0) {
      const parsed = Number(value);

      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return undefined;
}

function stringFrom(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
  }

  return undefined;
}

function catalogUnitLabel(value: string | undefined) {
  switch (value) {
    case "each":
    case "EACH":
      return "buc.";
    case "linear-meter":
    case "LINEAR_METER":
      return "ml";
    case "square-meter":
    case "SQUARE_METER":
      return "mp";
    case "hour":
    case "HOUR":
      return "oră";
    case "fixed":
    case "FIXED":
      return "lot";
    default:
      return value;
  }
}

function minorInput(value: number) {
  return (value / 100).toFixed(2);
}

function formatBasisPointsInput(value: number) {
  return (value / 100).toFixed(2).replace(/\.00$/, "");
}

function formatBasisPointsLabel(value: number) {
  return `${new Intl.NumberFormat("ro-RO", {
    maximumFractionDigits: 2,
  }).format(value / 100)}%`;
}

function formatMeasurement(value: number) {
  return new Intl.NumberFormat("ro-RO", {
    maximumFractionDigits: 3,
  }).format(value);
}

function formatQuantity(value: number) {
  return new Intl.NumberFormat("ro-RO", {
    maximumFractionDigits: 3,
  }).format(value);
}

function formatSignedMinor(value: number | null | undefined, currency = "RON") {
  if (value === null || value === undefined || value === 0) {
    return formatMoneyMinorRo(0, currency);
  }

  const formatted = formatMoneyMinorRo(Math.abs(value), currency);

  return `${value > 0 ? "+" : "-"}${formatted}`;
}

function formatMinor(
  value: bigint | number | null | undefined,
  currency = "RON",
) {
  if (value === null || value === undefined) {
    return commonLabel("totalPending");
  }

  const total = typeof value === "bigint" ? Number(value) : value;

  return formatMoneyMinorRo(total, currency);
}
