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
import { createTenantDataAccess, type TenantDataScope } from "../data";

export type CatalogCsvEntityKey =
  | "suppliers"
  | "profileSystems"
  | "profileItems"
  | "glassPackages"
  | "hardwareKits"
  | "colorFinishes"
  | "accessories"
  | "serviceItems"
  | "taxRates"
  | "priceLists"
  | "priceListItems";

export type CatalogCsvImportMode = "dry-run" | "publish";

export type CatalogCsvImportStatus = "empty" | "invalid" | "valid" | "imported";

export type CatalogCsvRowError = {
  rowNumber: number;
  field: string;
  message: string;
};

export type CatalogCsvImportResult = {
  entity: CatalogCsvEntityKey | null;
  mode: CatalogCsvImportMode;
  status: CatalogCsvImportStatus;
  message: string;
  totalRows: number;
  validRows: number;
  createdRows: number;
  updatedRows: number;
  errors: CatalogCsvRowError[];
};

export type CatalogCsvImportOptions = {
  access?: CatalogCsvDataAccess;
  actorUserId?: string | null;
  csvText: string;
  entity: CatalogCsvEntityKey;
  mode?: CatalogCsvImportMode;
  scope: TenantDataScope;
};

export type CatalogCsvExportOptions = {
  access?: CatalogCsvDataAccess;
  entity: CatalogCsvEntityKey;
  scope: TenantDataScope;
};

export type CatalogCsvDataAccess = {
  listTenantSuppliers(scope: TenantDataScope): Promise<Supplier[]>;
  getTenantSupplier(scope: TenantDataScope, id: string): Promise<Supplier | null>;
  createTenantSupplier(scope: TenantDataScope, data: Record<string, unknown>): Promise<Supplier | null>;
  updateTenantSupplier(
    scope: TenantDataScope,
    id: string,
    data: Record<string, unknown>,
  ): Promise<Supplier | null>;

  listTenantProfileSystems(scope: TenantDataScope): Promise<ProfileSystem[]>;
  getTenantProfileSystem(scope: TenantDataScope, id: string): Promise<ProfileSystem | null>;
  createTenantProfileSystem(
    scope: TenantDataScope,
    data: Record<string, unknown>,
  ): Promise<ProfileSystem | null>;
  updateTenantProfileSystem(
    scope: TenantDataScope,
    id: string,
    data: Record<string, unknown>,
  ): Promise<ProfileSystem | null>;

  listTenantProfileItems(scope: TenantDataScope): Promise<ProfileItem[]>;
  getTenantProfileItem(scope: TenantDataScope, id: string): Promise<ProfileItem | null>;
  createTenantProfileItem(
    scope: TenantDataScope,
    data: Record<string, unknown>,
  ): Promise<ProfileItem | null>;
  updateTenantProfileItem(
    scope: TenantDataScope,
    id: string,
    data: Record<string, unknown>,
  ): Promise<ProfileItem | null>;

  listTenantGlassPackages(scope: TenantDataScope): Promise<GlassPackage[]>;
  getTenantGlassPackage(scope: TenantDataScope, id: string): Promise<GlassPackage | null>;
  createTenantGlassPackage(
    scope: TenantDataScope,
    data: Record<string, unknown>,
  ): Promise<GlassPackage | null>;
  updateTenantGlassPackage(
    scope: TenantDataScope,
    id: string,
    data: Record<string, unknown>,
  ): Promise<GlassPackage | null>;

  listTenantHardwareKits(scope: TenantDataScope): Promise<HardwareKit[]>;
  getTenantHardwareKit(scope: TenantDataScope, id: string): Promise<HardwareKit | null>;
  createTenantHardwareKit(
    scope: TenantDataScope,
    data: Record<string, unknown>,
  ): Promise<HardwareKit | null>;
  updateTenantHardwareKit(
    scope: TenantDataScope,
    id: string,
    data: Record<string, unknown>,
  ): Promise<HardwareKit | null>;

  listTenantColorFinishes(scope: TenantDataScope): Promise<ColorFinish[]>;
  getTenantColorFinish(scope: TenantDataScope, id: string): Promise<ColorFinish | null>;
  createTenantColorFinish(
    scope: TenantDataScope,
    data: Record<string, unknown>,
  ): Promise<ColorFinish | null>;
  updateTenantColorFinish(
    scope: TenantDataScope,
    id: string,
    data: Record<string, unknown>,
  ): Promise<ColorFinish | null>;

  listTenantAccessories(scope: TenantDataScope): Promise<Accessory[]>;
  getTenantAccessory(scope: TenantDataScope, id: string): Promise<Accessory | null>;
  createTenantAccessory(scope: TenantDataScope, data: Record<string, unknown>): Promise<Accessory | null>;
  updateTenantAccessory(
    scope: TenantDataScope,
    id: string,
    data: Record<string, unknown>,
  ): Promise<Accessory | null>;

  listTenantServiceItems(scope: TenantDataScope): Promise<ServiceItem[]>;
  getTenantServiceItem(scope: TenantDataScope, id: string): Promise<ServiceItem | null>;
  createTenantServiceItem(
    scope: TenantDataScope,
    data: Record<string, unknown>,
  ): Promise<ServiceItem | null>;
  updateTenantServiceItem(
    scope: TenantDataScope,
    id: string,
    data: Record<string, unknown>,
  ): Promise<ServiceItem | null>;

  listTenantTaxRates(scope: TenantDataScope): Promise<TaxRate[]>;
  getTenantTaxRate(scope: TenantDataScope, id: string): Promise<TaxRate | null>;
  createTenantTaxRate(scope: TenantDataScope, data: Record<string, unknown>): Promise<TaxRate | null>;
  updateTenantTaxRate(
    scope: TenantDataScope,
    id: string,
    data: Record<string, unknown>,
  ): Promise<TaxRate | null>;

  listTenantPriceLists(scope: TenantDataScope): Promise<PriceList[]>;
  getTenantPriceList(scope: TenantDataScope, id: string): Promise<PriceList | null>;
  createTenantPriceList(scope: TenantDataScope, data: Record<string, unknown>): Promise<PriceList | null>;
  updateTenantPriceList(
    scope: TenantDataScope,
    id: string,
    data: Record<string, unknown>,
  ): Promise<PriceList | null>;

  listTenantPriceListItems(scope: TenantDataScope): Promise<PriceListItem[]>;
  getTenantPriceListItem(scope: TenantDataScope, id: string): Promise<PriceListItem | null>;
  createTenantPriceListItem(
    scope: TenantDataScope,
    data: Record<string, unknown>,
  ): Promise<PriceListItem | null>;
  updateTenantPriceListItem(
    scope: TenantDataScope,
    id: string,
    data: Record<string, unknown>,
  ): Promise<PriceListItem | null>;
};

type CsvRecord = Record<string, unknown> & {
  id: string;
};

type ParsedCsvRow = {
  rowNumber: number;
  values: Record<string, string>;
};

type StagedCsvRow = {
  data: Record<string, unknown>;
  id: string | null;
  operation: "create" | "update";
  rowNumber: number;
};

type ValidationContext = {
  access: CatalogCsvDataAccess;
  actorUserId?: string | null;
  errors: CatalogCsvRowError[];
  row: ParsedCsvRow;
  scope: TenantDataScope;
};

type CatalogCsvDefinition = {
  create: (
    access: CatalogCsvDataAccess,
    scope: TenantDataScope,
    data: Record<string, unknown>,
  ) => Promise<CsvRecord | null>;
  get: (
    access: CatalogCsvDataAccess,
    scope: TenantDataScope,
    id: string,
  ) => Promise<CsvRecord | null>;
  headers: readonly string[];
  key: CatalogCsvEntityKey;
  label: string;
  list: (access: CatalogCsvDataAccess, scope: TenantDataScope) => Promise<CsvRecord[]>;
  parse: (context: ValidationContext) => Promise<Record<string, unknown>>;
  toRow: (record: CsvRecord) => Record<string, string>;
  update: (
    access: CatalogCsvDataAccess,
    scope: TenantDataScope,
    id: string,
    data: Record<string, unknown>,
  ) => Promise<CsvRecord | null>;
};

export const catalogCsvEntityKeys: CatalogCsvEntityKey[] = [
  "suppliers",
  "profileSystems",
  "profileItems",
  "glassPackages",
  "hardwareKits",
  "colorFinishes",
  "accessories",
  "serviceItems",
  "taxRates",
  "priceLists",
  "priceListItems",
];

export const catalogCsvEntityLabels: Record<CatalogCsvEntityKey, string> = {
  suppliers: "Furnizori",
  profileSystems: "Sisteme de profil",
  profileItems: "Profile",
  glassPackages: "Pachete sticla",
  hardwareKits: "Kituri feronerie",
  colorFinishes: "Culori si finisaje",
  accessories: "Accesorii",
  serviceItems: "Servicii",
  taxRates: "Cote taxe",
  priceLists: "Liste de preturi",
  priceListItems: "Pozitii de pret",
};

export const initialCatalogCsvImportResult: CatalogCsvImportResult = {
  entity: null,
  mode: "dry-run",
  status: "empty",
  message: "Incarca un fisier CSV pentru validare dry-run.",
  totalRows: 0,
  validRows: 0,
  createdRows: 0,
  updatedRows: 0,
  errors: [],
};

export const catalogCsvHeaders: Record<CatalogCsvEntityKey, readonly string[]> = {
  suppliers: [
    "id",
    "name",
    "code",
    "contactName",
    "email",
    "phone",
    "website",
    "notes",
    "isActive",
  ],
  profileSystems: [
    "id",
    "supplierId",
    "name",
    "code",
    "materialType",
    "description",
    "configuration",
    "isActive",
  ],
  profileItems: [
    "id",
    "profileSystemId",
    "supplierId",
    "name",
    "code",
    "type",
    "unit",
    "description",
    "deductionRule",
    "wasteRule",
    "configuration",
    "isActive",
  ],
  glassPackages: [
    "id",
    "supplierId",
    "name",
    "code",
    "compositionLabel",
    "unit",
    "minBillableAreaSquareMm",
    "deductionRule",
    "configuration",
    "isActive",
  ],
  hardwareKits: [
    "id",
    "supplierId",
    "name",
    "code",
    "category",
    "openingType",
    "unit",
    "quantityRule",
    "configuration",
    "isActive",
  ],
  colorFinishes: [
    "id",
    "profileSystemId",
    "supplierId",
    "name",
    "code",
    "surface",
    "configuration",
    "isActive",
  ],
  accessories: [
    "id",
    "supplierId",
    "name",
    "code",
    "category",
    "unit",
    "quantityRule",
    "configuration",
    "isActive",
  ],
  serviceItems: ["id", "name", "code", "category", "unit", "configuration", "isActive"],
  taxRates: [
    "id",
    "name",
    "code",
    "rateBasisPoints",
    "isDefault",
    "validFrom",
    "validTo",
    "configuration",
    "isActive",
  ],
  priceLists: [
    "id",
    "name",
    "version",
    "currency",
    "status",
    "effectiveFrom",
    "effectiveTo",
    "notes",
    "isActive",
  ],
  priceListItems: [
    "id",
    "priceListId",
    "itemType",
    "catalogItemId",
    "sku",
    "description",
    "unit",
    "costMinor",
    "saleMinor",
    "currency",
    "metadata",
    "isActive",
  ],
};

const catalogCsvDefinitions: Record<CatalogCsvEntityKey, CatalogCsvDefinition> = {
  suppliers: {
    key: "suppliers",
    label: catalogCsvEntityLabels.suppliers,
    headers: catalogCsvHeaders.suppliers,
    list: (access, scope) => access.listTenantSuppliers(scope) as Promise<CsvRecord[]>,
    get: (access, scope, id) => access.getTenantSupplier(scope, id) as Promise<CsvRecord | null>,
    create: (access, scope, data) => access.createTenantSupplier(scope, data) as Promise<CsvRecord | null>,
    update: (access, scope, id, data) =>
      access.updateTenantSupplier(scope, id, data) as Promise<CsvRecord | null>,
    toRow: (record) => baseRecordRow(record, catalogCsvHeaders.suppliers),
    parse: async (context) => ({
      name: requiredText(context, "name", 160),
      code: optionalText(context, "code", 80),
      contactName: optionalText(context, "contactName", 160),
      email: optionalText(context, "email", 320),
      phone: optionalText(context, "phone", 80),
      website: optionalText(context, "website", 240),
      notes: optionalText(context, "notes", 1000),
      isActive: optionalBoolean(context, "isActive", true),
    }),
  },
  profileSystems: {
    key: "profileSystems",
    label: catalogCsvEntityLabels.profileSystems,
    headers: catalogCsvHeaders.profileSystems,
    list: (access, scope) => access.listTenantProfileSystems(scope) as Promise<CsvRecord[]>,
    get: (access, scope, id) => access.getTenantProfileSystem(scope, id) as Promise<CsvRecord | null>,
    create: (access, scope, data) =>
      access.createTenantProfileSystem(scope, data) as Promise<CsvRecord | null>,
    update: (access, scope, id, data) =>
      access.updateTenantProfileSystem(scope, id, data) as Promise<CsvRecord | null>,
    toRow: (record) => baseRecordRow(record, catalogCsvHeaders.profileSystems),
    parse: async (context) => {
      await optionalTenantReference(context, "supplierId", "Furnizorul", (id) =>
        context.access.getTenantSupplier(context.scope, id),
      );

      return {
        supplierId: optionalText(context, "supplierId", 120),
        name: requiredText(context, "name", 160),
        code: optionalText(context, "code", 80),
        materialType: enumText(context, "materialType", Object.values(CatalogMaterialType)),
        description: optionalText(context, "description", 1000),
        configuration: optionalJsonObject(context, "configuration"),
        isActive: optionalBoolean(context, "isActive", true),
      };
    },
  },
  profileItems: {
    key: "profileItems",
    label: catalogCsvEntityLabels.profileItems,
    headers: catalogCsvHeaders.profileItems,
    list: (access, scope) => access.listTenantProfileItems(scope) as Promise<CsvRecord[]>,
    get: (access, scope, id) => access.getTenantProfileItem(scope, id) as Promise<CsvRecord | null>,
    create: (access, scope, data) =>
      access.createTenantProfileItem(scope, data) as Promise<CsvRecord | null>,
    update: (access, scope, id, data) =>
      access.updateTenantProfileItem(scope, id, data) as Promise<CsvRecord | null>,
    toRow: (record) => baseRecordRow(record, catalogCsvHeaders.profileItems),
    parse: async (context) => {
      await requiredTenantReference(context, "profileSystemId", "Sistemul de profil", (id) =>
        context.access.getTenantProfileSystem(context.scope, id),
      );
      await optionalTenantReference(context, "supplierId", "Furnizorul", (id) =>
        context.access.getTenantSupplier(context.scope, id),
      );

      return {
        profileSystemId: requiredText(context, "profileSystemId", 120),
        supplierId: optionalText(context, "supplierId", 120),
        name: requiredText(context, "name", 160),
        code: optionalText(context, "code", 80),
        type: enumText(context, "type", Object.values(ProfileItemType)),
        unit: enumText(context, "unit", Object.values(CatalogUnit)),
        description: optionalText(context, "description", 1000),
        deductionRule: optionalJsonObject(context, "deductionRule"),
        wasteRule: optionalJsonObject(context, "wasteRule"),
        configuration: optionalJsonObject(context, "configuration"),
        isActive: optionalBoolean(context, "isActive", true),
      };
    },
  },
  glassPackages: {
    key: "glassPackages",
    label: catalogCsvEntityLabels.glassPackages,
    headers: catalogCsvHeaders.glassPackages,
    list: (access, scope) => access.listTenantGlassPackages(scope) as Promise<CsvRecord[]>,
    get: (access, scope, id) => access.getTenantGlassPackage(scope, id) as Promise<CsvRecord | null>,
    create: (access, scope, data) =>
      access.createTenantGlassPackage(scope, data) as Promise<CsvRecord | null>,
    update: (access, scope, id, data) =>
      access.updateTenantGlassPackage(scope, id, data) as Promise<CsvRecord | null>,
    toRow: (record) => baseRecordRow(record, catalogCsvHeaders.glassPackages),
    parse: async (context) => {
      await optionalTenantReference(context, "supplierId", "Furnizorul", (id) =>
        context.access.getTenantSupplier(context.scope, id),
      );

      return {
        supplierId: optionalText(context, "supplierId", 120),
        name: requiredText(context, "name", 160),
        code: optionalText(context, "code", 80),
        compositionLabel: optionalText(context, "compositionLabel", 160),
        unit: enumText(context, "unit", Object.values(CatalogUnit)),
        minBillableAreaSquareMm: optionalInteger(context, "minBillableAreaSquareMm"),
        deductionRule: optionalJsonObject(context, "deductionRule"),
        configuration: optionalJsonObject(context, "configuration"),
        isActive: optionalBoolean(context, "isActive", true),
      };
    },
  },
  hardwareKits: {
    key: "hardwareKits",
    label: catalogCsvEntityLabels.hardwareKits,
    headers: catalogCsvHeaders.hardwareKits,
    list: (access, scope) => access.listTenantHardwareKits(scope) as Promise<CsvRecord[]>,
    get: (access, scope, id) => access.getTenantHardwareKit(scope, id) as Promise<CsvRecord | null>,
    create: (access, scope, data) =>
      access.createTenantHardwareKit(scope, data) as Promise<CsvRecord | null>,
    update: (access, scope, id, data) =>
      access.updateTenantHardwareKit(scope, id, data) as Promise<CsvRecord | null>,
    toRow: (record) => baseRecordRow(record, catalogCsvHeaders.hardwareKits),
    parse: async (context) => {
      await optionalTenantReference(context, "supplierId", "Furnizorul", (id) =>
        context.access.getTenantSupplier(context.scope, id),
      );

      return {
        supplierId: optionalText(context, "supplierId", 120),
        name: requiredText(context, "name", 160),
        code: optionalText(context, "code", 80),
        category: optionalText(context, "category", 120),
        openingType: optionalText(context, "openingType", 120),
        unit: enumText(context, "unit", Object.values(CatalogUnit)),
        quantityRule: optionalJsonObject(context, "quantityRule"),
        configuration: optionalJsonObject(context, "configuration"),
        isActive: optionalBoolean(context, "isActive", true),
      };
    },
  },
  colorFinishes: {
    key: "colorFinishes",
    label: catalogCsvEntityLabels.colorFinishes,
    headers: catalogCsvHeaders.colorFinishes,
    list: (access, scope) => access.listTenantColorFinishes(scope) as Promise<CsvRecord[]>,
    get: (access, scope, id) => access.getTenantColorFinish(scope, id) as Promise<CsvRecord | null>,
    create: (access, scope, data) =>
      access.createTenantColorFinish(scope, data) as Promise<CsvRecord | null>,
    update: (access, scope, id, data) =>
      access.updateTenantColorFinish(scope, id, data) as Promise<CsvRecord | null>,
    toRow: (record) => baseRecordRow(record, catalogCsvHeaders.colorFinishes),
    parse: async (context) => {
      await optionalTenantReference(context, "profileSystemId", "Sistemul de profil", (id) =>
        context.access.getTenantProfileSystem(context.scope, id),
      );
      await optionalTenantReference(context, "supplierId", "Furnizorul", (id) =>
        context.access.getTenantSupplier(context.scope, id),
      );

      return {
        profileSystemId: optionalText(context, "profileSystemId", 120),
        supplierId: optionalText(context, "supplierId", 120),
        name: requiredText(context, "name", 160),
        code: optionalText(context, "code", 80),
        surface: optionalText(context, "surface", 120),
        configuration: optionalJsonObject(context, "configuration"),
        isActive: optionalBoolean(context, "isActive", true),
      };
    },
  },
  accessories: {
    key: "accessories",
    label: catalogCsvEntityLabels.accessories,
    headers: catalogCsvHeaders.accessories,
    list: (access, scope) => access.listTenantAccessories(scope) as Promise<CsvRecord[]>,
    get: (access, scope, id) => access.getTenantAccessory(scope, id) as Promise<CsvRecord | null>,
    create: (access, scope, data) =>
      access.createTenantAccessory(scope, data) as Promise<CsvRecord | null>,
    update: (access, scope, id, data) =>
      access.updateTenantAccessory(scope, id, data) as Promise<CsvRecord | null>,
    toRow: (record) => baseRecordRow(record, catalogCsvHeaders.accessories),
    parse: async (context) => {
      await optionalTenantReference(context, "supplierId", "Furnizorul", (id) =>
        context.access.getTenantSupplier(context.scope, id),
      );

      return {
        supplierId: optionalText(context, "supplierId", 120),
        name: requiredText(context, "name", 160),
        code: optionalText(context, "code", 80),
        category: optionalText(context, "category", 120),
        unit: enumText(context, "unit", Object.values(CatalogUnit)),
        quantityRule: optionalJsonObject(context, "quantityRule"),
        configuration: optionalJsonObject(context, "configuration"),
        isActive: optionalBoolean(context, "isActive", true),
      };
    },
  },
  serviceItems: {
    key: "serviceItems",
    label: catalogCsvEntityLabels.serviceItems,
    headers: catalogCsvHeaders.serviceItems,
    list: (access, scope) => access.listTenantServiceItems(scope) as Promise<CsvRecord[]>,
    get: (access, scope, id) => access.getTenantServiceItem(scope, id) as Promise<CsvRecord | null>,
    create: (access, scope, data) =>
      access.createTenantServiceItem(scope, data) as Promise<CsvRecord | null>,
    update: (access, scope, id, data) =>
      access.updateTenantServiceItem(scope, id, data) as Promise<CsvRecord | null>,
    toRow: (record) => baseRecordRow(record, catalogCsvHeaders.serviceItems),
    parse: async (context) => ({
      name: requiredText(context, "name", 160),
      code: optionalText(context, "code", 80),
      category: optionalText(context, "category", 120),
      unit: enumText(context, "unit", Object.values(CatalogUnit)),
      configuration: optionalJsonObject(context, "configuration"),
      isActive: optionalBoolean(context, "isActive", true),
    }),
  },
  taxRates: {
    key: "taxRates",
    label: catalogCsvEntityLabels.taxRates,
    headers: catalogCsvHeaders.taxRates,
    list: (access, scope) => access.listTenantTaxRates(scope) as Promise<CsvRecord[]>,
    get: (access, scope, id) => access.getTenantTaxRate(scope, id) as Promise<CsvRecord | null>,
    create: (access, scope, data) =>
      access.createTenantTaxRate(scope, data) as Promise<CsvRecord | null>,
    update: (access, scope, id, data) =>
      access.updateTenantTaxRate(scope, id, data) as Promise<CsvRecord | null>,
    toRow: (record) => baseRecordRow(record, catalogCsvHeaders.taxRates),
    parse: async (context) => ({
      name: requiredText(context, "name", 160),
      code: optionalText(context, "code", 80),
      rateBasisPoints: requiredInteger(context, "rateBasisPoints"),
      isDefault: optionalBoolean(context, "isDefault", false),
      validFrom: optionalDate(context, "validFrom"),
      validTo: optionalDate(context, "validTo"),
      configuration: optionalJsonObject(context, "configuration"),
      isActive: optionalBoolean(context, "isActive", true),
    }),
  },
  priceLists: {
    key: "priceLists",
    label: catalogCsvEntityLabels.priceLists,
    headers: catalogCsvHeaders.priceLists,
    list: (access, scope) => access.listTenantPriceLists(scope) as Promise<CsvRecord[]>,
    get: (access, scope, id) => access.getTenantPriceList(scope, id) as Promise<CsvRecord | null>,
    create: (access, scope, data) =>
      access.createTenantPriceList(scope, data) as Promise<CsvRecord | null>,
    update: (access, scope, id, data) =>
      access.updateTenantPriceList(scope, id, data) as Promise<CsvRecord | null>,
    toRow: (record) => baseRecordRow(record, catalogCsvHeaders.priceLists),
    parse: async (context) => ({
      name: requiredText(context, "name", 160),
      version: requiredText(context, "version", 80),
      currency: currencyText(context, "currency", true),
      status: enumText(context, "status", Object.values(PriceListStatus)),
      effectiveFrom: optionalDate(context, "effectiveFrom"),
      effectiveTo: optionalDate(context, "effectiveTo"),
      notes: optionalText(context, "notes", 1000),
      createdById: context.actorUserId ?? null,
      isActive: optionalBoolean(context, "isActive", true),
    }),
  },
  priceListItems: {
    key: "priceListItems",
    label: catalogCsvEntityLabels.priceListItems,
    headers: catalogCsvHeaders.priceListItems,
    list: (access, scope) => access.listTenantPriceListItems(scope) as Promise<CsvRecord[]>,
    get: (access, scope, id) => access.getTenantPriceListItem(scope, id) as Promise<CsvRecord | null>,
    create: (access, scope, data) =>
      access.createTenantPriceListItem(scope, data) as Promise<CsvRecord | null>,
    update: (access, scope, id, data) =>
      access.updateTenantPriceListItem(scope, id, data) as Promise<CsvRecord | null>,
    toRow: (record) => baseRecordRow(record, catalogCsvHeaders.priceListItems),
    parse: async (context) => {
      const itemType = enumText(context, "itemType", Object.values(PriceListItemType));

      await requiredTenantReference(context, "priceListId", "Lista de pret", (id) =>
        context.access.getTenantPriceList(context.scope, id),
      );

      if (itemType) {
        await validatePriceListCatalogItemReference(context, itemType);
      }

      return {
        priceListId: requiredText(context, "priceListId", 120),
        itemType,
        catalogItemId: requiredText(context, "catalogItemId", 120),
        sku: optionalText(context, "sku", 120),
        description: optionalText(context, "description", 1000),
        unit: enumText(context, "unit", Object.values(CatalogUnit)),
        costMinor: optionalInteger(context, "costMinor"),
        saleMinor: optionalInteger(context, "saleMinor"),
        currency: currencyText(context, "currency", false),
        metadata: optionalJsonObject(context, "metadata"),
        isActive: optionalBoolean(context, "isActive", true),
      };
    },
  },
};

export function isCatalogCsvEntityKey(value: string | null | undefined): value is CatalogCsvEntityKey {
  return Boolean(value && catalogCsvEntityKeys.includes(value as CatalogCsvEntityKey));
}

export async function exportTenantCatalogCsv({
  access = createTenantDataAccess() as CatalogCsvDataAccess,
  entity,
  scope,
}: CatalogCsvExportOptions) {
  const definition = catalogCsvDefinitions[entity];
  const records = await definition.list(access, scope);
  const rows = records.map((record) => definition.toRow(record));

  return serializeCsv(definition.headers, rows);
}

export async function importTenantCatalogCsv({
  access = createTenantDataAccess() as CatalogCsvDataAccess,
  actorUserId = null,
  csvText,
  entity,
  mode = "dry-run",
  scope,
}: CatalogCsvImportOptions): Promise<CatalogCsvImportResult> {
  const definition = catalogCsvDefinitions[entity];
  const validation = await validateTenantCatalogCsv({
    access,
    actorUserId,
    csvText,
    definition,
    mode,
    scope,
  });

  if (validation.errors.length > 0 || mode === "dry-run") {
    return validation;
  }

  let createdRows = 0;
  let updatedRows = 0;
  const applyErrors: CatalogCsvRowError[] = [];

  for (const stagedRow of validation.stagedRows) {
    const record =
      stagedRow.operation === "update" && stagedRow.id
        ? await definition.update(access, scope, stagedRow.id, stagedRow.data)
        : await definition.create(access, scope, stagedRow.data);

    if (!record) {
      applyErrors.push({
        rowNumber: stagedRow.rowNumber,
        field: stagedRow.operation === "update" ? "id" : "CSV",
        message: "Randul nu a putut fi publicat in tenantul curent.",
      });
      continue;
    }

    if (stagedRow.operation === "update") {
      updatedRows += 1;
    } else {
      createdRows += 1;
    }
  }

  if (applyErrors.length > 0) {
    return {
      entity,
      mode,
      status: "invalid",
      message: "Importul a intampinat erori de publicare.",
      totalRows: validation.totalRows,
      validRows: validation.validRows,
      createdRows,
      updatedRows,
      errors: applyErrors,
    };
  }

  return {
    entity,
    mode,
    status: "imported",
    message: `Import finalizat: ${createdRows} randuri create, ${updatedRows} randuri actualizate.`,
    totalRows: validation.totalRows,
    validRows: validation.validRows,
    createdRows,
    updatedRows,
    errors: [],
  };
}

async function validateTenantCatalogCsv({
  access,
  actorUserId,
  csvText,
  definition,
  mode,
  scope,
}: {
  access: CatalogCsvDataAccess;
  actorUserId?: string | null;
  csvText: string;
  definition: CatalogCsvDefinition;
  mode: CatalogCsvImportMode;
  scope: TenantDataScope;
}): Promise<CatalogCsvImportResult & { stagedRows: StagedCsvRow[] }> {
  const parseResult = parseCsv(csvText);
  const errors = [...parseResult.errors];
  const stagedRows: StagedCsvRow[] = [];
  const seenIds = new Set<string>();

  for (const row of parseResult.rows) {
    const context: ValidationContext = {
      access,
      actorUserId,
      errors,
      row,
      scope,
    };
    const existingErrorCount = errors.length;
    const id = optionalText(context, "id", 120);

    if (id) {
      if (seenIds.has(id)) {
        addError(context, "id", "ID-ul este duplicat in fisierul CSV.");
      } else {
        seenIds.add(id);
      }

      const existing = await definition.get(access, scope, id);

      if (!existing) {
        addError(context, "id", "ID-ul nu exista in tenantul curent.");
      }
    }

    const data = await definition.parse(context);

    if (errors.length === existingErrorCount) {
      stagedRows.push({
        data,
        id,
        operation: id ? "update" : "create",
        rowNumber: row.rowNumber,
      });
    }
  }

  if (parseResult.rows.length === 0 && errors.length === 0) {
    errors.push({
      rowNumber: 1,
      field: "CSV",
      message: "Fisierul CSV nu contine randuri de date.",
    });
  }

  if (errors.length > 0) {
    return {
      entity: definition.key,
      mode,
      status: "invalid",
      message: "Dry-run invalid. Corecteaza erorile pe randuri inainte de import.",
      totalRows: parseResult.rows.length,
      validRows: stagedRows.length,
      createdRows: 0,
      updatedRows: 0,
      errors,
      stagedRows: [],
    };
  }

  return {
    entity: definition.key,
    mode,
    status: "valid",
    message:
      mode === "dry-run"
        ? "Dry-run valid. Randurile pot fi importate."
        : "Validarea a trecut. Randurile vor fi publicate.",
    totalRows: parseResult.rows.length,
    validRows: stagedRows.length,
    createdRows: 0,
    updatedRows: 0,
    errors: [],
    stagedRows,
  };
}

function parseCsv(csvText: string) {
  const table = parseCsvTable(csvText);
  const [rawHeaders = [], ...rawRows] = table;
  const headers = rawHeaders.map((header) => header.trim());
  const errors: CatalogCsvRowError[] = [];

  if (headers.length === 0 || headers.every((header) => header.length === 0)) {
    return {
      errors: [
        {
          rowNumber: 1,
          field: "CSV",
          message: "Fisierul CSV trebuie sa contina un rand de antet.",
        },
      ],
      rows: [],
    };
  }

  const duplicateHeader = headers.find(
    (header, index) => header && headers.indexOf(header) !== index,
  );

  if (duplicateHeader) {
    errors.push({
      rowNumber: 1,
      field: duplicateHeader,
      message: "Antetul CSV contine coloane duplicate.",
    });
  }

  const rows = rawRows
    .map((cells, index): ParsedCsvRow | null => {
      if (cells.every((cell) => cell.trim().length === 0)) {
        return null;
      }

      if (cells.length > headers.length) {
        errors.push({
          rowNumber: index + 2,
          field: "CSV",
          message: "Randul are mai multe coloane decat antetul.",
        });
      }

      return {
        rowNumber: index + 2,
        values: Object.fromEntries(
          headers.map((header, headerIndex) => [header, cells[headerIndex] ?? ""]),
        ),
      };
    })
    .filter((row): row is ParsedCsvRow => Boolean(row));

  return { errors, rows };
}

function parseCsvTable(csvText: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < csvText.length; index += 1) {
    const char = csvText[index];
    const next = csvText[index + 1];

    if (quoted) {
      if (char === '"' && next === '"') {
        cell += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        cell += char;
      }

      continue;
    }

    if (char === '"') {
      quoted = true;
      continue;
    }

    if (char === ",") {
      row.push(cell);
      cell = "";
      continue;
    }

    if (char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    if (char === "\r") {
      continue;
    }

    cell += char;
  }

  row.push(cell);

  if (row.some((value) => value.length > 0) || rows.length === 0) {
    rows.push(row);
  }

  return rows;
}

function serializeCsv(headers: readonly string[], rows: Array<Record<string, string>>) {
  return [
    headers.map(escapeCsvCell).join(","),
    ...rows.map((row) => headers.map((header) => escapeCsvCell(row[header] ?? "")).join(",")),
  ].join("\r\n");
}

function escapeCsvCell(value: string) {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }

  return value;
}

function baseRecordRow(record: CsvRecord, headers: readonly string[]) {
  return Object.fromEntries(headers.map((header) => [header, csvValue(record[header])]));
}

function csvValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  if (typeof value === "bigint") {
    return value.toString();
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
}

function cell(context: ValidationContext, field: string) {
  return context.row.values[field]?.trim() ?? "";
}

function addError(context: ValidationContext, field: string, message: string) {
  context.errors.push({
    rowNumber: context.row.rowNumber,
    field,
    message,
  });
}

function requiredText(context: ValidationContext, field: string, maxLength: number) {
  const value = cell(context, field);

  if (!value) {
    addError(context, field, "Camp obligatoriu lipsa.");
    return "";
  }

  if (value.length > maxLength) {
    addError(context, field, `Valoarea depaseste limita de ${maxLength} caractere.`);
  }

  return value;
}

function optionalText(context: ValidationContext, field: string, maxLength: number) {
  const value = cell(context, field);

  if (!value) {
    return null;
  }

  if (value.length > maxLength) {
    addError(context, field, `Valoarea depaseste limita de ${maxLength} caractere.`);
  }

  return value;
}

function enumText<TValue extends string>(
  context: ValidationContext,
  field: string,
  allowedValues: readonly TValue[],
) {
  const value = cell(context, field);

  if (!value) {
    addError(context, field, "Camp obligatoriu lipsa.");
    return allowedValues[0] ?? "";
  }

  if (!allowedValues.includes(value as TValue)) {
    addError(context, field, `Valoarea trebuie sa fie una dintre: ${allowedValues.join(", ")}.`);
  }

  return value as TValue;
}

function currencyText(context: ValidationContext, field: string, required: boolean) {
  const value = cell(context, field).toUpperCase();

  if (!value) {
    if (required) {
      addError(context, field, "Camp obligatoriu lipsa.");
    }

    return "RON";
  }

  if (!/^[A-Z]{3}$/.test(value)) {
    addError(context, field, "Moneda trebuie sa aiba 3 litere, de exemplu RON.");
  }

  return value;
}

function requiredInteger(context: ValidationContext, field: string) {
  const value = cell(context, field);

  if (!value) {
    addError(context, field, "Camp obligatoriu lipsa.");
    return 0;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 0) {
    addError(context, field, "Valoarea trebuie sa fie un numar intreg pozitiv.");
    return 0;
  }

  return parsed;
}

function optionalInteger(context: ValidationContext, field: string) {
  const value = cell(context, field);

  if (!value) {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 0) {
    addError(context, field, "Valoarea trebuie sa fie un numar intreg pozitiv.");
    return null;
  }

  return parsed;
}

function optionalBoolean(context: ValidationContext, field: string, defaultValue: boolean) {
  const value = cell(context, field).toLowerCase();

  if (!value) {
    return defaultValue;
  }

  if (["true", "1", "da", "yes"].includes(value)) {
    return true;
  }

  if (["false", "0", "nu", "no"].includes(value)) {
    return false;
  }

  addError(context, field, "Valoarea trebuie sa fie true/false sau da/nu.");
  return defaultValue;
}

function optionalDate(context: ValidationContext, field: string) {
  const value = cell(context, field);

  if (!value) {
    return null;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    addError(context, field, "Data trebuie sa fie in format YYYY-MM-DD.");
    return null;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(date.getTime())) {
    addError(context, field, "Data nu este valida.");
    return null;
  }

  return date;
}

function optionalJsonObject(context: ValidationContext, field: string) {
  const value = cell(context, field);

  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as unknown;

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      addError(context, field, "Campul JSON trebuie sa fie un obiect.");
      return null;
    }

    return parsed as Record<string, unknown>;
  } catch {
    addError(context, field, "Campul JSON nu este valid.");
    return null;
  }
}

async function optionalTenantReference<TRecord>(
  context: ValidationContext,
  field: string,
  label: string,
  getRecord: (id: string) => Promise<TRecord | null>,
) {
  const value = cell(context, field);

  if (!value) {
    return;
  }

  if (!(await getRecord(value))) {
    addError(context, field, `${label} nu exista in tenantul curent.`);
  }
}

async function requiredTenantReference<TRecord>(
  context: ValidationContext,
  field: string,
  label: string,
  getRecord: (id: string) => Promise<TRecord | null>,
) {
  const value = cell(context, field);

  if (!value) {
    addError(context, field, "Camp obligatoriu lipsa.");
    return;
  }

  if (!(await getRecord(value))) {
    addError(context, field, `${label} nu exista in tenantul curent.`);
  }
}

async function validatePriceListCatalogItemReference(
  context: ValidationContext,
  itemType: PriceListItemType,
) {
  const catalogItemId = cell(context, "catalogItemId");

  if (!catalogItemId) {
    return;
  }

  if (itemType === PriceListItemType.CUSTOM) {
    return;
  }

  const record = await getCatalogItemForPriceType(context, itemType, catalogItemId);

  if (!record) {
    addError(context, "catalogItemId", "Articolul de catalog nu exista in tenantul curent.");
  }
}

function getCatalogItemForPriceType(
  context: ValidationContext,
  itemType: PriceListItemType,
  catalogItemId: string,
) {
  switch (itemType) {
    case PriceListItemType.PROFILE_ITEM:
      return context.access.getTenantProfileItem(context.scope, catalogItemId);
    case PriceListItemType.GLASS_PACKAGE:
      return context.access.getTenantGlassPackage(context.scope, catalogItemId);
    case PriceListItemType.HARDWARE_KIT:
      return context.access.getTenantHardwareKit(context.scope, catalogItemId);
    case PriceListItemType.COLOR_FINISH:
      return context.access.getTenantColorFinish(context.scope, catalogItemId);
    case PriceListItemType.ACCESSORY:
      return context.access.getTenantAccessory(context.scope, catalogItemId);
    case PriceListItemType.SERVICE_ITEM:
      return context.access.getTenantServiceItem(context.scope, catalogItemId);
    case PriceListItemType.TAX_RATE:
      return context.access.getTenantTaxRate(context.scope, catalogItemId);
    case PriceListItemType.CUSTOM:
    default:
      return Promise.resolve(null);
  }
}
