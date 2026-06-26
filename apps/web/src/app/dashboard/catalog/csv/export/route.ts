import { canManageCatalog, requireTenant } from "@/lib/auth";
import { exportTenantCatalogCsv, isCatalogCsvEntityKey } from "@/lib/catalog/catalog-csv";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const context = await requireTenant();
  const { searchParams } = new URL(request.url);
  const entity = searchParams.get("entity");

  if (!canManageCatalog(context.membership)) {
    return new Response("Doar OWNER/ADMIN pot exporta CSV.", { status: 403 });
  }

  if (!isCatalogCsvEntityKey(entity)) {
    return new Response("Sectiune CSV invalida.", { status: 400 });
  }

  const csv = await exportTenantCatalogCsv({
    entity,
    scope: context,
  });
  const dateSegment = new Date().toISOString().slice(0, 10);

  return new Response(csv, {
    headers: {
      "Cache-Control": "no-store",
      "Content-Disposition": `attachment; filename="catalog-${entity}-${dateSegment}.csv"`,
      "Content-Type": "text/csv; charset=utf-8",
    },
  });
}
