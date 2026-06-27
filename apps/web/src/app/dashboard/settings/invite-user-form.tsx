"use client";

import { Copy, UserPlus } from "lucide-react";
import { useActionState } from "react";
import { createInviteAction, type CreateInviteFormState } from "./actions";

const roleOptions = [
  { value: "ADMIN", label: "administrator" },
  { value: "ESTIMATOR", label: "estimator" },
  { value: "DEALER", label: "dealer" },
  { value: "OWNER", label: "proprietar" },
];

const initialCreateInviteFormState: CreateInviteFormState = {
  status: "idle",
};

export function InviteUserForm() {
  const [state, formAction, isPending] = useActionState(
    createInviteAction,
    initialCreateInviteFormState,
  );

  return (
    <div className="grid gap-4">
      <form action={formAction} className="grid gap-3 sm:grid-cols-[1fr_12rem_auto]">
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
          <span className="text-sm font-medium text-zinc-800">Rol</span>
          <select
            name="role"
            defaultValue="ESTIMATOR"
            className="mt-2 h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-950 outline-none focus:border-zinc-900"
          >
            {roleOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <button
          disabled={isPending}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white shadow-sm hover:bg-zinc-800 disabled:bg-zinc-400 sm:self-end"
        >
          <UserPlus aria-hidden="true" size={17} />
          {isPending ? "Se creează" : "Invită"}
        </button>
      </form>

      {state.message ? (
        <p
          className={`rounded-md px-3 py-2 text-sm font-medium ${
            state.status === "error"
              ? "bg-rose-50 text-rose-800"
              : "bg-emerald-50 text-emerald-800"
          }`}
        >
          {state.message}
        </p>
      ) : null}

      {state.acceptUrl ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-emerald-900">
            <Copy aria-hidden="true" size={16} />
            Link invitație
          </div>
          <input
            readOnly
            value={state.acceptUrl}
            className="mt-2 w-full rounded-md border border-emerald-200 bg-white px-3 py-2 text-xs text-zinc-800"
          />
          {state.expiresAt ? (
            <p className="mt-2 text-xs text-emerald-900">
              Expiră la {new Date(state.expiresAt).toLocaleString("ro-RO")}.
            </p>
          ) : null}
          <p className="mt-2 text-xs leading-5 text-emerald-900">
            Livrare email: stub manual. Nu trimite încă email automat.
          </p>
        </div>
      ) : null}
    </div>
  );
}
