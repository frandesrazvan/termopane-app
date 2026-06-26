import {
  AlertTriangle,
  Archive,
  FilePlus2,
  FileText,
  Settings,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import {
  canGeneratePdf,
  canManageCatalog,
  canManageUsers,
  canViewInternalCosts,
  listTenantMemberships,
  requireTenant,
} from "@/lib/auth";
import {
  getTenantCompanySettings,
  getTenantUserPreference,
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
  listTenantTaxRates,
} from "@/lib/data";
import { tenantMemberStatusLabel } from "@/lib/i18n";
import {
  summarizeBusinessValidationRecords,
  type BusinessValidationRecordInput,
  type BusinessValidationSummary,
} from "@/lib/validation/business-validation";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const context = await requireTenant();
  const canManageCatalogRecords = canManageCatalog(context.membership);
  const [memberships, userPreference, businessValidationSummary] = await Promise.all([
    listTenantMemberships(context.user.id),
    getTenantUserPreference(context, context.user.id),
    canManageCatalogRecords
      ? loadBusinessValidationSummary(context)
      : Promise.resolve(emptyBusinessValidationSummary),
  ]);
  const permissions = [
    { label: "Costuri interne", allowed: canViewInternalCosts(context.membership) },
    { label: "Administrare catalog", allowed: canManageCatalogRecords },
    { label: "Administrare utilizatori", allowed: canManageUsers(context.membership) },
    { label: "Generare PDF", allowed: canGeneratePdf(context.membership) },
  ];
  const shortcuts = dashboardShortcuts(userPreference?.dashboardShortcuts);

  return (
    <main className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-6xl">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-teal-700">Spațiu protejat</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-normal text-zinc-950 sm:text-3xl">
              Panou tenant
            </h1>
          </div>
          <div className="inline-flex min-h-10 items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-700 shadow-sm">
            <ShieldCheck aria-hidden="true" size={16} className="text-emerald-600" />
            Autorizat server-side
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {permissions.map((permission) => (
            <div
              key={permission.label}
              className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm"
            >
              <p className="text-xs font-medium uppercase text-zinc-500">
                {permission.label}
              </p>
              <p
                className={`mt-3 inline-flex rounded-md px-2 py-1 text-sm font-semibold ${
                  permission.allowed
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-zinc-100 text-zinc-600"
                }`}
              >
                {permission.allowed ? "Permis" : "Restricționat"}
              </p>
            </div>
          ))}
        </div>

        <BusinessValidationCallout summary={businessValidationSummary} />

        <section className="mt-6 rounded-md border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-zinc-950">Scurtături</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {shortcuts.map((shortcut) => (
              <Link
                className="flex min-h-14 items-center gap-3 rounded-md bg-stone-100 px-3 text-sm font-semibold text-zinc-800 hover:bg-stone-200"
                href={shortcut.href}
                key={shortcut.href}
              >
                <shortcut.icon aria-hidden="true" size={17} />
                {shortcut.label}
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-6 rounded-md border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-zinc-950">Context tenant</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <p className="rounded-md bg-stone-100 p-3 text-sm leading-6 text-zinc-700">
              Tenant activ: <span className="font-semibold">{context.tenant.slug}</span>
            </p>
            <p className="rounded-md bg-stone-100 p-3 text-sm leading-6 text-zinc-700">
              Apartenență:{" "}
              <span className="font-semibold">
                {tenantMemberStatusLabel(context.membership.status)}
              </span>
            </p>
            <p className="rounded-md bg-stone-100 p-3 text-sm leading-6 text-zinc-700">
              Tenant-uri disponibile: <span className="font-semibold">{memberships.length}</span>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

function dashboardShortcuts(value: unknown) {
  const selected = Array.isArray(value)
    ? value.flatMap((entry) => (typeof entry === "string" ? [entry] : []))
    : ["new-quote", "quotes"];
  const shortcuts = [
    { key: "new-quote", label: "Ofertă nouă", href: "/dashboard/quotes/new", icon: FilePlus2 },
    { key: "quotes", label: "Oferte", href: "/dashboard/quotes", icon: FileText },
    { key: "customers", label: "Clienți", href: "/dashboard/customers", icon: UsersRound },
    { key: "catalog", label: "Catalog", href: "/dashboard/catalog", icon: Archive },
    { key: "settings", label: "Setări", href: "/dashboard/settings", icon: Settings },
  ];
  const filtered = shortcuts.filter((shortcut) => selected.includes(shortcut.key));

  return filtered.length > 0 ? filtered : shortcuts.slice(0, 2);
}

function BusinessValidationCallout({ summary }: { summary: BusinessValidationSummary }) {
  if (!summary.hasPending) {
    return null;
  }

  return (
    <section className="mt-6 rounded-md border border-amber-200 bg-amber-50 p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-amber-900">
            <AlertTriangle aria-hidden="true" size={18} />
            <h2 className="text-base font-semibold">Validare business necesară</h2>
          </div>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-amber-950">
            {summary.total} înregistrări din catalog/calcul așteaptă confirmarea ownerilor
            înainte de folosire ca formulă de producție.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            className="inline-flex h-10 items-center justify-center rounded-md bg-amber-900 px-3 text-sm font-semibold text-white shadow-sm hover:bg-amber-800"
            href="/dashboard/catalog"
          >
            Catalog
          </Link>
          <Link
            className="inline-flex h-10 items-center justify-center rounded-md border border-amber-300 bg-white px-3 text-sm font-semibold text-amber-900 shadow-sm hover:bg-amber-100"
            href="/dashboard/settings"
          >
            Setări
          </Link>
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {summary.areas.map((area) => (
          <div key={area.area} className="rounded-md bg-white/80 px-3 py-2">
            <p className="text-xs font-medium text-amber-800">{area.label}</p>
            <p className="mt-1 text-lg font-semibold text-amber-950">{area.count}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-2 lg:grid-cols-3">
        {summary.items.slice(0, 3).map((item) => (
          <div
            key={`${item.area}-${item.recordId ?? item.label}`}
            className="rounded-md bg-white/80 px-3 py-2"
          >
            <p className="truncate text-sm font-semibold text-amber-950">{item.label}</p>
            <p className="mt-1 text-xs font-medium text-amber-800">{item.areaLabel}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

async function loadBusinessValidationSummary(
  context: Awaited<ReturnType<typeof requireTenant>>,
) {
  const [
    companySettings,
    profileSystems,
    profileItems,
    glassPackages,
    hardwareKits,
    colorFinishes,
    accessories,
    serviceItems,
    taxRates,
    priceLists,
    priceListItems,
    pricingRules,
  ] = await Promise.all([
    getTenantCompanySettings(context),
    listTenantProfileSystems(context),
    listTenantProfileItems(context),
    listTenantGlassPackages(context),
    listTenantHardwareKits(context),
    listTenantColorFinishes(context),
    listTenantAccessories(context),
    listTenantServiceItems(context),
    listTenantTaxRates(context),
    listTenantPriceLists(context),
    listTenantPriceListItems(context),
    listTenantPricingRules(context),
  ]);
  const records: BusinessValidationRecordInput[] = [];

  if (companySettings) {
    records.push({
      area: "companySettings",
      label: companySettings.displayName,
      recordId: companySettings.id,
      values: [
        companySettings.commercialDefaults,
        companySettings.calculationDefaults,
        companySettings.warrantyText,
        companySettings.deliveryText,
        companySettings.advancePaymentText,
        companySettings.pdfFooterText,
      ],
    });
  }

  records.push(
    ...profileSystems.map((record) => ({
      area: "profileSystems" as const,
      label: record.name,
      recordId: record.id,
      values: [record.configuration],
    })),
    ...profileItems.map((record) => ({
      area: "profileItems" as const,
      label: record.name,
      recordId: record.id,
      values: [record.deductionRule, record.wasteRule, record.configuration],
    })),
    ...glassPackages.map((record) => ({
      area: "glassPackages" as const,
      label: record.name,
      recordId: record.id,
      values: [record.deductionRule, record.configuration],
    })),
    ...hardwareKits.map((record) => ({
      area: "hardwareKits" as const,
      label: record.name,
      recordId: record.id,
      values: [record.quantityRule, record.configuration],
    })),
    ...colorFinishes.map((record) => ({
      area: "colorFinishes" as const,
      label: record.name,
      recordId: record.id,
      values: [record.configuration],
    })),
    ...accessories.map((record) => ({
      area: "accessories" as const,
      label: record.name,
      recordId: record.id,
      values: [record.quantityRule, record.configuration],
    })),
    ...serviceItems.map((record) => ({
      area: "serviceItems" as const,
      label: record.name,
      recordId: record.id,
      values: [record.configuration],
    })),
    ...taxRates.map((record) => ({
      area: "taxRates" as const,
      label: record.name,
      recordId: record.id,
      values: [record.configuration],
    })),
    ...priceLists.map((record) => ({
      area: "priceLists" as const,
      label: `${record.name} / ${record.version}`,
      recordId: record.id,
      values: [record.notes],
    })),
    ...priceListItems.map((record) => ({
      area: "priceListItems" as const,
      label: record.sku ?? record.description ?? record.catalogItemId,
      recordId: record.id,
      values: [record.metadata],
    })),
    ...pricingRules.map((record) => ({
      area: "pricingRules" as const,
      label: record.name,
      recordId: record.id,
      requiresBusinessValidation: record.requiresBusinessValidation,
      values: [record.configuration],
    })),
  );

  return summarizeBusinessValidationRecords(records);
}

const emptyBusinessValidationSummary: BusinessValidationSummary = {
  total: 0,
  hasPending: false,
  areas: [],
  items: [],
};
