import { Check } from "lucide-react";
import { Container } from "@/components/ui/container";

const audiences = [
  {
    role: "Schüler",
    color: "text-brand",
    headline: "Lernen, das wirklich hängen bleibt",
    points: [
      "KI-Tutor erklärt jede Aufgabe Schritt für Schritt",
      "Karteikarten mit Spaced-Repetition für Klausuren",
      "Streaks und Lerngruppen halten dich am Ball",
    ],
  },
  {
    role: "Lehrer",
    color: "text-success",
    headline: "Spart stundenlange Arbeit pro Woche",
    points: [
      "Aufgaben & Klassenarbeiten in Minuten generiert",
      "Auto-Korrektur-Vorschläge — du behältst die Kontrolle",
      "Live-Heatmap: Lernstand der Klasse auf einen Blick",
      "Kommunikation gebündelt — keine unnötigen Extra-Apps",
    ],
  },
  {
    role: "Schulleitung",
    color: "text-warning",
    headline: "Volle Kontrolle, sauberes Setup",
    points: [
      "Untis-Import in 5 Minuten — nicht in 5 Tagen",
      "DSGVO-konform aus Deutschland, AVV in 24 h",
      "SSO mit Microsoft/Google, SCIM-Provisioning",
      "Reporting für Schulträger und Eltern-Beirat",
    ],
  },
  {
    role: "Eltern",
    color: "text-info",
    headline: "Endlich überblickbar",
    points: [
      "Eine App für alle Kinder — Noten, Termine, Nachrichten",
      "Krankmeldung mit zwei Klicks (signiert, prüfbar)",
      "Push, wenn wirklich was Wichtiges passiert",
      "Kein Klassen-Chat-Chaos mehr",
    ],
  },
];

export function UseCases() {
  return (
    <section id="fuer-schulen" className="border-b border-border section bg-surface">
      <Container>
        <div className="max-w-2xl">
          <span className="eyebrow">Für jede Rolle</span>
          <h2 className="mt-4 text-4xl sm:text-5xl">
            Eine Plattform.
            <br />
            Vier echte Workflows.
          </h2>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-2">
          {audiences.map((a) => (
            <article
              key={a.role}
              className="premium-card flex flex-col p-7"
            >
              <p className={`text-xs font-semibold uppercase tracking-[0.2em] ${a.color}`}>
                Für {a.role}
              </p>
              <h3 className="mt-3 text-2xl font-bold tracking-tight">{a.headline}</h3>
              <ul className="mt-6 space-y-2.5">
                {a.points.map((p) => (
                  <li key={p} className="flex items-start gap-2.5 text-sm">
                    <Check className="mt-0.5 size-4 shrink-0 text-brand" strokeWidth={2.5} />
                    <span className="text-muted-fg">{p}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </Container>
    </section>
  );
}
