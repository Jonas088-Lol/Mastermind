import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "AGB",
  description: "Allgemeine Geschäftsbedingungen der MasterMind GmbH",
};

export default function AgbPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <Link
        href="/"
        className="mb-8 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-fg hover:text-fg"
      >
        <ArrowLeft className="size-3.5" />
        Zurück
      </Link>

      <h1 className="text-3xl font-bold tracking-tight">Allgemeine Geschäftsbedingungen</h1>

      <div className="prose prose-sm mt-8 max-w-none dark:prose-invert">
        <h2>§ 1 Geltungsbereich</h2>
        <p>
          Diese Allgemeinen Geschäftsbedingungen (AGB) gelten für alle Verträge zwischen der
          MasterMind GmbH (nachfolgend „MasterMind") und Schulen, Schulträgern sowie sonstigen
          Einrichtungen (nachfolgend „Kunde") über die Nutzung der MasterMind-Plattform.
        </p>

        <h2>§ 2 Leistungsgegenstand</h2>
        <p>
          MasterMind stellt eine cloudbasierte Schulverwaltungs- und Lernplattform bereit, die
          Funktionen für Lehrkräfte, Schülerinnen und Schüler sowie Eltern umfasst. Die
          jeweiligen Leistungsmerkmale ergeben sich aus dem gewählten Tarifplan.
        </p>

        <h2>§ 3 Vertragsschluss und Laufzeit</h2>
        <p>
          Der Vertrag kommt mit der Bestätigung der Registrierung durch MasterMind zustande.
          Die Mindestlaufzeit beträgt 12 Monate. Eine Kündigung ist mit einer Frist von 3 Monaten
          zum Ende der Vertragslaufzeit möglich.
        </p>

        <h2>§ 4 Nutzungsrechte</h2>
        <p>
          MasterMind räumt dem Kunden ein nicht-exklusives, nicht übertragbares Recht zur
          Nutzung der Plattform im vereinbarten Umfang ein. Eine Weitergabe von Zugangsdaten
          an Dritte außerhalb der Schulgemeinschaft ist untersagt.
        </p>

        <h2>§ 5 Pflichten des Kunden</h2>
        <p>
          Der Kunde ist verpflichtet, die Plattform nur für schulische Zwecke zu nutzen,
          aktuelle Kontaktdaten bereitzuhalten und MasterMind unverzüglich über Sicherheits-
          vorfälle zu informieren.
        </p>

        <h2>§ 6 Vergütung</h2>
        <p>
          Die Vergütung richtet sich nach dem gewählten Tarifplan. Rechnungen sind binnen
          14 Tagen nach Ausstellung fällig. Bei Zahlungsverzug ist MasterMind berechtigt,
          den Zugang vorübergehend zu sperren.
        </p>

        <h2>§ 7 Datenschutz</h2>
        <p>
          MasterMind verarbeitet personenbezogene Daten ausschließlich als Auftragsverarbeiter
          im Sinne von Art. 28 DSGVO. Die Details regelt der gesondert abzuschließende AVV.
        </p>

        <h2>§ 8 Haftungsbeschränkung</h2>
        <p>
          MasterMind haftet unbeschränkt für Vorsatz und grobe Fahrlässigkeit. Bei einfacher
          Fahrlässigkeit haftet MasterMind nur bei Verletzung wesentlicher Vertragspflichten,
          begrenzt auf den vertragstypisch vorhersehbaren Schaden.
        </p>

        <h2>§ 9 Schlussbestimmungen</h2>
        <p>
          Es gilt deutsches Recht. Gerichtsstand ist München. Sollten einzelne Bestimmungen
          unwirksam sein, bleiben die übrigen Bestimmungen davon unberührt.
        </p>

        <p className="text-xs text-muted-fg">Stand: Mai 2026</p>
      </div>
    </main>
  );
}
