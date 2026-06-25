import { PriceListStatus } from "@prisma/client";
import { notFound } from "next/navigation";
import { canManageCatalog, requireTenant } from "@/lib/auth";
import {
  listTenantAccessories,
  listTenantColorFinishes,
  listTenantGlassPackages,
  listTenantHardwareKits,
  listTenantPriceListItems,
  listTenantPriceLists,
  listTenantPricingRules,
  listTenantProfileItems,
  listTenantProfileSystems,
  listTenantServiceItems,
  listTenantSuppliers,
  listTenantTaxRates,
} from "@/lib/data";
import { CatalogEntityPage } from "../_components/catalog-entity-page";
import type { CatalogLookupData, CatalogRecord } from "../_components/catalog-form";
import { getCatalogConfigBySlug, type CatalogEntityConfig } from "../catalog-config";

export const dynamic = "force-dynamic";

export default async function CatalogSectionPage({
  params,
  searchParams,
}: {
  params: Promise<{ section: string }>;
  searchParams: Promise<{ error?: string; event?: string }>;
}) {
  const context = await requireTenant();
  const { section } = await params;
  const query = await searchParams;
  const config = getCatalogConfigBySlug(section);

  if (!config) {
    notFound();
  }

  const [suppliers, profileSystems, priceLists, records, pricingRules] = await Promise.all([
    listTenantSuppliers(context),
    listTenantProfileSystems(context),
    listTenantPriceLists(context),
    listRecords(context, config),
    config.entity === "priceListItems" ? listTenantPricingRules(context) : Promise.resolve([]),
  ]);
  const lookups: CatalogLookupData = {
    suppliers,
    profileSystems,
    priceLists,
  };

  return (
    <CatalogEntityPage
      canManage={canManageCatalog(context.membership)}
      config={config}
      error={query.error}
      event={query.event}
      lookups={lookups}
      records={records as CatalogRecord[]}
      summarySlot={
        config.entity === "priceListItems" ? (
          <PriceListSummary priceLists={priceLists as CatalogRecord[]} pricingRules={pricingRules as CatalogRecord[]} />
        ) : null
      }
      tenantName={context.tenant.name}
    />
  );
}

function listRecords(
  context: Awaited<ReturnType<typeof requireTenant>>,
  config: CatalogEntityConfig,
) {
  switch (config.entity) {
    case "suppliers":
      return listTenantSuppliers(context);
    case "profileSystems":
      return listTenantProfileSystems(context);
    case "profileItems":
      return listTenantProfileItems(context);
    case "glassPackages":
      return listTenantGlassPackages(context);
    case "hardwareKits":
      return listTenantHardwareKits(context);
    case "colorFinishes":
      return listTenantColorFinishes(context);
    case "accessories":
      return listTenantAccessories(context);
    case "serviceItems":
      return listTenantServiceItems(context);
    case "taxRates":
      return listTenantTaxRates(context);
    case "priceListItems":
      return listTenantPriceListItems(context);
    default:
      return Promise.resolve([]);
  }
}

function PriceListSummary({
  priceLists,
  pricingRules,
}: {
  priceLists: CatalogRecord[];
  pricingRules: CatalogRecord[];
}) {
  return (
    <div className="mt-5 grid gap-3 lg:grid-cols-2">
      <section className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
        <h2 className="text-base font-semibold text-zinc-950">Liste existente</h2>
        <p className="mt-1 text-sm leading-6 text-zinc-600">
          Pozitiile noi se aplica ofertelor noi; ofertele blocate pastreaza instantaneele vechi.
        </p>
        <div className="mt-4 grid gap-2">
          {priceLists.length > 0 ? (
            priceLists.map((priceList) => (
              <div key={priceList.id} className="rounded-md bg-stone-100 px-3 py-2">
                <div className="flex items-center justify-between gap-3">
                  <p className="truncate text-sm font-semibold text-zinc-900">
                    {String(priceList.name)} / {String(priceList.version)}
                  </p>
                  <span className="rounded-md bg-white px-2 py-1 text-xs font-semibold text-zinc-700">
                    {formatPriceListStatus(priceList.status)}
                  </span>
                </div>
                <p className="mt-1 text-xs font-medium text-zinc-600">{String(priceList.currency ?? "RON")}</p>
              </div>
            ))
          ) : (
            <p className="text-sm text-zinc-600">Nu exista liste de preturi.</p>
          )}
        </div>
      </section>

      <section className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
        <h2 className="text-base font-semibold text-zinc-950">Reguli de pret</h2>
        <p className="mt-1 text-sm leading-6 text-zinc-600">
          Regulile sunt afisate pentru configurare; executia DSL nu este implementata in MVP.
        </p>
        <div className="mt-4 grid gap-2">
          {pricingRules.length > 0 ? (
            pricingRules.map((rule) => (
              <div key={rule.id} className="rounded-md bg-stone-100 px-3 py-2">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-zinc-900">{String(rule.name)}</p>
                  {rule.requiresBusinessValidation ? (
                    <span className="rounded-md bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-900">
                      necesită validare business
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-xs font-medium text-zinc-600">
                  {String(rule.ruleType)} / prioritate {String(rule.priority ?? 0)}
                </p>
              </div>
            ))
          ) : (
            <p className="text-sm text-zinc-600">Nu exista reguli de pret.</p>
          )}
        </div>
      </section>
    </div>
  );
}

function formatPriceListStatus(status: unknown) {
  if (status === PriceListStatus.ACTIVE) {
    return "activa";
  }

  if (status === PriceListStatus.ARCHIVED) {
    return "arhivata";
  }

  return "ciorna";
}

