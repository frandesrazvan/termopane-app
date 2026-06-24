import type { Customer } from "@prisma/client";
import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";

type CustomerFormAction = (formData: FormData) => void | Promise<void>;

type CustomerFormProps = {
  action: CustomerFormAction;
  cancelHref: string;
  customer?: Pick<
    Customer,
    | "displayName"
    | "companyName"
    | "contactName"
    | "email"
    | "phone"
    | "taxIdentifier"
    | "addressLine1"
    | "addressLine2"
    | "city"
    | "country"
    | "notes"
  >;
  error?: string;
  submitLabel: string;
};

const inputClass =
  "mt-2 h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-950 outline-none focus:border-zinc-900";
const textareaClass =
  "mt-2 min-h-28 w-full rounded-md border border-zinc-300 bg-white px-3 py-3 text-sm text-zinc-950 outline-none focus:border-zinc-900";

export function CustomerForm({
  action,
  cancelHref,
  customer,
  error,
  submitLabel,
}: CustomerFormProps) {
  return (
    <form action={action} className="space-y-5">
      {error ? (
        <p className="rounded-md bg-rose-50 px-3 py-2 text-sm font-medium text-rose-800">
          Check the highlighted fields and try again.
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="text-sm font-medium text-zinc-800">Customer name</span>
          <input
            name="displayName"
            required
            maxLength={160}
            defaultValue={customer?.displayName ?? ""}
            className={inputClass}
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-zinc-800">Company</span>
          <input
            name="companyName"
            maxLength={160}
            defaultValue={customer?.companyName ?? ""}
            className={inputClass}
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-zinc-800">Contact person</span>
          <input
            name="contactName"
            maxLength={160}
            defaultValue={customer?.contactName ?? ""}
            className={inputClass}
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-zinc-800">Email</span>
          <input
            name="email"
            type="email"
            maxLength={320}
            defaultValue={customer?.email ?? ""}
            className={inputClass}
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-zinc-800">Phone</span>
          <input
            name="phone"
            type="tel"
            maxLength={80}
            defaultValue={customer?.phone ?? ""}
            className={inputClass}
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-zinc-800">Tax identifier</span>
          <input
            name="taxIdentifier"
            maxLength={80}
            defaultValue={customer?.taxIdentifier ?? ""}
            className={inputClass}
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-zinc-800">City</span>
          <input
            name="city"
            maxLength={120}
            defaultValue={customer?.city ?? ""}
            className={inputClass}
          />
        </label>

        <label className="block sm:col-span-2">
          <span className="text-sm font-medium text-zinc-800">Address line 1</span>
          <input
            name="addressLine1"
            maxLength={200}
            defaultValue={customer?.addressLine1 ?? ""}
            className={inputClass}
          />
        </label>

        <label className="block sm:col-span-2">
          <span className="text-sm font-medium text-zinc-800">Address line 2</span>
          <input
            name="addressLine2"
            maxLength={200}
            defaultValue={customer?.addressLine2 ?? ""}
            className={inputClass}
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-zinc-800">Country</span>
          <input
            name="country"
            maxLength={120}
            defaultValue={customer?.country ?? ""}
            className={inputClass}
          />
        </label>

        <label className="block sm:col-span-2">
          <span className="text-sm font-medium text-zinc-800">Notes</span>
          <textarea
            name="notes"
            maxLength={1000}
            defaultValue={customer?.notes ?? ""}
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
