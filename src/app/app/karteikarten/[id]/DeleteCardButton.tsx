/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deleteFlashcard } from "./actions";

interface Props {
  deckId: string;
  cardId: string;
}

/** Löscht eine einzelne Karte (mit Bestätigung). */
export function DeleteCardButton({ deckId, cardId }: Props) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      title="Karte löschen"
      onClick={() => {
        if (!confirm("Diese Karte wirklich löschen?")) return;
        startTransition(() => deleteFlashcard(deckId, cardId));
      }}
      className="shrink-0 rounded-lg p-1.5 text-muted-fg transition-colors hover:bg-danger/10 hover:text-danger disabled:opacity-50"
    >
      <Trash2 className="size-4" />
    </button>
  );
}
