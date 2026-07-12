/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use client";

import { Users } from "lucide-react";
import { useState, useTransition } from "react";
import { bulkInviteStudents, type BulkInviteResult } from "./actions";

export function BulkInviteCard() {
  const [result, setResult] = useState<BulkInviteResult | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const res = await bulkInviteStudents(formData);
      setResult(res);
    });
  }

  return (
    <div className="border border-border bg-bg">
      <div className="flex items-center gap-3 border-b border-border px-5 py-4">
        <Users className="size-4 text-muted-fg" strokeWidth={1.75} />
        <div>
          <p className="text-sm font-semibold">Massen-Import</p>
          <p className="text-xs text-muted-fg">
            Format: <span className="font-mono">Name;E-Mail;Klasse</span> — eine Zeile pro Schüler
          </p>
        </div>
      </div>
      <div className="p-5">
        <form action={handleSubmit} className="flex flex-col gap-4">
          <textarea
            name="csvData"
            rows={8}
            required
            className="w-full border border-border bg-bg px-3 py-2 font-mono text-sm text-fg outline-none transition-colors placeholder:font-sans placeholder:text-muted-fg focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/30"
            placeholder={"Name;E-Mail;Klasse\nLisa Müller;lisa@schule.de;8a\nMax Schmidt;max@schule.de;7b"}
          />
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={isPending}
              className="bg-fg px-4 py-2 text-sm font-semibold text-bg hover:bg-fg/90 disabled:opacity-50"
            >
              {isPending ? "Versende …" : "Einladungen senden"}
            </button>
            <p className="text-xs text-muted-fg">
              Bereits registrierte E-Mails werden übersprungen.
            </p>
          </div>
        </form>

        {result && (
          <div className="mt-4 space-y-2">
            <p className="text-sm">
              <span className="font-semibold text-success">✓ {result.sent} gesendet</span>
              {result.skipped > 0 && (
                <span className="ml-3 text-muted-fg">{result.skipped} übersprungen</span>
              )}
            </p>
            {result.errors.length > 0 && (
              <div className="max-h-40 overflow-y-auto border border-danger/30 bg-danger/5 p-3">
                <p className="mb-1 text-xs font-semibold text-danger">
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
      </div>
    </div>
  );
}
