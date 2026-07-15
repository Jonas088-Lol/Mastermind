/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use client";

import { useActionState } from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createDeck, type CreateDeckState } from "./actions";

interface Subject {
  id: string;
  name: string;
  shortName: string;
}

export function NewDeckForm({ subjects }: { subjects: Subject[] }) {
  const [state, formAction, pending] = useActionState<CreateDeckState, FormData>(
    createDeck,
    {},
  );

  return (
    <form action={formAction} className="flex flex-col gap-6 rounded-2xl border border-border bg-bg p-6">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">
          Deck-Name <span className="text-danger">*</span>
        </Label>
        <Input
          id="name"
          name="name"
          type="text"
          required
          placeholder="z. B. Mathe Trigonometrie"
          className="focus:border-brand focus:ring-1 focus:ring-brand"
        />
      </div>

      {subjects.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="subjectId">Fach (optional)</Label>
          <select
            id="subjectId"
            name="subjectId"
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-fg focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          >
            <option value="">Kein Fach</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.shortName})
              </option>
            ))}
          </select>
        </div>
      )}

      {state.error && (
        <p className="flex items-center gap-2 rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
          <AlertCircle className="size-4 shrink-0" />
          {state.error}
        </p>
      )}

      <div className="flex justify-end">
        <Button type="submit" size="md" disabled={pending}>
          {pending ? "Erstelle…" : "Deck erstellen"}
        </Button>
      </div>
    </form>
  );
}
