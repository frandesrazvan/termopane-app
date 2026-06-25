import { canManageCatalog, requireTenant } from "@/lib/auth";
import { CatalogHome } from "./_components/catalog-home";

export const dynamic = "force-dynamic";

export default async function CatalogPage() {
  const context = await requireTenant();

  return (
    <CatalogHome
      canManage={canManageCatalog(context.membership)}
      tenantName={context.tenant.name}
    />
  );
}

