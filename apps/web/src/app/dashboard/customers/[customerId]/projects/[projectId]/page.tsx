import { ArrowLeft, Edit3, FolderKanban, UserRound } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireTenant } from "@/lib/auth";
import { getTenantCustomer, getTenantProject } from "@/lib/data";
import { commonLabel, formatDateRo } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ customerId: string; projectId: string }>;
}) {
  const context = await requireTenant();
  const { customerId, projectId } = await params;
  const [customer, project] = await Promise.all([
    getTenantCustomer(context, customerId),
    getTenantProject(context, projectId),
  ]);

  if (!customer || !project || project.customerId !== customer.id) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-stone-50 px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-4xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link
              href={`/dashboard/customers/${customer.id}`}
              className="inline-flex items-center gap-2 text-sm font-medium text-zinc-600 hover:text-zinc-950"
            >
              <ArrowLeft aria-hidden="true" size={16} />
              Client
            </Link>
            <h1 className="mt-3 text-2xl font-semibold text-zinc-950 sm:text-3xl">
              {project.name}
            </h1>
            <p className="mt-1 text-sm text-zinc-600">{customer.displayName}</p>
          </div>

          <Link
            href={`/dashboard/customers/${customer.id}/projects/${project.id}/edit`}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-800 shadow-sm hover:bg-zinc-50"
          >
            <Edit3 aria-hidden="true" size={17} />
            Editează proiect
          </Link>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
          <section className="rounded-md border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-md bg-sky-50 text-sky-800">
                <FolderKanban aria-hidden="true" size={19} />
              </div>
              <h2 className="text-base font-semibold text-zinc-950">Detalii proiect</h2>
            </div>

            <dl className="mt-4 grid gap-3">
              <Detail label="Adresă șantier" value={project.siteAddress} />
              <Detail label="Note" value={project.notes} />
            </dl>
          </section>

          <aside className="rounded-md border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-zinc-950">Client</h2>
            <Link
              href={`/dashboard/customers/${customer.id}`}
              className="mt-4 flex items-center gap-3 rounded-md bg-stone-100 p-3 text-sm font-semibold text-zinc-800 hover:bg-stone-200"
            >
              <UserRound aria-hidden="true" size={17} />
              <span className="min-w-0 truncate">{customer.displayName}</span>
            </Link>
            <div className="mt-4 space-y-3 text-sm text-zinc-700">
              <p className="rounded-md bg-stone-100 p-3">
                Creat {formatDateRo(project.createdAt)}
              </p>
              <p className="rounded-md bg-stone-100 p-3">
                Actualizat {formatDateRo(project.updatedAt)}
              </p>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

function Detail({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="rounded-md bg-stone-100 p-3">
      <dt className="text-xs font-medium uppercase text-zinc-500">{label}</dt>
      <dd className="mt-2 whitespace-pre-wrap break-words text-sm font-medium text-zinc-800">
        {value || commonLabel("notSet")}
      </dd>
    </div>
  );
}
