/* Copyright 2026 Elian Schock, Jonas Schwenk */
/**
 * Datenmodell für eine einzelne Frage im Fragenpool.
 * Das Modell liefert nur die inhaltlichen Felder (GeneriertesItem),
 * die Metadaten (Schulart, Fach, ...) werden im Code aus der Zelle ergänzt.
 */

export const SCHWIERIGKEITSSTUFEN = [1, 2, 3, 4, 5] as const;
export type Schwierigkeit = (typeof SCHWIERIGKEITSSTUFEN)[number];

export const SCHWIERIGKEIT_LABEL: Record<Schwierigkeit, string> = {
  1: "leicht – Grundwissen / Reproduktion",
  2: "eher leicht – einfache Anwendung",
  3: "mittel – sichere Anwendung",
  4: "schwer – Übertragung / Mehrschritt",
  5: "sehr schwer – Transfer / komplexe Problemlösung",
};

/**
 * Score-Bänder pro Stufe. Der feine "schwierigkeit_score" (0–100) erlaubt
 * eine stufenlose Sortierung "oben leicht, unten schwer" innerhalb eines Themas:
 * sortiere nach (schwierigkeit ASC, schwierigkeit_score ASC).
 */
export const SCORE_BANDS: Record<Schwierigkeit, [number, number]> = {
  1: [0, 20],
  2: [20, 40],
  3: [40, 60],
  4: [60, 80],
  5: [80, 100],
};

export type FrageTyp = "single_choice" | "multiple_choice" | "wahr_falsch";

export type Antwort = {
  id: string;
  text: string;
  korrekt: boolean;
};

/** Das, was das Modell pro Frage zurückliefern muss. */
export type GeneriertesItem = {
  typ: FrageTyp;
  frage: string;
  antwortmoeglichkeiten: Antwort[];
  loesung: string[];
  erklaerung: string;
  schwierigkeit_score: number;
};

/** Vollständige Frage inkl. Metadaten – so wird sie als JSONL persistiert. */
export type Frage = GeneriertesItem & {
  schulart: string;
  bundesland: string;
  jahrgangsstufe: number;
  fach: string;
  thema: string;
  unterthema: string | null;
  schwierigkeit: number;
  modell: string;
  quelle: "ki-generiert";
  generiert_am: string;
};

/**
 * Parst und validiert einen rohen API-Response-Eintrag.
 * Gibt null zurück wenn das Format nicht passt.
 */
export function parseGeneriertesItem(raw: unknown): GeneriertesItem | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;

  if (typeof r.frage !== "string" || !r.frage) return null;
  if (typeof r.erklaerung !== "string" || !r.erklaerung) return null;
  if (typeof r.schwierigkeit_score !== "number") return null;

  const typ: FrageTyp =
    r.typ === "multiple_choice" ? "multiple_choice"
    : r.typ === "wahr_falsch" ? "wahr_falsch"
    : "single_choice";

  if (!Array.isArray(r.antwortmoeglichkeiten)) return null;
  const antworten: Antwort[] = [];
  for (const a of r.antwortmoeglichkeiten) {
    if (!a || typeof a !== "object") return null;
    const ao = a as Record<string, unknown>;
    if (typeof ao.id !== "string" || !ao.id) return null;
    if (typeof ao.text !== "string" || !ao.text) return null;
    if (typeof ao.korrekt !== "boolean") return null;
    antworten.push({ id: ao.id, text: ao.text, korrekt: ao.korrekt });
  }
  if (antworten.length < 2) return null;

  if (!Array.isArray(r.loesung) || r.loesung.length === 0) return null;
  const loesung = r.loesung as string[];

  return {
    typ,
    frage: r.frage,
    antwortmoeglichkeiten: antworten,
    loesung,
    erklaerung: r.erklaerung,
    schwierigkeit_score: r.schwierigkeit_score,
  };
}

/**
 * Inhaltliche Plausibilitätsprüfung:
 * - eindeutige Antwort-IDs
 * - mindestens eine richtige Antwort
 * - single_choice => genau eine richtige
 * - loesung deckt sich exakt mit den als korrekt markierten Antworten
 */
export function istGueltigesItem(item: GeneriertesItem): boolean {
  const ids = item.antwortmoeglichkeiten.map((a) => a.id);
  if (new Set(ids).size !== ids.length) return false;

  const korrekteIds = item.antwortmoeglichkeiten
    .filter((a) => a.korrekt)
    .map((a) => a.id);
  if (korrekteIds.length === 0) return false;
  if (item.typ === "single_choice" && korrekteIds.length !== 1) return false;

  const loesungAlleVorhanden = item.loesung.every((id) => ids.includes(id));
  if (!loesungAlleVorhanden) return false;

  const a = [...korrekteIds].sort().join(",");
  const b = [...item.loesung].sort().join(",");
  return a === b;
}

/** Normalisierter Schlüssel für die Dublettenerkennung innerhalb einer Zelle. */
export function normalisiereFrage(frage: string): string {
  return frage
    .toLowerCase()
    .replace(/[^\p{L}\p{N} ]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}
