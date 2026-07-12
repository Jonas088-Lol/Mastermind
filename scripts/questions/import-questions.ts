/* Copyright 2026 Elian Schock, Jonas Schwenk */
/**
 * Importiert die generierten JSONL-Shards in die Postgres-DB via Prisma.
 *
 * Voraussetzung: prisma generate wurde ausgeführt und das Modell `Frage`
 * existiert in schema.prisma / schema.postgres.prisma.
 *
 * Start:
 *   DATABASE_URL=postgresql://... npx tsx scripts/questions/import-questions.ts [ausgabeOrdner]
 *
 * Standard-Ausgabeordner: output/questions
 */

import * as fs from "node:fs";
import * as path from "node:path";
import * as process from "node:process";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const QUELLE = process.argv[2] ?? process.env.OUT ?? "output/questions";
const BATCH = 1000;

function* jsonlDateien(ordner: string): Generator<string> {
  for (const eintrag of fs.readdirSync(ordner, { withFileTypes: true })) {
    const p = path.join(ordner, eintrag.name);
    if (eintrag.isDirectory()) yield* jsonlDateien(p);
    else if (eintrag.name.endsWith(".jsonl")) yield p;
  }
}

async function main(): Promise<void> {
  let gesamt = 0;
  let puffer: object[] = [];

  const flush = async (): Promise<void> => {
    if (puffer.length === 0) return;
    // @ts-expect-error — Prisma-generierter Client kennt `frage` erst nach prisma generate
    const r = await prisma.frage.createMany({ data: puffer, skipDuplicates: true });
    gesamt += r.count;
    console.log(`  importiert: ${gesamt.toLocaleString("de-DE")}`);
    puffer = [];
  };

  for (const datei of jsonlDateien(QUELLE)) {
    for (const zeile of fs.readFileSync(datei, "utf8").split("\n")) {
      if (!zeile.trim()) continue;
      const f = JSON.parse(zeile) as Record<string, unknown>;
      puffer.push({
        schulart:           f.schulart,
        bundesland:         f.bundesland,
        jahrgangsstufe:     f.jahrgangsstufe,
        fach:               f.fach,
        thema:              f.thema,
        unterthema:         f.unterthema ?? null,
        schwierigkeit:      f.schwierigkeit,
        schwierigkeitScore: f.schwierigkeit_score,
        typ:                f.typ,
        frage:              f.frage,
        antworten:          f.antwortmoeglichkeiten,  // Postgres: Json
        loesung:            f.loesung,                // Postgres: String[]
        erklaerung:         f.erklaerung,
        modell:             f.modell ?? "ki-generiert",
        quelle:             "ki-generiert",
      });
      if (puffer.length >= BATCH) await flush();
    }
  }

  await flush();
  await prisma.$disconnect();
  console.log(`Fertig: ${gesamt.toLocaleString("de-DE")} Fragen importiert.`);
}

main().catch(async (e: unknown) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
