/* Copyright 2026 Elian Schock, Jonas Schwenk */
/**
 * QA-Report über die gesamte MEGA-Fragenbank (data/*.json).
 * Prüft pro Datei:
 *  (a) valides JSON-Array
 *  (b) jede Frage hat topic/question/options[4]/correct 0-3/explanation
 *  (c) alle 4 Optionen paarweise verschieden
 *  (d) options[correct] kommt nicht doppelt vor (folgt aus c, wird separat geprüft)
 *  (e) Frage-Text nicht leer / nicht > 500 Zeichen
 *  (f) keine exakten Duplikat-Fragen (question-Text) innerhalb einer Datei
 * Ausgabe: Tabelle pro Datei + Gesamtsumme. Exit-Code 1 bei Fehlern.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const DATA_DIR = join(dirname(fileURLToPath(import.meta.url)), "data");

const files = readdirSync(DATA_DIR).filter((f) => f.endsWith(".json")).sort();
let totalQuestions = 0;
let totalErrors = 0;
const rows = [];

for (const file of files) {
  const errors = [];
  let count = 0;
  let data;
  try {
    data = JSON.parse(readFileSync(join(DATA_DIR, file), "utf8"));
  } catch (e) {
    errors.push(`(a) kein valides JSON: ${e.message}`);
  }
  if (data !== undefined && !Array.isArray(data)) {
    errors.push("(a) JSON ist kein Array");
    data = undefined;
  }
  if (Array.isArray(data)) {
    count = data.length;
    const seen = new Map();
    data.forEach((q, i) => {
      const where = `#${i}`;
      if (!q || typeof q !== "object") { errors.push(`${where}: (b) kein Objekt`); return; }
      if (typeof q.topic !== "string" || !q.topic.trim()) errors.push(`${where}: (b) topic fehlt/leer`);
      if (typeof q.question !== "string") errors.push(`${where}: (b) question fehlt`);
      else {
        if (!q.question.trim()) errors.push(`${where}: (e) question leer`);
        if (q.question.length > 500) errors.push(`${where}: (e) question > 500 Zeichen (${q.question.length})`);
      }
      if (!Array.isArray(q.options) || q.options.length !== 4 || q.options.some((o) => typeof o !== "string" || !o.trim())) {
        errors.push(`${where}: (b) options ungültig (erwartet 4 nicht-leere Strings)`);
      } else {
        if (new Set(q.options).size !== 4) errors.push(`${where}: (c) Optionen nicht paarweise verschieden: ${JSON.stringify(q.options)}`);
        if (Number.isInteger(q.correct) && q.correct >= 0 && q.correct <= 3) {
          const c = q.options[q.correct];
          if (q.options.filter((o) => o === c).length > 1) errors.push(`${where}: (d) korrekte Option kommt mehrfach vor`);
        }
      }
      if (!Number.isInteger(q.correct) || q.correct < 0 || q.correct > 3) errors.push(`${where}: (b) correct nicht 0-3 (${q.correct})`);
      if (typeof q.explanation !== "string" || !q.explanation.trim()) errors.push(`${where}: (b) explanation fehlt/leer`);
      if (typeof q.question === "string") {
        if (seen.has(q.question)) errors.push(`${where}: (f) Duplikat von #${seen.get(q.question)}: "${q.question.slice(0, 60)}"`);
        else seen.set(q.question, i);
      }
    });
  }
  totalQuestions += count;
  totalErrors += errors.length;
  rows.push({ file, count, errors });
}

const w = Math.max(...rows.map((r) => r.file.length), 5);
console.log(`${"Datei".padEnd(w)}  Fragen  Fehler`);
console.log("-".repeat(w + 16));
for (const r of rows) {
  console.log(`${r.file.padEnd(w)}  ${String(r.count).padStart(6)}  ${String(r.errors.length).padStart(6)}`);
  for (const e of r.errors) console.log(`    ! ${e}`);
}
console.log("-".repeat(w + 16));
console.log(`${"GESAMT".padEnd(w)}  ${String(totalQuestions).padStart(6)}  ${String(totalErrors).padStart(6)}  (${rows.length} Dateien)`);
process.exit(totalErrors ? 1 : 0);
