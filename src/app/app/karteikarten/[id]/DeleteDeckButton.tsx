/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deleteDeck } from "./actions";

interface Props {
  deckId: string;
  deckName: string;
}

/** Löscht ein komplettes Deck inkl. aller Karten (mit Bestätigung). */
export function DeleteDeckButton({ deckId, deckName }: Props) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      title="Deck löschen"
      onClick={() => {
        if (!confirm(`Deck „${deckName}“ mit allen Karten wirklich löschen?`)) return;
        startTransition(() => deleteDeck(deckId));
      }}
      className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted-fg transition-colors hover:border-danger/40 hover:bg-danger/10 hover:text-danger disabled:opacity-50"
    >
      <Trash2 className="size-3.5" />
      {pending ? "Löscht…" : "Deck löschen"}
    </button>
  );
}
