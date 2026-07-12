/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use client";

import { FileText, Sparkles, Upload } from "lucide-react";
import { useActionState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { generateCardsFromPdf } from "./actions";

interface Props {
  subjects: { id: string; name: string }[];
}

export function AusPdfForm({ subjects }: Props) {
  const [error, action, pending] = useActionState(
    async (_prev: { error: string } | null, formData: FormData) => {
      return await generateCardsFromPdf(formData);
    },
    null
  );

  return (
    <form action={action} className="space-y-4">
      {error && (
        <div className="border-l-2 border-danger bg-danger/6 px-4 py-3 text-sm text-danger">
          {error.error}
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="pdf">PDF-Datei</Label>
        <label
          htmlFor="pdf"
          className="group flex w-full cursor-pointer items-center gap-3 border border-dashed border-border bg-bg p-5 transition-colors hover:border-brand"
        >
          <div className="grid size-12 place-items-center bg-surface group-hover:bg-brand group-hover:text-brand-fg">
            <Upload className="size-5" strokeWidth={1.75} />
          </div>
          <div>
            <p className="text-sm font-semibold">PDF hochladen</p>
            <p className="text-xs text-muted-fg">Nur textbasierte PDFs · max. 10 MB</p>
          </div>
          <FileText className="ml-auto size-5 text-muted-fg" strokeWidth={1.5} />
        </label>
        <input id="pdf" name="pdf" type="file" accept=".pdf,application/pdf" required className="sr-only" />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="deckName">Deck-Name</Label>
        <Input id="deckName" name="deckName" placeholder="z. B. Biologie Kap. 4 – Zelle" required />
      </div>

      {subjects.length > 0 && (
        <div className="space-y-1.5">
          <Label htmlFor="subjectId">Fach (optional)</Label>
          <select
            id="subjectId"
            name="subjectId"
            className="h-10 w-full border border-border bg-bg px-3 text-sm focus:border-brand focus:outline-none"
          >
            <option value="">Kein Fach</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center gap-2 bg-fg px-5 py-2.5 text-sm font-semibold text-bg transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        <Sparkles className="size-4" />
        {pending ? "Karten werden generiert…" : "Lernkarten generieren"}
      </button>
    </form>
  );
}
