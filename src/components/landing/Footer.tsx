import { Container } from "@/components/ui/container";

const cols = [
  {
    title: "Produkt",
    links: ["Für Schulen", "Für Lehrer", "Für Schüler", "Für Eltern", "Preise"],
  },
  {
    title: "Plattform",
    links: ["KI-Tutor", "Stundenplan", "Klassenbuch", "API", "Status"],
  },
  {
    title: "Unternehmen",
    links: ["Über uns", "Karriere", "Presse", "Kontakt"],
  },
  {
    title: "Recht",
    links: ["Impressum", "Datenschutz", "AGB", "AVV", "Cookies"],
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
                <li key={l}>
                  <a
                    href="#"
                    className="text-fg/80 transition-colors hover:text-fg"
                  >
                    {l}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </Container>

      <div className="border-t border-border">
        <Container className="flex flex-col items-start justify-between gap-3 py-6 text-xs text-muted-fg sm:flex-row sm:items-center">
          <p>© 2027 MasterMind GmbH · Hosting Frankfurt am Main</p>
          <p className="font-mono">
            Made with <span className="text-brand">◆</span> in Deutschland
          </p>
        </Container>
      </div>
    </footer>
  );
}
