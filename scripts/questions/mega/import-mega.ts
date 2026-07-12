/* Copyright 2026 Elian Schock, Jonas Schwenk */
/**
 * Importiert die MEGA-Fragenbank (scripts/questions/mega/data/*.json)
 * in die Datenbank: pro (Fach, Klasse, Topic) ein ExerciseTopic,
 * jede Frage als ExerciseQuestion (type "mc", correct = 0-basierter Index).
 *
 * Idempotent über deterministische IDs:
 *   Topic:  mega-<fach>-<klasse>-<slug>
 *   Frage:  mega-q-<hash aus fach|klasse|fragetext>
 *
 * Vorher generieren:
 *   node scripts/questions/mega/generate.mjs
 * Dann importieren (vom Repo-Root):
 *   npx tsx scripts/questions/mega/import-mega.ts
 * (im Container: docker compose exec app npx tsx scripts/questions/mega/import-mega.ts)
 */
import { PrismaClient } from "@prisma/client";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const prisma = new PrismaClient();

const DATA_DIR = join(__dirname, "data");

type MegaQuestion = {
  topic: string;
  question: string;
  options: string[];
  correct: number;
  explanation: string;
};

const SUBJECT_TITLES: Record<string, string> = {
  mathematik: "Mathematik",
  englisch: "Englisch",
  physik: "Physik",
  chemie: "Chemie",
  deutsch: "Deutsch",
  biologie: "Biologie",
  geschichte: "Geschichte",
  erdkunde: "Erdkunde",
};

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

/** FNV-1a 32-Bit-Hash als Hex — deterministisch, keine Abhängigkeiten. */
function fnv1a(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  // 2. Runde mit Salt gegen Kollisionen bei sehr ähnlichen Texten
  let h2 = 0x811c9dc5;
  for (let i = s.length - 1; i >= 0; i--) {
    h2 ^= s.charCodeAt(i) + 7;
    h2 = Math.imul(h2, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0") + h2.toString(16).padStart(8, "0");
}

async function main() {
  const files = readdirSync(DATA_DIR).filter((f) => f.endsWith(".json")).sort();
  if (files.length === 0) {
    console.error("✖ Keine JSON-Dateien in scripts/questions/mega/data — erst generate.mjs ausführen.");
    process.exit(1);
  }

  let topicCount = 0;
  let questionCount = 0;

  for (const file of files) {
    // Fach ohne Ziffern-Suffix ableiten: "mathematik5-klasse7.json" → fach "mathematik"
    const m = /^([a-zäöü]+?)\d*-klasse(\d+)\.json$/.exec(file);
    if (!m) { console.warn(`  Überspringe ${file} (unerwarteter Dateiname)`); continue; }
    const fach = m[1];
    const klasse = parseInt(m[2], 10);
    const questions: MegaQuestion[] = JSON.parse(readFileSync(join(DATA_DIR, file), "utf8"));

    // Nach Topic gruppieren
    const byTopic = new Map<string, MegaQuestion[]>();
    for (const q of questions) {
      const list = byTopic.get(q.topic) ?? [];
      list.push(q);
      byTopic.set(q.topic, list);
    }

    for (const [topic, qs] of byTopic) {
      const topicId = `mega-${fach}-${klasse}-${slugify(topic)}`;
      await prisma.exerciseTopic.upsert({
        where: { id: topicId },
        update: { title: topic },
        create: {
          id: topicId,
          subject: fach,
          grade: klasse,
          title: topic,
          description: `${SUBJECT_TITLES[fach] ?? fach} Klasse ${klasse}: ${topic} — automatisch generierter Übungspool.`,
        },
      });
      topicCount++;

      // Fragen: createMany mit skipDuplicates, wenn der Provider es kann (Postgres);
      // SQLite kennt skipDuplicates nicht → dort einzeln upserten.
      const rows = qs.map((q, i) => ({
        id: `mega-q-${fnv1a(`${fach}|${klasse}|${q.question}`)}`,
        topicId,
        type: "mc",
        question: q.question,
        options: JSON.stringify(q.options),
        correct: String(q.correct),
        explanation: q.explanation,
        order: i,
      }));

      try {
        const res = await prisma.exerciseQuestion.createMany({ data: rows, skipDuplicates: true });
        questionCount += res.count;
      } catch {
        // Fallback (z.B. SQLite ohne skipDuplicates): einzeln upserten
        for (const row of rows) {
          await prisma.exerciseQuestion.upsert({
            where: { id: row.id },
            update: {},
            create: row,
          });
          questionCount++;
        }
      }
    }
    console.log(`  ✓ ${file}: ${questions.length} Fragen in ${byTopic.size} Topics`);
  }

  console.log(`\n✓ Import fertig: ${topicCount} Topics bearbeitet, ${questionCount} Fragen neu angelegt (bereits vorhandene übersprungen).`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
