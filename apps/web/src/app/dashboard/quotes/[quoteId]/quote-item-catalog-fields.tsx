import {
  ProfileItemType,
  type ColorFinish,
  type GlassPackage,
  type HardwareKit,
  type PriceList,
  type ProfileItem,
  type ProfileSystem,
} from "@prisma/client";

export type FixedWindowCatalogFormOptions = {
  profileSystems: ProfileSystem[];
  frameProfiles: ProfileItem[];
  glassPackages: GlassPackage[];
  colorFinishes: ColorFinish[];
  hardwareKits: HardwareKit[];
  activePriceList: PriceList | null;
};

export type FixedWindowCatalogFieldDefaults = {
  profileSystemId?: string;
  frameProfileId?: string;
  glassPackageId?: string;
  colorFinishId?: string;
  hardwareKitId?: string;
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
    glassPackages: [],
    colorFinishes: [],
    hardwareKits: [],
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
  const typeLabel = profileItem.type === ProfileItemType.FRAME ? "toc" : profileItem.type.toLowerCase();

  return profileSystem ? `${baseLabel} - ${profileSystem.name} - ${typeLabel}` : `${baseLabel} - ${typeLabel}`;
}

function colorFinishOptionLabel(colorFinish: ColorFinish, profileSystems: ProfileSystem[]) {
  const profileSystem = colorFinish.profileSystemId
    ? profileSystems.find((system) => system.id === colorFinish.profileSystemId)
    : null;
  const baseLabel = catalogOptionLabel(colorFinish);

  return profileSystem ? `${baseLabel} - ${profileSystem.name}` : `${baseLabel} - general`;
}
