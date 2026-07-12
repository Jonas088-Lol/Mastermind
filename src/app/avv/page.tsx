/* Copyright 2026 Elian Schock, Jonas Schwenk */
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "AVV — Auftragsverarbeitungsvertrag",
  description: "Auftragsverarbeitungsvertrag gemäß Art. 28 DSGVO",
};

export default function AvvPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <Link
        href="/"
        className="mb-8 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-fg hover:text-fg"
      >
        <ArrowLeft className="size-3.5" />
        Zurück
      </Link>

      <h1 className="text-3xl font-bold tracking-tight">Auftragsverarbeitungsvertrag (AVV)</h1>
      <p className="mt-2 text-sm text-muted-fg">gemäß Art. 28 DSGVO</p>

      <div className="prose prose-sm mt-8 max-w-none dark:prose-invert">
        <h2>1. Gegenstand und Dauer</h2>
        <p>
          Dieser AVV regelt die Verarbeitung personenbezogener Daten durch die MasterMind GmbH
          (Auftragsverarbeiter) im Auftrag der jeweiligen Schule oder des Schulträgers
          (Verantwortlicher) im Rahmen der Nutzung der MasterMind-Plattform.
        </p>

        <h2>2. Art und Zweck der Verarbeitung</h2>
        <p>
          Der Auftragsverarbeiter verarbeitet personenbezogene Daten ausschließlich zum Zweck
          der Bereitstellung der vereinbarten Plattformleistungen. Dies umfasst:
        </p>
        <ul>
          <li>Benutzerverwaltung (Lehrkräfte, Schülerinnen und Schüler, Eltern)</li>
          <li>Speicherung von Lernfortschritten, Noten und Abgaben</li>
          <li>Bereitstellung des KI-Tutors mit Pseudonymisierung</li>
          <li>Kommunikation innerhalb der Plattform</li>
        </ul>

        <h2>3. Kategorien betroffener Personen</h2>
        <ul>
          <li>Schülerinnen und Schüler (teilweise Minderjährige)</li>
          <li>Lehrkräfte und Schulpersonal</li>
          <li>Erziehungsberechtigte</li>
        </ul>

        <h2>4. Weisungsgebundenheit</h2>
        <p>
          Der Auftragsverarbeiter verarbeitet Daten ausschließlich auf dokumentierte Weisung
          des Verantwortlichen. Er informiert den Verantwortlichen unverzüglich, wenn eine
          Weisung nach seiner Auffassung gegen Datenschutzrecht verstößt.
        </p>

        <h2>5. Technisch-organisatorische Maßnahmen (TOM)</h2>
        <p>
          MasterMind trifft geeignete technische und organisatorische Maßnahmen gemäß
          Art. 32 DSGVO, insbesondere:
        </p>
        <ul>
          <li>Verschlüsselung der Datenübertragung (TLS 1.3)</li>
          <li>Verschlüsselung der Daten im Ruhezustand</li>
          <li>Rollenbasierte Zugriffssteuerung</li>
          <li>Regelmäßige Backups in Deutschland</li>
          <li>Zwei-Faktor-Authentifizierung für Administratoren</li>
        </ul>

        <h2>6. Unterauftragsverarbeiter</h2>
        <p>
          MasterMind setzt folgende Unterauftragsverarbeiter ein:
        </p>
        <ul>
          <li>Hetzner Online GmbH (Hosting, DE)</li>
          <li>Anthropic PBC (KI-Verarbeitung, USA — SCCs gemäß Art. 46 DSGVO)</li>
        </ul>
        <p>
          Über neue Unterauftragsverarbeiter wird der Verantwortliche vorab informiert.
        </p>

        <h2>7. Datenlöschung</h2>
        <p>
          Nach Beendigung des Vertrags werden alle personenbezogenen Daten binnen 30 Tagen
          gelöscht, sofern keine gesetzliche Aufbewahrungspflicht besteht.
        </p>

        <h2>8. Kontakt Datenschutz</h2>
        <p>datenschutz@mastermind.app</p>

        <p className="text-xs text-muted-fg">Stand: Mai 2026</p>
      </div>
    </main>
  );
}
