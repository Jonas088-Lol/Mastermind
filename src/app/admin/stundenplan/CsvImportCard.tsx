"use client";

import { Upload } from "lucide-react";
import { useState, useTransition } from "react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { importTimetableCsv, type ImportResult } from "./actions";

export function CsvImportCard() {
  const [result, setResult] = useState<ImportResult | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const res = await importTimetableCsv(formData);
      setResult(res);
    });
  }

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>CSV-Import</CardTitle>
          <p className="mt-0.5 text-xs text-muted-fg">
            Format: <span className="font-mono">Klasse;Lehrer;Fach;Tag;Stunde;Raum</span> (Semikolon-getrennt, 1. Zeile = Header)
          </p>
        </div>
        <Upload className="size-4 text-muted-fg" strokeWidth={1.75} />
      </CardHeader>
      <CardBody className="space-y-4">
        <form action={handleSubmit} className="flex items-end gap-3">
          <div className="flex-1">
            <input
              type="file"
              name="csvFile"
              accept=".csv,.txt"
              required
              className="w-full cursor-pointer border border-border bg-bg px-3 py-2 text-sm text-fg file:mr-3 file:border-0 file:bg-transparent file:text-sm file:font-semibold file:text-brand"
            />
            <p className="mt-1 text-xs text-muted-fg">
              Tag: Mo/Di/Mi/Do/Fr oder 1–5 · Stunde: 1–9 · Raum optional
            </p>
          </div>
          <button
            type="submit"
            disabled={isPending}
            className="h-9 bg-fg px-4 text-sm font-semibold text-bg hover:bg-fg/90 disabled:opacity-50"
          >
            {isPending ? "Importiere …" : "Importieren"}
          </button>
        </form>

        {result && (
          <div className="space-y-2">
            <p className="text-sm font-semibold text-success">
              ✓ {result.imported} Eintrag{result.imported !== 1 ? "e" : ""} importiert
            </p>
            {result.errors.length > 0 && (
              <div className="max-h-40 overflow-y-auto border border-danger/30 bg-danger/5 p-3">
                <p className="mb-2 text-xs font-semibold text-danger">
                  {result.errors.length} Fehler:
                </p>
                <ul className="space-y-1">
                  {result.errors.map((e, i) => (
                    <li key={i} className="font-mono text-xs text-danger">
                      Zeile {e.line}: {e.msg}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
