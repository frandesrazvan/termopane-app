import { describe, expect, it } from "vitest";
import { dashboardNavItems, isDashboardNavItemActive } from "./dashboard-nav";

describe("dashboard navigation", () => {
  it("keeps mobile business navigation Romanian and routable", () => {
    expect(dashboardNavItems.map((item) => item.label)).toEqual([
      "Panou",
      "Clienți",
      "Oferte",
      "Catalog",
      "Setări",
    ]);
    expect(dashboardNavItems.map((item) => item.href)).toEqual([
      "/dashboard",
      "/dashboard/customers",
      "/dashboard/quotes",
      "/dashboard/catalog",
      "/dashboard/settings",
    ]);
    expect(dashboardNavItems.every((item) => item.href !== "#")).toBe(true);
  });

  it("matches exact and nested dashboard routes", () => {
    const dashboard = dashboardNavItems[0]!;
    const quotes = dashboardNavItems.find((item) => item.label === "Oferte")!;

    expect(isDashboardNavItemActive("/dashboard", dashboard)).toBe(true);
    expect(isDashboardNavItemActive("/dashboard/quotes", dashboard)).toBe(false);
    expect(isDashboardNavItemActive("/dashboard/quotes", quotes)).toBe(true);
    expect(isDashboardNavItemActive("/dashboard/quotes/demo", quotes)).toBe(true);
  });
});
