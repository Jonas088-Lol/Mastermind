/* Copyright 2026 Elian Schock, Jonas Schwenk */
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { COMPANY } from "@/lib/company";

export const metadata: Metadata = {
  title: "Impressum",
  description: "Impressum der MasterMind GmbH",
};

export default function ImpressumPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <Link
        href="/"
        className="mb-8 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-fg hover:text-fg"
      >
        <ArrowLeft className="size-3.5" />
        Zurück
      </Link>

      <h1 className="text-3xl font-bold tracking-tight">Impressum</h1>

      <div className="prose prose-sm mt-8 max-w-none dark:prose-invert">
        <h2>Angaben gemäß § 5 TMG</h2>
        <p>
          {COMPANY.name}<br />
          {COMPANY.street}<br />
          {COMPANY.zip} {COMPANY.city}<br />
          {COMPANY.country}
        </p>

        <h2>Kontakt</h2>
        <p>
          E-Mail: {COMPANY.email}<br />
          Web: {COMPANY.website}
        </p>

        <h2>Handelsregister</h2>
        <p>
          Registergericht: {COMPANY.court}<br />
          Registernummer: {COMPANY.hrb}
        </p>

        <h2>Umsatzsteuer-ID</h2>
        <p>
          Umsatzsteuer-Identifikationsnummer gemäß § 27 a Umsatzsteuergesetz:<br />
          {COMPANY.vatId}
        </p>

        <h2>Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV</h2>
        <p>
          {COMPANY.ceo}<br />
          {COMPANY.name}<br />
          {COMPANY.street}<br />
          {COMPANY.zip} {COMPANY.city}
        </p>

        <h2>Streitschlichtung</h2>
        <p>
          Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:{" "}
          <span className="font-mono text-xs">https://ec.europa.eu/consumers/odr/</span>.<br />
          Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer
          Verbraucherschlichtungsstelle teilzunehmen.
        </p>
      </div>
    </main>
  );
}
