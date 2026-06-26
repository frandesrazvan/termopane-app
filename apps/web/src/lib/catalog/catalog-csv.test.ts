import {
  CatalogMaterialType,
  CatalogUnit,
  PriceListItemType,
  PriceListStatus,
  ProfileItemType,
  type Accessory,
  type ColorFinish,
  type GlassPackage,
  type HardwareKit,
  type PriceList,
  type PriceListItem,
  type ProfileItem,
  type ProfileSystem,
  type ServiceItem,
  type Supplier,
  type TaxRate,
} from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  catalogCsvEntityKeys,
  catalogCsvHeaders,
  exportTenantCatalogCsv,
  importTenantCatalogCsv,
  type CatalogCsvDataAccess,
} from "./catalog-csv";
import type { TenantDataScope } from "../data";

type TenantRecord = {
  id: string;
  tenantId: string;
  [key: string]: unknown;
};

type CatalogCsvFixture = {
  access: CatalogCsvDataAccess;
  records: {
    accessories: Accessory[];
    colorFinishes: ColorFinish[];
    glassPackages: GlassPackage[];
    hardwareKits: HardwareKit[];
    priceListItems: PriceListItem[];
    priceLists: PriceList[];
    profileItems: ProfileItem[];
    profileSystems: ProfileSystem[];
    serviceItems: ServiceItem[];
    suppliers: Supplier[];
    taxRates: TaxRate[];
  };
};

describe("catalog CSV import/export", () => {
  it("exports expected headers for every catalog CSV entity", async () => {
    const { access } = createCatalogCsvFixture();

    for (const entity of catalogCsvEntityKeys) {
      const csv = await exportTenantCatalogCsv({
        access,
        entity,
        scope: { tenantId: "tenant-a" },
      });
      const [header] = csv.split(/\r?\n/);

      expect(header).toBe(catalogCsvHeaders[entity].join(","));
      expect(header).not.toContain("tenantId");
    }
  });

  it("validates required fields during import dry-run", async () => {
    const { access, records } = createCatalogCsvFixture();
    const result = await importTenantCatalogCsv({
      access,
      csvText: csvFor("suppliers", [
        ["", "", "SUP-LIPSA-NUME", "", "", "", "", "", "true"],
      ]),
      entity: "suppliers",
      mode: "dry-run",
      scope: { tenantId: "tenant-a" },
    });

    expect(result.status).toBe("invalid");
    expect(result.errors).toContainEqual({
      rowNumber: 2,
      field: "name",
      message: "Camp obligatoriu lipsa.",
    });
    expect(records.suppliers).toHaveLength(2);
  });

  it("rejects cross-tenant parent IDs during import validation", async () => {
    const { access, records } = createCatalogCsvFixture();
    const result = await importTenantCatalogCsv({
      access,
      csvText: csvFor("profileItems", [
        [
          "",
          "profile-system-b",
          "supplier-a",
          "Profil sintetic blocat",
          "PROFIL-BLOCAT",
          ProfileItemType.FRAME,
          CatalogUnit.LINEAR_METER,
          "",
          "",
          "",
          "",
          "true",
        ],
      ]),
      entity: "profileItems",
      mode: "publish",
      scope: { tenantId: "tenant-a" },
    });

    expect(result.status).toBe("invalid");
    expect(result.errors).toContainEqual({
      rowNumber: 2,
      field: "profileSystemId",
      message: "Sistemul de profil nu exista in tenantul curent.",
    });
    expect(records.profileItems).toHaveLength(2);
  });

  it("creates and updates only tenant-owned records", async () => {
    const { access, records } = createCatalogCsvFixture();
    const result = await importTenantCatalogCsv({
      access,
      csvText: csvFor("suppliers", [
        ["supplier-a", "Furnizor sintetic actualizat", "SUP-A2", "", "", "", "", "", "false"],
        ["", "Furnizor sintetic nou", "SUP-NOU", "", "", "", "", "", "true"],
      ]),
      entity: "suppliers",
      mode: "publish",
      scope: { tenantId: "tenant-a" },
    });

    expect(result.status).toBe("imported");
    expect(result.createdRows).toBe(1);
    expect(result.updatedRows).toBe(1);
    expect(records.suppliers.find((supplier) => supplier.id === "supplier-a")).toMatchObject({
      tenantId: "tenant-a",
      name: "Furnizor sintetic actualizat",
      code: "SUP-A2",
      isActive: false,
    });
    expect(records.suppliers.find((supplier) => supplier.id === "supplier-b")).toMatchObject({
      tenantId: "tenant-b",
      name: "Furnizor sintetic B",
      code: "SUP-B",
    });
    expect(records.suppliers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          tenantId: "tenant-a",
          name: "Furnizor sintetic nou",
          code: "SUP-NOU",
        }),
      ]),
    );
  });

  it("rejects cross-tenant record IDs instead of updating them", async () => {
    const { access, records } = createCatalogCsvFixture();
    const result = await importTenantCatalogCsv({
      access,
      csvText: csvFor("suppliers", [
        ["supplier-b", "Furnizor tenant strain", "SUP-B2", "", "", "", "", "", "true"],
      ]),
      entity: "suppliers",
      mode: "publish",
      scope: { tenantId: "tenant-a" },
    });

    expect(result.status).toBe("invalid");
    expect(result.errors).toContainEqual({
      rowNumber: 2,
      field: "id",
      message: "ID-ul nu exista in tenantul curent.",
    });
    expect(records.suppliers.find((supplier) => supplier.id === "supplier-b")).toMatchObject({
      tenantId: "tenant-b",
      name: "Furnizor sintetic B",
      code: "SUP-B",
    });
  });
});

function csvFor(entity: keyof typeof catalogCsvHeaders, rows: string[][]) {
  return [catalogCsvHeaders[entity].join(","), ...rows.map((row) => row.join(","))].join("\n");
}

function createCatalogCsvFixture(): CatalogCsvFixture {
  const records = {
    suppliers: [
      catalogRecord<Supplier>({
        id: "supplier-a",
        tenantId: "tenant-a",
        name: "Furnizor sintetic A",
        code: "SUP-A",
        isActive: true,
      }),
      catalogRecord<Supplier>({
        id: "supplier-b",
        tenantId: "tenant-b",
        name: "Furnizor sintetic B",
        code: "SUP-B",
        isActive: true,
      }),
    ],
    profileSystems: [
      catalogRecord<ProfileSystem>({
        id: "profile-system-a",
        tenantId: "tenant-a",
        supplierId: "supplier-a",
        name: "Sistem PVC sintetic A",
        code: "PVC-A",
        materialType: CatalogMaterialType.PVC,
        configuration: { validationStatus: "requires business validation" },
        isActive: true,
      }),
      catalogRecord<ProfileSystem>({
        id: "profile-system-b",
        tenantId: "tenant-b",
        supplierId: "supplier-b",
        name: "Sistem PVC sintetic B",
        code: "PVC-B",
        materialType: CatalogMaterialType.PVC,
        isActive: true,
      }),
    ],
    profileItems: [
      catalogRecord<ProfileItem>({
        id: "profile-item-a",
        tenantId: "tenant-a",
        profileSystemId: "profile-system-a",
        supplierId: "supplier-a",
        name: "Profil toc sintetic A",
        code: "TOC-A",
        type: ProfileItemType.FRAME,
        unit: CatalogUnit.LINEAR_METER,
        isActive: true,
      }),
      catalogRecord<ProfileItem>({
        id: "profile-item-b",
        tenantId: "tenant-b",
        profileSystemId: "profile-system-b",
        supplierId: "supplier-b",
        name: "Profil toc sintetic B",
        code: "TOC-B",
        type: ProfileItemType.FRAME,
        unit: CatalogUnit.LINEAR_METER,
        isActive: true,
      }),
    ],
    glassPackages: [
      catalogRecord<GlassPackage>({
        id: "glass-a",
        tenantId: "tenant-a",
        supplierId: "supplier-a",
        name: "Sticla sintetica A",
        code: "GL-A",
        unit: CatalogUnit.SQUARE_METER,
        isActive: true,
      }),
      catalogRecord<GlassPackage>({
        id: "glass-b",
        tenantId: "tenant-b",
        supplierId: "supplier-b",
        name: "Sticla sintetica B",
        code: "GL-B",
        unit: CatalogUnit.SQUARE_METER,
        isActive: true,
      }),
    ],
    hardwareKits: [
      catalogRecord<HardwareKit>({
        id: "hardware-a",
        tenantId: "tenant-a",
        supplierId: "supplier-a",
        name: "Feronerie sintetica A",
        code: "FER-A",
        unit: CatalogUnit.EACH,
        isActive: true,
      }),
      catalogRecord<HardwareKit>({
        id: "hardware-b",
        tenantId: "tenant-b",
        supplierId: "supplier-b",
        name: "Feronerie sintetica B",
        code: "FER-B",
        unit: CatalogUnit.EACH,
        isActive: true,
      }),
    ],
    colorFinishes: [
      catalogRecord<ColorFinish>({
        id: "color-a",
        tenantId: "tenant-a",
        profileSystemId: "profile-system-a",
        supplierId: "supplier-a",
        name: "Alb sintetic A",
        code: "ALB-A",
        isActive: true,
      }),
      catalogRecord<ColorFinish>({
        id: "color-b",
        tenantId: "tenant-b",
        profileSystemId: "profile-system-b",
        supplierId: "supplier-b",
        name: "Alb sintetic B",
        code: "ALB-B",
        isActive: true,
      }),
    ],
    accessories: [
      catalogRecord<Accessory>({
        id: "accessory-a",
        tenantId: "tenant-a",
        supplierId: "supplier-a",
        name: "Glaf sintetic A",
        code: "GLAF-A",
        unit: CatalogUnit.LINEAR_METER,
        isActive: true,
      }),
      catalogRecord<Accessory>({
        id: "accessory-b",
        tenantId: "tenant-b",
        supplierId: "supplier-b",
        name: "Glaf sintetic B",
        code: "GLAF-B",
        unit: CatalogUnit.LINEAR_METER,
        isActive: true,
      }),
    ],
    serviceItems: [
      catalogRecord<ServiceItem>({
        id: "service-a",
        tenantId: "tenant-a",
        name: "Montaj sintetic A",
        code: "MONTAJ-A",
        unit: CatalogUnit.FIXED,
        isActive: true,
      }),
      catalogRecord<ServiceItem>({
        id: "service-b",
        tenantId: "tenant-b",
        name: "Montaj sintetic B",
        code: "MONTAJ-B",
        unit: CatalogUnit.FIXED,
        isActive: true,
      }),
    ],
    taxRates: [
      catalogRecord<TaxRate>({
        id: "tax-a",
        tenantId: "tenant-a",
        name: "TVA sintetic A",
        code: "TVA-A",
        rateBasisPoints: 1900,
        isDefault: true,
        isActive: true,
      }),
      catalogRecord<TaxRate>({
        id: "tax-b",
        tenantId: "tenant-b",
        name: "TVA sintetic B",
        code: "TVA-B",
        rateBasisPoints: 1900,
        isDefault: true,
        isActive: true,
      }),
    ],
    priceLists: [
      catalogRecord<PriceList>({
        id: "price-list-a",
        tenantId: "tenant-a",
        name: "Lista sintetica A",
        version: "2026-a",
        currency: "RON",
        status: PriceListStatus.ACTIVE,
        isActive: true,
      }),
      catalogRecord<PriceList>({
        id: "price-list-b",
        tenantId: "tenant-b",
        name: "Lista sintetica B",
        version: "2026-b",
        currency: "RON",
        status: PriceListStatus.ACTIVE,
        isActive: true,
      }),
    ],
    priceListItems: [
      catalogRecord<PriceListItem>({
        id: "price-item-a",
        tenantId: "tenant-a",
        priceListId: "price-list-a",
        itemType: PriceListItemType.ACCESSORY,
        catalogItemId: "accessory-a",
        unit: CatalogUnit.LINEAR_METER,
        costMinor: BigInt(100),
        saleMinor: BigInt(150),
        currency: "RON",
        isActive: true,
      }),
      catalogRecord<PriceListItem>({
        id: "price-item-b",
        tenantId: "tenant-b",
        priceListId: "price-list-b",
        itemType: PriceListItemType.ACCESSORY,
        catalogItemId: "accessory-b",
        unit: CatalogUnit.LINEAR_METER,
        costMinor: BigInt(100),
        saleMinor: BigInt(150),
        currency: "RON",
        isActive: true,
      }),
    ],
  };

  return {
    access: {
      listTenantSuppliers: (scope) => list(records.suppliers, scope),
      getTenantSupplier: (scope, id) => get(records.suppliers, scope, id),
      createTenantSupplier: (scope, data) => create(records.suppliers, scope, data),
      updateTenantSupplier: (scope, id, data) => update(records.suppliers, scope, id, data),

      listTenantProfileSystems: (scope) => list(records.profileSystems, scope),
      getTenantProfileSystem: (scope, id) => get(records.profileSystems, scope, id),
      createTenantProfileSystem: (scope, data) => create(records.profileSystems, scope, data),
      updateTenantProfileSystem: (scope, id, data) => update(records.profileSystems, scope, id, data),

      listTenantProfileItems: (scope) => list(records.profileItems, scope),
      getTenantProfileItem: (scope, id) => get(records.profileItems, scope, id),
      createTenantProfileItem: (scope, data) => create(records.profileItems, scope, data),
      updateTenantProfileItem: (scope, id, data) => update(records.profileItems, scope, id, data),

      listTenantGlassPackages: (scope) => list(records.glassPackages, scope),
      getTenantGlassPackage: (scope, id) => get(records.glassPackages, scope, id),
      createTenantGlassPackage: (scope, data) => create(records.glassPackages, scope, data),
      updateTenantGlassPackage: (scope, id, data) => update(records.glassPackages, scope, id, data),

      listTenantHardwareKits: (scope) => list(records.hardwareKits, scope),
      getTenantHardwareKit: (scope, id) => get(records.hardwareKits, scope, id),
      createTenantHardwareKit: (scope, data) => create(records.hardwareKits, scope, data),
      updateTenantHardwareKit: (scope, id, data) => update(records.hardwareKits, scope, id, data),

      listTenantColorFinishes: (scope) => list(records.colorFinishes, scope),
      getTenantColorFinish: (scope, id) => get(records.colorFinishes, scope, id),
      createTenantColorFinish: (scope, data) => create(records.colorFinishes, scope, data),
      updateTenantColorFinish: (scope, id, data) => update(records.colorFinishes, scope, id, data),

      listTenantAccessories: (scope) => list(records.accessories, scope),
      getTenantAccessory: (scope, id) => get(records.accessories, scope, id),
      createTenantAccessory: (scope, data) => create(records.accessories, scope, data),
      updateTenantAccessory: (scope, id, data) => update(records.accessories, scope, id, data),

      listTenantServiceItems: (scope) => list(records.serviceItems, scope),
      getTenantServiceItem: (scope, id) => get(records.serviceItems, scope, id),
      createTenantServiceItem: (scope, data) => create(records.serviceItems, scope, data),
      updateTenantServiceItem: (scope, id, data) => update(records.serviceItems, scope, id, data),

      listTenantTaxRates: (scope) => list(records.taxRates, scope),
      getTenantTaxRate: (scope, id) => get(records.taxRates, scope, id),
      createTenantTaxRate: (scope, data) => create(records.taxRates, scope, data),
      updateTenantTaxRate: (scope, id, data) => update(records.taxRates, scope, id, data),

      listTenantPriceLists: (scope) => list(records.priceLists, scope),
      getTenantPriceList: (scope, id) => get(records.priceLists, scope, id),
      createTenantPriceList: (scope, data) => create(records.priceLists, scope, data),
      updateTenantPriceList: (scope, id, data) => update(records.priceLists, scope, id, data),

      listTenantPriceListItems: (scope) => list(records.priceListItems, scope),
      getTenantPriceListItem: (scope, id) => get(records.priceListItems, scope, id),
      createTenantPriceListItem: (scope, data) => create(records.priceListItems, scope, data),
      updateTenantPriceListItem: (scope, id, data) => update(records.priceListItems, scope, id, data),
    },
    records,
  };
}

function catalogRecord<TRecord extends TenantRecord>(
  overrides: Partial<TRecord> & Pick<TenantRecord, "id" | "tenantId">,
) {
  return {
    deletedAt: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  } as TRecord;
}

function list<TRecord extends TenantRecord>(records: TRecord[], scope: TenantDataScope) {
  const tenantId = scopeTenantId(scope);

  return Promise.resolve(records.filter((record) => record.tenantId === tenantId));
}

function get<TRecord extends TenantRecord>(
  records: TRecord[],
  scope: TenantDataScope,
  id: string,
) {
  const tenantId = scopeTenantId(scope);

  return Promise.resolve(
    records.find((record) => record.tenantId === tenantId && record.id === id) ?? null,
  );
}

function create<TRecord extends TenantRecord>(
  records: TRecord[],
  scope: TenantDataScope,
  data: Record<string, unknown>,
) {
  const tenantId = scopeTenantId(scope);
  const record = catalogRecord<TRecord>({
    id: `${String(data.name ?? data.sku ?? "record").toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${records.length + 1}`,
    tenantId,
    ...data,
  } as Partial<TRecord> & Pick<TenantRecord, "id" | "tenantId">);

  records.push(record);

  return Promise.resolve(record);
}

function update<TRecord extends TenantRecord>(
  records: TRecord[],
  scope: TenantDataScope,
  id: string,
  data: Record<string, unknown>,
) {
  const tenantId = scopeTenantId(scope);
  const record = records.find((candidate) => candidate.tenantId === tenantId && candidate.id === id);

  if (!record) {
    return Promise.resolve(null);
  }

  Object.assign(record, data);

  return Promise.resolve(record);
}

function scopeTenantId(scope: TenantDataScope) {
  return "tenantId" in scope ? scope.tenantId : scope.tenant.id;
}
