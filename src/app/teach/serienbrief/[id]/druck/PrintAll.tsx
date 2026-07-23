/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";
import { renderTemplate, type MergeData } from "@/lib/mail-merge";

/**
 * Sammeldruck: jeder Empfänger auf einer eigenen Seite (Seitenumbruch).
 * PDF entsteht über den Druckdialog des Browsers („Als PDF speichern") — wie
 * im übrigen Projekt (Zeugnis, Schülerzeitung), ohne PDF-Bibliothek.
 */
export function PrintAll({
  templateId,
  subject,
  body,
  data,
}: {
  templateId: string;
  subject: string;
  body: string;
  data: MergeData;
}) {
  // Beim direkten Aufruf nicht automatisch drucken — der Nutzer entscheidet.
  useEffect(() => { /* Platz für spätere Auto-Print-Option */ }, []);

  return (
    <div className="mx-auto w-full max-w-3xl">
      {/* Bedienleiste — im Druck ausgeblendet */}
      <div className="no-print mb-6 flex items-center justify-between gap-3">
        <Link
          href={`/teach/serienbrief/${templateId}`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-fg hover:text-fg"
        >
          <ArrowLeft className="size-4" /> Zurück zum Editor
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-fg">{data.rows.length} Briefe</span>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-fg px-3 py-2 text-xs font-semibold text-bg transition-opacity hover:opacity-90"
          >
            <Printer className="size-3.5" /> Alle drucken / als PDF
          </button>
        </div>
      </div>

      {data.rows.length === 0 ? (
        <p className="no-print text-sm text-muted-fg">Keine Empfänger vorhanden.</p>
      ) : (
        <div className="flex flex-col gap-8 print:gap-0">
          {data.rows.map((row, i) => (
            <article
              key={i}
              className="mm-letter rounded-lg border border-border bg-white p-10 text-black shadow-sm print:rounded-none print:border-0 print:p-0 print:shadow-none"
            >
              {subject && (
                <p className="mb-6 text-lg font-bold">{renderTemplate(subject, row)}</p>
              )}
              <div className="whitespace-pre-wrap text-sm leading-relaxed">
                {renderTemplate(body, row)}
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Jeder Brief auf eigene Seite; Bildschirm-Hintergrund neutral */}
      <style>{`
        @media print {
          .mm-letter { break-after: page; page-break-after: always; }
          .mm-letter:last-child { break-after: auto; page-break-after: auto; }
        }
      `}</style>
    </div>
  );
}
