import Link from "next/link";

export default function ForbiddenPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-stone-50 px-4">
      <section className="w-full max-w-md rounded-md border border-zinc-200 bg-white p-5 text-center shadow-sm">
        <p className="text-sm font-medium text-rose-700">Access denied</p>
        <h1 className="mt-2 text-xl font-semibold text-zinc-950">Tenant permission required</h1>
        <p className="mt-3 text-sm leading-6 text-zinc-600">
          The requested tenant or capability is not available for the current membership.
        </p>
        <Link
          href="/dashboard"
          className="mt-5 inline-flex h-11 items-center justify-center rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white"
        >
          Back to dashboard
        </Link>
      </section>
    </main>
  );
}
