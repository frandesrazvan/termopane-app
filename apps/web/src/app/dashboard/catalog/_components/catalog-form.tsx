import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";
import type { CatalogEntityConfig, CatalogFieldDefinition, CatalogLookupSource } from "../catalog-config";

export type CatalogRecord = {
  id: string;
  [key: string]: unknown;
};

export type CatalogLookupData = {
  suppliers: Array<{ id: string; name: string; code?: string | null }>;
  profileSystems: Array<{ id: string; name: string; code?: string | null }>;
  priceLists: Array<{ id: string; name: string; version: string; currency: string }>;
};

type CatalogFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  cancelHref?: string;
  config: CatalogEntityConfig;
  lookups: CatalogLookupData;
  record?: CatalogRecord;
  submitLabel: string;
};

const inputClass =
  "mt-2 h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-950 outline-none focus:border-zinc-900";
const textareaClass =
  "mt-2 min-h-28 w-full rounded-md border border-zinc-300 bg-white px-3 py-3 text-sm text-zinc-950 outline-none focus:border-zinc-900";

export function CatalogForm({
  action,
  cancelHref,
  config,
  lookups,
  record,
  submitLabel,
}: CatalogFormProps) {
  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="entity" value={config.entity} />

      <div className="grid gap-4 sm:grid-cols-2">
        {config.fields.map((field) => (
          <CatalogField key={field.name} field={field} lookups={lookups} record={record} />
        ))}
      </div>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        {cancelHref ? (
          <Link
            href={cancelHref}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-800 shadow-sm hover:bg-zinc-50"
          >
            <ArrowLeft aria-hidden="true" size={17} />
            Inapoi
          </Link>
        ) : null}
        <button className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white shadow-sm hover:bg-zinc-800">
          <Save aria-hidden="true" size={17} />
          {submitLabel}
        </button>
      </div>
    </form>
  );
}

function CatalogField({
  field,
  lookups,
  record,
}: {
  field: CatalogFieldDefinition;
  lookups: CatalogLookupData;
  record?: CatalogRecord;
}) {
  const value = record?.[field.name];
  const defaultValue = field.name === "currency" && value === undefined ? "RON" : formValue(value);
  const isWide = field.type === "textarea" || field.type === "json";

  if (field.type === "checkbox") {
    const checked = value === undefined ? field.name === "isActive" : Boolean(value);

    return (
      <label className="flex min-h-11 items-center gap-3 rounded-md border border-zinc-200 bg-white px-3 py-2">
        <input
          name={field.name}
          type="checkbox"
          defaultChecked={checked}
          className="size-4 rounded border-zinc-300 text-zinc-950"
        />
        <span className="text-sm font-medium text-zinc-800">{field.label}</span>
      </label>
    );
  }

  if (field.type === "select") {
    return (
      <label className="block">
        <span className="text-sm font-medium text-zinc-800">{field.label}</span>
        <select
          name={field.name}
          required={field.required}
          defaultValue={defaultValue}
          className={inputClass}
        >
          {field.placeholder ? <option value="">{field.placeholder}</option> : null}
          {selectOptions(field, lookups).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    );
  }

  if (field.type === "textarea" || field.type === "json") {
    return (
      <label className={`block ${isWide ? "sm:col-span-2" : ""}`}>
        <span className="text-sm font-medium text-zinc-800">{field.label}</span>
        <textarea
          name={field.name}
          required={field.required}
          maxLength={field.maxLength}
          placeholder={field.placeholder}
          defaultValue={field.type === "json" ? jsonValue(value) : defaultValue}
          className={textareaClass}
        />
      </label>
    );
  }

  return (
    <label className="block">
      <span className="text-sm font-medium text-zinc-800">{field.label}</span>
      <input
        name={field.name}
        type={field.type}
        required={field.required}
        maxLength={field.maxLength}
        min={field.min}
        step={field.step}
        defaultValue={defaultValue}
        className={inputClass}
      />
    </label>
  );
}

export function selectOptions(field: CatalogFieldDefinition, lookups: CatalogLookupData) {
  if (field.options) {
    return field.options;
  }

  if (!field.source) {
    return [];
  }

  return lookupOptions(field.source, lookups);
}

function lookupOptions(source: CatalogLookupSource, lookups: CatalogLookupData) {
  if (source === "priceLists") {
    return lookups.priceLists.map((priceList) => ({
      value: priceList.id,
      label: `${priceList.name} / ${priceList.version} (${priceList.currency})`,
    }));
  }

  return lookups[source].map((item) => ({
    value: item.id,
    label: item.code ? `${item.name} (${item.code})` : item.name,
  }));
}

function formValue(value: unknown) {
  if (value === null || value === undefined) {
    return "";
  }

  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  if (typeof value === "bigint") {
    return value.toString();
  }

  return String(value);
}

function jsonValue(value: unknown) {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  return JSON.stringify(value, null, 2);
}

