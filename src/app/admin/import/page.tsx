import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Download, FileCheck } from "lucide-react";
import { effectiveRole, getSession } from "@/lib/session";
import { importUsers } from "./actions";

export const metadata: Metadata = { title: "Nutzer importieren · Admin" };

interface PageProps {
  searchParams: Promise<{ created?: string; skipped?: string; errors?: string }>;
}

export default async function ImportPage({ searchParams }: PageProps) {
  const session = await getSession();
  if (!session || effectiveRole(session) !== "admin") redirect("/login");

  const { created, skipped, errors } = await searchParams;
  const hasResult = created !== undefined || skipped !== undefined;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8">
      <header className="flex flex-col gap-3">
        <Link
          href="/admin/nutzer"
          className="inline-flex w-fit items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-muted-fg transition-colors hover:text-fg"
        >
          <ArrowLeft className="size-3.5" />
          Nutzer
        </Link>
        <div className="flex items-center gap-3">
          <FileCheck className="size-6 text-muted-fg" strokeWidth={1.75} />
          <h1 className="text-3xl font-bold tracking-tight">Nutzer importieren (CSV)</h1>
        </div>
        <p className="text-sm text-muted-fg">
          Schüler oder Lehrkräfte per CSV-Paste massenimportieren.
        </p>
      </header>

      {hasResult && (
        <div className="border border-success/40 bg-success/[0.06] px-5 py-4">
          <p className="text-sm font-semibold text-success">
            Import abgeschlossen
          </p>
          <p className="mt-1 text-sm text-fg">
            {created ?? 0} Nutzer erstellt, {skipped ?? 0} übersprungen
            {Number(errors ?? 0) > 0 && (
              <span className="ml-2 text-warning">· {errors} Fehler</span>
            )}
          </p>
          <p className="mt-2 text-xs text-muted-fg">
            Bereits vorhandene E-Mail-Adressen wurden übersprungen.
          </p>
        </div>
      )}

      <form action={importUsers} className="flex flex-col gap-6">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold">Rolle</label>
          <div className="flex gap-6">
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="radio"
                name="role"
                value="student"
                defaultChecked
                className="accent-brand"
              />
              Schüler
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="radio"
                name="role"
                value="teacher"
                className="accent-brand"
              />
              Lehrer
            </label>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="csv" className="text-sm font-semibold">
            CSV-Daten einfügen
          </label>
          <textarea
            id="csv"
            name="csv"
            required
            rows={12}
            placeholder={"Name,E-Mail,Klasse\nMax Mustermann,max@schule.de,9b\nAnna Schmidt,anna@schule.de,10a"}
            className="border border-border bg-bg px-3 py-2.5 font-mono text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
          <p className="text-xs text-muted-fg">
            Spalten durch Komma oder Semikolon trennen. Die Klasse-Spalte ist optional.
          </p>
        </div>

        <div className="border border-border bg-surface p-4 text-sm text-muted-fg">
          <p className="font-semibold text-fg">Format</p>
          <p className="mt-2 font-mono text-xs">Name,E-Mail,Klasse</p>
          <ul className="mt-2 list-disc space-y-1 pl-4 text-xs">
            <li>Erste Zeile kann ein Header sein (Name/E-Mail) — wird automatisch übersprungen</li>
            <li>Trennzeichen: Komma oder Semikolon</li>
            <li>Klasse ist optional (nur bei Schülern relevant)</li>
            <li>Bereits vorhandene E-Mail-Adressen werden übersprungen</li>
            <li>Das Passwort muss vom Nutzer selbst gesetzt werden (Einladungslink)</li>
          </ul>
          <div className="mt-3 flex items-center gap-2 border-t border-border pt-3">
            <Download className="size-3.5 text-muted-fg" />
            <Link
              href="/admin/import/vorlage.csv"
              className="text-xs text-brand hover:underline"
            >
              CSV-Vorlage herunterladen
            </Link>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            className="bg-fg px-5 py-2.5 text-sm font-semibold text-bg hover:bg-fg/90"
          >
            Importieren
          </button>
          <Link href="/admin/nutzer" className="text-sm text-muted-fg hover:text-fg">
            Abbrechen
          </Link>
        </div>
      </form>
    </div>
  );
}
