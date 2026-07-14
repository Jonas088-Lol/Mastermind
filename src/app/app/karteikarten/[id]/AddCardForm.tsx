/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use client";

import { useRef, useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { addFlashcard } from "./actions";

interface Props {
  deckId: string;
}

/** Inline-Formular, um manuell einzelne Karteikarten zu erstellen. */
export function AddCardForm({ deckId }: Props) {
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const frontRef = useRef<HTMLTextAreaElement>(null);

  function submit() {
    if (!front.trim() || !back.trim()) {
      setError("Vorder- und Rückseite sind erforderlich");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await addFlashcard(deckId, front, back);
      if (res.ok) {
        setFront("");
        setBack("");
        frontRef.current?.focus();
      } else {
        setError(res.error ?? "Konnte Karte nicht speichern");
      }
    });
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="card-front" className="text-xs font-semibold uppercase tracking-wider text-muted-fg">
            Vorderseite
          </label>
          <textarea
            id="card-front"
            ref={frontRef}
            value={front}
            onChange={(e) => setFront(e.target.value)}
            rows={2}
            placeholder="z. B. Was ist die Hauptstadt von Frankreich?"
            className="resize-y rounded-lg border border-border bg-bg px-3 py-2 text-sm placeholder:text-muted-fg focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="card-back" className="text-xs font-semibold uppercase tracking-wider text-muted-fg">
            Rückseite
          </label>
          <textarea
            id="card-back"
            value={back}
            onChange={(e) => setBack(e.target.value)}
            rows={2}
            onKeyDown={(e) => {
              // Strg/Cmd + Enter speichert schnell hintereinander
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") submit();
            }}
            placeholder="z. B. Paris"
            className="resize-y rounded-lg border border-border bg-bg px-3 py-2 text-sm placeholder:text-muted-fg focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </div>
      </div>

      {error && <p className="mt-2 text-xs text-danger">{error}</p>}

      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="hidden text-[11px] text-muted-fg sm:block">Tipp: Strg/⌘ + Enter speichert.</p>
        <Button type="button" size="sm" onClick={submit} disabled={pending} className="ml-auto">
          <Plus className="size-3.5" />
          {pending ? "Speichere…" : "Karte hinzufügen"}
        </Button>
      </div>
    </div>
  );
}
