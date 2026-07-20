/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use client";

import { useState, useTransition } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { renameSubjectCategory, toggleSubjectCategory } from "./actions";

export interface CategoryOption {
  value: string;
  label: string;
}

/** Kennzeichnet die Auswahl „Sonstiges" — kein echter Fachtyp. */
export const CUSTOM_VALUE = "__custom";

/**
 * Fachtyp-Auswahl mit freier Eingabe.
 *
 * „Sonstiges" blendet ein Textfeld ein. Der Stern merkt die Eingabe schulweit
 * vor, sodass sie beim nächsten Mal oben als Vorschlag steht. Wählt man einen
 * gemerkten Fachtyp aus, bleibt dasselbe Textfeld sichtbar — dort lässt er
 * sich umbenennen oder über den Stern wieder entfernen.
 *
 * Die Chips sind Buttons, kein Radio-Set: Der abgeschickte Wert kommt aus dem
 * versteckten Feld unten. Sonst würde nach dem Umbenennen noch der alte Text
 * gespeichert.
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
  /** Ursprünglicher Name des gerade bearbeiteten Favoriten (für das Umbenennen). */
  const [editing, setEditing] = useState<string | null>(null);
  const [favorites, setFavorites] = useState(initialFavorites);
  const [pending, startTransition] = useTransition();

  const trimmed = custom.trim();
  const isCustomMode = selected === CUSTOM_VALUE;
  const isFavorite = favorites.some((f) => f.toLowerCase() === trimmed.toLowerCase());

  /** Ein eigener Fachtyp ist gewählt → Textfeld bleibt sichtbar. */
  const showInput = isCustomMode || editing !== null;

  function selectPreset(value: string) {
    setSelected(value);
    setEditing(null);
    setCustom("");
  }

  function selectFavorite(label: string) {
    setSelected(label);
    setEditing(label);
    setCustom(label);
  }

  function selectCustom() {
    setSelected(CUSTOM_VALUE);
    setEditing(null);
    setCustom("");
  }

  /** Stern: merken bzw. entfernen. */
  function toggleFavorite() {
    if (!trimmed || pending) return;
    const wasFavorite = isFavorite;

    setFavorites((prev) =>
      wasFavorite
        ? prev.filter((f) => f.toLowerCase() !== trimmed.toLowerCase())
        : [...prev, trimmed],
    );
    // Entfernt: kein Favorit mehr in Bearbeitung, der Text bleibt aber nutzbar.
    if (wasFavorite) {
      setEditing(null);
      setSelected(CUSTOM_VALUE);
    } else {
      setEditing(trimmed);
      setSelected(trimmed);
    }

    startTransition(async () => {
      const saved = await toggleSubjectCategory(trimmed);
      setFavorites(saved);
    });
  }

  /** Umbenennen, sobald das Feld verlassen wird. */
  function commitRename() {
    if (editing === null || pending) return;
    const next = trimmed;
    if (!next || next === editing) return;

    const from = editing;
    setFavorites((prev) => prev.map((f) => (f === from ? next : f)));
    setEditing(next);
    setSelected(next);

    startTransition(async () => {
      const saved = await renameSubjectCategory(from, next);
      setFavorites(saved);
    });
  }

  /** Was tatsächlich gespeichert wird. */
  const submittedCategory = showInput ? trimmed : selected;

  const chipClass = (active: boolean) =>
    cn(
      "inline-flex items-center rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors",
      active
        ? "border-brand bg-brand/10 text-brand"
        : "border-border text-muted-fg hover:border-brand/40 hover:text-fg",
    );

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-semibold">Fachtyp *</label>

      {/* Der abgeschickte Wert — Chips sind reine Bedienelemente. */}
      <input type="hidden" name="category" value={submittedCategory} />

      <div className="flex flex-wrap gap-2">
        {presets.map((cat) => (
          <button
            key={cat.value}
            type="button"
            onClick={() => selectPreset(cat.value)}
            aria-pressed={selected === cat.value}
            className={chipClass(selected === cat.value)}
          >
            {cat.label}
          </button>
        ))}

        {/* Gemerkte eigene Fachtypen */}
        {favorites.map((fav) => (
          <button
            key={fav}
            type="button"
            onClick={() => selectFavorite(fav)}
            aria-pressed={selected === fav}
            className={chipClass(selected === fav)}
          >
            <Star className="mr-1 size-3 text-warning" strokeWidth={2} fill="currentColor" />
            {fav}
          </button>
        ))}

        <button
          type="button"
          onClick={selectCustom}
          aria-pressed={isCustomMode}
          className={chipClass(isCustomMode)}
        >
          Sonstiges
        </button>
      </div>

      {/* Freie Eingabe — bei „Sonstiges" und bei gewähltem eigenem Fachtyp */}
      {showInput && (
        <div className="mt-1 flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              onBlur={commitRename}
              required
              maxLength={40}
              placeholder="Eigenen Fachtyp eingeben — z. B. Förderunterricht"
              aria-label="Eigener Fachtyp"
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
              <Star
                className="size-4"
                strokeWidth={1.75}
                fill={isFavorite ? "currentColor" : "none"}
              />
              <span className="sr-only">
                {isFavorite ? "Aus den Vorschlägen entfernen" : "Als Vorschlag merken"}
              </span>
            </button>
          </div>
          <p className="text-xs text-muted-fg">
            {editing !== null
              ? "Text ändern benennt den Fachtyp um — auch bei bereits angelegten Fächern. Der gelbe Stern entfernt ihn aus den Vorschlägen."
              : "Mit dem Stern merkst du dir den Fachtyp — er steht dann oben bei den Vorschlägen."}
          </p>
        </div>
      )}
    </div>
  );
}
