import { KeyRound, LogIn, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { devLoginEnabled } from "@/lib/env/runtime";
import { acceptInviteLoginAction, loginAction } from "./actions";

const errors: Record<string, string> = {
  disabled: "Autentificarea de dezvoltare este dezactivată în acest mediu.",
  invalid: "Folosește un utilizator sintetic de dezvoltare cu @example.test.",
  invite:
    "Invitația nu este validă sau a expirat. Cere un link nou de la proprietarul tenantului.",
  membership: "Nu există apartenență activă la tenant pentru acest utilizator.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; inviteToken?: string; tenantId?: string }>;
}) {
  const params = await searchParams;
  const errorMessage = params.error ? errors[params.error] : undefined;
  const showDevLogin = devLoginEnabled();

  return (
    <main className="min-h-screen bg-stone-50 px-4 py-8 sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-md flex-col justify-center">
        <div className="rounded-md border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-md bg-zinc-950 text-white">
              <ShieldCheck aria-hidden="true" size={20} />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-zinc-950">Autentificare</h1>
              <p className="text-sm text-zinc-600">Acces pilot prin invitație</p>
            </div>
          </div>

          <form action={acceptInviteLoginAction} className="mt-6 space-y-4">
            <label className="block">
              <span className="text-sm font-medium text-zinc-800">Email invitat</span>
              <input
                name="email"
                type="email"
                required
                autoComplete="email"
                className="mt-2 h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-950 outline-none focus:border-zinc-900"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-zinc-800">Cod invitație</span>
              <input
                name="inviteToken"
                required
                defaultValue={params.inviteToken ?? ""}
                autoComplete="one-time-code"
                className="mt-2 h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-950 outline-none focus:border-zinc-900"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-zinc-800">Tenant din invitație</span>
              <input
                name="tenantId"
                required
                defaultValue={params.tenantId ?? ""}
                className="mt-2 h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-950 outline-none focus:border-zinc-900"
              />
            </label>

            {errorMessage ? (
              <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-800">
                {errorMessage}
              </p>
            ) : null}

            <button className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white hover:bg-zinc-800">
              <KeyRound aria-hidden="true" size={17} />
              Acceptă invitația
            </button>
          </form>

          {showDevLogin ? (
            <div className="mt-6 border-t border-zinc-200 pt-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
                <LogIn aria-hidden="true" size={17} />
                Autentificare locală dezvoltare
              </div>
              <form action={loginAction} className="mt-4 space-y-4">
                <label className="block">
                  <span className="text-sm font-medium text-zinc-800">Email seed</span>
                  <input
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    defaultValue="owner@example.test"
                    className="mt-2 h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-950 outline-none focus:border-zinc-900"
                  />
                </label>
                <button className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-800 hover:bg-stone-100">
                  <LogIn aria-hidden="true" size={17} />
                  Continuă local
                </button>
              </form>
              <p className="mt-3 text-xs leading-5 text-zinc-500">
                Utilizatori seed: owner@example.test, admin@example.test, estimator@example.test,
                dealer@example.test.
              </p>
            </div>
          ) : null}
        </div>

        <Link href="/" className="mt-4 text-center text-sm font-medium text-zinc-700">
          Înapoi la prezentarea publică
        </Link>
      </div>
    </main>
  );
}
