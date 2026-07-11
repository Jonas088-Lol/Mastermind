"use client";

import { useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { createClass } from "./actions";

/**
 * Formular "Neue Klasse" mit Auto-Vervollständigung:
 * Steht in der Bezeichnung nur ein Buchstabe (z. B. "A") und wird ein
 * Jahrgang gewählt (z. B. 6), wird daraus automatisch "6A".
 * Wechselt man den Jahrgang später, wird eine führende Zahl ersetzt
 * (aus "6A" + Jahrgang 7 wird "7A"). Manuelle Eingaben bleiben möglich.
 */
export function NeueKlasseForm() {
  const [name, setName] = useState("");
  const [grade, setGrade] = useState("");

  function combineName(rawName: string, gradeVal: string): string {
    const n = rawName.trim();
    if (!gradeVal) return n;
    // Nur Buchstaben (z. B. "A", "b", "BC") → Jahrgang voranstellen
    if (/^[a-zA-Z]{1,3}$/.test(n)) return `${gradeVal}${n}`;
    // Führende Zahl (z. B. "6A") → Zahl durch neuen Jahrgang ersetzen
    const m = n.match(/^\d{1,2}([a-zA-Z]{0,3})$/);
    if (m) return `${gradeVal}${m[1]}`;
    return n;
  }

  function handleGradeChange(g: string) {
    setGrade(g);
    setName((cur) => combineName(cur, g));
  }

  function handleNameBlur() {
    setName((cur) => combineName(cur, grade));
  }

  return (
    <form action={createClass} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="name" className="text-sm font-semibold">Klassenbezeichnung</label>
        <Input
          id="name" name="name" type="text" required placeholder="z. B. A — wird mit Jahrgang zu 6A"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={handleNameBlur}
        />
        <p className="text-xs text-muted-fg">
          Buchstabe eingeben (z. B. A) — der gewählte Jahrgang wird automatisch vorangestellt. Wird in Großbuchstaben gespeichert.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="grade" className="text-sm font-semibold">Jahrgang</label>
        <select
          id="grade" name="grade" required
          value={grade}
          onChange={(e) => handleGradeChange(e.target.value)}
          className="h-10 border border-border bg-bg px-3 text-sm focus:border-brand focus:outline-none"
        >
          <option value="">Jahrgang wählen…</option>
          {Array.from({ length: 13 }, (_, i) => i + 1).map((g) => (
            <option key={g} value={g}>Klasse {g}</option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button type="submit" className="bg-fg px-5 py-2.5 text-sm font-semibold text-bg hover:bg-fg/90">
          Klasse erstellen
        </button>
        <Link href="/admin/klassen" className="text-sm text-muted-fg hover:text-fg">
          Abbrechen
        </Link>
      </div>
    </form>
  );
}
