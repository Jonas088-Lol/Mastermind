import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { COMPANY } from "@/lib/company";

export const metadata: Metadata = {
  title: "Datenschutz",
  description: "Datenschutzerklärung der MasterMind GmbH",
};

export default function DatenschutzPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <Link
        href="/"
        className="mb-8 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-fg hover:text-fg"
      >
        <ArrowLeft className="size-3.5" />
        Zurück
      </Link>

      <h1 className="text-3xl font-bold tracking-tight">Datenschutzerklärung</h1>

      <div className="prose prose-sm mt-8 max-w-none dark:prose-invert">
        <h2>1. Verantwortlicher</h2>
        <p>
          {COMPANY.name}, {COMPANY.street}, {COMPANY.zip} {COMPANY.city}<br />
          E-Mail: {COMPANY.emailPrivacy}
        </p>

        <h2>2. Erhobene Daten</h2>
        <p>
          Wir erheben und verarbeiten folgende personenbezogene Daten:
        </p>
        <ul>
          <li>Name und E-Mail-Adresse (Registrierung)</li>
          <li>Schulzugehörigkeit und Klasse</li>
          <li>Nutzungsaktivitäten (Lernfortschritt, Aufgaben, Noten)</li>
          <li>Technische Daten (IP-Adresse, Browser, Seitenaufrufe)</li>
        </ul>

        <h2>3. Rechtsgrundlagen</h2>
        <p>
          Die Verarbeitung erfolgt auf Grundlage von Art. 6 Abs. 1 lit. b DSGVO
          (Vertragserfüllung) sowie Art. 6 Abs. 1 lit. f DSGVO (berechtigte Interessen).
          Für Minderjährige unter 16 Jahren erfolgt die Verarbeitung auf Grundlage der
          Einwilligung gemäß Art. 8 DSGVO.
        </p>

        <h2>4. Datenspeicherung</h2>
        <p>
          Alle Daten werden ausschließlich auf Servern in Deutschland (Frankfurt am Main)
          gespeichert. Es findet keine Übermittlung in Drittländer statt.
        </p>

        <h2>5. Auftragsverarbeitung</h2>
        <p>
          Schulen schließen mit MasterMind einen Auftragsverarbeitungsvertrag (AVV) gemäß
          Art. 28 DSGVO ab. Schulen sind Verantwortliche im Sinne der DSGVO; MasterMind
          agiert als Auftragsverarbeiter.
        </p>

        <h2>6. KI-Funktionen</h2>
        <p>
          Inhalte, die an den KI-Tutor gesendet werden, werden vor der Übertragung
          pseudonymisiert (Schülernamen werden zu Initialen). MasterMind nutzt die
          Anthropic API (USA) mit Standard-Datenschutzklauseln.
        </p>

        <h2>7. Betroffenenrechte</h2>
        <p>
          Sie haben das Recht auf Auskunft (Art. 15 DSGVO), Berichtigung (Art. 16),
          Löschung (Art. 17), Einschränkung (Art. 18), Datenübertragbarkeit (Art. 20)
          und Widerspruch (Art. 21 DSGVO).
        </p>
        <p>
          Anfragen richten Sie bitte an: {COMPANY.emailPrivacy}
        </p>

        <h2>8. Beschwerderecht</h2>
        <p>
          Sie haben das Recht, sich bei der zuständigen Datenschutzbehörde zu beschweren.
          Zuständige Behörde: Bayerisches Landesamt für Datenschutzaufsicht (BayLDA).
        </p>

        <p className="text-xs text-muted-fg">Stand: Mai 2026</p>
      </div>
    </main>
  );
}
