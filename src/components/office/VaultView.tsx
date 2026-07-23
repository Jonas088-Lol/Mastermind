/* Copyright 2026 Elian Schock, Jonas Schwenk */
import { redirect } from "next/navigation";
import { Database, Download, ShieldCheck, Clock } from "lucide-react";
import { effectiveRole, getSession } from "@/lib/session";
import { canUseOffice } from "@/lib/office";

/**
 * MasterVault (v1: Export-/Backup-Format). Bietet die DSGVO-Selbstauskunft als
 * eine komprimierte Akte. Der eigentliche „eine DB pro Nutzer"-Umbau ist bewusst
 * später (siehe Roadmap) — hier zählt der greifbare Nutzen: Export, Backup,
 * Mitnahme beim Schulwechsel.
 */
export async function VaultView() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canUseOffice(effectiveRole(session))) redirect("/");

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">MasterOffice</p>
        <h1 className="mt-1 flex items-center gap-3 text-3xl font-bold tracking-tight sm:text-4xl">
          <Database className="size-8 text-brand" strokeWidth={1.5} />
          MasterVault
        </h1>
        <p className="mt-2 text-sm text-muted-fg">
          Deine persönliche Akte — alles an einem Ort, jederzeit exportierbar.
        </p>
      </header>

      {/* Export */}
      <div className="rounded-2xl border border-border bg-surface p-6">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <Download className="size-4 text-brand" strokeWidth={1.75} />
          Meine Daten exportieren
        </h2>
        <p className="mt-2 text-sm text-muted-fg">
          Lädt deine komplette Akte als eine komprimierte Datei herunter — Dokumente,
          Tabellen, Präsentationen, Hefte, Vokabeln, Karteikarten, Noten, Abgaben,
          Einwilligungen, Fortschritt und Einstellungen. Ideal für Backup, Umzug oder
          die DSGVO-Auskunft.
        </p>
        <a
          href="/api/vault/export"
          className="pastel-cta mt-4 inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold"
          download
        >
          <Download className="size-4" />
          Akte herunterladen (.json.gz)
        </a>
        <p className="mt-2 text-[11px] text-muted-fg">
          Format: gzip-komprimiertes JSON. Enthält nur deine eigenen Daten.
        </p>
      </div>

      {/* Datenschutz-Hinweis */}
      <div className="rounded-2xl border border-border p-5">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <ShieldCheck className="size-4 text-success" strokeWidth={1.75} />
          Datenschutz
        </h3>
        <ul className="mt-3 space-y-2 text-sm text-muted-fg">
          <li className="flex items-start gap-2">
            <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand" aria-hidden />
            Der Export enthält ausschließlich deine eigenen Daten.
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand" aria-hidden />
            Passwörter und Sicherheits-Geheimnisse werden nie exportiert.
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand" aria-hidden />
            Andere können deine Akte nur im gesetzlich/schulisch erlaubten Rahmen einsehen.
          </li>
        </ul>
      </div>

      {/* Ausblick */}
      <div className="rounded-2xl border border-border bg-surface p-5">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <Clock className="size-4 text-muted-fg" strokeWidth={1.75} />
          In Entwicklung
        </h3>
        <p className="mt-2 text-sm text-muted-fg">
          Wiederherstellung aus einer Akte und automatische Übernahme beim Schulwechsel
          folgen in einem späteren Schritt.
        </p>
      </div>
    </div>
  );
}
