import { Archive, FilePlus2, FileText, Settings, ShieldCheck, UsersRound } from "lucide-react";
import Link from "next/link";
import {
  canGeneratePdf,
  canManageCatalog,
  canManageUsers,
  canViewInternalCosts,
  listTenantMemberships,
  requireTenant,
} from "@/lib/auth";
import { getTenantUserPreference } from "@/lib/data";
import { tenantMemberStatusLabel } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const context = await requireTenant();
  const [memberships, userPreference] = await Promise.all([
    listTenantMemberships(context.user.id),
    getTenantUserPreference(context, context.user.id),
  ]);
  const permissions = [
    { label: "Costuri interne", allowed: canViewInternalCosts(context.membership) },
    { label: "Administrare catalog", allowed: canManageCatalog(context.membership) },
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
