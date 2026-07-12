/* Copyright 2026 Elian Schock, Jonas Schwenk */
/**
 * Boss-Fragen-Seeder — generiert Fragen für alle Boss-Fächer/-Stufen via
 * Anthropic API und speichert sie direkt in der Postgres-Frage-Tabelle.
 *
 * Voraussetzung:
 *   ANTHROPIC_API_KEY=sk-ant-...   (in .env oder Umgebung)
 *   DATABASE_URL=postgresql://...  (Production-DB)
 *
 * Start:
 *   npm run questions:seed-bosses
 *
 * Optionale Env-Vars:
 *   PRO_SLOT=20     – Fragen pro (Fach × Stufe × Thema), default: 20
 *   FACH=mathematik – nur dieses Fach verarbeiten
 *   STUFE=7         – nur diese Jahrgangsstufe verarbeiten
 */

import * as process from "node:process";
import { PrismaClient } from "@prisma/client";
import {
  GeneriertesItem,
  SCHWIERIGKEITSSTUFEN,
  SCHWIERIGKEIT_LABEL,
  SCORE_BANDS,
  Schwierigkeit,
  istGueltigesItem,
  normalisiereFrage,
  parseGeneriertesItem,
} from "./schema";

const prisma = new PrismaClient();

const PRO_SLOT   = Number(process.env.PRO_SLOT ?? 20);
const NUR_FACH   = process.env.FACH?.toLowerCase()   ?? null;
const NUR_STUFE  = process.env.STUFE ? Number(process.env.STUFE) : null;

// ─── Konfiguration ────────────────────────────────────────────────────────────

const MODELL_STANDARD = "claude-haiku-4-5-20251001";
const MODELL_PRO_FACH: Record<string, string> = {
  deutsch: "claude-sonnet-4-6",
};
const MAX_TOKENS  = 6000;
const BATCH_GROESSE = 20;
const MAX_PARALLEL  = 3;
const MAX_RETRIES   = 4;

const RUBRIK: Record<Schwierigkeit, string> = {
  1: "Grundwissen, direktes Erinnern/Erkennen, ein Rechen-/Denkschritt.",
  2: "Einfache Anwendung einer bekannten Regel, ein bis zwei Schritte.",
  3: "Sichere Anwendung bei Standardaufgaben, mehrere Schritte.",
  4: "Übertragung auf neue Kontexte, Mehrschritt, einfache Textaufgaben.",
  5: "Komplexe Problemlösung, Kombination mehrerer Konzepte, anspruchsvolle Textaufgaben.",
};

// ─── Boss-Curriculum ──────────────────────────────────────────────────────────

interface Slot {
  fach: string;
  jahrgangsstufe: number;
  thema: string;
}

function mk(fach: string, jahrgangsstufe: number, themen: string[]): Slot[] {
  return themen.map((thema) => ({ fach, jahrgangsstufe, thema }));
}

const BOSS_CURRICULUM: Slot[] = [
  // ── MATHEMATIK (Kl. 5–12: COMMON → MYTHIC) ──────────────────────────────
  ...mk("mathematik", 5,  ["Natürliche Zahlen und Stellenwertsystem", "Grundrechenarten", "Geometrie Grundlagen und Winkel"]),
  ...mk("mathematik", 6,  ["Bruchrechnung", "Dezimalzahlen und Prozentwerte", "Flächeninhalt und Umfang"]),
  ...mk("mathematik", 7,  ["Prozentrechnung und Zinsrechnung", "Rationale Zahlen", "Terme und lineare Gleichungen"]),
  ...mk("mathematik", 8,  ["Lineare Gleichungssysteme", "Lineare Funktionen und Graphen", "Körperberechnungen"]),
  ...mk("mathematik", 9,  ["Quadratische Gleichungen und Funktionen", "Ähnlichkeit und Trigonometrie", "Stochastik Grundlagen"]),
  ...mk("mathematik", 10, ["Logarithmen und Exponentialfunktionen", "Vektoren in der Ebene", "Stochastik vertieft"]),
  ...mk("mathematik", 11, ["Differentialrechnung", "Kurvendiskussion", "Vektorrechnung im Raum"]),
  ...mk("mathematik", 12, ["Integralrechnung", "Stochastik Abiturniveau", "Analytische Geometrie"]),

  // ── DEUTSCH (Kl. 5–12) ──────────────────────────────────────────────────
  ...mk("deutsch", 5,  ["Wortarten und Satzglieder", "Rechtschreibung Grundlagen", "Erzählende Texte"]),
  ...mk("deutsch", 6,  ["Zeitformen des Verbs", "Argumentieren Grundlagen", "Satzarten und Nebensätze"]),
  ...mk("deutsch", 7,  ["Erörterung", "Epik und Lyrik", "Sprachliche Gestaltungsmittel"]),
  ...mk("deutsch", 8,  ["Argumentation und Rhetorik", "Gedichtanalyse", "Inhaltsangabe und Textanalyse"]),
  ...mk("deutsch", 9,  ["Dramen und Dramatik", "Rhetorische Mittel", "Sprachgeschichte"]),
  ...mk("deutsch", 10, ["Literaturepochen Überblick", "Textinterpretation", "Komplexe Grammatik"]),
  ...mk("deutsch", 11, ["Literaturgeschichte 18. und 19. Jahrhundert", "Analyse literarischer Texte", "Sprachkritik und Sprachwandel"]),
  ...mk("deutsch", 12, ["Literatur des 20. Jahrhunderts", "Komplexe Erörterung", "Literaturtheorien Grundlagen"]),

  // ── ENGLISCH (Kl. 5–12) ─────────────────────────────────────────────────
  ...mk("englisch", 5,  ["Present tenses and to be", "Vocabulary basics and numbers", "Plural and articles"]),
  ...mk("englisch", 6,  ["Simple past and past progressive", "Comparison of adjectives", "Going-to future and will"]),
  ...mk("englisch", 7,  ["Present perfect", "Conditional I", "Passive voice"]),
  ...mk("englisch", 8,  ["Reported speech", "Relative clauses", "Conditional II and III"]),
  ...mk("englisch", 9,  ["Modal verbs advanced", "Gerund and infinitive", "Text types"]),
  ...mk("englisch", 10, ["Advanced grammar structures", "Idioms and phrasal verbs", "Literary analysis"]),
  ...mk("englisch", 11, ["Advanced writing skills", "Debate language", "American and British English"]),
  ...mk("englisch", 12, ["C1 Grammar", "Global topics vocabulary", "Mediation skills"]),

  // ── BIOLOGIE (Kl. 5–12: COMMON → MYTHIC) ────────────────────────────────
  ...mk("biologie", 5,  ["Pflanzenorgane und Pflanzenkunde", "Tiere und ihre Lebensräume", "Ökosystem Grundlagen"]),
  ...mk("biologie", 6,  ["Zelle Grundlagen", "Wirbeltierklassen", "Sinnesorgane"]),
  ...mk("biologie", 7,  ["Genetik Grundlagen", "Evolution Grundlagen", "Ökologie und Nahrungsnetze"]),
  ...mk("biologie", 8,  ["Fotosynthese und Zellatmung", "Neurobiologie Grundlagen", "Hormonsystem"]),
  ...mk("biologie", 9,  ["DNA und Proteinbiosynthese", "Immunsystem", "Ökosysteme vertieft"]),
  ...mk("biologie", 10, ["Genetik vertieft und Mendel-Gesetze", "Evolution vertieft", "Verhaltensbiologie"]),
  ...mk("biologie", 11, ["Biochemie Grundlagen", "Neurobiologie vertieft", "Ökologie und Klimawandel"]),
  ...mk("biologie", 12, ["Molekularbiologie", "Populationsbiologie", "Bioethik"]),

  // ── PHYSIK (Kl. 6–12: UNCOMMON → MYTHIC) ────────────────────────────────
  ...mk("physik", 6,  ["Mechanik Grundlagen und Kräfte", "Optik Grundlagen", "Wärmelehre Grundlagen"]),
  ...mk("physik", 7,  ["Kräfte und Bewegungsgesetze", "Dichte und Auftrieb", "Elektrischer Strom Grundlagen"]),
  ...mk("physik", 8,  ["Elektrischer Strom und Widerstand", "Magnetismus", "Schall und Wellen"]),
  ...mk("physik", 9,  ["Energie und Arbeit", "Mechanische Schwingungen", "Radioaktivität"]),
  ...mk("physik", 10, ["Elektrodynamik Grundlagen", "Elektromagnetismus", "Thermodynamik"]),
  ...mk("physik", 11, ["Mechanik vertieft und Impuls", "Elektrodynamik vertieft", "Optik vertieft"]),
  ...mk("physik", 12, ["Quantenphysik", "Spezielle Relativitätstheorie", "Kernphysik"]),

  // ── CHEMIE (Kl. 5–12: COMMON → MYTHIC) ──────────────────────────────────
  ...mk("chemie", 5,  ["Stoffe und ihre Eigenschaften", "Stoffgemische und Trennverfahren"]),
  ...mk("chemie", 6,  ["Atombau Grundlagen", "Chemische Reaktionen", "Verbrennung und Oxidation"]),
  ...mk("chemie", 7,  ["Periodensystem der Elemente", "Ionenbindung und Salze", "Metalle"]),
  ...mk("chemie", 8,  ["Säuren und Basen", "Redoxreaktionen", "Elektrochemie Grundlagen"]),
  ...mk("chemie", 9,  ["Organische Chemie Grundlagen", "Kohlenwasserstoffe", "Kunststoffe"]),
  ...mk("chemie", 10, ["Elektrochemie vertieft", "Chemische Gleichgewichte", "Reaktionskinetik"]),
  ...mk("chemie", 11, ["Organische Chemie vertieft", "Naturstoffe", "Technische Chemie"]),
  ...mk("chemie", 12, ["Komplexchemie", "Biochemie Grundlagen", "Polymerchemie"]),

  // ── GESCHICHTE (Kl. 5–11: COMMON → EPIC) ────────────────────────────────
  ...mk("geschichte", 5,  ["Vorgeschichte und Steinzeit", "Altes Ägypten", "Antikes Griechenland"]),
  ...mk("geschichte", 6,  ["Römisches Reich", "Frühes Mittelalter und Karolinger", "Byzantinisches Reich"]),
  ...mk("geschichte", 7,  ["Hochmittelalter und Kreuzzüge", "Reformation und Renaissance", "Absolutismus"]),
  ...mk("geschichte", 8,  ["Amerikanische und Französische Revolution", "Industrialisierung", "Nationalismus"]),
  ...mk("geschichte", 9,  ["Erster Weltkrieg", "Weimarer Republik", "Nationalsozialismus"]),
  ...mk("geschichte", 10, ["Zweiter Weltkrieg", "Holocaust und Erinnerungskultur", "Nachkriegsordnung"]),
  ...mk("geschichte", 11, ["Kalter Krieg", "BRD und DDR", "Dekolonialisierung"]),

  // ── INFORMATIK (Kl. 5–12: COMMON → LEGENDARY) ───────────────────────────
  ...mk("informatik", 5,  ["Grundlagen des Computers", "Binärsystem und Zahlensysteme", "Internet und Datenschutz"]),
  ...mk("informatik", 6,  ["Algorithmen Grundlagen", "Scratch und visuelle Programmierung", "Daten und Codierung"]),
  ...mk("informatik", 7,  ["Python Grundlagen", "Datenstrukturen Listen und Wörterbücher", "Netzwerke"]),
  ...mk("informatik", 8,  ["Objektorientierte Programmierung", "Rekursion", "Datenbankgrundlagen SQL"]),
  ...mk("informatik", 9,  ["Sortier- und Suchalgorithmen", "Kryptographie Grundlagen", "Automaten"]),
  ...mk("informatik", 10, ["Betriebssysteme", "Komplexitätstheorie", "Graphen und Bäume"]),
  ...mk("informatik", 11, ["Künstliche Intelligenz Grundlagen", "Maschinelles Lernen", "Parallelverarbeitung"]),
  ...mk("informatik", 12, ["Theoretische Informatik", "Compiler und formale Grammatiken", "Verteilte Systeme"]),
];

// ─── API ──────────────────────────────────────────────────────────────────────

interface MessagesResponse {
  content: Array<{ type: string; text?: string }>;
  usage?: { input_tokens: number; output_tokens: number };
}

async function mitBackoff<T>(fn: () => Promise<T>, maxRetries: number): Promise<T> {
  let versuch = 0;
  for (;;) {
    try {
      return await fn();
    } catch (e) {
      versuch++;
      if (versuch > maxRetries) throw e;
      const wartezeit = Math.min(30_000, 1000 * 2 ** versuch) + Math.random() * 500;
      await new Promise((r) => setTimeout(r, wartezeit));
    }
  }
}

function parseItems(roh: string): GeneriertesItem[] {
  let text = roh.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const start = text.indexOf("[");
  const ende = text.lastIndexOf("]");
  if (start !== -1 && ende > start) text = text.slice(start, ende + 1);
  let parsed: unknown;
  try { parsed = JSON.parse(text); } catch { return []; }
  if (!Array.isArray(parsed)) return [];
  const ergebnis: GeneriertesItem[] = [];
  for (const eintrag of parsed) {
    const item = parseGeneriertesItem(eintrag);
    if (item && istGueltigesItem(item)) ergebnis.push(item);
  }
  return ergebnis;
}

async function frageModellAb(modell: string, systemPrompt: string, userPrompt: string): Promise<GeneriertesItem[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY fehlt in der Umgebung.");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: modell,
      max_tokens: MAX_TOKENS,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });

  if (!res.ok) {
    const fehlertext = await res.text();
    throw new Error(`API ${res.status}: ${fehlertext.slice(0, 300)}`);
  }

  const data = (await res.json()) as MessagesResponse;
  const roh = data.content.filter((b) => b.type === "text").map((b) => b.text ?? "").join("");
  return parseItems(roh);
}

// ─── Prompts ──────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = [
  "Du bist eine erfahrene deutsche Lehrkraft und professionelle Item-Autorin für Lernstandserhebungen.",
  "Du erstellst Multiple-Choice-Fragen, die exakt zum deutschen Lehrplan der angegebenen Jahrgangsstufe passen.",
  "Regeln:",
  "- Antworte AUSSCHLIESSLICH mit einem gültigen JSON-Array. Kein Fließtext, kein Markdown, keine Code-Zäune.",
  "- Jede Frage ist eigenständig und eindeutig lösbar.",
  "- Genau eine richtige Antwort und drei plausible Distraktoren, die typische Schülerfehler abbilden.",
  "- Sprache: Deutsch, altersgerecht für die angegebene Stufe.",
  "- Keine inhaltlichen Dubletten innerhalb des Arrays.",
].join("\n");

function baueUserPrompt(slot: Slot, stufe: Schwierigkeit, anzahl: number): string {
  const [lo, hi] = SCORE_BANDS[stufe];
  return [
    `Erstelle ${anzahl} Multiple-Choice-Fragen.`,
    "",
    `Jahrgangsstufe: ${slot.jahrgangsstufe}`,
    `Fach: ${slot.fach}`,
    `Thema: ${slot.thema}`,
    `Schwierigkeitsstufe: ${stufe}/5 – ${SCHWIERIGKEIT_LABEL[stufe]}`,
    `Rubrik: ${RUBRIK[stufe]}`,
    `Vergib "schwierigkeit_score" als Zahl zwischen ${lo} und ${hi}.`,
    "",
    "Jedes Objekt hat exakt diese Felder:",
    "{",
    '  "typ": "single_choice",',
    '  "frage": "…",',
    '  "antwortmoeglichkeiten": [',
    '    {"id":"a","text":"…","korrekt":false},',
    '    {"id":"b","text":"…","korrekt":true},',
    '    {"id":"c","text":"…","korrekt":false},',
    '    {"id":"d","text":"…","korrekt":false}',
    "  ],",
    '  "loesung": ["b"],',
    '  "erklaerung": "kurze Begründung, warum die Lösung richtig ist",',
    `  "schwierigkeit_score": ${lo}`,
    "}",
    "",
    "- Genau eine richtige Antwort, drei plausible Distraktoren (typische Fehler).",
    `- Alle ${anzahl} Fragen inhaltlich verschieden, keine Dubletten.`,
    "- Antworte NUR mit dem JSON-Array, ohne weiteren Text.",
  ].join("\n");
}

// ─── DB-Insert ────────────────────────────────────────────────────────────────

async function insertiere(slot: Slot, stufe: Schwierigkeit, items: GeneriertesItem[]): Promise<number> {
  const [lo, hi] = SCORE_BANDS[stufe];
  let count = 0;
  for (const item of items) {
    const score = Math.min(hi, Math.max(lo, item.schwierigkeit_score));
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (prisma as any).frage.create({
        data: {
          schulart:          "allgemein",
          bundesland:        "allgemein",
          jahrgangsstufe:    slot.jahrgangsstufe,
          fach:              slot.fach,
          thema:             slot.thema,
          unterthema:        null,
          schwierigkeit:     stufe,
          schwierigkeitScore: score,
          typ:               item.typ,
          frage:             item.frage,
          antworten:         item.antwortmoeglichkeiten,
          loesung:           item.loesung,
          erklaerung:        item.erklaerung,
          modell:            MODELL_PRO_FACH[slot.fach] ?? MODELL_STANDARD,
          quelle:            "ki-generiert",
        },
      });
      count++;
    } catch {
      // Duplikat oder Constraints-Fehler — überspringen
    }
  }
  return count;
}

// ─── Verarbeitungsschleife ────────────────────────────────────────────────────

let abbruch = false;

async function verarbeiteSlot(slot: Slot): Promise<void> {
  const modell = MODELL_PRO_FACH[slot.fach] ?? MODELL_STANDARD;
  const label  = `${slot.fach}/Kl${slot.jahrgangsstufe}/${slot.thema}`;

  for (const stufe of SCHWIERIGKEITSSTUFEN) {
    if (abbruch) return;

    // Bereits vorhandene Fragen zählen
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const vorhanden = await (prisma as any).frage.count({
      where: {
        fach:           slot.fach,
        jahrgangsstufe: slot.jahrgangsstufe,
        thema:          slot.thema,
        schwierigkeit:  stufe,
      },
    }) as number;

    if (vorhanden >= PRO_SLOT) {
      console.log(`  ✓ ${label}/S${stufe}: ${vorhanden} vorhanden — übersprungen`);
      continue;
    }

    const noch = PRO_SLOT - vorhanden;
    const runden = Math.ceil(noch / BATCH_GROESSE);
    let erzeugt = 0;

    for (let r = 0; r < runden && erzeugt < noch && !abbruch; r += MAX_PARALLEL) {
      const batch = Array.from({ length: Math.min(MAX_PARALLEL, runden - r) }, () =>
        mitBackoff(
          () => frageModellAb(modell, SYSTEM_PROMPT, baueUserPrompt(slot, stufe, BATCH_GROESSE)),
          MAX_RETRIES,
        ).catch((e: unknown) => {
          console.error(`  ! ${label}/S${stufe}: ${(e as Error).message}`);
          return [];
        }),
      );

      const ergebnisse = await Promise.all(batch);
      for (const items of ergebnisse) {
        if (!items.length) continue;
        const neu = await insertiere(slot, stufe, items.slice(0, noch - erzeugt));
        erzeugt += neu;
      }
    }

    console.log(`  ✓ ${label}/S${stufe}: +${erzeugt} generiert (gesamt ${vorhanden + erzeugt})`);
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("Fehler: ANTHROPIC_API_KEY ist nicht gesetzt.");
    console.error("Bitte in .env eintragen: ANTHROPIC_API_KEY=sk-ant-...");
    process.exit(1);
  }

  const slots = BOSS_CURRICULUM.filter(
    (s) =>
      (NUR_FACH  === null || s.fach           === NUR_FACH)  &&
      (NUR_STUFE === null || s.jahrgangsstufe === NUR_STUFE),
  );

  console.log(`Boss-Fragen-Seeder`);
  console.log(`Slots: ${slots.length} | Ziel: ${PRO_SLOT} Fragen/Slot/Schwierigkeit`);
  console.log(`Gesamt max: ${slots.length * 5 * PRO_SLOT} Fragen\n`);

  process.on("SIGINT", () => {
    console.log("\nAbbruch angefordert — aktueller Stand ist gesichert.");
    abbruch = true;
  });

  for (const slot of slots) {
    if (abbruch) break;
    console.log(`\n→ ${slot.fach}/Kl${slot.jahrgangsstufe}: ${slot.thema}`);
    await verarbeiteSlot(slot);
  }

  await prisma.$disconnect();
  console.log("\nFertig.");
}

main().catch(async (e: unknown) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
