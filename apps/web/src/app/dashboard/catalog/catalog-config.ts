import {
  CatalogMaterialType,
  CatalogUnit,
  PriceListItemType,
  ProfileItemType,
} from "@prisma/client";

export type CatalogEntityKey =
  | "suppliers"
  | "profileSystems"
  | "profileItems"
  | "glassPackages"
  | "hardwareKits"
  | "colorFinishes"
  | "accessories"
  | "serviceItems"
  | "taxRates"
  | "priceListItems";

export type CatalogSectionSlug =
  | "suppliers"
  | "profile-systems"
  | "profile-items"
  | "glass-packages"
  | "hardware-kits"
  | "colors"
  | "accessories"
  | "services"
  | "tax-rates"
  | "price-lists";

export type CatalogLookupSource = "suppliers" | "profileSystems" | "priceLists";

export type CatalogFieldDefinition = {
  name: string;
  label: string;
  type: "text" | "email" | "tel" | "url" | "textarea" | "select" | "number" | "checkbox" | "json" | "date";
  required?: boolean;
  options?: Array<{ value: string; label: string }>;
  source?: CatalogLookupSource;
  placeholder?: string;
  maxLength?: number;
  min?: number;
  step?: number;
};

export type CatalogEntityConfig = {
  entity: CatalogEntityKey;
  slug: CatalogSectionSlug;
  href: string;
  title: string;
  singular: string;
  description: string;
  createLabel: string;
  emptyLabel: string;
  listLabel: string;
  fields: CatalogFieldDefinition[];
};

export const catalogEntityKeys: CatalogEntityKey[] = [
  "suppliers",
  "profileSystems",
  "profileItems",
  "glassPackages",
  "hardwareKits",
  "colorFinishes",
  "accessories",
  "serviceItems",
  "taxRates",
  "priceListItems",
];

const materialOptions = [
  { value: CatalogMaterialType.PVC, label: "PVC" },
  { value: CatalogMaterialType.ALUMINIUM, label: "Aluminiu" },
  { value: CatalogMaterialType.OTHER, label: "Alt material" },
];

const unitOptions = [
  { value: CatalogUnit.EACH, label: "Bucata" },
  { value: CatalogUnit.LINEAR_METER, label: "Metru liniar" },
  { value: CatalogUnit.SQUARE_METER, label: "Metru patrat" },
  { value: CatalogUnit.HOUR, label: "Ora" },
  { value: CatalogUnit.FIXED, label: "Pret fix" },
];

const profileItemTypeOptions = [
  { value: ProfileItemType.FRAME, label: "Toc" },
  { value: ProfileItemType.SASH, label: "Cercevea" },
  { value: ProfileItemType.MULLION, label: "Montant" },
  { value: ProfileItemType.TRANSOM, label: "Traversa" },
  { value: ProfileItemType.THRESHOLD, label: "Prag" },
  { value: ProfileItemType.REINFORCEMENT, label: "Armatura" },
  { value: ProfileItemType.OTHER, label: "Alt profil" },
];

const priceListItemTypeOptions = [
  { value: PriceListItemType.PROFILE_ITEM, label: "Profil" },
  { value: PriceListItemType.GLASS_PACKAGE, label: "Pachet sticla" },
  { value: PriceListItemType.HARDWARE_KIT, label: "Feronerie" },
  { value: PriceListItemType.COLOR_FINISH, label: "Culoare" },
  { value: PriceListItemType.ACCESSORY, label: "Accesoriu" },
  { value: PriceListItemType.SERVICE_ITEM, label: "Serviciu" },
  { value: PriceListItemType.TAX_RATE, label: "Taxa" },
  { value: PriceListItemType.CUSTOM, label: "Personalizat" },
];

const nameField = { name: "name", label: "Denumire", type: "text", required: true, maxLength: 160 } satisfies CatalogFieldDefinition;
const codeField = { name: "code", label: "Cod", type: "text", maxLength: 80 } satisfies CatalogFieldDefinition;
const activeField = { name: "isActive", label: "Activ", type: "checkbox" } satisfies CatalogFieldDefinition;
const supplierField = {
  name: "supplierId",
  label: "Furnizor",
  type: "select",
  source: "suppliers",
  placeholder: "Fara furnizor",
} satisfies CatalogFieldDefinition;
const profileSystemField = {
  name: "profileSystemId",
  label: "Sistem de profil",
  type: "select",
  source: "profileSystems",
  placeholder: "Alege sistemul",
  required: true,
} satisfies CatalogFieldDefinition;
const optionalProfileSystemField = {
  ...profileSystemField,
  required: false,
  placeholder: "Fara sistem dedicat",
} satisfies CatalogFieldDefinition;
const unitField = {
  name: "unit",
  label: "Unitate",
  type: "select",
  required: true,
  options: unitOptions,
} satisfies CatalogFieldDefinition;
const configurationField = {
  name: "configuration",
  label: "Configuratie JSON",
  type: "json",
  placeholder: "{\"validationStatus\":\"necesită validare business\"}",
} satisfies CatalogFieldDefinition;
const deductionRuleField = {
  name: "deductionRule",
  label: "Regula deductii JSON",
  type: "json",
  placeholder: "{\"validationStatus\":\"necesită validare business\"}",
} satisfies CatalogFieldDefinition;
const quantityRuleField = {
  name: "quantityRule",
  label: "Regula cantitate JSON",
  type: "json",
  placeholder: "{\"validationStatus\":\"necesită validare business\"}",
} satisfies CatalogFieldDefinition;

export const catalogEntityConfig: Record<CatalogEntityKey, CatalogEntityConfig> = {
  suppliers: {
    entity: "suppliers",
    slug: "suppliers",
    href: "/dashboard/catalog/suppliers",
    title: "Furnizori",
    singular: "furnizor",
    description: "Date de contact si surse pentru articolele de catalog.",
    createLabel: "Adauga furnizor",
    emptyLabel: "Nu exista furnizori in acest tenant.",
    listLabel: "Lista furnizori",
    fields: [
      nameField,
      codeField,
      { name: "contactName", label: "Persoana contact", type: "text", maxLength: 160 },
      { name: "email", label: "Email", type: "email", maxLength: 320 },
      { name: "phone", label: "Telefon", type: "tel", maxLength: 80 },
      { name: "website", label: "Website", type: "url", maxLength: 240 },
      { name: "notes", label: "Observatii", type: "textarea", maxLength: 1000 },
      activeField,
    ],
  },
  profileSystems: {
    entity: "profileSystems",
    slug: "profile-systems",
    href: "/dashboard/catalog/profile-systems",
    title: "Sisteme de profil",
    singular: "sistem de profil",
    description: "Familii PVC sau aluminiu folosite in configurarea ofertelor.",
    createLabel: "Adauga sistem",
    emptyLabel: "Nu exista sisteme de profil.",
    listLabel: "Lista sisteme",
    fields: [
      nameField,
      codeField,
      supplierField,
      { name: "materialType", label: "Material", type: "select", required: true, options: materialOptions },
      { name: "description", label: "Descriere", type: "textarea", maxLength: 1000 },
      configurationField,
      activeField,
    ],
  },
  profileItems: {
    entity: "profileItems",
    slug: "profile-items",
    href: "/dashboard/catalog/profile-items",
    title: "Profile",
    singular: "profil",
    description: "Componente liniare pentru toc, cercevea, montant, prag si armatura.",
    createLabel: "Adauga profil",
    emptyLabel: "Nu exista profile.",
    listLabel: "Lista profile",
    fields: [
      nameField,
      codeField,
      profileSystemField,
      supplierField,
      { name: "type", label: "Tip profil", type: "select", required: true, options: profileItemTypeOptions },
      unitField,
      { name: "description", label: "Descriere", type: "textarea", maxLength: 1000 },
      deductionRuleField,
      { name: "wasteRule", label: "Regula pierderi JSON", type: "json", placeholder: "{\"validationStatus\":\"necesită validare business\"}" },
      configurationField,
      activeField,
    ],
  },
  glassPackages: {
    entity: "glassPackages",
    slug: "glass-packages",
    href: "/dashboard/catalog/glass-packages",
    title: "Pachete sticla",
    singular: "pachet sticla",
    description: "Configuratii de geam termoizolant si reguli configurabile.",
    createLabel: "Adauga pachet sticla",
    emptyLabel: "Nu exista pachete de sticla.",
    listLabel: "Lista pachete",
    fields: [
      nameField,
      codeField,
      supplierField,
      { name: "compositionLabel", label: "Compozitie", type: "text", maxLength: 160 },
      unitField,
      { name: "minBillableAreaSquareMm", label: "Suprafata minima facturabila (mm2)", type: "number", min: 0, step: 1 },
      deductionRuleField,
      configurationField,
      activeField,
    ],
  },
  hardwareKits: {
    entity: "hardwareKits",
    slug: "hardware-kits",
    href: "/dashboard/catalog/hardware-kits",
    title: "Kituri feronerie",
    singular: "kit feronerie",
    description: "Seturi de feronerie si reguli de cantitate configurabile.",
    createLabel: "Adauga kit feronerie",
    emptyLabel: "Nu exista kituri de feronerie.",
    listLabel: "Lista feronerie",
    fields: [
      nameField,
      codeField,
      supplierField,
      { name: "category", label: "Categorie", type: "text", maxLength: 120 },
      { name: "openingType", label: "Tip deschidere", type: "text", maxLength: 120 },
      unitField,
      quantityRuleField,
      configurationField,
      activeField,
    ],
  },
  colorFinishes: {
    entity: "colorFinishes",
    slug: "colors",
    href: "/dashboard/catalog/colors",
    title: "Culori si finisaje",
    singular: "culoare",
    description: "Finisaje disponibile pe sisteme sau furnizori.",
    createLabel: "Adauga culoare",
    emptyLabel: "Nu exista culori sau finisaje.",
    listLabel: "Lista culori",
    fields: [
      nameField,
      codeField,
      optionalProfileSystemField,
      supplierField,
      { name: "surface", label: "Suprafata", type: "text", maxLength: 120 },
      configurationField,
      activeField,
    ],
  },
  accessories: {
    entity: "accessories",
    slug: "accessories",
    href: "/dashboard/catalog/accessories",
    title: "Accesorii",
    singular: "accesoriu",
    description: "Glafuri, plase, profile auxiliare si alte optiuni.",
    createLabel: "Adauga accesoriu",
    emptyLabel: "Nu exista accesorii.",
    listLabel: "Lista accesorii",
    fields: [
      nameField,
      codeField,
      supplierField,
      { name: "category", label: "Categorie", type: "text", maxLength: 120 },
      unitField,
      quantityRuleField,
      configurationField,
      activeField,
    ],
  },
  serviceItems: {
    entity: "serviceItems",
    slug: "services",
    href: "/dashboard/catalog/services",
    title: "Servicii",
    singular: "serviciu",
    description: "Montaj, transport si alte pozitii de serviciu.",
    createLabel: "Adauga serviciu",
    emptyLabel: "Nu exista servicii.",
    listLabel: "Lista servicii",
    fields: [
      nameField,
      codeField,
      { name: "category", label: "Categorie", type: "text", maxLength: 120 },
      unitField,
      configurationField,
      activeField,
    ],
  },
  taxRates: {
    entity: "taxRates",
    slug: "tax-rates",
    href: "/dashboard/catalog/tax-rates",
    title: "Cote taxe",
    singular: "cota taxa",
    description: "Cote TVA sau alte taxe configurate pentru tenant.",
    createLabel: "Adauga taxa",
    emptyLabel: "Nu exista cote de taxe.",
    listLabel: "Lista taxe",
    fields: [
      nameField,
      codeField,
      { name: "rateBasisPoints", label: "Rata (puncte baza)", type: "number", required: true, min: 0, step: 1 },
      { name: "isDefault", label: "Implicit", type: "checkbox" },
      { name: "validFrom", label: "Valabil de la", type: "date" },
      { name: "validTo", label: "Valabil pana la", type: "date" },
      configurationField,
      activeField,
    ],
  },
  priceListItems: {
    entity: "priceListItems",
    slug: "price-lists",
    href: "/dashboard/catalog/price-lists",
    title: "Liste de preturi",
    singular: "pozitie de pret",
    description: "Pozitii de pret legate de lista activa; formulele raman neexecutate in MVP.",
    createLabel: "Adauga pozitie de pret",
    emptyLabel: "Nu exista pozitii de pret.",
    listLabel: "Pozitii de pret",
    fields: [
      {
        name: "priceListId",
        label: "Lista de pret",
        type: "select",
        source: "priceLists",
        placeholder: "Alege lista",
        required: true,
      },
      { name: "itemType", label: "Tip articol", type: "select", required: true, options: priceListItemTypeOptions },
      { name: "catalogItemId", label: "ID articol catalog", type: "text", required: true, maxLength: 120 },
      { name: "sku", label: "SKU", type: "text", maxLength: 120 },
      { name: "description", label: "Descriere", type: "textarea", maxLength: 1000 },
      unitField,
      { name: "costMinor", label: "Cost intern (bani)", type: "number", min: 0, step: 1 },
      { name: "saleMinor", label: "Pret vanzare (bani)", type: "number", min: 0, step: 1 },
      { name: "currency", label: "Moneda", type: "text", maxLength: 3 },
      { name: "metadata", label: "Metadate JSON", type: "json", placeholder: "{\"validationStatus\":\"necesită validare business\"}" },
      activeField,
    ],
  },
};

export const catalogSections = [
  catalogEntityConfig.suppliers,
  catalogEntityConfig.profileSystems,
  catalogEntityConfig.profileItems,
  catalogEntityConfig.glassPackages,
  catalogEntityConfig.hardwareKits,
  catalogEntityConfig.colorFinishes,
  catalogEntityConfig.accessories,
  catalogEntityConfig.serviceItems,
  catalogEntityConfig.taxRates,
  catalogEntityConfig.priceListItems,
];

export function getCatalogConfigBySlug(slug: string) {
  return catalogSections.find((section) => section.slug === slug) ?? null;
}

export function getCatalogRouteForEntity(entity: CatalogEntityKey) {
  return catalogEntityConfig[entity].href;
}
