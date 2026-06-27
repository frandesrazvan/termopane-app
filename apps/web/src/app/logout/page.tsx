import { LogOut } from "lucide-react";
import { logoutAction } from "./actions";

export default function LogoutPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-stone-50 px-4">
      <form
        action={logoutAction}
        className="w-full max-w-sm rounded-md border border-zinc-200 bg-white p-5 text-center shadow-sm"
      >
        <h1 className="text-lg font-semibold text-zinc-950">Deconectare</h1>
        <p className="mt-2 text-sm text-zinc-600">Încheie sesiunea curentă.</p>
        <button className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white hover:bg-zinc-800">
          <LogOut aria-hidden="true" size={17} />
          Deconectează-te
        </button>
      </form>
    </main>
  );
}
