/* Copyright 2026 Elian Schock, Jonas Schwenk */
/**
 * Baut das Offline-Übungs-Bundle für die Flutter-App aus der MEGA-Fragenbank
 * (scripts/questions/mega/data/<fach>-klasse<N>.json) → flutter_app/assets/exercises.json.
 *
 * Gruppiert pro (Fach, Klasse, Topic) zu einem ExerciseTopic; jede Frage als
 * Multiple-Choice (options = JSON-Array-String, correct = Index als String).
 *
 * Ausführen (vom Repo-Root):  node scripts/build-offline-bundle.mjs
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "questions", "mega", "data");
const OUT_DIR = join(__dirname, "..", "flutter_app", "assets", "exercises");

function slugify(s) {
  return s.toLowerCase()
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
}

const files = readdirSync(DATA_DIR).filter((f) => f.endsWith(".json"));
const topicsMap = new Map(); // key: subject|grade|topic → topic object
let questionCount = 0;

for (const file of files) {
  const m = file.match(/^(.+)-klasse(\d+)\.json$/);
  if (!m) continue;
  // Batch-Suffix entfernen: biologie2 → biologie, mathematik5 → mathematik
  const subject = m[1].replace(/\d+$/, "");
  const grade = parseInt(m[2], 10);
  let arr;
  try {
    arr = JSON.parse(readFileSync(join(DATA_DIR, file), "utf8"));
  } catch {
    continue;
  }
  if (!Array.isArray(arr)) continue;

  for (const q of arr) {
    if (!q || typeof q.question !== "string" || !Array.isArray(q.options)) continue;
    const topicTitle = String(q.topic ?? "Allgemein");
    const key = `${subject}|${grade}|${topicTitle}`;
    let topic = topicsMap.get(key);
    if (!topic) {
      topic = {
        id: `mega-${subject}-${grade}-${slugify(topicTitle)}`,
        subject,
        grade,
        title: topicTitle,
        description: null,
        order: topicsMap.size,
        questions: [],
      };
      topicsMap.set(key, topic);
    }
    topic.questions.push({
      id: `q-${subject}-${grade}-${topic.questions.length}-${slugify(topicTitle).slice(0, 12)}`,
      type: "mc",
      question: q.question,
      options: JSON.stringify(q.options.map((o) => String(o))),
      correct: String(q.correct ?? 0),
      explanation: q.explanation ? String(q.explanation) : null,
      order: topic.questions.length,
    });
    questionCount++;
  }
}

const topics = [...topicsMap.values()].sort(
  (a, b) => a.subject.localeCompare(b.subject) || a.grade - b.grade || a.title.localeCompare(b.title),
);

// Pro Fach eine Datei + eine kleine index.json → App lädt nur das Nötige.
rmSync(OUT_DIR, { recursive: true, force: true });
mkdirSync(OUT_DIR, { recursive: true });

const bySubject = new Map();
for (const t of topics) {
  if (!bySubject.has(t.subject)) bySubject.set(t.subject, []);
  bySubject.get(t.subject).push(t);
}

const index = { version: 1, generatedAt: "2026-07-16T00:00:00.000Z", subjects: [] };
for (const [subject, subjTopics] of bySubject) {
  writeFileSync(join(OUT_DIR, `${subject}.json`), JSON.stringify({ subject, topics: subjTopics }));
  const grades = [...new Set(subjTopics.map((t) => t.grade))].sort((a, b) => a - b);
  index.subjects.push({
    key: subject,
    grades,
    topicCount: subjTopics.length,
    questionCount: subjTopics.reduce((s, t) => s + t.questions.length, 0),
  });
}
index.subjects.sort((a, b) => a.key.localeCompare(b.key));
writeFileSync(join(OUT_DIR, "index.json"), JSON.stringify(index));

console.log(`✓ ${OUT_DIR}/`);
console.log(`  Fächer: ${index.subjects.length} (je eine Datei + index.json)`);
console.log(`  Themen: ${topics.length}`);
console.log(`  Fragen: ${questionCount}`);
