/* Copyright 2026 Elian Schock, Jonas Schwenk */
import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";

type ColLink = { label: string; href?: string };

const cols: { title: string; links: ColLink[] }[] = [
  {
    title: "Produkt",
    links: [
      { label: "Für Schulen", href: "/fuer/schulen" },
      { label: "Für Lehrer", href: "/fuer/lehrer" },
      { label: "Für Schüler", href: "/fuer/schueler" },
      { label: "Für Eltern", href: "/fuer/eltern" },
      { label: "Preise", href: "/preise" },
    ],
  },
  {
    title: "Plattform",
    links: [
      { label: "KI-Tutor" },
      { label: "Stundenplan" },
      { label: "Klassenbuch" },
      { label: "API" },
      { label: "Status" },
    ],
  },
  {
    title: "Unternehmen",
    links: [
      { label: "Über uns" },
      { label: "Karriere" },
      { label: "Presse" },
      { label: "FAQ", href: "/faq" },
      { label: "Kontakt", href: "/kontakt" },
    ],
  },
  {
    title: "Recht",
    links: [
      { label: "Impressum", href: "/impressum" },
      { label: "Datenschutz", href: "/datenschutz" },
      { label: "AGB", href: "/agb" },
      { label: "AVV", href: "/avv" },
      { label: "Cookies" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-border bg-surface/40">
      <div className="container-px mx-auto max-w-7xl py-14 lg:py-16">
        <div className="grid gap-10 lg:grid-cols-6">
          {/* Brand */}
          <div className="lg:col-span-2">
            <BrandLogo height="h-8" showName />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-fg">
              Lernen. Kommunizieren. Organisieren.
              <span className="block">Eine Plattform für die gesamte Schule.</span>
            </p>
            <div className="mt-5 flex items-center gap-2">
              <div className="size-2 rounded-full bg-success" />
              <span className="text-xs font-medium text-muted-fg">Alle Systeme stabil</span>
            </div>
          </div>

          {/* Links */}
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4 lg:col-span-4">
            {cols.map((c) => (
              <div key={c.title}>
                <p className="text-xs font-bold uppercase tracking-widest text-fg">
                  {c.title}
                </p>
                <ul className="mt-4 space-y-2.5">
                  {c.links.map((l) => (
                    <li key={l.label}>
                      {l.href ? (
                        <Link
                          href={l.href}
                          className="text-sm text-muted-fg transition-colors hover:text-fg"
                        >
                          {l.label}
                        </Link>
                      ) : (
                        <span className="cursor-default text-sm text-muted-fg/50">
                          {l.label}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-3 border-t border-border pt-6 text-xs text-muted-fg sm:flex-row sm:items-center">
          <p>© {new Date().getFullYear()} Masters Studios</p>
          <p>Made with <span className="text-brand">♥</span> in Deutschland</p>
        </div>
      </div>
    </footer>
  );
}
