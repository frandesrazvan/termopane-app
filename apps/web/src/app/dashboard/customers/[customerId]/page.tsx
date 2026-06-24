import { ArrowLeft, Building2, Edit3, FolderKanban, Mail, Phone, Plus } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireTenant } from "@/lib/auth";
import { getTenantCustomer, listTenantProjects } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ customerId: string }>;
}) {
  const context = await requireTenant();
  const { customerId } = await params;
  const customer = await getTenantCustomer(context, customerId);

  if (!customer) {
    notFound();
  }

  const projects = await listTenantProjects(context, { customerId: customer.id });

  return (
    <main className="min-h-screen bg-stone-50 px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-5xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link
              href="/dashboard/customers"
              className="inline-flex items-center gap-2 text-sm font-medium text-zinc-600 hover:text-zinc-950"
            >
              <ArrowLeft aria-hidden="true" size={16} />
              Customers
            </Link>
            <h1 className="mt-3 text-2xl font-semibold text-zinc-950 sm:text-3xl">
              {customer.displayName}
            </h1>
            {customer.companyName ? (
              <p className="mt-1 text-sm text-zinc-600">{customer.companyName}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Link
              href={`/dashboard/customers/${customer.id}/edit`}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-800 shadow-sm hover:bg-zinc-50"
            >
              <Edit3 aria-hidden="true" size={17} />
              Edit
            </Link>
            <Link
              href={`/dashboard/customers/${customer.id}/projects/new`}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white shadow-sm hover:bg-zinc-800"
            >
              <Plus aria-hidden="true" size={17} />
              New project
            </Link>
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className="rounded-md border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-zinc-950">Customer details</h2>
            <dl className="mt-4 grid gap-3 sm:grid-cols-2">
              <Detail label="Contact" value={customer.contactName} />
              <Detail label="Tax identifier" value={customer.taxIdentifier} />
              <Detail icon={Mail} label="Email" value={customer.email} />
              <Detail icon={Phone} label="Phone" value={customer.phone} />
              <Detail label="City" value={customer.city} />
              <Detail label="Country" value={customer.country} />
              <Detail
                className="sm:col-span-2"
                label="Address line 1"
                value={customer.addressLine1}
              />
              <Detail
                className="sm:col-span-2"
                label="Address line 2"
                value={customer.addressLine2}
              />
              <Detail className="sm:col-span-2" label="Notes" value={customer.notes} />
            </dl>
          </section>

          <aside className="rounded-md border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-zinc-950">Record</h2>
            <div className="mt-4 space-y-3 text-sm text-zinc-700">
              <p className="rounded-md bg-stone-100 p-3">
                Created {customer.createdAt.toLocaleDateString("ro-RO")}
              </p>
              <p className="rounded-md bg-stone-100 p-3">
                Updated {customer.updatedAt.toLocaleDateString("ro-RO")}
              </p>
              <p className="rounded-md bg-stone-100 p-3">Projects {projects.length}</p>
            </div>
          </aside>
        </div>

        <section className="mt-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-zinc-950">Projects</h2>
            <Link
              href={`/dashboard/customers/${customer.id}/projects/new`}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-800 shadow-sm hover:bg-zinc-50"
            >
              <Plus aria-hidden="true" size={16} />
              Add
            </Link>
          </div>

          {projects.length > 0 ? (
            <div className="mt-3 grid gap-3">
              {projects.map((project) => (
                <Link
                  key={project.id}
                  href={`/dashboard/customers/${customer.id}/projects/${project.id}`}
                  className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm hover:border-zinc-300"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-sky-50 text-sky-800">
                      <FolderKanban aria-hidden="true" size={19} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="truncate text-base font-semibold text-zinc-950">
                        {project.name}
                      </h3>
                      {project.siteAddress ? (
                        <p className="mt-1 text-sm text-zinc-600">{project.siteAddress}</p>
                      ) : null}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="mt-3 rounded-md border border-dashed border-zinc-300 bg-white p-6 text-center">
              <div className="mx-auto flex size-11 items-center justify-center rounded-md bg-stone-100 text-zinc-700">
                <Building2 aria-hidden="true" size={20} />
              </div>
              <h3 className="mt-4 text-base font-semibold text-zinc-950">No projects yet</h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-600">
                Add a project for this customer before starting a future quote workflow.
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function Detail({
  className = "",
  icon: Icon,
  label,
  value,
}: {
  className?: string;
  icon?: typeof Mail;
  label: string;
  value?: string | null;
}) {
  return (
    <div className={`rounded-md bg-stone-100 p-3 ${className}`}>
      <dt className="flex items-center gap-2 text-xs font-medium uppercase text-zinc-500">
        {Icon ? <Icon aria-hidden="true" size={14} /> : null}
        {label}
      </dt>
      <dd className="mt-2 whitespace-pre-wrap break-words text-sm font-medium text-zinc-800">
        {value || "Not set"}
      </dd>
    </div>
  );
}
