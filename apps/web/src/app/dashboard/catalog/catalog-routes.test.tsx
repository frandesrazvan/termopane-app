import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { dashboardNavItems } from "../dashboard-nav";
import { CatalogHome } from "./_components/catalog-home";
import { catalogSections } from "./catalog-config";

const expectedRoutes = [
  "/dashboard/catalog/suppliers",
  "/dashboard/catalog/profile-systems",
  "/dashboard/catalog/profile-items",
  "/dashboard/catalog/glass-packages",
  "/dashboard/catalog/hardware-kits",
  "/dashboard/catalog/colors",
  "/dashboard/catalog/accessories",
  "/dashboard/catalog/services",
  "/dashboard/catalog/tax-rates",
  "/dashboard/catalog/price-lists",
];

describe("catalog admin routes", () => {
  it("renders Romanian catalog labels and links every catalog route", () => {
    const markup = renderToStaticMarkup(
      <CatalogHome canManage={true} tenantName="Tenant sintetic" />,
    );

    expect(markup).toContain("Administrare catalog");
    expect(markup).toContain("Furnizori");
    expect(markup).toContain("Sisteme de profil");
    expect(markup).toContain("Pachete sticla");
    expect(markup).toContain("Kituri feronerie");
    expect(markup).toContain("Culori si finisaje");
    expect(markup).toContain("Liste de preturi");

    for (const route of expectedRoutes) {
      expect(markup).toContain(route);
    }
  });

  it("keeps the dashboard Catalog navigation pointed at the catalog landing route", () => {
    expect(dashboardNavItems.find((item) => item.label === "Catalog")?.href).toBe(
      "/dashboard/catalog",
    );
  });

  it("defines all requested catalog sections", () => {
    expect(catalogSections.map((section) => section.href)).toEqual(expectedRoutes);
  });
});

