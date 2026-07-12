/* Copyright 2026 Elian Schock, Jonas Schwenk */
/**
 * curriculum-seed.ts
 * Seeds: Bundesland, Landkreis (Bayern full + stubs), CurriculumSubject,
 *        Curriculum (Bayern Gymnasium grades 5–12 complete), TreeNode + TreeNodePrereq.
 *
 * HOW TO ADD A NEW BUNDESLAND:
 *   1. Add to BUNDESLAENDER array (code + name).
 *   2. Add Landkreise to LANDKREISE array (id pattern: "{code}-LK-{slug}").
 *   3. Add Curriculum entries to BY_GYMNASIUM or create a new block per Schulart.
 *   4. Run: npx ts-node --project tsconfig.seed.json prisma/seed/curriculum-seed.ts
 *
 * No code changes needed — purely data additions.
 */

import { PrismaClient, Schulart, TreeQuestType } from "@prisma/client";

const prisma = new PrismaClient();

// ── 1. Bundesländer ──────────────────────────────────────────────────────────

const BUNDESLAENDER = [
  { code: "BY", name: "Bayern" },
  { code: "BW", name: "Baden-Württemberg" },
  { code: "BE", name: "Berlin" },
  { code: "BB", name: "Brandenburg" },
  { code: "HB", name: "Bremen" },
  { code: "HH", name: "Hamburg" },
  { code: "HE", name: "Hessen" },
  { code: "MV", name: "Mecklenburg-Vorpommern" },
  { code: "NI", name: "Niedersachsen" },
  { code: "NW", name: "Nordrhein-Westfalen" },
  { code: "RP", name: "Rheinland-Pfalz" },
  { code: "SL", name: "Saarland" },
  { code: "SN", name: "Sachsen" },
  { code: "ST", name: "Sachsen-Anhalt" },
  { code: "SH", name: "Schleswig-Holstein" },
  { code: "TH", name: "Thüringen" },
];

// ── 2. Landkreise ─────────────────────────────────────────────────────────────
// Bayern: alle 25 kreisfreien Städte + 71 Landkreise = 96 Verwaltungseinheiten
// Übrige Länder: je 1 Stub-Eintrag (Landeshauptstadt), der Seeding-Pfad ist klar.

const LANDKREISE = [
  // ── Bayern (vollständig) ──────────────────────────────────────────────────
  // Kreisfreie Städte
  { id: "BY-SK-AUG", name: "Augsburg (Stadt)",          bundeslandCode: "BY" },
  { id: "BY-SK-BAM", name: "Bamberg (Stadt)",            bundeslandCode: "BY" },
  { id: "BY-SK-BAY", name: "Bayreuth (Stadt)",           bundeslandCode: "BY" },
  { id: "BY-SK-COB", name: "Coburg (Stadt)",             bundeslandCode: "BY" },
  { id: "BY-SK-ERL", name: "Erlangen",                   bundeslandCode: "BY" },
  { id: "BY-SK-FUE", name: "Fürth (Stadt)",              bundeslandCode: "BY" },
  { id: "BY-SK-HOF", name: "Hof (Stadt)",                bundeslandCode: "BY" },
  { id: "BY-SK-ING", name: "Ingolstadt",                 bundeslandCode: "BY" },
  { id: "BY-SK-KAU", name: "Kaufbeuren",                 bundeslandCode: "BY" },
  { id: "BY-SK-KEM", name: "Kempten (Allgäu)",           bundeslandCode: "BY" },
  { id: "BY-SK-LAN", name: "Landshut (Stadt)",           bundeslandCode: "BY" },
  { id: "BY-SK-MEM", name: "Memmingen",                  bundeslandCode: "BY" },
  { id: "BY-SK-MUC", name: "München (Stadt)",            bundeslandCode: "BY" },
  { id: "BY-SK-NUE", name: "Nürnberg",                   bundeslandCode: "BY" },
  { id: "BY-SK-PAS", name: "Passau (Stadt)",             bundeslandCode: "BY" },
  { id: "BY-SK-ROS", name: "Rosenheim (Stadt)",          bundeslandCode: "BY" },
  { id: "BY-SK-SCB", name: "Schwabach",                  bundeslandCode: "BY" },
  { id: "BY-SK-SWN", name: "Schweinfurt (Stadt)",        bundeslandCode: "BY" },
  { id: "BY-SK-STR", name: "Straubing (Stadt)",          bundeslandCode: "BY" },
  { id: "BY-SK-WEI", name: "Weiden i.d.OPf.",           bundeslandCode: "BY" },
  { id: "BY-SK-WUE", name: "Würzburg (Stadt)",           bundeslandCode: "BY" },
  // Landkreise
  { id: "BY-LK-AIC", name: "Aichach-Friedberg",          bundeslandCode: "BY" },
  { id: "BY-LK-ALT", name: "Altötting",                  bundeslandCode: "BY" },
  { id: "BY-LK-AMS", name: "Amberg-Sulzbach",            bundeslandCode: "BY" },
  { id: "BY-LK-ANS", name: "Ansbach",                    bundeslandCode: "BY" },
  { id: "BY-LK-ASC", name: "Aschaffenburg",              bundeslandCode: "BY" },
  { id: "BY-LK-AUG", name: "Augsburg (Landkreis)",       bundeslandCode: "BY" },
  { id: "BY-LK-BAK", name: "Bad Kissingen",              bundeslandCode: "BY" },
  { id: "BY-LK-BTW", name: "Bad Tölz-Wolfratshausen",   bundeslandCode: "BY" },
  { id: "BY-LK-BAM", name: "Bamberg (Landkreis)",        bundeslandCode: "BY" },
  { id: "BY-LK-BAY", name: "Bayreuth (Landkreis)",       bundeslandCode: "BY" },
  { id: "BY-LK-BGL", name: "Berchtesgadener Land",       bundeslandCode: "BY" },
  { id: "BY-LK-CHA", name: "Cham",                       bundeslandCode: "BY" },
  { id: "BY-LK-COB", name: "Coburg (Landkreis)",         bundeslandCode: "BY" },
  { id: "BY-LK-DAH", name: "Dachau",                     bundeslandCode: "BY" },
  { id: "BY-LK-DEG", name: "Deggendorf",                 bundeslandCode: "BY" },
  { id: "BY-LK-DLG", name: "Dillingen a.d.Donau",        bundeslandCode: "BY" },
  { id: "BY-LK-DGF", name: "Dingolfing-Landau",          bundeslandCode: "BY" },
  { id: "BY-LK-DON", name: "Donau-Ries",                 bundeslandCode: "BY" },
  { id: "BY-LK-EBE", name: "Ebersberg",                  bundeslandCode: "BY" },
  { id: "BY-LK-EIH", name: "Eichstätt",                  bundeslandCode: "BY" },
  { id: "BY-LK-ERD", name: "Erding",                     bundeslandCode: "BY" },
  { id: "BY-LK-ERH", name: "Erlangen-Höchstadt",         bundeslandCode: "BY" },
  { id: "BY-LK-FO",  name: "Forchheim",                  bundeslandCode: "BY" },
  { id: "BY-LK-FS",  name: "Freising",                   bundeslandCode: "BY" },
  { id: "BY-LK-FRG", name: "Freyung-Grafenau",           bundeslandCode: "BY" },
  { id: "BY-LK-FFB", name: "Fürstenfeldbruck",           bundeslandCode: "BY" },
  { id: "BY-LK-FUE", name: "Fürth (Landkreis)",          bundeslandCode: "BY" },
  { id: "BY-LK-GAP", name: "Garmisch-Partenkirchen",     bundeslandCode: "BY" },
  { id: "BY-LK-GZ",  name: "Günzburg",                   bundeslandCode: "BY" },
  { id: "BY-LK-HAS", name: "Haßberge",                   bundeslandCode: "BY" },
  { id: "BY-LK-HO",  name: "Hof (Landkreis)",            bundeslandCode: "BY" },
  { id: "BY-LK-KEH", name: "Kelheim",                    bundeslandCode: "BY" },
  { id: "BY-LK-KT",  name: "Kitzingen",                  bundeslandCode: "BY" },
  { id: "BY-LK-KC",  name: "Kronach",                    bundeslandCode: "BY" },
  { id: "BY-LK-KU",  name: "Kulmbach",                   bundeslandCode: "BY" },
  { id: "BY-LK-LL",  name: "Landsberg am Lech",          bundeslandCode: "BY" },
  { id: "BY-LK-LA",  name: "Landshut (Landkreis)",       bundeslandCode: "BY" },
  { id: "BY-LK-LIF", name: "Lichtenfels",                bundeslandCode: "BY" },
  { id: "BY-LK-LI",  name: "Lindau (Bodensee)",          bundeslandCode: "BY" },
  { id: "BY-LK-MSP", name: "Main-Spessart",              bundeslandCode: "BY" },
  { id: "BY-LK-MB",  name: "Miesbach",                   bundeslandCode: "BY" },
  { id: "BY-LK-MIL", name: "Miltenberg",                 bundeslandCode: "BY" },
  { id: "BY-LK-MUE", name: "Mühldorf a.Inn",             bundeslandCode: "BY" },
  { id: "BY-LK-MUC", name: "München (Landkreis)",        bundeslandCode: "BY" },
  { id: "BY-LK-ND",  name: "Neuburg-Schrobenhausen",     bundeslandCode: "BY" },
  { id: "BY-LK-NM",  name: "Neumarkt i.d.OPf.",         bundeslandCode: "BY" },
  { id: "BY-LK-NEA", name: "Neustadt a.d.Aisch-Bad Windsheim", bundeslandCode: "BY" },
  { id: "BY-LK-NEW", name: "Neustadt a.d.Waldnaab",      bundeslandCode: "BY" },
  { id: "BY-LK-LAU", name: "Nürnberger Land",            bundeslandCode: "BY" },
  { id: "BY-LK-OAL", name: "Oberallgäu",                 bundeslandCode: "BY" },
  { id: "BY-LK-OAL2",name: "Ostallgäu",                  bundeslandCode: "BY" },
  { id: "BY-LK-PAN", name: "Passau (Landkreis)",         bundeslandCode: "BY" },
  { id: "BY-LK-PAF", name: "Pfaffenhofen a.d.Ilm",      bundeslandCode: "BY" },
  { id: "BY-LK-REG", name: "Regen",                      bundeslandCode: "BY" },
  { id: "BY-LK-R",   name: "Regensburg (Landkreis)",     bundeslandCode: "BY" },
  { id: "BY-LK-RHO", name: "Rhön-Grabfeld",              bundeslandCode: "BY" },
  { id: "BY-LK-RO",  name: "Rosenheim (Landkreis)",      bundeslandCode: "BY" },
  { id: "BY-LK-RH",  name: "Roth",                       bundeslandCode: "BY" },
  { id: "BY-LK-ROT", name: "Rottal-Inn",                 bundeslandCode: "BY" },
  { id: "BY-LK-SAD", name: "Schwandorf",                  bundeslandCode: "BY" },
  { id: "BY-LK-SW",  name: "Schweinfurt (Landkreis)",    bundeslandCode: "BY" },
  { id: "BY-LK-STA", name: "Starnberg",                  bundeslandCode: "BY" },
  { id: "BY-LK-SR",  name: "Straubing-Bogen",            bundeslandCode: "BY" },
  { id: "BY-LK-TIR", name: "Tirschenreuth",              bundeslandCode: "BY" },
  { id: "BY-LK-TS",  name: "Traunstein",                 bundeslandCode: "BY" },
  { id: "BY-LK-MN",  name: "Unterallgäu",                bundeslandCode: "BY" },
  { id: "BY-LK-WM",  name: "Weilheim-Schongau",          bundeslandCode: "BY" },
  { id: "BY-LK-WUG", name: "Weißenburg-Gunzenhausen",    bundeslandCode: "BY" },
  { id: "BY-LK-WUN", name: "Wunsiedel i.Fichtelgebirge", bundeslandCode: "BY" },
  { id: "BY-LK-WUE", name: "Würzburg (Landkreis)",       bundeslandCode: "BY" },
  // ── Stubs für übrige Bundesländer (je 1 Eintrag — erweiterbar) ───────────
  { id: "BW-SK-STU", name: "Stuttgart",     bundeslandCode: "BW" },
  { id: "BE-SK-BER", name: "Berlin",        bundeslandCode: "BE" },
  { id: "BB-SK-POT", name: "Potsdam",       bundeslandCode: "BB" },
  { id: "HB-SK-HRB", name: "Bremen",        bundeslandCode: "HB" },
  { id: "HH-SK-HAM", name: "Hamburg",       bundeslandCode: "HH" },
  { id: "HE-SK-WIE", name: "Wiesbaden",     bundeslandCode: "HE" },
  { id: "MV-SK-SCW", name: "Schwerin",      bundeslandCode: "MV" },
  { id: "NI-SK-HAN", name: "Hannover",      bundeslandCode: "NI" },
  { id: "NW-SK-DUS", name: "Düsseldorf",    bundeslandCode: "NW" },
  { id: "RP-SK-MNZ", name: "Mainz",         bundeslandCode: "RP" },
  { id: "SL-SK-SAR", name: "Saarbrücken",   bundeslandCode: "SL" },
  { id: "SN-SK-DRE", name: "Dresden",       bundeslandCode: "SN" },
  { id: "ST-SK-MAG", name: "Magdeburg",     bundeslandCode: "ST" },
  { id: "SH-SK-KIE", name: "Kiel",          bundeslandCode: "SH" },
  { id: "TH-SK-ERF", name: "Erfurt",        bundeslandCode: "TH" },
];

// ── 3. Curriculum Subjects (global, app-wide) ─────────────────────────────────

const SUBJECTS = [
  { key: "mathematik",   label: "Mathematik",          color: "#6366f1", icon: "➕", order: 0 },
  { key: "deutsch",      label: "Deutsch",             color: "#f59e0b", icon: "📖", order: 1 },
  { key: "englisch",     label: "Englisch",            color: "#0ea5e9", icon: "🌍", order: 2 },
  { key: "latein",       label: "Latein",              color: "#8b5cf6", icon: "🏛️", order: 3 },
  { key: "franzoesisch", label: "Französisch",         color: "#ec4899", icon: "🥐", order: 4 },
  { key: "physik",       label: "Physik",              color: "#a855f7", icon: "⚡", order: 5 },
  { key: "chemie",       label: "Chemie",              color: "#14b8a6", icon: "🧪", order: 6 },
  { key: "biologie",     label: "Biologie",            color: "#22c55e", icon: "🌱", order: 7 },
  { key: "geschichte",   label: "Geschichte",          color: "#ef4444", icon: "🏰", order: 8 },
  { key: "geographie",   label: "Geographie",          color: "#84cc16", icon: "🗺️", order: 9 },
  { key: "informatik",   label: "Informatik",          color: "#06b6d4", icon: "💻", order: 10 },
  { key: "sport",        label: "Sport",               color: "#f97316", icon: "⚽", order: 11 },
  { key: "religion",     label: "Religion/Ethik",      color: "#d97706", icon: "✨", order: 12 },
  { key: "kunst",        label: "Kunst",               color: "#db2777", icon: "🎨", order: 13 },
  { key: "musik",        label: "Musik",               color: "#7c3aed", icon: "🎵", order: 14 },
  { key: "wirtschaft",   label: "Wirtschaft & Recht",  color: "#0891b2", icon: "💼", order: 15 },
  { key: "sozialkunde",  label: "Sozialkunde",         color: "#059669", icon: "🏛", order: 16 },
];

// ── 4. Curriculum: Bayern Gymnasium (LehrplanPLUS) ────────────────────────────
// Format: { s: subjectKey, h: wochenstunden, wp: isWahlpflicht }

type CurriculumRow = { s: string; h: number; wp?: boolean };

const BY_GYM: Record<number, CurriculumRow[]> = {
  5: [
    { s: "deutsch",    h: 5 },
    { s: "mathematik", h: 4 },
    { s: "englisch",   h: 4 },
    { s: "biologie",   h: 2 },
    { s: "geschichte", h: 2 },
    { s: "geographie", h: 2 },
    { s: "sport",      h: 3 },
    { s: "religion",   h: 2 },
    { s: "kunst",      h: 2, wp: true },
    { s: "musik",      h: 2, wp: true },
  ],
  6: [
    { s: "deutsch",      h: 5 },
    { s: "mathematik",   h: 4 },
    { s: "englisch",     h: 4 },
    { s: "latein",       h: 4, wp: true },
    { s: "franzoesisch", h: 4, wp: true },
    { s: "biologie",     h: 2 },
    { s: "geschichte",   h: 2 },
    { s: "geographie",   h: 2 },
    { s: "sport",        h: 3 },
    { s: "religion",     h: 2 },
    { s: "kunst",        h: 2, wp: true },
    { s: "musik",        h: 2, wp: true },
  ],
  7: [
    { s: "deutsch",      h: 4 },
    { s: "mathematik",   h: 4 },
    { s: "englisch",     h: 3 },
    { s: "latein",       h: 4, wp: true },
    { s: "franzoesisch", h: 4, wp: true },
    { s: "physik",       h: 2 },
    { s: "biologie",     h: 2 },
    { s: "geschichte",   h: 2 },
    { s: "geographie",   h: 2 },
    { s: "sport",        h: 3 },
    { s: "religion",     h: 2 },
    { s: "kunst",        h: 2, wp: true },
    { s: "musik",        h: 2, wp: true },
  ],
  8: [
    { s: "deutsch",      h: 4 },
    { s: "mathematik",   h: 4 },
    { s: "englisch",     h: 3 },
    { s: "latein",       h: 3, wp: true },
    { s: "franzoesisch", h: 3, wp: true },
    { s: "physik",       h: 2 },
    { s: "chemie",       h: 2 },
    { s: "biologie",     h: 2 },
    { s: "geschichte",   h: 2 },
    { s: "sozialkunde",  h: 1 },
    { s: "geographie",   h: 2 },
    { s: "informatik",   h: 2 },
    { s: "sport",        h: 3 },
    { s: "religion",     h: 2 },
    { s: "kunst",        h: 2, wp: true },
    { s: "musik",        h: 2, wp: true },
  ],
  9: [
    { s: "deutsch",      h: 4 },
    { s: "mathematik",   h: 4 },
    { s: "englisch",     h: 3 },
    { s: "latein",       h: 3, wp: true },
    { s: "franzoesisch", h: 3, wp: true },
    { s: "physik",       h: 3 },
    { s: "chemie",       h: 2 },
    { s: "biologie",     h: 2 },
    { s: "geschichte",   h: 2 },
    { s: "sozialkunde",  h: 1 },
    { s: "geographie",   h: 2 },
    { s: "informatik",   h: 2 },
    { s: "wirtschaft",   h: 2 },
    { s: "sport",        h: 3 },
    { s: "religion",     h: 2 },
    { s: "kunst",        h: 2, wp: true },
    { s: "musik",        h: 2, wp: true },
  ],
  10: [
    { s: "deutsch",      h: 4 },
    { s: "mathematik",   h: 4 },
    { s: "englisch",     h: 3 },
    { s: "latein",       h: 3, wp: true },
    { s: "franzoesisch", h: 3, wp: true },
    { s: "physik",       h: 3 },
    { s: "chemie",       h: 2 },
    { s: "biologie",     h: 2 },
    { s: "geschichte",   h: 2 },
    { s: "sozialkunde",  h: 1 },
    { s: "geographie",   h: 2 },
    { s: "informatik",   h: 2 },
    { s: "wirtschaft",   h: 2 },
    { s: "sport",        h: 3 },
    { s: "religion",     h: 2 },
    { s: "kunst",        h: 2, wp: true },
    { s: "musik",        h: 2, wp: true },
  ],
  11: [
    { s: "deutsch",      h: 4 },
    { s: "mathematik",   h: 4 },
    { s: "englisch",     h: 3 },
    { s: "latein",       h: 3, wp: true },
    { s: "franzoesisch", h: 3, wp: true },
    { s: "physik",       h: 3, wp: true },
    { s: "chemie",       h: 3, wp: true },
    { s: "biologie",     h: 3, wp: true },
    { s: "geschichte",   h: 2 },
    { s: "sozialkunde",  h: 2 },
    { s: "geographie",   h: 2, wp: true },
    { s: "informatik",   h: 3, wp: true },
    { s: "sport",        h: 2 },
    { s: "religion",     h: 2 },
    { s: "kunst",        h: 2, wp: true },
    { s: "musik",        h: 2, wp: true },
    { s: "wirtschaft",   h: 2, wp: true },
  ],
  12: [
    { s: "deutsch",      h: 4 },
    { s: "mathematik",   h: 4 },
    { s: "englisch",     h: 3 },
    { s: "latein",       h: 3, wp: true },
    { s: "franzoesisch", h: 3, wp: true },
    { s: "physik",       h: 3, wp: true },
    { s: "chemie",       h: 3, wp: true },
    { s: "biologie",     h: 3, wp: true },
    { s: "geschichte",   h: 2 },
    { s: "sozialkunde",  h: 2 },
    { s: "geographie",   h: 2, wp: true },
    { s: "informatik",   h: 3, wp: true },
    { s: "sport",        h: 2 },
    { s: "religion",     h: 2 },
    { s: "kunst",        h: 2, wp: true },
    { s: "musik",        h: 2, wp: true },
    { s: "wirtschaft",   h: 2, wp: true },
  ],
};

// ── 5. TreeNodes (curriculum-driven, Bayern Gymnasium) ───────────────────────
// Each subject gets 6 tiers mapping to learning progression across grades 5–12.
// Hub node is the universal starting point.

interface NodeDef {
  slug: string;
  subjectKey: string | null;
  title: string;
  description: string;
  tier: number;
  isHub?: boolean;
  requiredQuestCount: number;
  prerequisites: string[];
  quests: { type: TreeQuestType; title: string; description: string; target: number; rewardXp: number }[];
}

const HUB: NodeDef = {
  slug: "hub-allgemeinwissen",
  subjectKey: null,
  title: "Der Ursprung",
  description: "Beantworte eine Allgemeinwissensfrage, um den Skill-Baum zu öffnen und deine Reise zu beginnen.",
  tier: 0,
  isHub: true,
  requiredQuestCount: 1,
  prerequisites: [],
  quests: [
    {
      type: TreeQuestType.QUIZ,
      title: "Allgemeinwissen-Probe",
      description: "Beantworte 1 Allgemeinwissensfrage korrekt.",
      target: 1,
      rewardXp: 50,
    },
  ],
};

// Template: 6 tiers per core subject
const SUBJECT_TIERS: Record<string, { title: string; desc: string; quests: { type: TreeQuestType; title: string; desc: string; target: number; xp: number }[] }[]> = {
  mathematik: [
    { title: "Zahlen & Grundrechenarten",    desc: "Natürliche Zahlen, Grundrechenarten, Primzahlen, Teilbarkeit.", quests: [{ type: TreeQuestType.EXERCISES, title: "10 Mathe-Übungen", desc: "Löse 10 Übungen zu Grundrechenarten mit ≥70%.", target: 10, xp: 60 }, { type: TreeQuestType.FLASHCARDS, title: "Karteikarten Zahlen", desc: "Arbeite ein Karteikarten-Set zu Zahlen durch.", target: 20, xp: 40 }] },
    { title: "Brüche & Dezimalzahlen",       desc: "Bruchrechnung, Dezimalzahlen, Prozent- und Promillerechnung.", quests: [{ type: TreeQuestType.EXERCISES, title: "Brüche üben", desc: "Löse 15 Übungen zu Brüchen.", target: 15, xp: 70 }, { type: TreeQuestType.QUIZ, title: "Bruch-Quiz", desc: "Bestehe ein Quiz mit 80% Trefferquote.", target: 8, xp: 50 }] },
    { title: "Algebra & Gleichungen",        desc: "Variablen, Terme, lineare und quadratische Gleichungen.", quests: [{ type: TreeQuestType.EXERCISES, title: "Gleichungen lösen", desc: "Löse 15 Gleichungsaufgaben.", target: 15, xp: 80 }, { type: TreeQuestType.PPTX, title: "Algebra-Präsentation", desc: "Erstelle eine PPTX zu linearen Gleichungen.", target: 1, xp: 100 }] },
    { title: "Geometrie",                    desc: "Flächeninhalt, Umfang, Pythagoras, Ähnlichkeit, Kreisberechnung.", quests: [{ type: TreeQuestType.EXERCISES, title: "Geometrie-Training", desc: "Löse 20 Geometrieaufgaben.", target: 20, xp: 90 }, { type: TreeQuestType.BOSS_FIGHT, title: "Geometrie-Boss", desc: "Besiege den Geometrie-Boss.", target: 1, xp: 120 }] },
    { title: "Funktionen",                   desc: "Lineare und quadratische Funktionen, Koordinatensystem, Schnittpunkte.", quests: [{ type: TreeQuestType.EXERCISES, title: "Funktionen analysieren", desc: "Löse 20 Funktionsaufgaben.", target: 20, xp: 100 }, { type: TreeQuestType.PPTX, title: "Funktionen-Vortrag", desc: "Erstelle eine Präsentation zu Funktionen.", target: 1, xp: 110 }] },
    { title: "Analysis",                     desc: "Differentialrechnung, Integralrechnung, Kurvendiskussion.", quests: [{ type: TreeQuestType.EXERCISES, title: "Analysis-Marathon", desc: "Löse 25 Analysis-Aufgaben.", target: 25, xp: 130 }, { type: TreeQuestType.BOSS_FIGHT, title: "Analysis-Boss", desc: "Besiege den Analysis-Boss.", target: 1, xp: 150 }] },
  ],
  deutsch: [
    { title: "Grammatik Grundlagen",         desc: "Wortarten, Satzglieder, Rechtschreibung und Zeichensetzung.", quests: [{ type: TreeQuestType.EXERCISES, title: "Grammatik-Übungen", desc: "Löse 10 Grammatikaufgaben.", target: 10, xp: 55 }, { type: TreeQuestType.FLASHCARDS, title: "Wortarten lernen", desc: "Lerne 25 Karteikarten zu Wortarten.", target: 25, xp: 45 }] },
    { title: "Lesen & Verstehen",            desc: "Textverstehen, Schlussfolgerungen, Sinnentnahme.", quests: [{ type: TreeQuestType.EXERCISES, title: "Leseverständnis", desc: "Löse 12 Leseverständnisübungen.", target: 12, xp: 65 }, { type: TreeQuestType.QUIZ, title: "Textanalyse-Quiz", desc: "Beantworte 8 Fragen zu einem Text.", target: 8, xp: 55 }] },
    { title: "Aufsatz & Schreiben",          desc: "Erzählung, Beschreibung, Erörterung — Aufbau und Stil.", quests: [{ type: TreeQuestType.EXERCISES, title: "Aufsatz-Training", desc: "Löse 10 Schreibaufgaben.", target: 10, xp: 75 }, { type: TreeQuestType.PPTX, title: "Schreibtipps-PPTX", desc: "Erstelle eine Präsentation über Aufsatztechniken.", target: 1, xp: 95 }] },
    { title: "Literatur interpretieren",     desc: "Gedichtanalyse, Kurzgeschichten, Erzähltechniken.", quests: [{ type: TreeQuestType.EXERCISES, title: "Literaturanalyse", desc: "Analysiere 8 Textstellen.", target: 8, xp: 80 }, { type: TreeQuestType.BOSS_FIGHT, title: "Literatur-Boss", desc: "Besiege den Literatur-Boss.", target: 1, xp: 110 }] },
    { title: "Sprache & Stil",               desc: "Rhetorische Mittel, Stilistik, Sprachgeschichte.", quests: [{ type: TreeQuestType.EXERCISES, title: "Stilmittel erkennen", desc: "Löse 15 Stilmittel-Aufgaben.", target: 15, xp: 90 }, { type: TreeQuestType.FLASHCARDS, title: "Rhetorische Mittel", desc: "Lerne 30 Karteikarten zu Stilmitteln.", target: 30, xp: 60 }] },
    { title: "Klassik & Moderne",            desc: "Deutsche Klassik, Romantik, Moderne — Epochen und Autoren.", quests: [{ type: TreeQuestType.EXERCISES, title: "Epochen-Quiz", desc: "Löse 20 Fragen zu Literaturepochen.", target: 20, xp: 110 }, { type: TreeQuestType.BOSS_FIGHT, title: "Deutsch-Meister", desc: "Besiege den finalen Deutsch-Boss.", target: 1, xp: 140 }] },
  ],
  englisch: [
    { title: "Vocabulary & Basics",          desc: "Grundwortschatz, einfache Grammatik, Simple Present/Past.", quests: [{ type: TreeQuestType.FLASHCARDS, title: "Vokabeln Tier 1", desc: "Lerne 30 englische Vokabeln.", target: 30, xp: 50 }, { type: TreeQuestType.EXERCISES, title: "Basics üben", desc: "Löse 10 Grammatikaufgaben.", target: 10, xp: 55 }] },
    { title: "Grammar Intermediate",         desc: "Present Perfect, Conditionals, Passive Voice.", quests: [{ type: TreeQuestType.EXERCISES, title: "Grammar Drills", desc: "Löse 15 Grammar-Aufgaben.", target: 15, xp: 70 }, { type: TreeQuestType.FLASHCARDS, title: "Irregular Verbs", desc: "Lerne 40 unregelmäßige Verben.", target: 40, xp: 60 }] },
    { title: "Reading & Comprehension",      desc: "Texte verstehen, Hauptideen identifizieren, Schlussfolgerungen ziehen.", quests: [{ type: TreeQuestType.EXERCISES, title: "Reading Tasks", desc: "Löse 12 Leseverständnisaufgaben.", target: 12, xp: 75 }, { type: TreeQuestType.QUIZ, title: "Reading Quiz", desc: "Beantworte 10 Fragen zu einem englischen Text.", target: 10, xp: 65 }] },
    { title: "Writing & Expression",         desc: "Essays, Briefe, Berichte auf Englisch schreiben.", quests: [{ type: TreeQuestType.EXERCISES, title: "Writing Practice", desc: "Löse 10 Schreibaufgaben.", target: 10, xp: 85 }, { type: TreeQuestType.PPTX, title: "English Presentation", desc: "Erstelle eine englische Präsentation.", target: 1, xp: 100 }] },
    { title: "Advanced Grammar",             desc: "Subjunctive, Reported Speech, komplexe Satzstrukturen.", quests: [{ type: TreeQuestType.EXERCISES, title: "Advanced Drills", desc: "Löse 20 fortgeschrittene Grammar-Aufgaben.", target: 20, xp: 95 }, { type: TreeQuestType.BOSS_FIGHT, title: "English Boss", desc: "Besiege den Englisch-Boss.", target: 1, xp: 120 }] },
    { title: "Fluency & Literature",         desc: "Literarische Texte, Idioms, akademisches Schreiben.", quests: [{ type: TreeQuestType.EXERCISES, title: "Literature Analysis", desc: "Analysiere 8 englische Texte.", target: 8, xp: 110 }, { type: TreeQuestType.BOSS_FIGHT, title: "English Master", desc: "Besiege den finalen Englisch-Boss.", target: 1, xp: 140 }] },
  ],
  physik: [
    { title: "Mechanik Grundlagen",          desc: "Kräfte, Hebelgesetze, Druck, Reibung, Bewegung.", quests: [{ type: TreeQuestType.EXERCISES, title: "Mechanik üben", desc: "Löse 12 Mechanik-Aufgaben.", target: 12, xp: 65 }, { type: TreeQuestType.FLASHCARDS, title: "Mechanik-Begriffe", desc: "Lerne 25 Physik-Karteikarten.", target: 25, xp: 50 }] },
    { title: "Wärmelehre",                   desc: "Temperatur, Wärmeausdehnung, Wärmeübertragung, Aggregatzustände.", quests: [{ type: TreeQuestType.EXERCISES, title: "Wärme berechnen", desc: "Löse 12 Wärmelehre-Aufgaben.", target: 12, xp: 70 }, { type: TreeQuestType.PPTX, title: "Wärme-Vortrag", desc: "Erstelle eine PPTX zur Wärmelehre.", target: 1, xp: 90 }] },
    { title: "Optik & Elektrizität",         desc: "Lichtbrechung, Linsen, elektrischer Stromkreis, Ohm'sches Gesetz.", quests: [{ type: TreeQuestType.EXERCISES, title: "Optik & Strom", desc: "Löse 15 Aufgaben zu Optik und Elektrizität.", target: 15, xp: 80 }, { type: TreeQuestType.BOSS_FIGHT, title: "Physik-Boss I", desc: "Besiege den ersten Physik-Boss.", target: 1, xp: 110 }] },
    { title: "Schwingungen & Wellen",        desc: "Frequenz, Amplitude, Schall, Resonanz.", quests: [{ type: TreeQuestType.EXERCISES, title: "Wellen-Training", desc: "Löse 15 Aufgaben zu Schwingungen.", target: 15, xp: 85 }, { type: TreeQuestType.FLASHCARDS, title: "Wellen-Begriffe", desc: "Lerne 30 Karteikarten zu Wellen.", target: 30, xp: 55 }] },
    { title: "Elektromagnetismus",           desc: "Magnetfelder, Induktion, Transformator, elektromagnetische Wellen.", quests: [{ type: TreeQuestType.EXERCISES, title: "E-Mag Aufgaben", desc: "Löse 18 Elektromagnetismus-Aufgaben.", target: 18, xp: 95 }, { type: TreeQuestType.BOSS_FIGHT, title: "Physik-Boss II", desc: "Besiege den zweiten Physik-Boss.", target: 1, xp: 125 }] },
    { title: "Quantenphysik & Kernphysik",   desc: "Atomkern, Radioaktivität, Quantenphänomene, Grundlagen.", quests: [{ type: TreeQuestType.EXERCISES, title: "Kern & Quant", desc: "Löse 20 Aufgaben zur modernen Physik.", target: 20, xp: 120 }, { type: TreeQuestType.BOSS_FIGHT, title: "Physik-Meister", desc: "Besiege den finalen Physik-Boss.", target: 1, xp: 150 }] },
  ],
  chemie: [
    { title: "Atombau & Periodensystem",     desc: "Atomhülle, Atomkern, Elektronenkonfiguration, PSE.", quests: [{ type: TreeQuestType.EXERCISES, title: "Atom-Grundlagen", desc: "Löse 12 Aufgaben zum Atombau.", target: 12, xp: 65 }, { type: TreeQuestType.FLASHCARDS, title: "PSE-Karten", desc: "Lerne 30 Elemente des Periodensystems.", target: 30, xp: 55 }] },
    { title: "Chemische Bindungen",          desc: "Ionenbindung, Elektronenpaarbindung, Metallbindung.", quests: [{ type: TreeQuestType.EXERCISES, title: "Bindungstypen", desc: "Löse 12 Aufgaben zu Bindungen.", target: 12, xp: 70 }, { type: TreeQuestType.QUIZ, title: "Bindungs-Quiz", desc: "Beantworte 10 Fragen zu Bindungstypen.", target: 10, xp: 60 }] },
    { title: "Säuren & Basen",               desc: "pH-Wert, Indikatoren, Neutralisation, Salzbildung.", quests: [{ type: TreeQuestType.EXERCISES, title: "pH berechnen", desc: "Löse 15 Säure-Basen-Aufgaben.", target: 15, xp: 80 }, { type: TreeQuestType.BOSS_FIGHT, title: "Chemie-Boss I", desc: "Besiege den ersten Chemie-Boss.", target: 1, xp: 110 }] },
    { title: "Organische Chemie",            desc: "Kohlenwasserstoffe, funktionelle Gruppen, Reaktionstypen.", quests: [{ type: TreeQuestType.EXERCISES, title: "Organik üben", desc: "Löse 18 organische Aufgaben.", target: 18, xp: 90 }, { type: TreeQuestType.PPTX, title: "Organik-Vortrag", desc: "Erstelle eine PPTX zur organischen Chemie.", target: 1, xp: 110 }] },
    { title: "Reaktionskinetik",             desc: "Reaktionsgeschwindigkeit, Katalysatoren, Gleichgewicht.", quests: [{ type: TreeQuestType.EXERCISES, title: "Kinetik-Training", desc: "Löse 15 Kinetik-Aufgaben.", target: 15, xp: 95 }, { type: TreeQuestType.BOSS_FIGHT, title: "Chemie-Boss II", desc: "Besiege den zweiten Chemie-Boss.", target: 1, xp: 130 }] },
    { title: "Elektrochemie & Analytik",     desc: "Elektrolyse, galvanische Elemente, analytische Verfahren.", quests: [{ type: TreeQuestType.EXERCISES, title: "Elektrochemie", desc: "Löse 20 Elektrochemie-Aufgaben.", target: 20, xp: 120 }, { type: TreeQuestType.BOSS_FIGHT, title: "Chemie-Meister", desc: "Besiege den finalen Chemie-Boss.", target: 1, xp: 150 }] },
  ],
  biologie: [
    { title: "Zelle & Lebewesen",            desc: "Zellaufbau, Zellorganellen, Einteilung der Lebewesen.", quests: [{ type: TreeQuestType.EXERCISES, title: "Zell-Grundlagen", desc: "Löse 10 Zellbiologie-Aufgaben.", target: 10, xp: 60 }, { type: TreeQuestType.FLASHCARDS, title: "Zell-Karten", desc: "Lerne 25 Karteikarten zur Zelle.", target: 25, xp: 50 }] },
    { title: "Ökosystem & Ökologie",         desc: "Nahrungsketten, Kreisläufe, Ökosysteme und ihr Schutz.", quests: [{ type: TreeQuestType.EXERCISES, title: "Öko-Aufgaben", desc: "Löse 12 Ökologie-Aufgaben.", target: 12, xp: 65 }, { type: TreeQuestType.PPTX, title: "Ökosystem-Vortrag", desc: "Erstelle eine PPTX zu einem Ökosystem.", target: 1, xp: 85 }] },
    { title: "Genetik Grundlagen",           desc: "DNA, Gene, Mendel'sche Regeln, Mutation.", quests: [{ type: TreeQuestType.EXERCISES, title: "Genetik üben", desc: "Löse 15 Genetik-Aufgaben.", target: 15, xp: 80 }, { type: TreeQuestType.BOSS_FIGHT, title: "Genetik-Boss", desc: "Besiege den Genetik-Boss.", target: 1, xp: 110 }] },
    { title: "Evolution",                    desc: "Selektion, Anpassung, Artbildung, Evolutionsbelege.", quests: [{ type: TreeQuestType.EXERCISES, title: "Evolution analysieren", desc: "Löse 15 Evolutionsaufgaben.", target: 15, xp: 85 }, { type: TreeQuestType.FLASHCARDS, title: "Evolutions-Karten", desc: "Lerne 30 Evolutionsbegriffe.", target: 30, xp: 60 }] },
    { title: "Neurobiologie & Sinne",        desc: "Nervenzelle, Reizleitung, Sinnesorgane, Gehirn.", quests: [{ type: TreeQuestType.EXERCISES, title: "Neuro-Training", desc: "Löse 15 Neurobiologie-Aufgaben.", target: 15, xp: 90 }, { type: TreeQuestType.BOSS_FIGHT, title: "Biologie-Boss", desc: "Besiege den zweiten Biologie-Boss.", target: 1, xp: 120 }] },
    { title: "Biotechnologie & Anwendungen", desc: "Gentechnik, PCR, Klonierung, ethische Aspekte.", quests: [{ type: TreeQuestType.EXERCISES, title: "Biotech-Aufgaben", desc: "Löse 20 Biotechnologie-Aufgaben.", target: 20, xp: 115 }, { type: TreeQuestType.BOSS_FIGHT, title: "Bio-Meister", desc: "Besiege den finalen Biologie-Boss.", target: 1, xp: 145 }] },
  ],
  geschichte: [
    { title: "Antike Welt",                  desc: "Griechenland, Rom, frühe Hochkulturen.", quests: [{ type: TreeQuestType.EXERCISES, title: "Antike-Aufgaben", desc: "Löse 10 Aufgaben zur Antike.", target: 10, xp: 55 }, { type: TreeQuestType.FLASHCARDS, title: "Antike-Karten", desc: "Lerne 25 historische Persönlichkeiten.", target: 25, xp: 50 }] },
    { title: "Mittelalter",                  desc: "Feudalsystem, Kreuzzüge, Pest, Kirche.", quests: [{ type: TreeQuestType.EXERCISES, title: "Mittelalter-Quiz", desc: "Löse 12 Mittelalter-Aufgaben.", target: 12, xp: 65 }, { type: TreeQuestType.PPTX, title: "Mittelalter-Vortrag", desc: "Erstelle eine PPTX zum Mittelalter.", target: 1, xp: 85 }] },
    { title: "Frühe Neuzeit",                desc: "Renaissance, Reformation, Absolutismus, Aufklärung.", quests: [{ type: TreeQuestType.EXERCISES, title: "Frühe Neuzeit", desc: "Löse 12 Aufgaben zur Frühen Neuzeit.", target: 12, xp: 70 }, { type: TreeQuestType.BOSS_FIGHT, title: "Geschichte-Boss I", desc: "Besiege den ersten Geschichte-Boss.", target: 1, xp: 100 }] },
    { title: "19. Jahrhundert",              desc: "Industrialisierung, Nationalismus, Imperialismus.", quests: [{ type: TreeQuestType.EXERCISES, title: "19. Jh. Aufgaben", desc: "Löse 15 Aufgaben zum 19. Jahrhundert.", target: 15, xp: 80 }, { type: TreeQuestType.FLASHCARDS, title: "Industrialisierung", desc: "Lerne 30 Begriffe zur Industrialisierung.", target: 30, xp: 60 }] },
    { title: "Weltkriege & Weimarer Republik", desc: "Erster Weltkrieg, Weimarer Republik, Zweiter Weltkrieg.", quests: [{ type: TreeQuestType.EXERCISES, title: "WK-Training", desc: "Löse 18 Aufgaben zu den Weltkriegen.", target: 18, xp: 95 }, { type: TreeQuestType.BOSS_FIGHT, title: "Geschichte-Boss II", desc: "Besiege den zweiten Geschichte-Boss.", target: 1, xp: 125 }] },
    { title: "Nachkriegszeit & Moderne",     desc: "Kalter Krieg, Deutsche Teilung, Wiedervereinigung, Globalisierung.", quests: [{ type: TreeQuestType.EXERCISES, title: "Moderne Geschichte", desc: "Löse 20 Aufgaben zur Nachkriegszeit.", target: 20, xp: 110 }, { type: TreeQuestType.BOSS_FIGHT, title: "Geschichte-Meister", desc: "Besiege den finalen Geschichte-Boss.", target: 1, xp: 140 }] },
  ],
  geographie: [
    { title: "Karten & Orientierung",        desc: "Maßstab, Himmelsrichtungen, topographische Karten.", quests: [{ type: TreeQuestType.EXERCISES, title: "Karten lesen", desc: "Löse 10 Kartenaufgaben.", target: 10, xp: 55 }, { type: TreeQuestType.FLASHCARDS, title: "Geo-Grundbegriffe", desc: "Lerne 25 geographische Begriffe.", target: 25, xp: 45 }] },
    { title: "Klima & Wetter",               desc: "Klimazonen, Wetterphänomene, Klimawandel.", quests: [{ type: TreeQuestType.EXERCISES, title: "Klimaaufgaben", desc: "Löse 12 Klima-Aufgaben.", target: 12, xp: 65 }, { type: TreeQuestType.PPTX, title: "Klimazonen-Vortrag", desc: "Erstelle eine PPTX zu Klimazonen.", target: 1, xp: 85 }] },
    { title: "Erde & Plattentektonik",       desc: "Erdaufbau, Vulkanismus, Erdbeben, Plattentektonik.", quests: [{ type: TreeQuestType.EXERCISES, title: "Erde erforschen", desc: "Löse 15 Aufgaben zur Plattentektonik.", target: 15, xp: 75 }, { type: TreeQuestType.BOSS_FIGHT, title: "Geo-Boss I", desc: "Besiege den ersten Geographie-Boss.", target: 1, xp: 100 }] },
    { title: "Landwirtschaft & Wirtschaft",  desc: "Landwirtschaftliche Systeme, Globalisierung, Welthandel.", quests: [{ type: TreeQuestType.EXERCISES, title: "Wirtschaftsgeographie", desc: "Löse 15 wirtschaftsgeographische Aufgaben.", target: 15, xp: 80 }, { type: TreeQuestType.FLASHCARDS, title: "Wirtschafts-Karten", desc: "Lerne 30 Wirtschaftsbegriffe.", target: 30, xp: 55 }] },
    { title: "Bevölkerung & Migration",      desc: "Demographischer Wandel, Urbanisierung, Migrationsbewegungen.", quests: [{ type: TreeQuestType.EXERCISES, title: "Bevölkerungs-Training", desc: "Löse 15 Bevölkerungsaufgaben.", target: 15, xp: 85 }, { type: TreeQuestType.BOSS_FIGHT, title: "Geo-Boss II", desc: "Besiege den zweiten Geographie-Boss.", target: 1, xp: 115 }] },
    { title: "Nachhaltigkeit & Zukunft",     desc: "Ressourcen, Nachhaltigkeit, Energiewende, globale Herausforderungen.", quests: [{ type: TreeQuestType.EXERCISES, title: "Nachhaltigkeits-Aufgaben", desc: "Löse 20 Aufgaben zur Nachhaltigkeit.", target: 20, xp: 110 }, { type: TreeQuestType.BOSS_FIGHT, title: "Geo-Meister", desc: "Besiege den finalen Geographie-Boss.", target: 1, xp: 140 }] },
  ],
  informatik: [
    { title: "Grundlagen & Algorithmen",     desc: "Binärsystem, Algorithmen, Pseudocode, Ablaufdiagramme.", quests: [{ type: TreeQuestType.EXERCISES, title: "Informatik-Basics", desc: "Löse 10 Grundlagen-Aufgaben.", target: 10, xp: 60 }, { type: TreeQuestType.FLASHCARDS, title: "Informatik-Begriffe", desc: "Lerne 25 Informatik-Begriffe.", target: 25, xp: 50 }] },
    { title: "Programmierung Grundlagen",    desc: "Variablen, Schleifen, Bedingungen in einer Programmiersprache.", quests: [{ type: TreeQuestType.EXERCISES, title: "Coding-Training", desc: "Löse 12 Programmieraufgaben.", target: 12, xp: 70 }, { type: TreeQuestType.PPTX, title: "Programmier-Vortrag", desc: "Erstelle eine PPTX zu Programmierkonzepten.", target: 1, xp: 90 }] },
    { title: "Datenstrukturen",              desc: "Arrays, Listen, Stapel, Schlangen, Bäume.", quests: [{ type: TreeQuestType.EXERCISES, title: "Datenstrukturen üben", desc: "Löse 15 Datenstruktur-Aufgaben.", target: 15, xp: 80 }, { type: TreeQuestType.BOSS_FIGHT, title: "Informatik-Boss I", desc: "Besiege den ersten Informatik-Boss.", target: 1, xp: 110 }] },
    { title: "Datenbanken & Netzwerke",      desc: "SQL, relationale Datenbanken, Netzwerkprotokolle, Sicherheit.", quests: [{ type: TreeQuestType.EXERCISES, title: "DB & Netz", desc: "Löse 15 Aufgaben zu Datenbanken.", target: 15, xp: 85 }, { type: TreeQuestType.FLASHCARDS, title: "Netz-Begriffe", desc: "Lerne 30 Netzwerk-Begriffe.", target: 30, xp: 60 }] },
    { title: "Objektorientierung",           desc: "Klassen, Objekte, Vererbung, Polymorphismus.", quests: [{ type: TreeQuestType.EXERCISES, title: "OOP-Training", desc: "Löse 18 OOP-Aufgaben.", target: 18, xp: 95 }, { type: TreeQuestType.BOSS_FIGHT, title: "Informatik-Boss II", desc: "Besiege den zweiten Informatik-Boss.", target: 1, xp: 125 }] },
    { title: "KI & Informatik der Zukunft",  desc: "Maschinelles Lernen, neuronale Netze, Ethik der KI.", quests: [{ type: TreeQuestType.EXERCISES, title: "KI-Grundlagen", desc: "Löse 20 KI-Aufgaben.", target: 20, xp: 120 }, { type: TreeQuestType.BOSS_FIGHT, title: "Informatik-Meister", desc: "Besiege den finalen Informatik-Boss.", target: 1, xp: 150 }] },
  ],
};

// Subjects with fewer tiers (4 tiers — sport, religion, kunst/musik)
const SHORT_TIERS: Record<string, { title: string; desc: string; quests: { type: TreeQuestType; title: string; desc: string; target: number; xp: number }[] }[]> = {
  latein: [
    { title: "Latein-Grundvokabular",  desc: "Erste Vokabeln, Substantive, a/o-Deklination.", quests: [{ type: TreeQuestType.FLASHCARDS, title: "Latein-Vokabeln I", desc: "Lerne 40 Latein-Vokabeln.", target: 40, xp: 55 }, { type: TreeQuestType.EXERCISES, title: "Latein-Übungen I", desc: "Löse 10 Grammatikaufgaben.", target: 10, xp: 60 }] },
    { title: "Grammatik & Kasuslehre", desc: "Alle Kasus, Konjugation, ACI.", quests: [{ type: TreeQuestType.EXERCISES, title: "Kasuslehre", desc: "Löse 15 Kasus-Aufgaben.", target: 15, xp: 75 }, { type: TreeQuestType.FLASHCARDS, title: "Latein-Vokabeln II", desc: "Lerne 50 weitere Vokabeln.", target: 50, xp: 60 }] },
    { title: "Textarbeit",             desc: "Caesar, Cicero, Lektüreanalyse.", quests: [{ type: TreeQuestType.EXERCISES, title: "Textübersetzung", desc: "Übersetze 8 Textstellen.", target: 8, xp: 90 }, { type: TreeQuestType.BOSS_FIGHT, title: "Latein-Boss", desc: "Besiege den Latein-Boss.", target: 1, xp: 120 }] },
    { title: "Latein-Meister",         desc: "Fortgeschrittene Texte, Stilistik, Sprachgeschichte.", quests: [{ type: TreeQuestType.EXERCISES, title: "Latein-Meister", desc: "Löse 20 fortgeschrittene Aufgaben.", target: 20, xp: 110 }, { type: TreeQuestType.BOSS_FIGHT, title: "Latein-Meister", desc: "Besiege den finalen Latein-Boss.", target: 1, xp: 140 }] },
  ],
  franzoesisch: [
    { title: "Französisch-Grundlagen", desc: "Begrüßungen, Zahlen, erste Vokabeln, Présent.", quests: [{ type: TreeQuestType.FLASHCARDS, title: "Franz. Vokabeln I", desc: "Lerne 40 franz. Vokabeln.", target: 40, xp: 55 }, { type: TreeQuestType.EXERCISES, title: "Französisch-Basics", desc: "Löse 10 Grammatikaufgaben.", target: 10, xp: 60 }] },
    { title: "Grammatik Intermédiaire", desc: "Vergangenheitsformen, Subjunktiv, Pronomen.", quests: [{ type: TreeQuestType.EXERCISES, title: "Franz. Grammatik", desc: "Löse 15 Grammatik-Aufgaben.", target: 15, xp: 75 }, { type: TreeQuestType.FLASHCARDS, title: "Franz. Vokabeln II", desc: "Lerne 50 weitere Vokabeln.", target: 50, xp: 60 }] },
    { title: "Texte & Konversation",   desc: "Textanalyse, freies Schreiben, mündlicher Ausdruck.", quests: [{ type: TreeQuestType.EXERCISES, title: "Franz. Textarbeit", desc: "Löse 12 Leseverständnisaufgaben.", target: 12, xp: 85 }, { type: TreeQuestType.BOSS_FIGHT, title: "Français-Boss", desc: "Besiege den Französisch-Boss.", target: 1, xp: 115 }] },
    { title: "Français avancé",        desc: "Kulturkenntnisse, fortgeschrittene Grammatik, Literatur.", quests: [{ type: TreeQuestType.EXERCISES, title: "Franz. Meister", desc: "Löse 20 fortgeschrittene Aufgaben.", target: 20, xp: 110 }, { type: TreeQuestType.BOSS_FIGHT, title: "Français Maître", desc: "Besiege den finalen Französisch-Boss.", target: 1, xp: 140 }] },
  ],
  sport: [
    { title: "Sportgrundlagen",        desc: "Ausdauer, Kraft, Koordination — Grundlagen des Sports.", quests: [{ type: TreeQuestType.STREAK, title: "Sport-Streak", desc: "Halte eine Lernstreak von 5 Tagen.", target: 5, xp: 70 }, { type: TreeQuestType.EXERCISES, title: "Sport-Theorie", desc: "Löse 10 Sport-Theorieaufgaben.", target: 10, xp: 55 }] },
    { title: "Sportarten & Regeln",    desc: "Mannschaftssport, Individualsport, Regelwerke.", quests: [{ type: TreeQuestType.EXERCISES, title: "Regelkunde", desc: "Löse 12 Regelkunde-Aufgaben.", target: 12, xp: 65 }, { type: TreeQuestType.FLASHCARDS, title: "Sport-Regeln", desc: "Lerne 20 Sportregel-Karten.", target: 20, xp: 50 }] },
    { title: "Trainingslehre",         desc: "Trainingsplanung, Periodisierung, Regeneration.", quests: [{ type: TreeQuestType.EXERCISES, title: "Trainingslehre", desc: "Löse 15 Trainingslehre-Aufgaben.", target: 15, xp: 80 }, { type: TreeQuestType.PPTX, title: "Trainingsplan-PPTX", desc: "Erstelle eine PPTX zum Trainingsplan.", target: 1, xp: 95 }] },
    { title: "Sport & Gesellschaft",   desc: "Sport in der Gesellschaft, Doping, Olympia, Gesundheit.", quests: [{ type: TreeQuestType.EXERCISES, title: "Sport & Gesundheit", desc: "Löse 15 Aufgaben zu Sport und Gesellschaft.", target: 15, xp: 85 }, { type: TreeQuestType.BOSS_FIGHT, title: "Sport-Boss", desc: "Besiege den Sport-Boss.", target: 1, xp: 110 }] },
  ],
  religion: [
    { title: "Grundfragen & Glauben",  desc: "Glaube, Ethik, Weltanschauungen, Lebenssinndeutung.", quests: [{ type: TreeQuestType.EXERCISES, title: "Ethik-Grundlagen", desc: "Löse 10 Ethik-Aufgaben.", target: 10, xp: 55 }, { type: TreeQuestType.FLASHCARDS, title: "Religion-Begriffe", desc: "Lerne 25 religiöse Begriffe.", target: 25, xp: 45 }] },
    { title: "Weltreligionen",         desc: "Christentum, Islam, Judentum, Hinduismus, Buddhismus im Vergleich.", quests: [{ type: TreeQuestType.EXERCISES, title: "Weltreligionen", desc: "Löse 12 Aufgaben zu Weltreligionen.", target: 12, xp: 65 }, { type: TreeQuestType.PPTX, title: "Religion-Vortrag", desc: "Erstelle eine PPTX zu einer Weltreligion.", target: 1, xp: 85 }] },
    { title: "Ethik & Verantwortung",  desc: "Moral, Verantwortung, Bioethik, soziale Gerechtigkeit.", quests: [{ type: TreeQuestType.EXERCISES, title: "Ethik-Analyse", desc: "Löse 15 Ethik-Aufgaben.", target: 15, xp: 80 }, { type: TreeQuestType.BOSS_FIGHT, title: "Ethik-Boss", desc: "Besiege den Ethik-Boss.", target: 1, xp: 110 }] },
    { title: "Religion & Moderne",     desc: "Religion in der modernen Welt, Dialog, Extremismus.", quests: [{ type: TreeQuestType.EXERCISES, title: "Religion & Moderne", desc: "Löse 15 aktuelle Aufgaben.", target: 15, xp: 90 }, { type: TreeQuestType.BOSS_FIGHT, title: "Religion-Meister", desc: "Besiege den finalen Ethik-Boss.", target: 1, xp: 120 }] },
  ],
  kunst: [
    { title: "Grundlagen der Kunst",   desc: "Farblehre, Bildkomposition, Zeichentechniken.", quests: [{ type: TreeQuestType.EXERCISES, title: "Kunst-Grundlagen", desc: "Löse 10 Kunstaufgaben.", target: 10, xp: 55 }, { type: TreeQuestType.FLASHCARDS, title: "Kunst-Begriffe", desc: "Lerne 20 Kunstbegriffe.", target: 20, xp: 45 }] },
    { title: "Kunstepochen",           desc: "Renaissance, Barock, Impressionismus, Moderne.", quests: [{ type: TreeQuestType.EXERCISES, title: "Kunstepochen", desc: "Löse 12 Aufgaben zu Epochen.", target: 12, xp: 65 }, { type: TreeQuestType.PPTX, title: "Kunstepoche-Vortrag", desc: "Erstelle eine PPTX zu einer Kunstepoche.", target: 1, xp: 85 }] },
    { title: "Bildanalyse",            desc: "Formale und inhaltliche Bildanalyse, Interpretation.", quests: [{ type: TreeQuestType.EXERCISES, title: "Bildanalyse üben", desc: "Analysiere 8 Kunstwerke.", target: 8, xp: 80 }, { type: TreeQuestType.BOSS_FIGHT, title: "Kunst-Boss", desc: "Besiege den Kunst-Boss.", target: 1, xp: 110 }] },
    { title: "Kunst & Gesellschaft",   desc: "Kunst als Spiegel der Gesellschaft, Medienkunst, Designprinzipien.", quests: [{ type: TreeQuestType.EXERCISES, title: "Kunst & Medien", desc: "Löse 15 Aufgaben zu Kunst und Medien.", target: 15, xp: 90 }, { type: TreeQuestType.BOSS_FIGHT, title: "Kunst-Meister", desc: "Besiege den finalen Kunst-Boss.", target: 1, xp: 120 }] },
  ],
  musik: [
    { title: "Musiktheorie Grundlagen", desc: "Notenlesen, Rhythmus, Takt, Tonleitern.", quests: [{ type: TreeQuestType.EXERCISES, title: "Musiktheorie", desc: "Löse 10 Musiktheorie-Aufgaben.", target: 10, xp: 55 }, { type: TreeQuestType.FLASHCARDS, title: "Noten-Karten", desc: "Lerne 25 Musik-Begriffe.", target: 25, xp: 45 }] },
    { title: "Musikepochen & Stile",   desc: "Klassik, Romantik, Jazz, Rock, Pop — Epochen und Merkmale.", quests: [{ type: TreeQuestType.EXERCISES, title: "Musikepochen", desc: "Löse 12 Aufgaben zu Musikepochen.", target: 12, xp: 65 }, { type: TreeQuestType.PPTX, title: "Musikepoche-Vortrag", desc: "Erstelle eine PPTX zu einer Musikepoche.", target: 1, xp: 85 }] },
    { title: "Musikanalyse",           desc: "Harmonielehre, Analyse von Stücken, Gehörbildung.", quests: [{ type: TreeQuestType.EXERCISES, title: "Musikanalyse", desc: "Analysiere 8 Musikstücke.", target: 8, xp: 80 }, { type: TreeQuestType.BOSS_FIGHT, title: "Musik-Boss", desc: "Besiege den Musik-Boss.", target: 1, xp: 110 }] },
    { title: "Musik & Gesellschaft",   desc: "Musik als Kulturgut, Medienwandel, Musikindustrie.", quests: [{ type: TreeQuestType.EXERCISES, title: "Musik & Medien", desc: "Löse 15 aktuelle Musikaufgaben.", target: 15, xp: 90 }, { type: TreeQuestType.BOSS_FIGHT, title: "Musik-Meister", desc: "Besiege den finalen Musik-Boss.", target: 1, xp: 120 }] },
  ],
  wirtschaft: [
    { title: "Wirtschaftsgrundlagen",  desc: "Angebot & Nachfrage, Marktmechanismen, Wirtschaftssysteme.", quests: [{ type: TreeQuestType.EXERCISES, title: "Wirtschafts-Basics", desc: "Löse 10 Wirtschaftsaufgaben.", target: 10, xp: 60 }, { type: TreeQuestType.FLASHCARDS, title: "Wirtschafts-Begriffe", desc: "Lerne 25 Wirtschafts-Begriffe.", target: 25, xp: 50 }] },
    { title: "Recht & Verträge",       desc: "Vertragsrecht, Verbraucherrecht, BGB-Grundlagen.", quests: [{ type: TreeQuestType.EXERCISES, title: "Rechtskunde", desc: "Löse 12 Rechtskunde-Aufgaben.", target: 12, xp: 70 }, { type: TreeQuestType.PPTX, title: "Recht-Vortrag", desc: "Erstelle eine PPTX zu einem Rechtsthema.", target: 1, xp: 90 }] },
    { title: "Finanzen & Steuern",     desc: "Budgetplanung, Steuern, Investitionen, Bankwesen.", quests: [{ type: TreeQuestType.EXERCISES, title: "Finanz-Training", desc: "Löse 15 Finanz-Aufgaben.", target: 15, xp: 80 }, { type: TreeQuestType.BOSS_FIGHT, title: "Wirtschafts-Boss", desc: "Besiege den Wirtschafts-Boss.", target: 1, xp: 110 }] },
    { title: "Volkswirtschaft",        desc: "Konjunktur, Inflation, Arbeitsmarkt, globale Wirtschaft.", quests: [{ type: TreeQuestType.EXERCISES, title: "VWL-Aufgaben", desc: "Löse 18 VWL-Aufgaben.", target: 18, xp: 95 }, { type: TreeQuestType.BOSS_FIGHT, title: "Wirtschafts-Meister", desc: "Besiege den finalen Wirtschafts-Boss.", target: 1, xp: 125 }] },
  ],
  sozialkunde: [
    { title: "Politische Grundlagen",  desc: "Demokratie, Gewaltenteilung, Grundgesetz.", quests: [{ type: TreeQuestType.EXERCISES, title: "Politik-Basics", desc: "Löse 10 Politikaufgaben.", target: 10, xp: 55 }, { type: TreeQuestType.FLASHCARDS, title: "Politik-Begriffe", desc: "Lerne 25 Politikbegriffe.", target: 25, xp: 45 }] },
    { title: "Gesellschaft & Soziales", desc: "Soziale Schichten, Migration, Minderheiten, soziale Gerechtigkeit.", quests: [{ type: TreeQuestType.EXERCISES, title: "Soziales Lernen", desc: "Löse 12 Gesellschaftsaufgaben.", target: 12, xp: 65 }, { type: TreeQuestType.PPTX, title: "Gesellschafts-Vortrag", desc: "Erstelle eine PPTX zu einem gesellschaftlichen Thema.", target: 1, xp: 85 }] },
    { title: "Internationale Politik",  desc: "EU, Vereinte Nationen, internationale Konflikte.", quests: [{ type: TreeQuestType.EXERCISES, title: "Internationale Politik", desc: "Löse 15 Aufgaben zur int. Politik.", target: 15, xp: 80 }, { type: TreeQuestType.BOSS_FIGHT, title: "Politik-Boss", desc: "Besiege den Politik-Boss.", target: 1, xp: 110 }] },
    { title: "Zeitgeschehen & Medien",  desc: "Medienkompetenz, aktuelle Politik, Informationsbewertung.", quests: [{ type: TreeQuestType.EXERCISES, title: "Medienkunde", desc: "Löse 15 Medienkundeaufgaben.", target: 15, xp: 85 }, { type: TreeQuestType.BOSS_FIGHT, title: "Sozio-Meister", desc: "Besiege den finalen Sozialkunde-Boss.", target: 1, xp: 115 }] },
  ],
};

// ── Main seed function ────────────────────────────────────────────────────────

export async function seedCurriculum() {
  console.log("  Seeding Bundesländer…");
  for (const bl of BUNDESLAENDER) {
    await prisma.bundesland.upsert({ where: { code: bl.code }, update: {}, create: bl });
  }
  console.log(`  ✓ ${BUNDESLAENDER.length} Bundesländer`);

  console.log("  Seeding Landkreise…");
  for (const lk of LANDKREISE) {
    await prisma.landkreis.upsert({ where: { id: lk.id }, update: {}, create: lk });
  }
  console.log(`  ✓ ${LANDKREISE.length} Landkreise`);

  console.log("  Seeding CurriculumSubjects…");
  const subjectMap: Record<string, string> = {};
  for (const s of SUBJECTS) {
    const rec = await prisma.curriculumSubject.upsert({
      where: { key: s.key },
      update: { label: s.label, color: s.color, icon: s.icon, order: s.order },
      create: s,
    });
    subjectMap[s.key] = rec.id;
  }
  console.log(`  ✓ ${SUBJECTS.length} Fächer`);

  console.log("  Seeding Curriculum (BY, Gymnasium, Jgst 5–12)…");
  let curriculumCount = 0;
  for (const [gradeStr, rows] of Object.entries(BY_GYM)) {
    const grade = parseInt(gradeStr, 10);
    for (const row of rows) {
      if (!subjectMap[row.s]) continue;
      await prisma.curriculum.upsert({
        where: {
          bundeslandCode_schulart_jahrgangsstufe_subjectId: {
            bundeslandCode: "BY",
            schulart: Schulart.GYMNASIUM,
            jahrgangsstufe: grade,
            subjectId: subjectMap[row.s]!,
          },
        },
        update: { wochenstunden: row.h, isWahlpflicht: row.wp ?? false },
        create: {
          bundeslandCode: "BY",
          schulart: Schulart.GYMNASIUM,
          jahrgangsstufe: grade,
          subjectId: subjectMap[row.s]!,
          wochenstunden: row.h,
          isWahlpflicht: row.wp ?? false,
        },
      });
      curriculumCount++;
    }
  }
  console.log(`  ✓ ${curriculumCount} Curriculum-Einträge`);

  console.log("  Seeding TreeNodes…");
  let nodeCount = 0;

  // Hub
  const hub = await prisma.treeNode.upsert({
    where: { slug: HUB.slug },
    update: {},
    create: {
      slug: HUB.slug,
      title: HUB.title,
      description: HUB.description,
      tier: HUB.tier,
      isHub: true,
      requiredQuestCount: HUB.requiredQuestCount,
    },
  });
  nodeCount++;

  // Hub quests
  for (let i = 0; i < HUB.quests.length; i++) {
    const q = HUB.quests[i]!;
    await prisma.treeQuest.upsert({
      where: { slug: `${HUB.slug}-q${i}` },
      update: {},
      create: { slug: `${HUB.slug}-q${i}`, nodeId: hub.id, type: q.type, title: q.title, description: q.description, target: q.target, rewardXp: q.rewardXp, sortOrder: i },
    });
  }

  // Subject nodes
  const allTierDefs = { ...SUBJECT_TIERS, ...SHORT_TIERS };
  const nodeIdMap: Record<string, string> = { [hub.slug]: hub.id };

  for (const [subjectKey, tiers] of Object.entries(allTierDefs)) {
    const subjectId = subjectMap[subjectKey];
    if (!subjectId) continue;

    let prevSlug = hub.slug;
    for (let ti = 0; ti < tiers.length; ti++) {
      const tierDef = tiers[ti]!;
      const slug = `${subjectKey}-t${ti + 1}`;

      const node = await prisma.treeNode.upsert({
        where: { slug },
        update: {},
        create: {
          slug,
          subjectId,
          title: tierDef.title,
          description: tierDef.desc,
          tier: ti + 1,
          requiredQuestCount: tierDef.quests.length,
        },
      });
      nodeIdMap[slug] = node.id;
      nodeCount++;

      // Prerequisite: previous tier (or hub for T1)
      await prisma.treeNodePrereq.upsert({
        where: { nodeId_requiresNodeId: { nodeId: node.id, requiresNodeId: nodeIdMap[prevSlug]! } },
        update: {},
        create: { nodeId: node.id, requiresNodeId: nodeIdMap[prevSlug]! },
      });

      // Quests
      for (let qi = 0; qi < tierDef.quests.length; qi++) {
        const q = tierDef.quests[qi]!;
        const questSlug = `${slug}-q${qi}`;
        await prisma.treeQuest.upsert({
          where: { slug: questSlug },
          update: {},
          create: { slug: questSlug, nodeId: node.id, type: q.type, title: q.title, description: q.desc, target: q.target, rewardXp: q.xp, sortOrder: qi },
        });
      }

      prevSlug = slug;
    }
  }

  console.log(`  ✓ ${nodeCount} TreeNodes + Prereqs + Quests`);
}

// Run if called directly
if (require.main === module) {
  seedCurriculum()
    .then(() => { console.log("✅ Curriculum seed complete"); })
    .catch(console.error)
    .finally(() => prisma.$disconnect());
}
