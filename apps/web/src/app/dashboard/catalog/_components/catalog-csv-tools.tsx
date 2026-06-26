"use client";

import { AlertCircle, CheckCircle2, Download, Upload } from "lucide-react";
import { useActionState, useMemo, useState } from "react";
import type { CatalogCsvEntityKey, CatalogCsvImportResult } from "@/lib/catalog/catalog-csv";
import { importCatalogCsvAction } from "../actions";

type CatalogCsvToolsProps = {
  defaultEntity: CatalogCsvEntityKey;
  entities: Array<{
    key: CatalogCsvEntityKey;
    label: string;
  }>;
};

const initialState: CatalogCsvImportResult = {
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

export function CatalogCsvTools({ defaultEntity, entities }: CatalogCsvToolsProps) {
  const [selectedEntity, setSelectedEntity] = useState<CatalogCsvEntityKey>(defaultEntity);
  const [state, formAction, pending] = useActionState(importCatalogCsvAction, initialState);
  const selectedLabel = useMemo(
    () => entities.find((entity) => entity.key === selectedEntity)?.label ?? "Catalog",
    [entities, selectedEntity],
  );
  const exportHref = `/dashboard/catalog/csv/export?entity=${encodeURIComponent(selectedEntity)}`;
  const hasErrors = state.errors.length > 0;

  return (
    <section className="mt-5 rounded-md border border-zinc-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Upload aria-hidden="true" size={18} className="text-teal-800" />
            <h2 className="text-base font-semibold text-zinc-950">Import/export CSV</h2>
          </div>
          <p className="mt-1 text-sm leading-6 text-zinc-600">
            Exporta datele tenantului curent sau ruleaza un dry-run inainte de import. Randurile
            invalide nu sunt publicate.
          </p>
        </div>

        <a
          href={exportHref}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-800 shadow-sm hover:bg-zinc-50"
        >
          <Download aria-hidden="true" size={17} />
          Exporta {selectedLabel}
        </a>
      </div>

      <form action={formAction} className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,220px)_1fr_auto] lg:items-end">
        <label className="block">
          <span className="text-sm font-medium text-zinc-800">Sectiune CSV</span>
          <select
            name="csvEntity"
            value={selectedEntity}
            onChange={(event) => setSelectedEntity(event.target.value as CatalogCsvEntityKey)}
            className="mt-2 h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-950 outline-none focus:border-zinc-900"
          >
            {entities.map((entity) => (
              <option key={entity.key} value={entity.key}>
                {entity.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-sm font-medium text-zinc-800">Fisier CSV</span>
          <input
            name="csvFile"
            type="file"
            accept=".csv,text/csv"
            className="mt-2 block h-11 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 file:mr-3 file:rounded-md file:border-0 file:bg-zinc-100 file:px-3 file:py-1 file:text-sm file:font-semibold file:text-zinc-800"
          />
        </label>

        <div className="grid gap-2 sm:grid-cols-2 lg:min-w-72">
          <button
            name="intent"
            value="dry-run"
            disabled={pending}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-800 shadow-sm hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <CheckCircle2 aria-hidden="true" size={17} />
            Valideaza dry-run
          </button>
          <button
            name="intent"
            value="publish"
            disabled={pending}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white shadow-sm hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Upload aria-hidden="true" size={17} />
            Importa CSV
          </button>
        </div>
      </form>

      <div
        aria-live="polite"
        className={`mt-5 rounded-md px-3 py-3 text-sm font-medium ${
          hasErrors
            ? "bg-rose-50 text-rose-800"
            : state.status === "valid" || state.status === "imported"
              ? "bg-emerald-50 text-emerald-800"
              : "bg-stone-100 text-zinc-700"
        }`}
      >
        <div className="flex items-start gap-2">
          {hasErrors ? <AlertCircle aria-hidden="true" size={17} /> : <CheckCircle2 aria-hidden="true" size={17} />}
          <div>
            <p>{state.message}</p>
            {state.totalRows > 0 ? (
              <p className="mt-1 text-xs">
                Randuri: {state.totalRows} total, {state.validRows} valide, {state.createdRows} create,{" "}
                {state.updatedRows} actualizate.
              </p>
            ) : null}
          </div>
        </div>
      </div>

      {hasErrors ? (
        <div className="mt-4 overflow-x-auto rounded-md border border-rose-200">
          <table className="min-w-full divide-y divide-rose-200 text-sm">
            <thead className="bg-rose-50 text-left text-xs font-semibold uppercase text-rose-900">
              <tr>
                <th className="px-3 py-2">Rand</th>
                <th className="px-3 py-2">Camp</th>
                <th className="px-3 py-2">Eroare</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rose-100 bg-white text-rose-900">
              {state.errors.map((error, index) => (
                <tr key={`${error.rowNumber}-${error.field}-${index}`}>
                  <td className="whitespace-nowrap px-3 py-2 font-semibold">{error.rowNumber}</td>
                  <td className="whitespace-nowrap px-3 py-2">{error.field}</td>
                  <td className="px-3 py-2">{error.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
