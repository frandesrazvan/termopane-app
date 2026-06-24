import { ArrowLeft, UserRound } from "lucide-react";
import Link from "next/link";
import { requireTenant } from "@/lib/auth";
import { CustomerForm } from "../_components/customer-form";
import { createCustomerAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function NewCustomerPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireTenant();
  const params = await searchParams;

  return (
    <main className="min-h-screen bg-stone-50 px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-3xl">
        <Link
          href="/dashboard/customers"
          className="inline-flex items-center gap-2 text-sm font-medium text-zinc-600 hover:text-zinc-950"
        >
          <ArrowLeft aria-hidden="true" size={16} />
          Customers
        </Link>

        <section className="mt-5 rounded-md border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-md bg-teal-50 text-teal-800">
              <UserRound aria-hidden="true" size={19} />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-zinc-950">New customer</h1>
              <p className="mt-1 text-sm text-zinc-600">Customer and contact record</p>
            </div>
          </div>

          <div className="mt-6">
            <CustomerForm
              action={createCustomerAction}
              cancelHref="/dashboard/customers"
              error={params.error}
              submitLabel="Create customer"
            />
          </div>
        </section>
      </div>
    </main>
  );
}
