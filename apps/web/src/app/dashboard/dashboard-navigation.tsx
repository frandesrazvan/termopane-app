"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { dashboardNavItems, isDashboardNavItemActive } from "./dashboard-nav";

export function DashboardDesktopNavigation() {
  const pathname = usePathname();

  return (
    <nav className="space-y-1" aria-label="Navigare principală">
      {dashboardNavItems.map((item) => (
        <Link
          key={item.label}
          href={item.href}
          aria-current={isDashboardNavItemActive(pathname, item) ? "page" : undefined}
          className={navItemClassName(isDashboardNavItemActive(pathname, item), "desktop")}
        >
          <item.icon aria-hidden="true" size={18} />
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

export function DashboardMobileNavigation() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navigare mobilă"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200 bg-white px-3 pt-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] shadow-[0_-8px_24px_rgba(24,24,27,0.08)] lg:hidden"
    >
      <div className="mx-auto grid max-w-md grid-cols-4 gap-1">
        {dashboardNavItems.map((item) => {
          const active = isDashboardNavItemActive(pathname, item);

          return (
            <Link
              key={item.label}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={navItemClassName(active, "mobile")}
            >
              <item.icon aria-hidden="true" size={18} />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function navItemClassName(active: boolean, variant: "desktop" | "mobile") {
  const base =
    "touch-manipulation rounded-md font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2";

  if (variant === "mobile") {
    return [
      base,
      "flex min-h-12 flex-col items-center justify-center gap-1 px-1 py-2 text-[11px]",
      active
        ? "bg-zinc-950 text-white"
        : "text-zinc-600 active:bg-stone-100 active:text-zinc-950",
    ].join(" ");
  }

  return [
    base,
    "flex min-h-11 items-center gap-3 px-3 py-2 text-sm",
    active
      ? "bg-zinc-950 text-white"
      : "text-zinc-600 hover:bg-white hover:text-zinc-950 active:bg-stone-100",
  ].join(" ");
}
