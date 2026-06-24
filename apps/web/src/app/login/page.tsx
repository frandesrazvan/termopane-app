import { LogIn, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { loginAction } from "./actions";

const errors: Record<string, string> = {
  disabled: "Development login is disabled in this environment.",
  invalid: "Use a synthetic development user ending in @example.test.",
  membership: "No active tenant membership was found for that user.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const errorMessage = params.error ? errors[params.error] : undefined;

  return (
    <main className="min-h-screen bg-stone-50 px-4 py-8 sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-md flex-col justify-center">
        <div className="rounded-md border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-md bg-zinc-950 text-white">
              <ShieldCheck aria-hidden="true" size={20} />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-zinc-950">Sign in</h1>
              <p className="text-sm text-zinc-600">Synthetic development access</p>
            </div>
          </div>

          <form action={loginAction} className="mt-6 space-y-4">
            <label className="block">
              <span className="text-sm font-medium text-zinc-800">Email</span>
              <input
                name="email"
                type="email"
                required
                autoComplete="email"
                defaultValue="owner@example.test"
                className="mt-2 h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-950 outline-none focus:border-zinc-900"
              />
            </label>

            {errorMessage ? (
              <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-800">
                {errorMessage}
              </p>
            ) : null}

            <button className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white hover:bg-zinc-800">
              <LogIn aria-hidden="true" size={17} />
              Continue
            </button>
          </form>

          <p className="mt-4 text-xs leading-5 text-zinc-500">
            Seed users: owner@example.test, admin@example.test, estimator@example.test,
            dealer@example.test.
          </p>
        </div>

        <Link href="/" className="mt-4 text-center text-sm font-medium text-zinc-700">
          Back to public overview
        </Link>
      </div>
    </main>
  );
}
