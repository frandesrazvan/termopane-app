import { Archive, ArrowLeft, Box, Pencil, Plus } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { archiveCatalogRecordAction, createCatalogRecordAction, updateCatalogRecordAction } from "../actions";
import type { CatalogEntityConfig, CatalogFieldDefinition } from "../catalog-config";
import { CatalogForm, selectOptions, type CatalogLookupData, type CatalogRecord } from "./catalog-form";

type CatalogEntityPageProps = {
  canManage: boolean;
  config: CatalogEntityConfig;
  csvToolsSlot?: ReactNode;
  error?: string;
  event?: string;
  lookups: CatalogLookupData;
  records: CatalogRecord[];
  summarySlot?: ReactNode;
  tenantName: string;
};

export function CatalogEntityPage({
  canManage,
  config,
  csvToolsSlot,
  error,
  event,
  lookups,
  records,
  summarySlot,
  tenantName,
}: CatalogEntityPageProps) {
  return (
    <main className="min-h-screen bg-stone-50 px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-6xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link
              href="/dashboard/catalog"
              className="inline-flex items-center gap-2 text-sm font-medium text-zinc-600 hover:text-zinc-950"
            >
              <ArrowLeft aria-hidden="true" size={16} />
              Catalog
            </Link>
            <h1 className="mt-3 text-2xl font-semibold text-zinc-950 sm:text-3xl">
              {config.title}
            </h1>
            <p className="mt-1 text-sm text-zinc-600">{tenantName}</p>
          </div>
          <span className="inline-flex min-h-10 items-center rounded-md border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-700 shadow-sm">
            {canManage ? "Administrare activa" : "Mod citire"}
          </span>
        </div>

        {error ? (
          <p className="mt-5 rounded-md bg-rose-50 px-3 py-2 text-sm font-medium text-rose-800">
            Verifica valorile introduse si incearca din nou.
          </p>
        ) : null}
        {event ? (
          <p className="mt-5 rounded-md bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">
            Operatiunea a fost salvata.
          </p>
        ) : null}

        <section className="mt-5 rounded-md border border-zinc-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-teal-50 text-teal-800">
              <Box aria-hidden="true" size={19} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-zinc-950">{config.listLabel}</h2>
              <p className="mt-1 text-sm leading-6 text-zinc-600">{config.description}</p>
            </div>
          </div>
        </section>

        {summarySlot}

        {canManage ? csvToolsSlot : null}

        {canManage ? (
          <details className="mt-5 rounded-md border border-zinc-200 bg-white p-4 shadow-sm sm:p-5">
            <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-zinc-950">
              <Plus aria-hidden="true" size={17} />
              {config.createLabel}
            </summary>
            <div className="mt-5">
              <CatalogForm
                action={createCatalogRecordAction}
                config={config}
                lookups={lookups}
                submitLabel="Salveaza"
              />
            </div>
          </details>
        ) : (
          <p className="mt-5 rounded-md border border-zinc-200 bg-white px-4 py-3 text-sm font-medium text-zinc-700 shadow-sm">
            Rolul curent poate consulta catalogul, dar nu poate crea, edita sau arhiva inregistrari.
          </p>
        )}

        <section className="mt-6">
          {records.length > 0 ? (
            <div className="grid gap-3">
              {records.map((record) => (
                <CatalogRecordCard
                  key={record.id}
                  canManage={canManage}
                  config={config}
                  lookups={lookups}
                  record={record}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-md border border-dashed border-zinc-300 bg-white p-6 text-center">
              <div className="mx-auto flex size-11 items-center justify-center rounded-md bg-stone-100 text-zinc-700">
                <Archive aria-hidden="true" size={20} />
              </div>
              <h2 className="mt-4 text-base font-semibold text-zinc-950">{config.emptyLabel}</h2>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function CatalogRecordCard({
  canManage,
  config,
  lookups,
  record,
}: {
  canManage: boolean;
  config: CatalogEntityConfig;
  lookups: CatalogLookupData;
  record: CatalogRecord;
}) {
  const isArchived = Boolean(record.deletedAt);
  const updateAction = updateCatalogRecordAction.bind(null, config.entity, record.id);
  const archiveAction = archiveCatalogRecordAction.bind(null, config.entity, record.id);

  return (
    <article className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-zinc-950">
            {recordTitle(record, config)}
          </h3>
          <div className="mt-2 flex flex-wrap gap-2">
            <StateBadge record={record} />
            {requiresBusinessValidation(record) ? (
              <span className="rounded-md bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-900">
                necesită validare business
              </span>
            ) : null}
          </div>
        </div>
        <span className="text-xs font-medium text-zinc-500">
          {formatDate(record.updatedAt ?? record.createdAt)}
        </span>
      </div>

      <dl className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {summaryFields(config).map((field) => (
          <div key={field.name} className="rounded-md bg-stone-100 px-3 py-2">
            <dt className="text-xs font-medium text-zinc-500">{field.label}</dt>
            <dd className="mt-1 truncate text-sm font-semibold text-zinc-800">
              {displayFieldValue(record[field.name], field, lookups)}
            </dd>
          </div>
        ))}
      </dl>

      {canManage && !isArchived ? (
        <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_auto] lg:items-start">
          <details className="rounded-md border border-zinc-200 bg-stone-50 p-4">
            <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-zinc-950">
              <Pencil aria-hidden="true" size={16} />
              Editeaza
            </summary>
            <div className="mt-5">
              <CatalogForm
                action={updateAction}
                config={config}
                lookups={lookups}
                record={record}
                submitLabel="Salveaza"
              />
            </div>
          </details>

          <form action={archiveAction}>
            <button className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md border border-rose-200 bg-white px-4 text-sm font-semibold text-rose-700 shadow-sm hover:bg-rose-50 lg:w-auto">
              <Archive aria-hidden="true" size={17} />
              Arhiveaza
            </button>
          </form>
        </div>
      ) : null}
    </article>
  );
}

function StateBadge({ record }: { record: CatalogRecord }) {
  if (record.deletedAt) {
    return <span className="rounded-md bg-zinc-100 px-2 py-1 text-xs font-semibold text-zinc-700">arhivat</span>;
  }

  if (record.isActive === false) {
    return <span className="rounded-md bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-900">inactiv</span>;
  }

  return <span className="rounded-md bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-800">activ</span>;
}

function recordTitle(record: CatalogRecord, config: CatalogEntityConfig) {
  const directName = record.name ?? record.description ?? record.sku;

  if (directName) {
    return String(directName);
  }

  if (config.entity === "priceListItems") {
    return `${record.itemType ?? "Pozitie"} / ${record.catalogItemId ?? record.id}`;
  }

  return `${config.singular} ${record.id}`;
}

function summaryFields(config: CatalogEntityConfig) {
  return config.fields
    .filter((field) => !["json", "textarea", "checkbox"].includes(field.type))
    .filter((field) => field.name !== "name")
    .slice(0, 4);
}

function displayFieldValue(
  value: unknown,
  field: CatalogFieldDefinition,
  lookups: CatalogLookupData,
) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  if (field.type === "select") {
    const option = selectOptions(field, lookups).find((candidate) => candidate.value === value);

    return option?.label ?? String(value);
  }

  if (value instanceof Date) {
    return value.toLocaleDateString("ro-RO");
  }

  if (typeof value === "bigint") {
    return value.toString();
  }

  return String(value);
}

function formatDate(value: unknown) {
  if (value instanceof Date) {
    return value.toLocaleDateString("ro-RO");
  }

  return "";
}

function requiresBusinessValidation(record: CatalogRecord) {
  if (record.requiresBusinessValidation === true) {
    return true;
  }

  return ["configuration", "deductionRule", "wasteRule", "quantityRule", "metadata"].some((field) =>
    containsBusinessValidation(record[field]),
  );
}

function containsBusinessValidation(value: unknown): boolean {
  if (typeof value === "string") {
    const normalized = value.toLowerCase();

    return normalized.includes("requires business validation") || normalized.includes("validare business");
  }

  if (Array.isArray(value)) {
    return value.some((item) => containsBusinessValidation(item));
  }

  if (value && typeof value === "object") {
    return Object.values(value).some((item) => containsBusinessValidation(item));
  }

  return false;
}

