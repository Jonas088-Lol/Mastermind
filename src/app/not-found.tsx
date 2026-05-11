import { ArrowLeft, Compass, Search } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Seite nicht gefunden",
  description: "Die angeforderte Seite existiert nicht.",
};

const SHORTCUTS = [
  { href: "/", label: "Startseite", hint: "Marketing-Seite" },
  { href: "/login", label: "Anmelden", hint: "Demo-Logins" },
  { href: "/app", label: "Schüler-App", hint: "Dashboard" },
  { href: "/teach", label: "Lehrer-Cockpit", hint: "Klassen & Korrektur" },
  { href: "/eltern", label: "Eltern", hint: "Übersicht pro Kind" },
  { href: "/admin", label: "Schul-Admin", hint: "Lizenz & Nutzer" },
];

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-surface px-6 py-10">
      <div className="w-full max-w-2xl border border-border bg-bg p-10">
        <Link
          href="/"
          className="flex items-center gap-2 font-bold tracking-tight"
        >
          <span className="grid size-7 place-items-center bg-fg text-bg text-[11px] font-black">
            MM
          </span>
          <span>MasterMind</span>
        </Link>

        <div className="mt-12 flex items-baseline gap-6">
          <p className="font-mono text-7xl font-bold tracking-tight text-brand sm:text-8xl">
            404
          </p>
          <div className="flex-1 border-l-2 border-brand pl-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">
              Seite nicht gefunden
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
              Hier ist nichts.
            </h1>
          </div>
        </div>

        <p className="mt-6 text-sm text-muted-fg">
          Diese URL gehört zu keiner aktiven Route. Vielleicht hat sich der Link
          geändert oder du bist auf einen Tippfehler gestoßen. Such dir einen Startpunkt:
        </p>

        <ul className="mt-6 grid gap-px border border-border bg-border sm:grid-cols-2">
          {SHORTCUTS.map((s) => (
            <li key={s.href}>
              <Link
                href={s.href}
                className="group flex items-center gap-3 bg-bg p-3.5 transition-colors hover:bg-surface"
              >
                <Compass
                  className="size-4 shrink-0 text-muted-fg transition-colors group-hover:text-brand"
                  strokeWidth={1.75}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{s.label}</p>
                  <p className="text-xs text-muted-fg">{s.hint}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>

        <div className="mt-8 flex flex-col gap-2 sm:flex-row">
          <Link
            href="/"
            className={`${buttonVariants({ variant: "outline", size: "md" })} flex-1`}
          >
            <ArrowLeft className="size-4" />
            Zur Startseite
          </Link>
          <Link
            href="/search"
            className={`${buttonVariants({ size: "md" })} flex-1`}
          >
            <Search className="size-4" />
            Suchen
          </Link>
        </div>
      </div>
    </main>
  );
}
