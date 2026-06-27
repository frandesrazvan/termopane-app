import { Building2, LogOut, RefreshCw } from "lucide-react";
import { listTenantMemberships, requireTenant } from "@/lib/auth";
import { tenantRoleLabel } from "@/lib/i18n";
import { logoutAction } from "../logout/actions";
import { switchTenantAction } from "./actions";
import {
  DashboardDesktopNavigation,
  DashboardMobileNavigation,
} from "./dashboard-navigation";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const context = await requireTenant();
  const memberships = await listTenantMemberships(context.user.id);

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col">
        <header className="sticky top-0 z-30 border-b border-zinc-200 bg-stone-50/95 px-4 py-3 backdrop-blur sm:px-6">
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

            <div className="flex min-w-0 flex-1 items-center justify-end gap-2 sm:flex-none">
              <form action={switchTenantAction} className="flex min-w-0 items-center gap-2">
                <label className="sr-only" htmlFor="tenantId">
                  Tenant curent
                </label>
                <select
                  id="tenantId"
                  name="tenantId"
                  defaultValue={context.tenant.id}
                  className="h-11 min-w-0 max-w-[9.5rem] rounded-md border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-800 shadow-sm outline-none focus:border-zinc-900 sm:max-w-48"
                >
                  {memberships.map((membership) => (
                    <option key={membership.tenantId} value={membership.tenantId}>
                      {membership.tenant.name}
                    </option>
                  ))}
                </select>
                <button className="inline-flex size-11 shrink-0 items-center justify-center rounded-md border border-zinc-200 bg-white text-sm font-semibold text-zinc-800 shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2 active:bg-stone-100 sm:h-11 sm:w-auto sm:px-3">
                  <RefreshCw aria-hidden="true" size={16} />
                  <span className="sr-only sm:not-sr-only sm:ml-2">Schimbă</span>
                </button>
              </form>
              <form action={logoutAction}>
                <button className="flex size-11 touch-manipulation items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-700 shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2 active:bg-stone-100">
                  <LogOut aria-hidden="true" size={17} />
                  <span className="sr-only">Deconectare</span>
                </button>
              </form>
            </div>
          </div>
        </header>

        <div className="grid flex-1 grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)]">
          <aside className="hidden border-r border-zinc-200 px-4 py-6 lg:block">
            <DashboardDesktopNavigation />
          </aside>
          <div className="min-w-0 pb-24 lg:pb-0">{children}</div>
        </div>

        <DashboardMobileNavigation />
      </div>
    </div>
  );
}
