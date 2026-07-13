/* Copyright 2026 Elian Schock, Jonas Schwenk */
import { ArrowLeft, Home, LogIn, GraduationCap, Presentation, Users, Download } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { buttonVariants } from "@/components/ui/button";
import { BrandLogo } from "@/components/BrandLogo";

export const metadata: Metadata = {
  title: "Seite nicht gefunden",
  description: "Die angeforderte Seite existiert nicht.",
};

// Landing-Symboldesign: Icon in leicht-transparent gefärbter, abgerundeter Kachel.
const SHORTCUTS = [
  { href: "/",        label: "Startseite",        hint: "Marketing-Seite",     icon: Home,          color: "text-brand bg-brand/10" },
  { href: "/login",   label: "Anmelden",          hint: "Demo-Logins",         icon: LogIn,         color: "text-purple-500 bg-purple-50 dark:bg-purple-950/30" },
  { href: "/app",     label: "Schüler-App",       hint: "Dashboard",           icon: GraduationCap, color: "text-sky-500 bg-sky-50 dark:bg-sky-950/30" },
  { href: "/teach",   label: "Lehrer-Cockpit",    hint: "Klassen & Korrektur", icon: Presentation,  color: "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/30" },
  { href: "/eltern",  label: "Eltern",            hint: "Übersicht pro Kind",  icon: Users,         color: "text-pink-500 bg-pink-50 dark:bg-pink-950/30" },
  { href: "/download", label: "App herunterladen", hint: "Windows, Mac, Mobil", icon: Download,      color: "text-cyan-600 bg-cyan-50 dark:bg-cyan-950/30" },
];

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-surface px-6 py-10">
      <div className="w-full max-w-2xl rounded-3xl border border-border bg-bg p-8 shadow-sm sm:p-10">
        {/* Echtes (transparentes) Logo statt Platzhalter */}
        <Link href="/" className="flex items-center gap-2 font-bold tracking-tight">
          <BrandLogo height="h-8" showName />
        </Link>

        {/* 404 und Text nebeneinander */}
        <div className="mt-10 flex items-center justify-center gap-5">
          <p className="font-mono text-7xl font-bold tracking-tight text-brand sm:text-8xl">404</p>
          <div className="border-l-2 border-brand pl-4 text-left">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">
              Seite nicht gefunden
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
              Hier ist nichts.
            </h1>
          </div>
        </div>

        {/* Zentrierter Beschreibungstext */}
        <p className="mx-auto mt-6 max-w-lg text-center text-sm text-muted-fg">
          Diese URL gehört zu keiner aktiven Route. Vielleicht hat sich der Link
          geändert oder du bist auf einen Tippfehler gestoßen. Such dir einen Startpunkt:
        </p>

        {/* Moderne, abgerundete Boxen mit passenden Icons (Landing-Symboldesign) */}
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {SHORTCUTS.map((s) => (
            <li key={s.href}>
              <Link
                href={s.href}
                className="group flex items-center gap-3 rounded-2xl border border-border bg-surface p-3.5 transition-all hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-sm"
              >
                <span className={`grid size-10 shrink-0 place-items-center rounded-2xl ${s.color}`}>
                  <s.icon className="size-5" strokeWidth={1.75} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{s.label}</p>
                  <p className="text-xs text-muted-fg">{s.hint}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>

        {/* Nur ein zentrierter Button */}
        <div className="mt-8 flex justify-center">
          <Link href="/" className={`${buttonVariants({ size: "lg" })} pastel-cta`}>
            <ArrowLeft className="size-4" />
            Zur Startseite
          </Link>
        </div>
      </div>
    </main>
  );
}
