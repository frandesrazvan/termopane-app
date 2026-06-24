import type { Project } from "@prisma/client";
import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";

type ProjectFormAction = (formData: FormData) => void | Promise<void>;

type ProjectFormProps = {
  action: ProjectFormAction;
  cancelHref: string;
  error?: string;
  project?: Pick<Project, "name" | "siteAddress" | "notes">;
  submitLabel: string;
};

const inputClass =
  "mt-2 h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-950 outline-none focus:border-zinc-900";
const textareaClass =
  "mt-2 min-h-28 w-full rounded-md border border-zinc-300 bg-white px-3 py-3 text-sm text-zinc-950 outline-none focus:border-zinc-900";

export function ProjectForm({
  action,
  cancelHref,
  error,
  project,
  submitLabel,
}: ProjectFormProps) {
  return (
    <form action={action} className="space-y-5">
      {error ? (
        <p className="rounded-md bg-rose-50 px-3 py-2 text-sm font-medium text-rose-800">
          Check the highlighted fields and try again.
        </p>
      ) : null}

      <div className="grid gap-4">
        <label className="block">
          <span className="text-sm font-medium text-zinc-800">Project name</span>
          <input
            name="name"
            required
            maxLength={160}
            defaultValue={project?.name ?? ""}
            className={inputClass}
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-zinc-800">Site address</span>
          <input
            name="siteAddress"
            maxLength={240}
            defaultValue={project?.siteAddress ?? ""}
            className={inputClass}
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-zinc-800">Notes</span>
          <textarea
            name="notes"
            maxLength={1000}
            defaultValue={project?.notes ?? ""}
            className={textareaClass}
          />
        </label>
      </div>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Link
          href={cancelHref}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-800 shadow-sm hover:bg-zinc-50"
        >
          <ArrowLeft aria-hidden="true" size={17} />
          Cancel
        </Link>
        <button className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white shadow-sm hover:bg-zinc-800">
          <Save aria-hidden="true" size={17} />
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
