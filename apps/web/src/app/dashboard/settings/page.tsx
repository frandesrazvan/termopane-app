import { Building2, Hash, ImageIcon, Save, Settings, Upload, UserCog, UserPlus } from "lucide-react";
import { QuoteNumberDatePattern, type CompanySettings, type TenantAsset } from "@prisma/client";
import Link from "next/link";
import {
  canManageCompanySettings,
  canManageQuoteNumbering,
  canManageUsers,
  listTenantInvites,
  requireTenant,
} from "@/lib/auth";
import {
  getTenantCompanySettings,
  getTenantCompanyLogoAsset,
  getTenantQuoteNumberSettings,
  getTenantUserPreference,
  previewTenantQuoteNumber,
} from "@/lib/data";
import { formatDateTimeRo, tenantRoleLabel } from "@/lib/i18n";
import { InviteUserForm } from "./invite-user-form";
import {
  updateCompanySettingsAction,
  uploadCompanyLogoAction,
  updateQuoteNumberSettingsAction,
  updateUserPreferencesAction,
} from "./actions";

export const dynamic = "force-dynamic";

type SettingsPageProps = {
  searchParams: Promise<{ error?: string; saved?: string }>;
};

const templateOptions = [
  { value: "template-a", label: "Template A - ofertă detaliată" },
  { value: "template-b", label: "Template B - propunere compactă" },
];

const shortcutOptions = [
  { value: "new-quote", label: "Ofertă nouă" },
  { value: "quotes", label: "Oferte" },
  { value: "customers", label: "Clienți" },
  { value: "catalog", label: "Catalog" },
  { value: "settings", label: "Setări" },
];

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const context = await requireTenant();
  const params = await searchParams;
  const [companySettings, quoteNumberSettings, userPreference] = await Promise.all([
    getTenantCompanySettings(context),
    getTenantQuoteNumberSettings(context),
    getTenantUserPreference(context, context.user.id),
  ]);
  const canEditCompany = canManageCompanySettings(context.membership);
  const canEditNumbering = canManageQuoteNumbering(context.membership);
  const canInviteUsers = canManageUsers(context.membership);
  const tenantInvites = canInviteUsers ? await listTenantInvites(context) : [];
  const companyLogoAsset = companySettings?.logoAssetId
    ? await getTenantCompanyLogoAsset(context, companySettings.logoAssetId)
    : null;
  const numberingDefaults = quoteNumberSettings ?? {
    prefix: "OF",
    nextNumber: 1,
    datePattern: QuoteNumberDatePattern.YEAR,
  };
  const nextQuoteNumber = previewTenantQuoteNumber(numberingDefaults);
  const selectedShortcuts = dashboardShortcuts(userPreference?.dashboardShortcuts);

  return (
    <main className="min-h-screen bg-stone-50 px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-6xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 text-sm font-medium text-zinc-600 hover:text-zinc-950"
            >
              <Settings aria-hidden="true" size={16} />
              Panou
            </Link>
            <h1 className="mt-3 text-2xl font-semibold text-zinc-950 sm:text-3xl">
              Setări
            </h1>
            <p className="mt-1 text-sm text-zinc-600">{context.tenant.name}</p>
          </div>
          <span className="inline-flex w-fit rounded-md bg-white px-3 py-2 text-sm font-semibold text-zinc-700 shadow-sm ring-1 ring-zinc-200">
            Limba: română
          </span>
        </div>

        {params.saved ? (
          <p className="mt-5 rounded-md bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">
            Setările au fost salvate.
          </p>
        ) : null}
        {params.error ? (
          <p className="mt-5 rounded-md bg-rose-50 px-3 py-2 text-sm font-medium text-rose-800">
            Verifică valorile introduse și încearcă din nou.
          </p>
        ) : null}

        <div className="mt-6 grid gap-5">
          <section className="rounded-md border border-zinc-200 bg-white p-5 shadow-sm">
            <SectionHeading
              icon={Building2}
              title="Companie și PDF"
              status={canEditCompany ? "Editabil" : "Doar citire"}
            />
            <CompanyLogoPanel
              asset={companyLogoAsset}
              canEdit={canEditCompany}
              settings={companySettings}
            />
            <form action={updateCompanySettingsAction} className="mt-5 grid gap-4">
              <input name="settingsId" type="hidden" value={companySettings?.id ?? ""} />
              <div className="grid gap-3 sm:grid-cols-2">
                <TextField
                  defaultValue={companySettings?.displayName ?? context.tenant.name}
                  disabled={!canEditCompany}
                  label="Nume afișat"
                  name="displayName"
                  required
                />
                <TextField
                  defaultValue={companySettings?.legalName ?? context.tenant.name}
                  disabled={!canEditCompany}
                  label="Denumire legală"
                  name="legalName"
                  required
                />
                <TextField
                  defaultValue={companySettings?.taxIdentifier ?? ""}
                  disabled={!canEditCompany}
                  label="Cod fiscal"
                  name="taxIdentifier"
                />
                <TextField
                  defaultValue={companySettings?.registrationNumber ?? ""}
                  disabled={!canEditCompany}
                  label="Număr Registrul Comerțului"
                  name="registrationNumber"
                />
                <TextField
                  defaultValue={companySettings?.phone ?? ""}
                  disabled={!canEditCompany}
                  label="Telefon"
                  name="phone"
                />
                <TextField
                  defaultValue={companySettings?.email ?? ""}
                  disabled={!canEditCompany}
                  label="Email"
                  name="email"
                />
                <TextField
                  defaultValue={companySettings?.website ?? ""}
                  disabled={!canEditCompany}
                  label="Website"
                  name="website"
                />
                <TextField
                  defaultValue={companySettings?.defaultCurrency ?? "RON"}
                  disabled={!canEditCompany}
                  label="Monedă implicită"
                  maxLength={3}
                  name="defaultCurrency"
                  required
                />
                <SelectField
                  defaultValue={companySettings?.defaultPdfTemplate ?? "template-a"}
                  disabled={!canEditCompany}
                  label="Șablon PDF implicit"
                  name="defaultPdfTemplate"
                  options={templateOptions}
                />
                <TextField
                  defaultValue={basisPointsToPercentInput(companySettings?.vatRateBasisPoints)}
                  disabled={!canEditCompany}
                  inputMode="decimal"
                  label="Cota TVA (%)"
                  name="vatRatePercent"
                  placeholder="19"
                />
                <TextField
                  defaultValue={companySettings?.offerValidityDays?.toString() ?? ""}
                  disabled={!canEditCompany}
                  inputMode="numeric"
                  label="Valabilitate ofertă (zile)"
                  name="offerValidityDays"
                  placeholder="14"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <TextField
                  defaultValue={companySettings?.addressLine1 ?? ""}
                  disabled={!canEditCompany}
                  label="Adresă"
                  name="addressLine1"
                />
                <TextField
                  defaultValue={companySettings?.addressLine2 ?? ""}
                  disabled={!canEditCompany}
                  label="Adresă suplimentară"
                  name="addressLine2"
                />
                <TextField
                  defaultValue={companySettings?.city ?? ""}
                  disabled={!canEditCompany}
                  label="Localitate"
                  name="city"
                />
                <TextField
                  defaultValue={companySettings?.country ?? ""}
                  disabled={!canEditCompany}
                  label="Țară"
                  name="country"
                />
              </div>

              <div className="grid gap-3">
                <TextAreaField
                  defaultValue={companySettings?.paymentTermsText ?? ""}
                  disabled={!canEditCompany}
                  label="Termeni de plată"
                  name="paymentTermsText"
                />
                <TextAreaField
                  defaultValue={companySettings?.warrantyText ?? ""}
                  disabled={!canEditCompany}
                  label="Garanție"
                  name="warrantyText"
                />
                <TextAreaField
                  defaultValue={companySettings?.deliveryText ?? ""}
                  disabled={!canEditCompany}
                  label="Livrare"
                  name="deliveryText"
                />
                <TextAreaField
                  defaultValue={companySettings?.advancePaymentText ?? ""}
                  disabled={!canEditCompany}
                  label="Avans"
                  name="advancePaymentText"
                />
                <TextAreaField
                  defaultValue={companySettings?.pdfFooterText ?? ""}
                  disabled={!canEditCompany}
                  label="Footer PDF"
                  name="pdfFooterText"
                />
              </div>

              {canEditCompany ? <SubmitButton label="Salvează compania" /> : null}
            </form>
          </section>

          <section className="rounded-md border border-zinc-200 bg-white p-5 shadow-sm">
            <SectionHeading
              icon={Hash}
              title="Numerotare oferte"
              status={canEditNumbering ? "Owner" : "Doar proprietar"}
            />
            <div className="mt-4 rounded-md bg-stone-100 p-4">
              <p className="text-xs font-semibold uppercase text-zinc-500">
                Următorul număr
              </p>
              <p className="mt-2 break-words text-xl font-semibold text-zinc-950">
                {nextQuoteNumber}
              </p>
            </div>
            <form action={updateQuoteNumberSettingsAction} className="mt-5 grid gap-4">
              <input name="settingsId" type="hidden" value={quoteNumberSettings?.id ?? ""} />
              <div className="grid gap-3 sm:grid-cols-3">
                <TextField
                  defaultValue={numberingDefaults.prefix}
                  disabled={!canEditNumbering}
                  label="Prefix"
                  name="prefix"
                  required
                />
                <TextField
                  defaultValue={numberingDefaults.nextNumber.toString()}
                  disabled={!canEditNumbering}
                  inputMode="numeric"
                  label="Următorul număr"
                  name="nextNumber"
                  required
                />
                <SelectField
                  defaultValue={numberingDefaults.datePattern}
                  disabled={!canEditNumbering}
                  label="Model dată"
                  name="datePattern"
                  options={[
                    { value: QuoteNumberDatePattern.NONE, label: "Fără dată" },
                    { value: QuoteNumberDatePattern.YEAR, label: "An" },
                    { value: QuoteNumberDatePattern.YEAR_MONTH, label: "An și lună" },
                  ]}
                />
              </div>
              {canEditNumbering ? <SubmitButton label="Salvează numerotarea" /> : null}
            </form>
          </section>

          <section className="rounded-md border border-zinc-200 bg-white p-5 shadow-sm">
            <SectionHeading
              icon={UserPlus}
              title="Utilizatori și invitații"
              status={canInviteUsers ? "Owner" : "Doar proprietar"}
            />
            {canInviteUsers ? (
              <div className="mt-5 grid gap-5">
                <InviteUserForm />
                <div>
                  <h3 className="text-sm font-semibold text-zinc-900">Invitații recente</h3>
                  <div className="mt-3 grid gap-2">
                    {tenantInvites.length > 0 ? (
                      tenantInvites.map((invite) => (
                        <div
                          key={invite.id}
                          className="grid gap-2 rounded-md border border-zinc-200 bg-stone-50 p-3 text-sm text-zinc-700 sm:grid-cols-[1fr_auto]"
                        >
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-zinc-950">{invite.email}</p>
                            <p className="mt-1 text-xs text-zinc-500">
                              Rol: {tenantRoleLabel(invite.role)} · expiră{" "}
                              {formatDateTimeRo(invite.expiresAt)}
                            </p>
                          </div>
                          <span className="inline-flex w-fit items-center rounded-md bg-white px-2 py-1 text-xs font-semibold text-zinc-700 ring-1 ring-zinc-200">
                            {inviteStatusLabel(invite)}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="rounded-md bg-stone-100 px-3 py-2 text-sm text-zinc-600">
                        Nu există invitații create pentru acest tenant.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <p className="mt-4 rounded-md bg-stone-100 px-3 py-2 text-sm text-zinc-600">
                Doar proprietarii tenantului pot invita utilizatori în modelul curent de
                permisiuni.
              </p>
            )}
          </section>

          <section className="rounded-md border border-zinc-200 bg-white p-5 shadow-sm">
            <SectionHeading icon={UserCog} title="Preferințe utilizator" status="Personal" />
            <form action={updateUserPreferencesAction} className="mt-5 grid gap-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <SelectField
                  defaultValue={userPreference?.defaultPdfTemplate ?? ""}
                  label="Șablon preferat"
                  name="defaultPdfTemplate"
                  options={[
                    { value: "", label: "Implicit companie" },
                    ...templateOptions,
                  ]}
                />
                <TextField defaultValue="română" disabled label="Limbă" name="languageLabel" />
              </div>
              <div>
                <p className="text-sm font-medium text-zinc-800">Scurtături panou</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {shortcutOptions.map((option) => (
                    <label
                      className="flex min-h-11 items-center gap-3 rounded-md border border-zinc-200 bg-stone-50 px-3 text-sm font-medium text-zinc-800"
                      key={option.value}
                    >
                      <input
                        defaultChecked={selectedShortcuts.includes(option.value)}
                        name="dashboardShortcuts"
                        type="checkbox"
                        value={option.value}
                        className="size-4 rounded border-zinc-300 text-zinc-950"
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
              </div>
              <SubmitButton label="Salvează preferințele" />
            </form>
          </section>
        </div>
      </div>
    </main>
  );
}

function SectionHeading({
  icon: Icon,
  status,
  title,
}: {
  icon: typeof Building2;
  status: string;
  title: string;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-md bg-sky-50 text-sky-800">
          <Icon aria-hidden="true" size={19} />
        </div>
        <h2 className="text-lg font-semibold text-zinc-950">{title}</h2>
      </div>
      <span className="inline-flex w-fit rounded-md bg-stone-100 px-2 py-1 text-sm font-medium text-zinc-600">
        {status}
      </span>
    </div>
  );
}

function CompanyLogoPanel({
  asset,
  canEdit,
  settings,
}: {
  asset: TenantAsset | null;
  canEdit: boolean;
  settings: CompanySettings | null;
}) {
  const logoUrl = companyLogoPreviewUrl(settings);

  return (
    <div className="mt-5 grid gap-4 rounded-md border border-zinc-200 bg-stone-50 p-4 md:grid-cols-[7rem_1fr]">
      <div className="flex size-28 items-center justify-center overflow-hidden rounded-md border border-zinc-200 bg-white">
        {logoUrl ? (
          <div
            aria-label="Logo companie"
            className="size-full bg-contain bg-center bg-no-repeat"
            role="img"
            style={{ backgroundImage: `url("${logoUrl}")` }}
          />
        ) : (
          <div className="grid place-items-center gap-2 text-center text-zinc-500">
            <ImageIcon aria-hidden="true" size={28} />
            <span className="text-xs font-semibold">FÄƒrÄƒ logo</span>
          </div>
        )}
      </div>
      <div className="grid gap-3">
        <div>
          <h3 className="text-sm font-semibold text-zinc-950">Logo companie</h3>
          <p className="mt-1 text-sm leading-6 text-zinc-600">
            PNG, JPG sau WebP, maximum 2 MB. SVG este blocat pÃ¢nÄƒ existÄƒ
            sanitizare dedicatÄƒ.
          </p>
          {asset ? (
            <p className="mt-1 text-xs text-zinc-500">
              ÃŽncÄƒrcat la {formatDateTimeRo(asset.uploadedAt)} Â· {asset.mimeType}
            </p>
          ) : null}
        </div>
        {canEdit ? (
          <form
            action={uploadCompanyLogoAction}
            className="grid gap-3 sm:grid-cols-[1fr_auto]"
            encType="multipart/form-data"
          >
            <input
              accept="image/png,image/jpeg,image/webp"
              aria-label="FiÈ™ier logo companie"
              className="h-11 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 file:mr-3 file:rounded-md file:border-0 file:bg-zinc-100 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-zinc-800"
              name="logo"
              required
              type="file"
            />
            <button className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white shadow-sm hover:bg-zinc-800">
              <Upload aria-hidden="true" size={17} />
              ÃŽncarcÄƒ logo
            </button>
          </form>
        ) : (
          <p className="rounded-md bg-white px-3 py-2 text-sm text-zinc-600 ring-1 ring-zinc-200">
            Doar OWNER È™i ADMIN pot modifica logo-ul companiei.
          </p>
        )}
      </div>
    </div>
  );
}

function TextField({
  defaultValue,
  disabled = false,
  inputMode,
  label,
  maxLength,
  name,
  placeholder,
  required = false,
}: {
  defaultValue?: string;
  disabled?: boolean;
  inputMode?: "decimal" | "numeric" | "search" | "text";
  label: string;
  maxLength?: number;
  name: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-zinc-800">{label}</span>
      <input
        className="mt-2 h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-950 outline-none focus:border-zinc-900 disabled:bg-stone-100 disabled:text-zinc-500"
        defaultValue={defaultValue}
        disabled={disabled}
        inputMode={inputMode}
        maxLength={maxLength}
        name={name}
        placeholder={placeholder}
        required={required}
      />
    </label>
  );
}

function SelectField({
  defaultValue,
  disabled = false,
  label,
  name,
  options,
}: {
  defaultValue?: string;
  disabled?: boolean;
  label: string;
  name: string;
  options: Array<{ label: string; value: string }>;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-zinc-800">{label}</span>
      <select
        className="mt-2 h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-950 outline-none focus:border-zinc-900 disabled:bg-stone-100 disabled:text-zinc-500"
        defaultValue={defaultValue ?? ""}
        disabled={disabled}
        name={name}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function TextAreaField({
  defaultValue,
  disabled = false,
  label,
  name,
}: {
  defaultValue?: string;
  disabled?: boolean;
  label: string;
  name: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-zinc-800">{label}</span>
      <textarea
        className="mt-2 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 outline-none focus:border-zinc-900 disabled:bg-stone-100 disabled:text-zinc-500"
        defaultValue={defaultValue}
        disabled={disabled}
        name={name}
        rows={3}
      />
    </label>
  );
}

function SubmitButton({ label }: { label: string }) {
  return (
    <button className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white shadow-sm hover:bg-zinc-800 sm:w-fit">
      <Save aria-hidden="true" size={17} />
      {label}
    </button>
  );
}

function inviteStatusLabel(invite: Awaited<ReturnType<typeof listTenantInvites>>[number]) {
  if (invite.revokedAt) {
    return "revocată";
  }

  if (invite.acceptedAt) {
    return "acceptată";
  }

  if (invite.expiresAt <= new Date()) {
    return "expirată";
  }

  return "în așteptare";
}

function basisPointsToPercentInput(value: number | null | undefined) {
  return value === null || value === undefined
    ? ""
    : (value / 100).toFixed(2).replace(/\.00$/, "");
}

function dashboardShortcuts(value: unknown) {
  if (!Array.isArray(value)) {
    return ["new-quote", "quotes"];
  }

  return value.flatMap((entry) => (typeof entry === "string" ? [entry] : []));
}

function companyLogoPreviewUrl(settings: CompanySettings | null) {
  const logoUrl = settings?.logoUrl?.trim();

  if (!settings?.logoAssetId || !logoUrl?.startsWith("/dashboard/settings/logo/")) {
    return null;
  }

  return logoUrl;
}
