import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";

export const metadata: Metadata = {
  title: "FAQ – Häufig gestellte Fragen | MasterMind",
  description:
    "Antworten auf die häufigsten Fragen zu MasterMind: Allgemein, Schulen, Datenschutz und Gamification.",
};

const categories: {
  title: string;
  items: { q: string; a: string }[];
}[] = [
  {
    title: "Allgemein",
    items: [
      {
        q: "Was ist MasterMind?",
        a: "MasterMind ist eine cloudbasierte Schulplattform, die Lernapp, Schulverwaltung und KI-Tutor in einem vereint. Schülerinnen und Schüler können Aufgaben bearbeiten, Karteikarten lernen und durch ein Gamification-System motiviert werden. Lehrkräfte verwalten Aufgaben, Noten und Stundenpläne — alles DSGVO-konform aus Deutschland.",
      },
      {
        q: "Für welche Schularten ist MasterMind geeignet?",
        a: "MasterMind ist für alle allgemeinbildenden Schulen konzipiert — von der Grundschule bis zum Gymnasium sowie für Berufsschulen und Schulträger. Die Plattform lässt sich flexibel an unterschiedliche Schulgrößen und Strukturen anpassen.",
      },
      {
        q: "Gibt es eine Testphase?",
        a: "Ja. Alle Pläne können 30 Tage lang vollständig und kostenlos getestet werden. Es ist keine Kreditkarte erforderlich. Nach der Testphase entscheiden Sie frei, ob und welchen Plan Sie aktivieren möchten.",
      },
      {
        q: "Wie werden Daten gespeichert?",
        a: "Alle Daten werden ausschließlich auf Servern in Deutschland (Frankfurt am Main) gespeichert. MasterMind verarbeitet personenbezogene Daten als Auftragsverarbeiter gemäß Art. 28 DSGVO. Der Auftragsverarbeitungsvertrag (AVV) wird vor der Aktivierung abgeschlossen.",
      },
    ],
  },
  {
    title: "Für Schulen",
    items: [
      {
        q: "Wie starte ich mit MasterMind?",
        a: "Nach der Registrierung steht Ihnen ein Einrichtungsassistent zur Verfügung. In wenigen Schritten legen Sie Klassen, Lehrkräfte und Schülerinnen und Schüler an. Alternativ übernehmen wir die Ersteinrichtung im Rahmen unseres Onboarding-Pakets.",
      },
      {
        q: "Kann ich bestehende Schülerdaten importieren?",
        a: "Ja. MasterMind unterstützt den Import von Schülerdaten über CSV-Dateien sowie über standardisierte Schulverwaltungsschnittstellen. Für Enterprise-Kunden bieten wir zusätzlich eine Migration per SCIM an.",
      },
      {
        q: "Welche technischen Voraussetzungen gibt es?",
        a: "MasterMind läuft vollständig im Browser — es ist keine Software-Installation erforderlich. Für Lehrkräfte und Schülerinnen und Schüler genügt ein moderner Browser (Chrome, Firefox, Safari, Edge) und eine stabile Internetverbindung. Für die mobile Nutzung steht eine Progressive Web App (PWA) zur Verfügung.",
      },
      {
        q: "Wie lange dauert die Einrichtung?",
        a: "Die Grundeinrichtung mit Import der Klassen und Nutzerdaten ist in der Regel innerhalb eines Schultages abgeschlossen. Das vollständige Rollout inklusive Einweisung der Lehrkräfte dauert typischerweise ein bis zwei Wochen.",
      },
    ],
  },
  {
    title: "Datenschutz & Sicherheit",
    items: [
      {
        q: "Ist MasterMind DSGVO-konform?",
        a: "Ja. MasterMind wurde von Grund auf DSGVO-konform entwickelt. Alle Daten werden in Deutschland verarbeitet und gespeichert. Ein Auftragsverarbeitungsvertrag (AVV) gemäß Art. 28 DSGVO wird standardmäßig bereitgestellt und kann innerhalb von 24 Stunden unterzeichnet werden.",
      },
      {
        q: "Wo werden die Daten gespeichert?",
        a: "Sämtliche Daten — inklusive Backups — werden auf zertifizierten Servern in Frankfurt am Main (Deutschland) gespeichert. Es findet keine Übertragung in Drittländer statt.",
      },
      {
        q: "Was passiert mit den Daten bei Kündigung?",
        a: "Nach der Kündigung stellen wir Ihnen einen vollständigen Datenexport im CSV- und JSON-Format bereit. Anschließend werden alle personenbezogenen Daten entsprechend den DSGVO-Vorgaben und den Fristen aus dem AVV unwiderruflich gelöscht.",
      },
    ],
  },
  {
    title: "Gamification",
    items: [
      {
        q: "Was ist das Münzsystem?",
        a: "Schülerinnen und Schüler sammeln Münzen, indem sie Aufgaben erledigen, Lernziele erreichen und Quests abschließen. Münzen können im Schul-Shop gegen virtuelle Gegenstände oder schulinterne Belohnungen eingetauscht werden. Das System ist vollständig von der Schule konfigurierbar.",
      },
      {
        q: "Können Schüler echtes Geld ausgeben?",
        a: "Nein. Das Münzsystem funktioniert ausschließlich mit virtuellen Münzen, die durch schulische Leistungen verdient werden. Es gibt keine Möglichkeit, echtes Geld einzusetzen oder In-App-Käufe zu tätigen.",
      },
      {
        q: "Wie funktioniert das XP-System?",
        a: "Erfahrungspunkte (XP) werden für erledigte Aufgaben, abgeschlossene Lerneinheiten und aktive Teilnahme vergeben. Mit steigendem XP-Level schalten Schülerinnen und Schüler neue Titel und Abzeichen frei. Lehrkräfte können die XP-Vergabe individuell anpassen.",
      },
    ],
  },
];

export default function FaqPage() {
  return (
    <>
      <Navbar />
      <main>
        {/* Hero */}
        <section className="border-b border-border section">
          <Container>
            <Link
              href="/"
              className="mb-8 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-fg hover:text-fg"
            >
              <ArrowLeft className="size-3.5" />
              Startseite
            </Link>

            <div className="mx-auto max-w-2xl text-center">
              <span className="eyebrow">
                <span className="inline-block size-1.5 bg-brand" />
                FAQ
              </span>
              <h1 className="mt-4 text-4xl sm:text-5xl">
                Häufig gestellte Fragen
              </h1>
              <p className="mt-5 text-lg text-muted-fg">
                Alles, was Sie über MasterMind wissen müssen — von der ersten Frage bis zum
                Go-Live.
              </p>
            </div>
          </Container>
        </section>

        {/* Categories */}
        <section className="section">
          <Container>
            <div className="mx-auto max-w-2xl space-y-16">
              {categories.map((cat) => (
                <div key={cat.title}>
                  <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">
                    {cat.title}
                  </h2>
                  <div className="mt-6 space-y-3">
                    {cat.items.map((item) => (
                      <details
                        key={item.q}
                        className="group border border-border bg-bg"
                      >
                        <summary className="flex cursor-pointer select-none items-center justify-between gap-4 px-6 py-4 font-semibold">
                          {item.q}
                          <span className="ml-4 shrink-0 text-muted-fg transition-transform group-open:rotate-180">
                            ▾
                          </span>
                        </summary>
                        <p className="border-t border-border px-6 pb-5 pt-4 text-sm leading-relaxed text-muted-fg">
                          {item.a}
                        </p>
                      </details>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Subtle footer row */}
            <div className="mt-16 border-t border-border pt-8 text-center text-sm text-muted-fg">
              Ihre Frage ist nicht dabei?{" "}
              <Link href="/kontakt" className="font-semibold text-fg hover:text-brand">
                Kontaktieren Sie uns
              </Link>{" "}
              — wir helfen gerne weiter.
            </div>
          </Container>
        </section>
      </main>
      <Footer />
    </>
  );
}
