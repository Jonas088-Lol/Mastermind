/* Copyright 2026 Elian Schock, Jonas Schwenk */
/**
 * Fragen-Generator für Mastermind.
 *
 * Erzeugt Multiple-Choice-Fragen pro Zelle (Bundesland × Schulart × Stufe × Fach
 * × Thema × Schwierigkeit) über die Anthropic-API und schreibt sie als JSONL-Shards.
 *
 * Eigenschaften:
 *  - parallele Batches pro Runde (maxParallel)
 *  - Dublettenerkennung pro Zelle
 *  - Validierung (kaputte Items werden verworfen)
 *  - resümierbar: vorhandene Shards werden gezählt, fertige Zellen übersprungen
 *  - Sättigungserkennung: liefert das Modell nur noch Dubletten, wird die Zelle
 *    sauber beendet (nicht jedes enge Thema gibt 5000 sinnvolle Fragen her)
 *  - Token-/Kostentracking
 *
 * Start:
 *   ANTHROPIC_API_KEY=sk-... npx tsx scripts/questions/generate-questions.ts
 *
 * Umgebungsvariablen:
 *   ZIEL         – Fragen pro (Thema × Schwierigkeitsstufe), default: 200
 *   GEN_MODEL    – Standard-Modell, default: claude-haiku-4-5-20251001
 *   OUT          – Ausgabeordner, default: output/questions
 *   PRICE_IN     – Input-Preis USD/1M Token (Schätzung)
 *   PRICE_OUT    – Output-Preis USD/1M Token (Schätzung)
 */

import * as fs from "node:fs";
import * as path from "node:path";
import * as process from "node:process";

import { ALLE_CURRICULA } from "./curriculum";
import {
  Frage,
  GeneriertesItem,
  SCHWIERIGKEITSSTUFEN,
  SCHWIERIGKEIT_LABEL,
  SCORE_BANDS,
  Schwierigkeit,
  istGueltigesItem,
  normalisiereFrage,
  parseGeneriertesItem,
} from "./schema";

// ---------------------------------------------------------------------------
// Konfiguration
// ---------------------------------------------------------------------------

const CONFIG = {
  // Leere Filter = alles aus dem Curriculum. Zum gezielten Testen befüllen.
  bundeslaender: [] as string[],
  schularten:    [] as string[],
  faecher:       [] as string[],
  jahrgangsstufen: [] as number[],

  // Ziel PRO (Thema × Schwierigkeitsstufe).
  // 200  => 1.000 Fragen pro Thema (5 Stufen) – sinnvoller Startwert
  // 1000 => 5.000 Fragen pro Thema (oberes Ende)
  zielProThemaUndStufe: Number(process.env.ZIEL ?? 200),

  batchGroesse:  20, // Fragen pro API-Aufruf (kleiner = robusteres JSON)
  maxParallel:    5, // gleichzeitige API-Aufrufe pro Runde
  maxTokens:   6000,
  maxRetries:     5,
  maxLeereRunden: 8, // danach gilt eine Zelle als gesättigt

  // Modell-IDs — aktuelle Claude-Modelle:
  //   Haiku  (schnell/günstig): claude-haiku-4-5-20251001
  //   Sonnet (stark/sprachlich): claude-sonnet-4-6
  standardModell: process.env.GEN_MODEL ?? "claude-haiku-4-5-20251001",
  modellProFach: {
    deutsch: "claude-sonnet-4-6",
  } as Record<string, string>,

  ausgabeOrdner: process.env.OUT ?? "output/questions",

  // NUR zur groben Schätzung – aktuelle Preise selbst eintragen (USD / 1 Mio. Token).
  preisInputPro1M:  Number(process.env.PRICE_IN  ?? 1.0),
  preisOutputPro1M: Number(process.env.PRICE_OUT ?? 5.0),
};

const RUBRIK: Record<Schwierigkeit, string> = {
  1: "Grundwissen, direktes Erinnern/Erkennen, ein Rechen-/Denkschritt.",
  2: "Einfache Anwendung einer bekannten Regel, ein bis zwei Schritte.",
  3: "Sichere Anwendung bei Standardaufgaben, mehrere Schritte.",
  4: "Übertragung auf neue Kontexte, Mehrschritt, einfache Textaufgaben.",
  5: "Komplexe Problemlösung, Kombination mehrerer Konzepte, anspruchsvolle Textaufgaben.",
};

// ---------------------------------------------------------------------------
// Zellen
// ---------------------------------------------------------------------------

interface Zelle {
  bundesland: string;
  schulart: string;
  jahrgangsstufe: number;
  fach: string;
  thema: string;
  unterthema: string | null;
  schwierigkeit: Schwierigkeit;
  ziel: number;
}

function passtFilter(wert: string | number, filter: Array<string | number>): boolean {
  return filter.length === 0 || filter.includes(wert);
}

function baueZellen(): Zelle[] {
  const zellen: Zelle[] = [];
  for (const curr of ALLE_CURRICULA) {
    if (!passtFilter(curr.bundesland, CONFIG.bundeslaender)) continue;
    for (const sa of curr.schularten) {
      if (!passtFilter(sa.schulart, CONFIG.schularten)) continue;
      for (const jg of sa.jahrgaenge) {
        if (!passtFilter(jg.jahrgangsstufe, CONFIG.jahrgangsstufen)) continue;
        for (const fa of jg.faecher) {
          if (!passtFilter(fa.fach, CONFIG.faecher)) continue;
          for (const th of fa.themen) {
            const unter = th.unterthemen?.length ? th.unterthemen.join(", ") : null;
            for (const stufe of SCHWIERIGKEITSSTUFEN) {
              zellen.push({
                bundesland: curr.bundesland,
                schulart: sa.schulart,
                jahrgangsstufe: jg.jahrgangsstufe,
                fach: fa.fach,
                thema: th.thema,
                unterthema: unter,
                schwierigkeit: stufe,
                ziel: CONFIG.zielProThemaUndStufe,
              });
            }
          }
        }
      }
    }
  }
  return zellen;
}

function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function pfadFuerZelle(z: Zelle): string {
  return path.join(
    CONFIG.ausgabeOrdner,
    slug(z.bundesland),
    slug(z.schulart),
    `klasse-${z.jahrgangsstufe}`,
    slug(z.fach),
    `${slug(z.thema)}__s${z.schwierigkeit}.jsonl`,
  );
}

function labelZelle(z: Zelle): string {
  return `${z.schulart}/Kl${z.jahrgangsstufe}/${z.fach}/${z.thema}/S${z.schwierigkeit}`;
}

function waehleModell(fach: string): string {
  return CONFIG.modellProFach[fach] ?? CONFIG.standardModell;
}

// ---------------------------------------------------------------------------
// Prompt
// ---------------------------------------------------------------------------

function baueSystemPrompt(): string {
  return [
    "Du bist eine erfahrene deutsche Lehrkraft und professionelle Item-Autorin für Lernstandserhebungen.",
    "Du erstellst Multiple-Choice-Fragen, die exakt zum deutschen Lehrplan der angegebenen Schulart und Jahrgangsstufe passen.",
    "Regeln:",
    "- Antworte AUSSCHLIESSLICH mit einem gültigen JSON-Array. Kein Fließtext, kein Markdown, keine Code-Zäune.",
    "- Jede Frage ist eigenständig und eindeutig lösbar.",
    "- Genau eine richtige Antwort und drei plausible Distraktoren, die typische Schülerfehler abbilden – keine absurden Optionen.",
    "- Sprache: Deutsch, altersgerecht für die angegebene Stufe.",
    "- Keine inhaltlichen Dubletten innerhalb des Arrays.",
  ].join("\n");
}

function baueUserPrompt(z: Zelle, anzahl: number): string {
  const [lo, hi] = SCORE_BANDS[z.schwierigkeit];
  const unter = z.unterthema ? ` (Schwerpunkte: ${z.unterthema})` : "";
  return [
    `Erstelle ${anzahl} Multiple-Choice-Fragen.`,
    "",
    `Schulart: ${z.schulart}`,
    `Bundesland: ${z.bundesland}`,
    `Jahrgangsstufe: ${z.jahrgangsstufe}`,
    `Fach: ${z.fach}`,
    `Thema: ${z.thema}${unter}`,
    `Schwierigkeitsstufe: ${z.schwierigkeit}/5 – ${SCHWIERIGKEIT_LABEL[z.schwierigkeit]}`,
    `Rubrik: ${RUBRIK[z.schwierigkeit]}`,
    `Vergib "schwierigkeit_score" als Zahl zwischen ${lo} und ${hi} (leichteste Frage zuerst).`,
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
    "Vorgaben:",
    "- Genau eine richtige Antwort, drei plausible Distraktoren (typische Fehler).",
    `- Alle ${anzahl} Fragen inhaltlich verschieden, keine Dubletten.`,
    "- Innerhalb des Arrays nach schwierigkeit_score aufsteigend sortieren.",
    "- Antworte NUR mit dem JSON-Array, ohne weiteren Text.",
  ].join("\n");
}

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------

interface ApiAntwort {
  items: GeneriertesItem[];
  inputTokens: number;
  outputTokens: number;
}

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
  try {
    parsed = JSON.parse(text);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  const ergebnis: GeneriertesItem[] = [];
  for (const eintrag of parsed) {
    const item = parseGeneriertesItem(eintrag);
    if (item && istGueltigesItem(item)) ergebnis.push(item);
  }
  return ergebnis;
}

async function frageModellAb(
  modell: string,
  system: string,
  prompt: string,
  maxTokens: number,
): Promise<ApiAntwort> {
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
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    const fehlertext = await res.text();
    throw new Error(`API ${res.status}: ${fehlertext.slice(0, 300)}`);
  }

  const data = (await res.json()) as MessagesResponse;
  const roh = data.content
    .filter((b) => b.type === "text")
    .map((b) => b.text ?? "")
    .join("");

  return {
    items: parseItems(roh),
    inputTokens: data.usage?.input_tokens ?? 0,
    outputTokens: data.usage?.output_tokens ?? 0,
  };
}

// ---------------------------------------------------------------------------
// Verarbeitung
// ---------------------------------------------------------------------------

interface Statistik {
  inputTokens: number;
  outputTokens: number;
  fragenGesamt: number;
}

let abbruchAngefordert = false;

function vollstaendigeFrage(z: Zelle, item: GeneriertesItem, modell: string): Frage {
  const [lo, hi] = SCORE_BANDS[z.schwierigkeit];
  const score = Math.min(hi, Math.max(lo, item.schwierigkeit_score));
  return {
    ...item,
    schwierigkeit_score: score,
    schulart: z.schulart,
    bundesland: z.bundesland,
    jahrgangsstufe: z.jahrgangsstufe,
    fach: z.fach,
    thema: z.thema,
    unterthema: z.unterthema,
    schwierigkeit: z.schwierigkeit,
    modell,
    quelle: "ki-generiert",
    generiert_am: new Date().toISOString(),
  };
}

function ladeVorhandene(datei: string, gesehen: Set<string>): number {
  if (!fs.existsSync(datei)) return 0;
  let anzahl = 0;
  for (const zeile of fs.readFileSync(datei, "utf8").split("\n")) {
    if (!zeile.trim()) continue;
    anzahl++;
    try {
      const f = JSON.parse(zeile) as { frage?: string };
      if (f.frage) gesehen.add(normalisiereFrage(f.frage));
    } catch {
      /* defekte Zeile ignorieren */
    }
  }
  return anzahl;
}

async function verarbeiteZelle(z: Zelle, stats: Statistik): Promise<void> {
  const datei = pfadFuerZelle(z);
  fs.mkdirSync(path.dirname(datei), { recursive: true });

  const gesehen = new Set<string>();
  const vorhanden = ladeVorhandene(datei, gesehen);
  if (vorhanden >= z.ziel) {
    log(`✓ ${labelZelle(z)} bereits ${vorhanden}/${z.ziel}`);
    return;
  }

  const modell = waehleModell(z.fach);
  const stream = fs.createWriteStream(datei, { flags: "a" });
  let erzeugt = vorhanden;
  let leereRunden = 0;

  try {
    while (erzeugt < z.ziel && leereRunden < CONFIG.maxLeereRunden && !abbruchAngefordert) {
      const verbleibend = z.ziel - erzeugt;
      const runden = Math.min(CONFIG.maxParallel, Math.ceil(verbleibend / CONFIG.batchGroesse));

      const anfragen = Array.from({ length: runden }, () =>
        mitBackoff(
          () => frageModellAb(modell, baueSystemPrompt(), baueUserPrompt(z, CONFIG.batchGroesse), CONFIG.maxTokens),
          CONFIG.maxRetries,
        ).catch((e: unknown) => {
          log(`  ! ${labelZelle(z)}: ${(e as Error).message}`);
          return null;
        }),
      );

      const ergebnisse = await Promise.all(anfragen);
      let neue = 0;

      for (const r of ergebnisse) {
        if (!r) continue;
        stats.inputTokens += r.inputTokens;
        stats.outputTokens += r.outputTokens;
        for (const item of r.items) {
          if (erzeugt >= z.ziel) break;
          const key = normalisiereFrage(item.frage);
          if (gesehen.has(key)) continue;
          gesehen.add(key);
          stream.write(JSON.stringify(vollstaendigeFrage(z, item, modell)) + "\n");
          erzeugt++;
          neue++;
        }
      }

      if (neue === 0) {
        leereRunden++;
      } else {
        leereRunden = 0;
        stats.fragenGesamt += neue;
        log(`  ${labelZelle(z)}: ${erzeugt}/${z.ziel} (+${neue})`);
      }
    }
  } finally {
    await new Promise<void>((resolve) => stream.end(resolve));
  }

  if (erzeugt < z.ziel && leereRunden >= CONFIG.maxLeereRunden) {
    log(`~ ${labelZelle(z)} gesättigt bei ${erzeugt}/${z.ziel} (Modell liefert nur noch Dubletten)`);
  }
}

// ---------------------------------------------------------------------------
// Ausgabe / Kosten
// ---------------------------------------------------------------------------

function log(msg: string): void {
  console.log(msg);
}

function druckeKosten(stats: Statistik): void {
  const inM = stats.inputTokens / 1_000_000;
  const outM = stats.outputTokens / 1_000_000;
  const kosten = inM * CONFIG.preisInputPro1M + outM * CONFIG.preisOutputPro1M;
  log(
    `  Σ ${stats.fragenGesamt.toLocaleString("de-DE")} Fragen | ` +
      `${stats.inputTokens.toLocaleString("de-DE")} in / ${stats.outputTokens.toLocaleString("de-DE")} out Tokens | ` +
      `~$${kosten.toFixed(2)} (Beispielpreise – aktuelle Preise selbst eintragen)`,
  );
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const zellen = baueZellen();
  const gesamtZiel = zellen.reduce((s, z) => s + z.ziel, 0);

  log(`Zellen geplant: ${zellen.length.toLocaleString("de-DE")}`);
  log(`Maximale Zielmenge: ${gesamtZiel.toLocaleString("de-DE")} Fragen`);
  log(`Ausgabe: ${path.resolve(CONFIG.ausgabeOrdner)}\n`);

  process.on("SIGINT", () => {
    log("\nAbbruch angefordert – aktueller Stand ist gesichert. Fortsetzen per Neustart.");
    abbruchAngefordert = true;
  });

  const stats: Statistik = { inputTokens: 0, outputTokens: 0, fragenGesamt: 0 };

  for (const z of zellen) {
    if (abbruchAngefordert) break;
    await verarbeiteZelle(z, stats);
    druckeKosten(stats);
  }

  log("\nFertig.");
  druckeKosten(stats);
}

main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});
