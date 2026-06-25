import { ArrowLeft, FolderKanban } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireTenant } from "@/lib/auth";
import { getTenantCustomer, getTenantProject } from "@/lib/data";
import { ProjectForm } from "../../../../_components/project-form";
import { updateProjectAction } from "../../../../actions";

export const dynamic = "force-dynamic";

export default async function EditProjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ customerId: string; projectId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const context = await requireTenant();
  const { customerId, projectId } = await params;
  const errorParams = await searchParams;
  const [customer, project] = await Promise.all([
    getTenantCustomer(context, customerId),
    getTenantProject(context, projectId),
  ]);

  if (!customer || !project || project.customerId !== customer.id) {
    notFound();
  }

  const action = updateProjectAction.bind(null, customer.id, project.id);

  return (
    <main className="min-h-screen bg-stone-50 px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-3xl">
        <Link
          href={`/dashboard/customers/${customer.id}/projects/${project.id}`}
          className="inline-flex items-center gap-2 text-sm font-medium text-zinc-600 hover:text-zinc-950"
        >
          <ArrowLeft aria-hidden="true" size={16} />
          Proiect
        </Link>

        <section className="mt-5 rounded-md border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-md bg-sky-50 text-sky-800">
              <FolderKanban aria-hidden="true" size={19} />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-xl font-semibold text-zinc-950">Editează proiect</h1>
              <p className="mt-1 truncate text-sm text-zinc-600">{project.name}</p>
            </div>
          </div>

          <div className="mt-6">
            <ProjectForm
              action={action}
              cancelHref={`/dashboard/customers/${customer.id}/projects/${project.id}`}
              error={errorParams.error}
              project={project}
              submitLabel="Salvează proiect"
            />
          </div>
        </section>
      </div>
    </main>
  );
}
