/* Copyright 2026 Elian Schock, Jonas Schwenk */
/**
 * boss-defs.ts — static boss catalog (client + server safe, no Prisma imports)
 *
 * Grade ranges follow the rarity tier:
 *   Common    → 5–8   (Einführungsphase)
 *   Uncommon  → 6–9
 *   Rare      → 7–10
 *   Epic      → 8–11
 *   Legendary → 9–12
 *   Mythic    → 10–12 (Oberstufe only)
 *   Secret    → 5–12  (all grades, special unlock required)
 */

export type BossRarity = "COMMON" | "UNCOMMON" | "RARE" | "EPIC" | "LEGENDARY" | "MYTHIC" | "SECRET";

export interface BossDef {
  id:        string;
  name:      string;
  subject:   string;
  emoji:     string;
  rarity:    BossRarity;
  minGrade:  number;
  maxGrade:  number;
  baseHp:    number;
  baseXp:    number;
  baseCoins: number;
  loreShort: string;
  custom:    boolean;   // true = hand-built bespoke component exists
  mvpTarget: number;    // MVP kills needed to complete rarity tier
}

// ── Rarity base stats ─────────────────────────────────────────────────────────
export const RARITY_BASE: Record<BossRarity, { hp: number; xp: number; coins: number; mvpTarget: number }> = {
  COMMON:    { hp: 20,  xp: 100,  coins: 8,   mvpTarget: 20 },
  UNCOMMON:  { hp: 40,  xp: 200,  coins: 18,  mvpTarget: 15 },
  RARE:      { hp: 70,  xp: 350,  coins: 35,  mvpTarget: 12 },
  EPIC:      { hp: 120, xp: 600,  coins: 70,  mvpTarget: 10 },
  LEGENDARY: { hp: 200, xp: 1000, coins: 140, mvpTarget: 7  },
  MYTHIC:    { hp: 350, xp: 1800, coins: 280, mvpTarget: 6  },
  SECRET:    { hp: 500, xp: 3000, coins: 500, mvpTarget: 5  },
};

const GRADE_RANGE: Record<BossRarity, [number, number]> = {
  COMMON:    [5, 8],
  UNCOMMON:  [6, 9],
  RARE:      [7, 10],
  EPIC:      [8, 11],
  LEGENDARY: [9, 12],
  MYTHIC:    [10, 12],
  SECRET:    [5,  12],
};

function b(
  id: string, name: string, subject: string, emoji: string,
  rarity: BossRarity, loreShort: string, custom = false,
): BossDef {
  const stats = RARITY_BASE[rarity];
  const [min, max] = GRADE_RANGE[rarity];
  return { id, name, subject, emoji, rarity, minGrade: min, maxGrade: max,
    baseHp: stats.hp, baseXp: stats.xp, baseCoins: stats.coins,
    loreShort, custom, mvpTarget: stats.mvpTarget };
}

// ── The 75 bosses ──────────────────────────────────────────────────────────────
export const ALL_BOSSES: BossDef[] = [

  // ── COMMON (20) ──────────────────────────────────────────────────────────────
  b("zahlenschatten",    "Zahlenschatten",       "Mathematik", "👺", "COMMON",    "Er taucht auf wenn die Konzentration nachlässt und dreht Zahlen ins Falsche."),
  b("schriftpest",       "Schriftpest",          "Deutsch",    "👻", "COMMON",    "Kein Text ist vor ihr sicher. Sie hinterlässt Spuren in jedem Wort."),
  b("gedankenschleier",  "Gedankenschleier",     "Englisch",   "🤧", "COMMON",    "Verwirrt englische Vokabeln und lässt Bedeutungen verschwimmen."),
  b("chaoskeim",         "Chaoskeim",            "Deutsch",    "🍄", "COMMON",    "Er sprießt in unleserlichen Aufsätzen und nährt sich von Kommafehlern."),
  b("rechenfluch",       "Rechenfluch",          "Mathematik", "➕", "COMMON",    "Ein alter Fluch der einfache Rechnungen unlösbar erscheinen lässt."),
  b("tintenklaue",       "Tintenklaue",          "Deutsch",    "📝", "COMMON",    "Reißt Sätze auseinander und verwirrt Satzglieder."),
  b("bruchdaemon",       "Bruchdämon",           "Mathematik", "🐸", "COMMON",    "Lebt in den Nennern und Zählern und macht Bruchrechnung zur Qual."),
  b("winkelfinsternis",  "Winkelfinsternis",     "Mathematik", "📐", "COMMON",    "Verdreht Winkel und macht Geometrie unberechenbar."),
  b("erster-waechter",   "Der Erste Wächter",    "Mathematik", "🔢", "COMMON",    "Bewacht das Tor zum Zahlenreich. Wer ihn besiegt meistert Grundlagen."),
  b("wortfresser",       "Wortfresser",          "Deutsch",    "🐒", "COMMON",    "Verschlingt wichtige Wörter und lässt Lücken in Texten."),
  b("silbengift",        "Silbengift",           "Deutsch",    "🐍", "COMMON",    "Vergiftet Silbentrennung und Rechtschreibung."),
  b("sprachbrand",       "Sprachbrand",          "Englisch",   "🌪️","COMMON",    "Verbrennt englische Grammatikregeln und hinterlässt Asche."),
  b("dornenwurm",        "Dornenwurm",           "Biologie",   "🌿", "COMMON",    "Windet sich durch Pflanzenkunde und sticht bei falschen Antworten."),
  b("klauenschatten",    "Klauenschatten",       "Biologie",   "🐊", "COMMON",    "Lauert im Dickicht der Tierklassifikation."),
  b("formeldunkel",      "Formeldunkel",         "Chemie",     "💤", "COMMON",    "Lässt chemische Formeln unleserlich werden."),
  b("zeitfaelscher",     "Zeitfälscher",         "Geschichte", "📜", "COMMON",    "Verfälscht Jahreszahlen und historische Abläufe."),
  b("byteschatten",      "Byteschatten",         "Informatik", "🐣", "COMMON",    "Ein junger Datendämon der erste Algorithmen korrumpiert."),
  b("schleiergeist",     "Schleiergeist",        "Deutsch",    "📖", "COMMON",    "Verhüllt Textbedeutungen hinter Nebel."),
  b("uhrenfluch",        "Uhrenfluch",           "Mathematik", "🕐", "COMMON",    "Dreht die Zeit zurück und lässt Zeitberechnungen scheitern."),
  b("datenpest",         "Datenpest",            "Informatik", "💾", "COMMON",    "Infiziert Datenstrukturen und lässt Variablen verschwinden."),

  // ── UNCOMMON (15) ────────────────────────────────────────────────────────────
  b("gleichungshexer",   "Gleichungshexer",      "Mathematik", "🧮", "UNCOMMON",  "Hexer der lineare Gleichungen in Rätsel verwandelt."),
  b("grammatikwraith",   "Grammatikwraith",      "Deutsch",    "👻", "UNCOMMON",  "Geist der Falschschreibung der in Klassenarbeiten erscheint."),
  b("bedeutungsdieb",    "Bedeutungsdieb",       "Englisch",   "🌀", "UNCOMMON",  "Stiehlt die Bedeutung englischer Vokabeln."),
  b("sprachverderber",   "Sprachverderber",      "Deutsch",    "🦅", "UNCOMMON",  "Greift aus der Luft an und verdirbt Stil und Ausdruck."),
  b("gleichungsteufel",  "Gleichungsteufel",     "Mathematik", "📊", "UNCOMMON",  "Macht quadratische Gleichungen zum Alptraum."),
  b("genkorruptor",      "Genkorruptor",         "Biologie",   "🧬", "UNCOMMON",  "Korrumpiert DNA-Wissen und Zellbiologie."),
  b("kraftfeldpolter",   "Kraftfeldpolter",      "Physik",     "💨", "UNCOMMON",  "Poltergeist der Kraftfelder und Bewegungsgesetze stört."),
  b("elektronenjaeger",  "Elektronenjäger",      "Chemie",     "🧪", "UNCOMMON",  "Jagt Elektronen und verwirrt chemische Bindungen."),
  b("jahrhundertjaeger", "Jahrhundertjäger",     "Geschichte", "📅", "UNCOMMON",  "Jagt durch Jahrhunderte und verwirrt Epochen."),
  b("zufallsdaemon",     "Zufallsdämon",         "Mathematik", "🎲", "UNCOMMON",  "Macht Wahrscheinlichkeitsrechnung unberechenbar."),
  b("graphenbrecher",    "Graphenbrecher",       "Mathematik", "📈", "UNCOMMON",  "Zertrümmert Koordinatensysteme und Funktionsgraphen."),
  b("reimtoeter",        "Reimtöter",            "Deutsch",    "🎭", "UNCOMMON",  "Tötet Lyrik und Versmaß in Gedichtanalysen."),
  b("geometrieschaender","Geometrieschänder",    "Mathematik", "📉", "UNCOMMON",  "Schändet Dreiecke, Kreise und geometrische Beweise."),
  b("codebrecher",       "Codebrecher",          "Informatik", "🔮", "UNCOMMON",  "Bricht Algorithmen und macht Code unleserlich."),
  b("rhetoriktoeter",    "Rhetoriktöter",        "Deutsch",    "📢", "UNCOMMON",  "Vernichtet Argumentation und rhetorische Mittel."),

  // ── RARE (12) ────────────────────────────────────────────────────────────────
  b("algebraghul",       "Algebraghul",          "Mathematik", "🧟", "RARE",      "Untot aus dem Algebrafriedhof. Löst alle Variablen auf."),
  b("syntaxspecter",     "Syntaxspecter",        "Deutsch",    "👁️","RARE",      "Lauert in Schachtelsätzen und zerstört Syntax."),
  b("grammatikgreif",    "Grammatikgreif",       "Englisch",   "🧌", "RARE",      "Greift englische Grammatik mit scharfen Klauen an."),
  b("zellenzerstoerer",  "Zellenzerstörer",      "Biologie",   "🧫", "RARE",      "Zerstört Zellstrukturen und Mitosewissen."),
  b("wellen-wraith",     "Wellen-Wraith",        "Physik",     "🌊", "RARE",      "Reitet auf Schallwellen und verwirrt Optik."),
  b("elementarbrecher",  "Elementarbrecher",     "Chemie",     "⚗️","RARE",      "Bricht das Periodensystem auseinander."),
  b("chronospeiniger",   "Chronospeiniger",      "Geschichte", "🏛️","RARE",      "Peinigt Schüler mit verworrenen Epochen und Quellen."),
  b("logarithmen-lich",  "Das Logarithmen-Lich", "Mathematik", "💀", "RARE",      "Lich der Exponenten. Wer den Log nicht kennt fällt."),
  b("lebensentzieher",   "Lebensentzieher",      "Biologie",   "🌱", "RARE",      "Entzieht Lebewesen ihre Klassifikation."),
  b("byteverschlinger",  "Byteverschlinger",     "Informatik", "💻", "RARE",      "Verschlingt ganze Programmteile und hinterlässt Bugs."),
  b("lichtbrecher",      "Lichtbrecher",         "Physik",     "🔭", "RARE",      "Bricht Licht so dass Optik-Formeln versagen."),
  b("textverschlinger",  "Textverschlinger",     "Deutsch",    "🔬", "RARE",      "Verschlingt Texte und spuckt Unsinn aus."),

  // ── EPIC (10) ────────────────────────────────────────────────────────────────
  b("malachar",          "Malachar der Algebradämon",     "Mathematik", "👹", "EPIC", "Uralter Dämon der Algebra. Drei Phasen, jede gefährlicher.", false),
  b("medea",             "Grammatikgorgon Medea",         "Deutsch",    "🐲", "EPIC", "Ihr Blick versteinert jeden der Grammatik nicht beherrscht.",  false),
  b("graf-vox",          "Graf Vox der Gedankenvampir",   "Englisch",   "🧛", "EPIC", "Saugt englische Vokabeln aus dem Gedächtnis.",                 false),
  b("helixdrache",       "Helixdrache",                   "Biologie",   "🧬", "EPIC", "Sein Körper ist aus DNA gewoben. Genetik ist sein Fach.",      false),
  b("quantenphantom",    "Quantenphantom",                "Physik",     "⚡", "EPIC", "Existiert in Superposition. Falsche Antwort — kollabiert er.",  false),
  b("elementarchimaere", "Elementarchimäre",              "Chemie",     "🧪", "EPIC", "Verschmilzt Elemente zu einem gefährlichen Mischwesen.",        false),
  b("chronosgolem",      "Chronosgolem",                  "Geschichte", "🗿", "EPIC", "Golem aus Jahrtausenden. Er kennt jedes Datum.",               false),
  b("datenkrake",        "Die Datenkrake",                "Informatik", "🐙", "EPIC", "Acht Tentakel, acht Fäden gleichzeitig — jeder ein Algorithmus.", false),
  b("azmodan",           "Azmodan, Fürst der Kurven",     "Mathematik", "🌌", "EPIC", "Beherrscht Analysis und Integrale mit kosmischer Macht.",      false),
  b("wyrm-vergessens",   "Wyrm des Vergessens",           "Deutsch",    "🐉", "EPIC", "Schluckt Erinnerungen an Epochen der Literaturgeschichte.",    false),

  // ── LEGENDARY (7) ───────────────────────────────────────────────────────────
  b("xerath",            "Zahlenkönig Xerath",            "Mathematik", "👑", "LEGENDARY", "König aller Zahlen. Nur die besten Mathematiker können ihn bezwingen.", true),
  b("sprachfuerst",      "Dunkler Sprachfürst",           "Deutsch",    "📜", "LEGENDARY", "Herrscher über das Wort. Sein Reich ist die Sprache selbst.",            true),
  b("imperiator",        "Imperiator der Sprache",        "Englisch",   "🦁", "LEGENDARY", "Beherrscht alle englischen Zeiten, Modi und Idiome.",                    true),
  b("urzeitbehemoth",    "Urzeitbehemoth",                "Biologie",   "🦕", "LEGENDARY", "Urzeitliche Bestie. Evolutionslehre ist sein Schwert.",                  true),
  b("phoenix-entropie",  "Phönix der Entropie",           "Physik",     "🔥", "LEGENDARY", "Stirbt und erwacht. Jede Phase verlangt mehr Physikwissen.",             true),
  b("cerberus",          "Cerberus der Elemente",         "Chemie",     "🐕", "LEGENDARY", "Drei Köpfe, drei Elementsgruppen. Alle müssen besiegt werden.",           true),
  b("digitaler-tyrann",  "Der Digitale Tyrann",           "Informatik", "🤖", "LEGENDARY", "KI-Tyrann der alle Algorithmen und Datenstrukturen beherrscht.",         true),

  // ── MYTHIC (6) ──────────────────────────────────────────────────────────────
  b("kalkulon",          "KALKULON",                      "Mathematik", "🌠", "MYTHIC", "Lebendige Rechenmaschine. Mathematik in seiner reinsten — tödlichsten — Form.", true),
  b("schwarzer-prophet", "Der Schwarze Prophet",          "Deutsch",    "🖤", "MYTHIC", "Prophezeit den Untergang der deutschen Sprache. Muss gestoppt werden.",          true),
  b("last-tongue",       "The Last Tongue",               "Englisch",   "🌐", "MYTHIC", "The final guardian of the English language. No mercy.",                          true),
  b("urmutter-null",     "Urmutter Null",                 "Biologie",   "🦠", "MYTHIC", "Urbeginn allen Lebens. Wer sie besiegt kennt Biologie in Vollendung.",           true),
  b("schroedingers-herrscher", "Schrödingers Herrscher", "Physik",     "⚛️","MYTHIC", "Gleichzeitig tot und lebendig. Nur Quantenmechanik-Meister können ihn fassen.",  true),
  b("element-119",       "Phantom Element 119",           "Chemie",     "🔮", "MYTHIC", "Element jenseits des Periodensystems. Chemie an ihrer Grenze.",                  true),

  // ── SECRET (5) — alle Fächer ─────────────────────────────────────────────────
  b("omega-prime",       "OMEGA-PRIME",                   "Alle Fächer", "🌟", "SECRET", "Die Verkörperung des Verfalls. Alle Fächer auf einmal. Der Endgegner.",           true),
  b("magister-mortis",   "Magister Mortis",               "Alle Fächer", "👨‍🏫","SECRET", "Ein Lehrer der zur dunklen Seite wechselte. Weiß alles — und nutzt es gegen euch.", true),
  b("nullverstand",      "NULLVERSTAND",                  "Alle Fächer", "📚", "SECRET", "Das Nichtwissen als Wesen. Jede falsche Antwort stärkt ihn.",                     true),
  b("der-richter",       "Der Richter",                   "Alle Fächer", "📋", "SECRET", "Richtet über euer Wissen mit unfehlbarem Maßstab.",                              true),
  b("mastermind",        "MASTERMIND",                    "Alle Fächer", "🧠", "SECRET", "Der Verfall in seiner reinsten Form. Besiege ihn und rette das Wissen.",           true),
];

// ── Lookup helpers ────────────────────────────────────────────────────────────

export const BOSS_MAP = new Map<string, BossDef>(ALL_BOSSES.map((b) => [b.id, b]));

export const RARITY_COLOR: Record<BossRarity, string> = {
  COMMON:    "#9ca3af",
  UNCOMMON:  "#22c55e",
  RARE:      "#3b82f6",
  EPIC:      "#a855f7",
  LEGENDARY: "#f97316",
  MYTHIC:    "#ef4444",
  SECRET:    "#eab308",
};

export const RARITY_LABEL: Record<BossRarity, string> = {
  COMMON:    "Gewöhnlich",
  UNCOMMON:  "Ungewöhnlich",
  RARE:      "Selten",
  EPIC:      "Episch",
  LEGENDARY: "Legendär",
  MYTHIC:    "Mythisch",
  SECRET:    "Geheim",
};

export const SUBJECT_COLOR: Record<string, string> = {
  "Mathematik": "#3b82f6",
  "Deutsch":    "#ef4444",
  "Englisch":   "#22c55e",
  "Biologie":   "#10b981",
  "Physik":     "#8b5cf6",
  "Chemie":     "#f97316",
  "Geschichte": "#d97706",
  "Informatik": "#06b6d4",
  "Alle Fächer":"#eab308",
};

export function getBossTitle(bossId: string): string {
  const boss = BOSS_MAP.get(bossId);
  return boss ? `${boss.name}-Bezwinger` : "Unbekannter Bezwinger";
}

/** Scale HP/XP/Coins by player grade (5=1.0x baseline, 12=1.5x) */
export function scaledStats(boss: BossDef, grade: number) {
  const scale = 1 + (Math.max(5, Math.min(12, grade)) - 5) * (0.5 / 7);
  return {
    hp:    Math.round(boss.baseHp    * scale),
    xp:    Math.round(boss.baseXp    * scale),
    coins: Math.round(boss.baseCoins * scale),
  };
}
