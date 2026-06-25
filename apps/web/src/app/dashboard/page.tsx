import {
  Archive,
  Building2,
  FileText,
  LayoutDashboard,
  LogOut,
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
import { tenantMemberStatusLabel, tenantRoleLabel } from "@/lib/i18n";
import { logoutAction } from "../logout/actions";
import { switchTenantAction } from "./actions";

const navItems = [
  { label: "Panou", icon: LayoutDashboard, href: "/dashboard", active: true },
  { label: "Clienți", icon: UsersRound, href: "/dashboard/customers" },
  { label: "Oferte", icon: FileText, href: "/dashboard/quotes" },
  { label: "Catalog", icon: Archive, href: "#" },
  { label: "Setări", icon: Settings, href: "#" },
];

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const context = await requireTenant();
  const memberships = await listTenantMemberships(context.user.id);
  const permissions = [
    { label: "Costuri interne", allowed: canViewInternalCosts(context.membership) },
    { label: "Administrare catalog", allowed: canManageCatalog(context.membership) },
    { label: "Administrare utilizatori", allowed: canManageUsers(context.membership) },
    { label: "Generare PDF", allowed: canGeneratePdf(context.membership) },
  ];

  return (
    <main className="min-h-screen bg-stone-50">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col">
        <header className="sticky top-0 z-10 border-b border-zinc-200 bg-stone-50/95 px-4 py-3 backdrop-blur sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-zinc-950 text-white">
                <Building2 aria-hidden="true" size={20} />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-zinc-950">
                  {context.tenant.name}
                </p>
                <p className="truncate text-xs text-zinc-500">
                  {context.user.displayName} · {tenantRoleLabel(context.membership.role)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <form action={switchTenantAction}>
                <label className="sr-only" htmlFor="tenantId">
                  Tenant curent
                </label>
                <select
                  id="tenantId"
                  name="tenantId"
                  defaultValue={context.tenant.id}
                  className="h-10 max-w-44 rounded-md border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-800 shadow-sm"
                >
                  {memberships.map((membership) => (
                    <option key={membership.tenantId} value={membership.tenantId}>
                      {membership.tenant.name}
                    </option>
                  ))}
                </select>
                <button className="ml-2 h-10 rounded-md border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-800 shadow-sm">
                  Schimbă
                </button>
              </form>
              <form action={logoutAction}>
                <button className="flex size-10 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-700 shadow-sm">
                  <LogOut aria-hidden="true" size={17} />
                  <span className="sr-only">Deconectare</span>
                </button>
              </form>
            </div>
          </div>
        </header>

        <div className="grid flex-1 grid-cols-1 lg:grid-cols-[220px_1fr]">
          <aside className="hidden border-r border-zinc-200 px-4 py-6 lg:block">
            <nav className="space-y-1" aria-label="Navigare principală">
              {navItems.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium ${
                    item.active
                      ? "bg-zinc-950 text-white"
                      : "text-zinc-600 hover:bg-white hover:text-zinc-950"
                  }`}
                >
                  <item.icon aria-hidden="true" size={18} />
                  {item.label}
                </Link>
              ))}
            </nav>
          </aside>

          <section className="px-4 py-6 pb-24 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-medium text-teal-700">Spațiu protejat</p>
                <h1 className="mt-1 text-2xl font-semibold tracking-normal text-zinc-950 sm:text-3xl">
                  Panou tenant
                </h1>
              </div>
              <div className="inline-flex items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-700 shadow-sm">
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
          </section>
        </div>
      </div>
    </main>
  );
}
