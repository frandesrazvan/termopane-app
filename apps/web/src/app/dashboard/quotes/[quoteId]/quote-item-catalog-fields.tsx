import {
  type Accessory,
  ProfileItemType,
  type ColorFinish,
  type GlassPackage,
  type HardwareKit,
  type PriceList,
  type ProfileItem,
  type ProfileSystem,
  type ServiceItem,
} from "@prisma/client";

export type FixedWindowCatalogFormOptions = {
  profileSystems: ProfileSystem[];
  frameProfiles: ProfileItem[];
  thresholdProfiles: ProfileItem[];
  glassPackages: GlassPackage[];
  colorFinishes: ColorFinish[];
  hardwareKits: HardwareKit[];
  accessories: Accessory[];
  serviceItems: ServiceItem[];
  activePriceList: PriceList | null;
};

export type FixedWindowCatalogFieldDefaults = {
  profileSystemId?: string;
  frameProfileId?: string;
  thresholdProfileId?: string;
  glassPackageId?: string;
  colorFinishId?: string;
  hardwareKitId?: string;
};

export type CatalogLineFieldDefaults = {
  accessoryId?: string;
  serviceItemId?: string;
};

export function FixedWindowCatalogFields({
  currency,
  defaults = {},
  options,
}: {
  currency: string;
  defaults?: FixedWindowCatalogFieldDefaults;
  options: FixedWindowCatalogFormOptions;
}) {
  const hasRequiredOptions = hasRequiredFixedWindowCatalogOptions(options);

  return (
    <div className="grid gap-3">
      {hasRequiredOptions ? null : (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900">
          Completează catalogul pentru sistem, profil toc, sticlă și culoare înainte de poziții fixe.
        </p>
      )}

      {options.activePriceList ? (
        <p className="rounded-md bg-stone-100 px-3 py-2 text-sm font-medium text-zinc-700">
          Listă de prețuri activă: {options.activePriceList.name} / {options.activePriceList.version}
        </p>
      ) : (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900">
          Nu există listă de prețuri activă pentru {currency}; calculul va marca prețuri lipsă.
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <SelectField
          label="Sistem de profil"
          name="profileSystemId"
          options={options.profileSystems.map((profileSystem) => ({
            label: catalogOptionLabel(profileSystem),
            value: profileSystem.id,
          }))}
          placeholder="Alege sistemul"
          defaultValue={defaults.profileSystemId}
          required
        />
        <SelectField
          label="Profil toc"
          name="frameProfileId"
          options={options.frameProfiles.map((frameProfile) => ({
            label: profileItemOptionLabel(frameProfile, options.profileSystems),
            value: frameProfile.id,
          }))}
          placeholder="Alege profilul toc"
          defaultValue={defaults.frameProfileId}
          required
        />
        <SelectField
          label="Pachet sticlă"
          name="glassPackageId"
          options={options.glassPackages.map((glassPackage) => ({
            label: catalogOptionLabel(glassPackage),
            value: glassPackage.id,
          }))}
          placeholder="Alege pachetul"
          defaultValue={defaults.glassPackageId}
          required
        />
        <SelectField
          label="Culoare/finisaj"
          name="colorFinishId"
          options={options.colorFinishes.map((colorFinish) => ({
            label: colorFinishOptionLabel(colorFinish, options.profileSystems),
            value: colorFinish.id,
          }))}
          placeholder="Alege culoarea"
          defaultValue={defaults.colorFinishId}
          required
        />
        <SelectField
          label="Feronerie"
          name="hardwareKitId"
          options={options.hardwareKits.map((hardwareKit) => ({
            label: catalogOptionLabel(hardwareKit),
            value: hardwareKit.id,
          }))}
          placeholder="Fără feronerie selectată"
          defaultValue={defaults.hardwareKitId}
        />
      </div>
    </div>
  );
}

export function DoorCatalogFields({
  currency,
  defaults = {},
  options,
}: {
  currency: string;
  defaults?: FixedWindowCatalogFieldDefaults;
  options: FixedWindowCatalogFormOptions;
}) {
  const hasRequiredOptions =
    options.profileSystems.length > 0 && options.colorFinishes.length > 0;

  return (
    <div className="grid gap-3">
      {hasRequiredOptions ? null : (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900">
          Completează catalogul pentru sistem de profil și culoare înainte de poziții de tip ușă.
        </p>
      )}

      {options.activePriceList ? (
        <p className="rounded-md bg-stone-100 px-3 py-2 text-sm font-medium text-zinc-700">
          Listă de prețuri activă: {options.activePriceList.name} / {options.activePriceList.version}
        </p>
      ) : (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900">
          Nu există listă de prețuri activă pentru {currency}; calculul va folosi doar prețuri explicite.
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <SelectField
          label="Sistem de profil"
          name="profileSystemId"
          options={options.profileSystems.map((profileSystem) => ({
            label: catalogOptionLabel(profileSystem),
            value: profileSystem.id,
          }))}
          placeholder="Alege sistemul"
          defaultValue={defaults.profileSystemId}
          required
        />
        <SelectField
          label="Culoare/finisaj"
          name="colorFinishId"
          options={options.colorFinishes.map((colorFinish) => ({
            label: colorFinishOptionLabel(colorFinish, options.profileSystems),
            value: colorFinish.id,
          }))}
          placeholder="Alege culoarea"
          defaultValue={defaults.colorFinishId}
          required
        />
        <SelectField
          label="Profil toc ușă"
          name="frameProfileId"
          options={options.frameProfiles.map((frameProfile) => ({
            label: profileItemOptionLabel(frameProfile, options.profileSystems),
            value: frameProfile.id,
          }))}
          placeholder="Fără profil toc selectat"
          defaultValue={defaults.frameProfileId}
        />
        <SelectField
          label="Profil prag"
          name="thresholdProfileId"
          options={options.thresholdProfiles.map((thresholdProfile) => ({
            label: profileItemOptionLabel(thresholdProfile, options.profileSystems),
            value: thresholdProfile.id,
          }))}
          placeholder="Fără prag selectat"
          defaultValue={defaults.thresholdProfileId}
        />
        <SelectField
          label="Pachet sticlă opțional"
          name="glassPackageId"
          options={options.glassPackages.map((glassPackage) => ({
            label: catalogOptionLabel(glassPackage),
            value: glassPackage.id,
          }))}
          placeholder="Fără sticlă selectată"
          defaultValue={defaults.glassPackageId}
        />
        <SelectField
          label="Feronerie"
          name="hardwareKitId"
          options={options.hardwareKits.map((hardwareKit) => ({
            label: catalogOptionLabel(hardwareKit),
            value: hardwareKit.id,
          }))}
          placeholder="Fără feronerie selectată"
          defaultValue={defaults.hardwareKitId}
        />
      </div>
    </div>
  );
}

export function AccessoryLineCatalogFields({
  defaults = {},
  options,
}: {
  defaults?: CatalogLineFieldDefaults;
  options: FixedWindowCatalogFormOptions;
}) {
  return (
    <div className="grid gap-3">
      {options.accessories.length > 0 ? null : (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900">
          Nu există accesorii active în catalog pentru această ofertă.
        </p>
      )}
      <SelectField
        label="Accesoriu"
        name="catalogItemId"
        options={options.accessories.map((accessory) => ({
          label: catalogLineOptionLabel(accessory),
          value: accessory.id,
        }))}
        placeholder="Alege accesoriul"
        defaultValue={defaults.accessoryId}
        required
      />
    </div>
  );
}

export function ServiceLineCatalogFields({
  defaults = {},
  label = "Serviciu",
  options,
  placeholder = "Alege serviciul",
}: {
  defaults?: CatalogLineFieldDefaults;
  label?: string;
  options: FixedWindowCatalogFormOptions;
  placeholder?: string;
}) {
  return (
    <div className="grid gap-3">
      {options.serviceItems.length > 0 ? null : (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900">
          Nu există servicii active în catalog pentru această ofertă.
        </p>
      )}
      <SelectField
        label={label}
        name="catalogItemId"
        options={options.serviceItems.map((serviceItem) => ({
          label: catalogLineOptionLabel(serviceItem),
          value: serviceItem.id,
        }))}
        placeholder={placeholder}
        defaultValue={defaults.serviceItemId}
        required
      />
    </div>
  );
}

export function hasRequiredFixedWindowCatalogOptions(options: FixedWindowCatalogFormOptions) {
  return (
    options.profileSystems.length > 0 &&
    options.frameProfiles.length > 0 &&
    options.glassPackages.length > 0 &&
    options.colorFinishes.length > 0
  );
}

export function emptyFixedWindowCatalogFormOptions(): FixedWindowCatalogFormOptions {
  return {
    profileSystems: [],
    frameProfiles: [],
    thresholdProfiles: [],
    glassPackages: [],
    colorFinishes: [],
    hardwareKits: [],
    accessories: [],
    serviceItems: [],
    activePriceList: null,
  };
}

function SelectField({
  defaultValue,
  label,
  name,
  options,
  placeholder,
  required = false,
}: {
  defaultValue?: string;
  label: string;
  name: string;
  options: Array<{ label: string; value: string }>;
  placeholder: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-zinc-800">{label}</span>
      <select
        name={name}
        required={required}
        defaultValue={defaultValue ?? ""}
        className="mt-2 h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-950 outline-none focus:border-zinc-900"
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function catalogOptionLabel(record: { code: string | null; name: string }) {
  return record.code ? `${record.name} (${record.code})` : record.name;
}

function profileItemOptionLabel(profileItem: ProfileItem, profileSystems: ProfileSystem[]) {
  const profileSystem = profileSystems.find((system) => system.id === profileItem.profileSystemId);
  const baseLabel = catalogOptionLabel(profileItem);
  const typeLabel =
    profileItem.type === ProfileItemType.FRAME
      ? "toc"
      : profileItem.type === ProfileItemType.THRESHOLD
        ? "prag"
        : profileItem.type.toLowerCase();

  return profileSystem ? `${baseLabel} - ${profileSystem.name} - ${typeLabel}` : `${baseLabel} - ${typeLabel}`;
}

function colorFinishOptionLabel(colorFinish: ColorFinish, profileSystems: ProfileSystem[]) {
  const profileSystem = colorFinish.profileSystemId
    ? profileSystems.find((system) => system.id === colorFinish.profileSystemId)
    : null;
  const baseLabel = catalogOptionLabel(colorFinish);

  return profileSystem ? `${baseLabel} - ${profileSystem.name}` : `${baseLabel} - general`;
}

function catalogLineOptionLabel(record: {
  category: string | null;
  code: string | null;
  name: string;
  unit: { toString(): string };
}) {
  const codeLabel = record.code ? ` (${record.code})` : "";
  const categoryLabel = record.category ? ` - ${record.category}` : "";

  return `${record.name}${codeLabel}${categoryLabel} - ${unitLabel(record.unit.toString())}`;
}

function unitLabel(value: string) {
  switch (value) {
    case "EACH":
      return "buc.";
    case "LINEAR_METER":
      return "ml";
    case "SQUARE_METER":
      return "mp";
    case "HOUR":
      return "oră";
    case "FIXED":
      return "lot";
    default:
      return value;
  }
}
