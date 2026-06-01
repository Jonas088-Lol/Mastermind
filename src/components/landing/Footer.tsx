import Link from "next/link";
import { Container } from "@/components/ui/container";

type ColLink = { label: string; href?: string };

const cols: { title: string; links: ColLink[] }[] = [
  {
    title: "Produkt",
    links: [
      { label: "Für Schulen" },
      { label: "Für Lehrer" },
      { label: "Für Schüler" },
      { label: "Für Eltern" },
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
    <footer className="bg-bg">
      <Container className="grid gap-12 py-16 lg:grid-cols-6">
        <div className="lg:col-span-2">
          <div className="flex items-center gap-2 font-bold tracking-tight">
            <span className="grid size-7 place-items-center bg-fg text-bg text-[11px] font-black">
              MM
            </span>
            <span>MasterMind</span>
          </div>
          <p className="mt-4 max-w-xs text-sm text-muted-fg">
            Eine Plattform für Schule. Lernen, Verwaltung und KI — DSGVO-fest aus
            Deutschland.
          </p>
        </div>

        {cols.map((c) => (
          <div key={c.title}>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-fg">
              {c.title}
            </p>
            <ul className="mt-4 space-y-2 text-sm">
              {c.links.map((l) => (
                <li key={l.label}>
                  {l.href ? (
                    <Link
                      href={l.href}
                      className="text-fg/80 transition-colors hover:text-fg"
                    >
                      {l.label}
                    </Link>
                  ) : (
                    <span className="cursor-default text-fg/40">{l.label}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </Container>

      <div className="border-t border-border">
        <Container className="flex flex-col items-start justify-between gap-3 py-6 text-xs text-muted-fg sm:flex-row sm:items-center">
          <p>© {new Date().getFullYear()} MasterMind GmbH · Hosting Frankfurt am Main</p>
          <p className="font-mono">
            Made with <span className="text-brand">◆</span> in Deutschland
          </p>
        </Container>
      </div>
    </footer>
  );
}
