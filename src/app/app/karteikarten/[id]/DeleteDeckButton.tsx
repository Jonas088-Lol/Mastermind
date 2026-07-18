/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteDeck } from "./actions";

interface Props {
  deckId: string;
  deckName: string;
}

/** Löscht ein komplettes Deck inkl. aller Karten (mit Bestätigung). */
export function DeleteDeckButton({ deckId, deckName }: Props) {
  const [pending, startTransition] = useTransition();

  return (
    // Gleiche Form/Größe wie der Exportieren-Button daneben (outline · sm),
    // aber dauerhaft rot; beim Hovern wird das Rot etwas heller.
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={pending}
      title="Deck löschen"
      onClick={() => {
        if (!confirm(`Deck „${deckName}“ mit allen Karten wirklich löschen?`)) return;
        startTransition(() => deleteDeck(deckId));
      }}
      className="border-danger/40 text-danger hover:border-danger/60 hover:bg-danger/10 hover:text-danger/80"
    >
      <Trash2 className="size-3.5" />
      {pending ? "Löscht…" : "Deck löschen"}
    </Button>
  );
}
