/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use client";

import { useState, useTransition } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { toggleSubjectCategory } from "./actions";

export interface CategoryOption {
  value: string;
  label: string;
}

/** Kennzeichnet die Auswahl „Sonstiges" — kein echter Fachtyp. */
export const CUSTOM_VALUE = "__custom";

/**
 * Fachtyp-Auswahl mit freier Eingabe.
 *
 * „Sonstiges" blendet ein Textfeld ein. Der Stern daneben merkt die Eingabe
 * schulweit vor, sodass sie beim nächsten Mal oben als Vorschlag steht.
 */
export function SubjectTypePicker({
  presets,
  favorites: initialFavorites,
}: {
  presets: CategoryOption[];
  favorites: string[];
}) {
  const [selected, setSelected] = useState(presets[0]?.value ?? "allgemein");
  const [custom, setCustom] = useState("");
  const [favorites, setFavorites] = useState(initialFavorites);
  const [pending, startTransition] = useTransition();

  const trimmed = custom.trim();
  const isFavorite = favorites.some((f) => f.toLowerCase() === trimmed.toLowerCase());

  function toggleFavorite() {
    if (!trimmed || pending) return;
    // Optimistisch umschalten — der Server bestätigt gleich darauf.
    setFavorites((prev) =>
      isFavorite
        ? prev.filter((f) => f.toLowerCase() !== trimmed.toLowerCase())
        : [...prev, trimmed],
    );
    startTransition(async () => {
      const saved = await toggleSubjectCategory(trimmed);
      setFavorites(saved);
    });
  }

  // Favoriten erscheinen als vollwertige Vorschläge zwischen Presets und „Sonstiges".
  const favoriteOptions: CategoryOption[] = favorites.map((f) => ({ value: f, label: f }));
  const options = [...presets, ...favoriteOptions];

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-semibold">Fachtyp *</label>

      <div className="flex flex-wrap gap-2">
        {options.map((cat) => (
          <label key={cat.value} className="cursor-pointer">
            <input
              type="radio"
              name="category"
              value={cat.value}
              checked={selected === cat.value}
              onChange={() => setSelected(cat.value)}
              className="peer sr-only"
            />
            <span className="inline-flex items-center rounded-xl border border-border px-3 py-1.5 text-xs font-semibold text-muted-fg transition-colors peer-checked:border-brand peer-checked:bg-brand/10 peer-checked:text-brand">
              {cat.label}
            </span>
          </label>
        ))}

        {/* Sonstiges */}
        <label className="cursor-pointer">
          <input
            type="radio"
            name="category"
            value={CUSTOM_VALUE}
            checked={selected === CUSTOM_VALUE}
            onChange={() => setSelected(CUSTOM_VALUE)}
            className="peer sr-only"
          />
          <span className="inline-flex items-center rounded-xl border border-border px-3 py-1.5 text-xs font-semibold text-muted-fg transition-colors peer-checked:border-brand peer-checked:bg-brand/10 peer-checked:text-brand">
            Sonstiges
          </span>
        </label>
      </div>

      {/* Freie Eingabe — nur bei „Sonstiges" */}
      {selected === CUSTOM_VALUE && (
        <div className="mt-1 flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <input
              type="text"
              name="customCategory"
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              required
              maxLength={40}
              placeholder="Eigenen Fachtyp eingeben — z. B. Förderunterricht"
              className="min-w-0 flex-1 rounded-lg border border-border bg-bg px-3 py-2 text-sm text-fg outline-none transition-colors placeholder:text-muted-fg focus:border-brand"
            />
            <button
              type="button"
              onClick={toggleFavorite}
              disabled={!trimmed || pending}
              aria-pressed={isFavorite}
              title={
                !trimmed
                  ? "Erst einen Fachtyp eingeben"
                  : isFavorite
                    ? "Aus den Vorschlägen entfernen"
                    : "Zu den Vorschlägen hinzufügen"
              }
              className={cn(
                "grid size-10 shrink-0 place-items-center rounded-xl border transition-colors",
                "disabled:cursor-not-allowed disabled:opacity-40",
                isFavorite
                  ? "border-warning/40 bg-warning/10 text-warning"
                  : "border-border bg-surface text-muted-fg hover:border-brand/40 hover:text-brand",
              )}
            >
              <Star className="size-4" strokeWidth={1.75} fill={isFavorite ? "currentColor" : "none"} />
              <span className="sr-only">
                {isFavorite ? "Favorit entfernen" : "Als Vorschlag merken"}
              </span>
            </button>
          </div>
          <p className="text-xs text-muted-fg">
            Mit dem Stern merkst du dir den Fachtyp — er steht dann oben bei den Vorschlägen.
          </p>
        </div>
      )}
    </div>
  );
}
