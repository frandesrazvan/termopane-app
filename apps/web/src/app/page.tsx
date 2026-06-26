import {
  Archive,
  Building2,
  Calculator,
  FileText,
  LayoutDashboard,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from "lucide-react";
import Link from "next/link";

const navItems = [
  { label: "Panou", icon: LayoutDashboard, href: "/dashboard", active: true },
  { label: "Clienți", icon: UsersRound, href: "/dashboard/customers" },
  { label: "Oferte", icon: FileText, href: "/dashboard/quotes" },
  { label: "Catalog", icon: Archive, href: "/dashboard/catalog" },
];

const readinessItems = [
  { label: "Spațiu lucru", value: "Pregătit", tone: "bg-emerald-100 text-emerald-800" },
  { label: "Autentificare", value: "Activă", tone: "bg-emerald-100 text-emerald-800" },
  { label: "Formule", value: "Nevalidate", tone: "bg-rose-100 text-rose-800" },
];

const workflowCards = [
  {
    title: "Ciorne ofertă",
    value: "0",
    detail: "Fluxul de oferte salvate pornește de aici.",
    icon: FileText,
  },
  {
    title: "Administrare catalog",
    value: "0",
    detail: "Profilurile, sticla, feroneria și accesoriile au date demo limitate.",
    icon: Archive,
  },
  {
    title: "Pachet calcul",
    value: "MVP",
    detail: "Calculele rămân pe snapshot-uri sintetice, fără formule de producție reale.",
    icon: Calculator,
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-stone-50">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col">
        <header className="sticky top-0 z-10 border-b border-zinc-200 bg-stone-50/95 px-4 py-3 backdrop-blur sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-zinc-950 text-white">
                <Building2 aria-hidden="true" size={20} />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-zinc-950">
                  Termopane App
                </p>
                <p className="truncate text-xs text-zinc-500">
                  Spațiu de lucru MVP
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-700 shadow-sm">
              <ShieldCheck aria-hidden="true" size={16} className="text-emerald-600" />
              Scop MVP
            </div>
          </div>
        </header>

        <div className="grid flex-1 grid-cols-1 lg:grid-cols-[220px_1fr]">
          <aside className="hidden border-r border-zinc-200 px-4 py-6 lg:block">
            <nav className="space-y-1" aria-label="Navigare principală">
              {navItems.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium ${
                    item.active
                      ? "bg-zinc-950 text-white"
                      : "text-zinc-600 hover:bg-white hover:text-zinc-950"
                  }`}
                >
                  <item.icon aria-hidden="true" size={18} />
                  {item.label}
                </Link>
              ))}
            </nav>
          </aside>

          <section className="px-4 py-6 pb-24 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-medium text-teal-700">Spațiu demo</p>
                <h1 className="mt-1 text-2xl font-semibold tracking-normal text-zinc-950 sm:text-3xl">
                  Panou mobil pentru oferte de termopane
                </h1>
              </div>
              <Link
                href="/dashboard"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white shadow-sm hover:bg-zinc-800"
              >
                <Sparkles aria-hidden="true" size={17} />
                Deschide aplicația
              </Link>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {readinessItems.map((item) => (
                <div
                  key={item.label}
                  className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm"
                >
                  <p className="text-xs font-medium uppercase text-zinc-500">
                    {item.label}
                  </p>
                  <p
                    className={`mt-3 inline-flex rounded-md px-2 py-1 text-sm font-semibold ${item.tone}`}
                  >
                    {item.value}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-3">
              {workflowCards.map((card) => (
                <article
                  key={card.title}
                  className="rounded-md border border-zinc-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-sm font-semibold text-zinc-800">
                      {card.title}
                    </h2>
                    <card.icon aria-hidden="true" size={19} className="text-teal-700" />
                  </div>
                  <p className="mt-4 text-3xl font-semibold text-zinc-950">
                    {card.value}
                  </p>
                  <p className="mt-3 text-sm leading-6 text-zinc-600">
                    {card.detail}
                  </p>
                </article>
              ))}
            </div>

            <section className="mt-6 rounded-md border border-zinc-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-md bg-amber-100 text-amber-800">
                  <Calculator aria-hidden="true" size={18} />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-zinc-950">
                    Reguli de lucru
                  </h2>
                  <p className="mt-1 text-sm text-zinc-600">
                    Regulile comerciale rămân configurabile până la validare.
                  </p>
                </div>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <p className="rounded-md bg-stone-100 p-3 text-sm leading-6 text-zinc-700">
                  Autentificarea folosește sesiuni semnate server-side și apartenență activă la
                  tenant înainte de acces.
                </p>
                <p className="rounded-md bg-stone-100 p-3 text-sm leading-6 text-zinc-700">
                  Pachetele de calcul, desen și PDF sunt legate prin snapshot-uri testabile, fără
                  reguli de producție inventate.
                </p>
              </div>
            </section>
          </section>
        </div>

        <nav
          aria-label="Navigare mobilă"
          className="fixed inset-x-0 bottom-0 border-t border-zinc-200 bg-white px-3 py-2 shadow-[0_-8px_24px_rgba(24,24,27,0.08)] lg:hidden"
        >
          <div className="mx-auto grid max-w-md grid-cols-4 gap-1">
            {navItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className={`flex flex-col items-center gap-1 rounded-md px-2 py-2 text-[11px] font-medium ${
                  item.active ? "bg-zinc-950 text-white" : "text-zinc-600"
                }`}
              >
                <item.icon aria-hidden="true" size={18} />
                {item.label}
              </Link>
            ))}
          </div>
        </nav>
      </div>
    </main>
  );
}
