import { ArrowLeft, UserRound } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireTenant } from "@/lib/auth";
import { getTenantCustomer } from "@/lib/data";
import { CustomerForm } from "../../_components/customer-form";
import { updateCustomerAction } from "../../actions";

export const dynamic = "force-dynamic";

export default async function EditCustomerPage({
  params,
  searchParams,
}: {
  params: Promise<{ customerId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const context = await requireTenant();
  const { customerId } = await params;
  const errorParams = await searchParams;
  const customer = await getTenantCustomer(context, customerId);

  if (!customer) {
    notFound();
  }

  const action = updateCustomerAction.bind(null, customer.id);

  return (
    <main className="min-h-screen bg-stone-50 px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-3xl">
        <Link
          href={`/dashboard/customers/${customer.id}`}
          className="inline-flex items-center gap-2 text-sm font-medium text-zinc-600 hover:text-zinc-950"
        >
          <ArrowLeft aria-hidden="true" size={16} />
          Client
        </Link>

        <section className="mt-5 rounded-md border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-md bg-teal-50 text-teal-800">
              <UserRound aria-hidden="true" size={19} />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-xl font-semibold text-zinc-950">Editează client</h1>
              <p className="mt-1 truncate text-sm text-zinc-600">{customer.displayName}</p>
            </div>
          </div>

          <div className="mt-6">
            <CustomerForm
              action={action}
              cancelHref={`/dashboard/customers/${customer.id}`}
              customer={customer}
              error={errorParams.error}
              submitLabel="Salvează client"
            />
          </div>
        </section>
      </div>
    </main>
  );
}
