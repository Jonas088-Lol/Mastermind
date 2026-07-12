/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use client";

import { useRef, useState, useTransition } from "react";
import { Upload, X } from "lucide-react";
import { importDeck } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const MAX_CARDS = 500;

type ParsedDeck = { name: string; cards: { front: string; back: string }[] };

export function ImportDeckForm() {
  const [open, setOpen] = useState(false);
  const [parsed, setParsed] = useState<ParsedDeck | null>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  function reset() {
    setParsed(null);
    setName("");
    setError(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handleFile(file: File | undefined) {
    setError(null);
    setParsed(null);
    if (!file) return;
    if (file.size > 2_000_000) {
      setError("Datei ist zu groß (max. 2 MB).");
      return;
    }
    let data: unknown;
    try {
      data = JSON.parse(await file.text());
    } catch {
      setError("Die Datei enthält kein gültiges JSON.");
      return;
    }
    if (typeof data !== "object" || data === null || !Array.isArray((data as { cards?: unknown }).cards)) {
      setError("Erwartet wird ein Objekt mit { name, cards: [{ front, back }] }.");
      return;
    }
    const obj = data as { name?: unknown; cards: unknown[] };
    if (obj.cards.length > MAX_CARDS) {
      setError(`Maximal ${MAX_CARDS} Karten pro Import.`);
      return;
    }
    const cards: { front: string; back: string }[] = [];
    for (const c of obj.cards) {
      if (typeof c !== "object" || c === null) continue;
      const card = c as { front?: unknown; back?: unknown };
      if (typeof card.front !== "string" || typeof card.back !== "string") continue;
      const front = card.front.trim().slice(0, 2000);
      const back = card.back.trim().slice(0, 2000);
      if (front && back) cards.push({ front, back });
    }
    if (cards.length === 0) {
      setError("Keine gültigen Karten in der Datei gefunden.");
      return;
    }
    const deckName = typeof obj.name === "string" ? obj.name.trim().slice(0, 120) : "";
    setParsed({ name: deckName, cards });
    setName(deckName || file.name.replace(/\.json$/i, "").slice(0, 120));
  }

  function submit() {
    if (!parsed) return;
    const finalName = name.trim().slice(0, 120);
    if (!finalName) {
      setError("Bitte gib einen Deck-Namen an.");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await importDeck(finalName, JSON.stringify(parsed.cards));
      } catch (e) {
        // redirect() wirft intern (digest "NEXT_REDIRECT") — nur echte Fehler anzeigen
        const digest = (e as { digest?: string } | null)?.digest;
        if (typeof digest === "string" && digest.startsWith("NEXT_REDIRECT")) throw e;
        setError(e instanceof Error ? e.message : "Import fehlgeschlagen.");
      }
    });
  }

  if (!open) {
    return (
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Upload className="size-3.5" />
        Deck importieren
      </Button>
    );
  }

  return (
    <div className="w-full rounded-2xl border border-border bg-surface p-5 sm:max-w-md">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">Deck importieren</p>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => {
            reset();
            setOpen(false);
          }}
          aria-label="Schließen"
        >
          <X className="size-4" />
        </Button>
      </div>
      <p className="mt-1 text-xs text-muted-fg">
        JSON-Datei im Format {"{ name, cards: [{ front, back }] }"} · max. {MAX_CARDS} Karten.
      </p>

      <div className="mt-4 space-y-3">
        <div>
          <Label htmlFor="import-file">JSON-Datei</Label>
          <input
            ref={fileRef}
            id="import-file"
            type="file"
            accept="application/json,.json"
            className="mt-1 block w-full text-xs text-muted-fg file:mr-3 file:rounded-lg file:border file:border-border file:bg-bg file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-fg hover:file:bg-surface"
            onChange={(e) => void handleFile(e.target.files?.[0])}
          />
        </div>

        {parsed && (
          <>
            <div>
              <Label htmlFor="import-name">Deck-Name</Label>
              <Input
                id="import-name"
                value={name}
                maxLength={120}
                onChange={(e) => setName(e.target.value)}
                className="mt-1"
              />
            </div>
            <p className="text-xs text-muted-fg">
              <span className="font-semibold text-fg">{parsed.cards.length}</span>{" "}
              {parsed.cards.length === 1 ? "Karte" : "Karten"} erkannt.
            </p>
          </>
        )}

        {error && <p className="text-xs font-medium text-danger">{error}</p>}

        <div className="flex gap-2">
          <Button type="button" size="sm" disabled={!parsed || isPending} onClick={submit}>
            {isPending ? "Importiere …" : "Importieren"}
          </Button>
        </div>
      </div>
    </div>
  );
}
