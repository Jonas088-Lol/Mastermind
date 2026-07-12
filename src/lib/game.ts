/* Copyright 2026 Elian Schock, Jonas Schwenk */
// Core game engine: 500-level system, rank tiers, XP curves, titles, quests, combos

// ── Boss Tiers ────────────────────────────────────────────

export const BOSS_TIERS = {
  common:    { label: "Common",    color: "#9ca3af", border: "border-gray-400/50",   glow: "shadow-gray-400/20",   hp: 20,  coinReward: 8,   mvpCoinReward: 25,   xpReward: 100,  spawnWeight: 40 },
  uncommon:  { label: "Uncommon",  color: "#22c55e", border: "border-green-400/50",  glow: "shadow-green-400/20",  hp: 40,  coinReward: 18,  mvpCoinReward: 55,   xpReward: 200,  spawnWeight: 25 },
  rare:      { label: "Rare",      color: "#3b82f6", border: "border-blue-400/50",   glow: "shadow-blue-400/20",   hp: 70,  coinReward: 35,  mvpCoinReward: 110,  xpReward: 350,  spawnWeight: 15 },
  epic:      { label: "Epic",      color: "#a855f7", border: "border-purple-400/50", glow: "shadow-purple-400/20", hp: 120, coinReward: 70,  mvpCoinReward: 210,  xpReward: 600,  spawnWeight: 10 },
  legendary: { label: "Legendary", color: "#f97316", border: "border-orange-400/50", glow: "shadow-orange-400/20", hp: 200, coinReward: 140, mvpCoinReward: 420,  xpReward: 1000, spawnWeight: 6  },
  mythic:    { label: "Mythic",    color: "#ef4444", border: "border-red-400/50",    glow: "shadow-red-400/20",    hp: 350, coinReward: 280, mvpCoinReward: 840,  xpReward: 1800, spawnWeight: 3  },
  secret:    { label: "Secret",    color: "#eab308", border: "border-yellow-400/50", glow: "shadow-yellow-400/20", hp: 500, coinReward: 500, mvpCoinReward: 1500, xpReward: 3000, spawnWeight: 1  },
} as const;

export type BossTier = keyof typeof BOSS_TIERS;

export function randomBossTier(): BossTier {
  const total = Object.values(BOSS_TIERS).reduce((s, t) => s + t.spawnWeight, 0);
  let roll = Math.random() * total;
  for (const [key, val] of Object.entries(BOSS_TIERS) as [BossTier, typeof BOSS_TIERS[BossTier]][]) {
    roll -= val.spawnWeight;
    if (roll <= 0) return key;
  }
  return "common";
}

export const BOSS_SUBJECTS = [
  "mathematik", "deutsch", "englisch", "biologie", "physik", "chemie", "geschichte", "informatik",
] as const;

export type BossSubject = typeof BOSS_SUBJECTS[number];

export const BOSS_GRADES = [5, 6, 7, 8, 9, 10, 11, 12] as const;

// ── XP Curve ─────────────────────────────────────────────

const XP_PER_LEVEL_BREAKPOINTS: [number, number, number][] = [
  [1,   50,   100],
  [51,  100,  200],
  [101, 150,  500],
  [151, 200,  1000],
  [201, 250,  2000],
  [251, 300,  4000],
  [301, 350,  8000],
  [351, 400,  15000],
  [401, 430,  25000],
  [431, 450,  40000],
  [451, 470,  60000],
  [471, 485,  90000],
  [486, 495,  130000],
  [496, 499,  180000],
  [500, 500,  250000],
];

function xpNeededForLevel(level: number): number {
  for (const [start, end, xp] of XP_PER_LEVEL_BREAKPOINTS) {
    if (level >= start && level <= end) return xp;
  }
  return 250000;
}

export function levelFromXp(xp: number): number {
  let remaining = xp;
  for (let lvl = 1; lvl <= 500; lvl++) {
    const needed = xpNeededForLevel(lvl);
    if (remaining < needed) return lvl;
    remaining -= needed;
  }
  return 500;
}

export function xpForLevel(targetLevel: number): number {
  let total = 0;
  for (let lvl = 1; lvl < targetLevel; lvl++) {
    total += xpNeededForLevel(lvl);
  }
  return total;
}

export function xpToNextLevel(xp: number): number {
  const currentLevel = levelFromXp(xp);
  if (currentLevel >= 500) return 0;
  const levelStartXp = xpForLevel(currentLevel);
  const xpInCurrentLevel = xp - levelStartXp;
  return xpNeededForLevel(currentLevel) - xpInCurrentLevel;
}

export function xpProgressInLevel(xp: number): number {
  const currentLevel = levelFromXp(xp);
  if (currentLevel >= 500) return 100;
  const levelStartXp = xpForLevel(currentLevel);
  const xpInCurrentLevel = xp - levelStartXp;
  const needed = xpNeededForLevel(currentLevel);
  return Math.round((xpInCurrentLevel / needed) * 100);
}

// ── Rank Tiers ────────────────────────────────────────────

export interface RankTier {
  name: string;
  nameDE: string;
  minLevel: number;
  maxLevel: number;
  color: string;
  gradient: string;
  icon: string;
  border: string;
}

export const RANK_TIERS: RankTier[] = [
  { name: "Rookie",       nameDE: "Rookie",        minLevel: 1,   maxLevel: 10,  color: "#9ca3af", gradient: "from-gray-400 to-gray-600",       icon: "🥉", border: "border-gray-400" },
  { name: "Beginner",     nameDE: "Anfänger",       minLevel: 11,  maxLevel: 25,  color: "#78716c", gradient: "from-stone-400 to-stone-600",     icon: "📚", border: "border-stone-400" },
  { name: "Learner",      nameDE: "Lernender",      minLevel: 26,  maxLevel: 50,  color: "#16a34a", gradient: "from-green-500 to-emerald-600",   icon: "🌱", border: "border-green-500" },
  { name: "Scholar",      nameDE: "Gelehrter",      minLevel: 51,  maxLevel: 100, color: "#0ea5e9", gradient: "from-sky-400 to-blue-600",        icon: "📖", border: "border-sky-400" },
  { name: "Advanced",     nameDE: "Fortgeschritten",minLevel: 101, maxLevel: 150, color: "#8b5cf6", gradient: "from-violet-500 to-purple-700",  icon: "⚡", border: "border-violet-500" },
  { name: "Expert",       nameDE: "Experte",        minLevel: 151, maxLevel: 200, color: "#f59e0b", gradient: "from-amber-400 to-orange-600",   icon: "🔥", border: "border-amber-400" },
  { name: "Master",       nameDE: "Meister",        minLevel: 201, maxLevel: 250, color: "#ef4444", gradient: "from-red-400 to-rose-700",       icon: "⚔️", border: "border-red-400" },
  { name: "Grandmaster",  nameDE: "Großmeister",    minLevel: 251, maxLevel: 300, color: "#ec4899", gradient: "from-pink-400 to-rose-600",      icon: "💎", border: "border-pink-400" },
  { name: "Elite",        nameDE: "Elite",          minLevel: 301, maxLevel: 350, color: "#06b6d4", gradient: "from-cyan-400 to-teal-600",      icon: "🏆", border: "border-cyan-400" },
  { name: "Champion",     nameDE: "Champion",       minLevel: 351, maxLevel: 400, color: "#f97316", gradient: "from-orange-400 to-red-600",     icon: "👑", border: "border-orange-400" },
  { name: "Legend",       nameDE: "Legende",        minLevel: 401, maxLevel: 430, color: "#eab308", gradient: "from-yellow-400 to-amber-600",   icon: "⭐", border: "border-yellow-400" },
  { name: "Mythic",       nameDE: "Mythisch",       minLevel: 431, maxLevel: 450, color: "#a855f7", gradient: "from-purple-400 to-fuchsia-600", icon: "🌌", border: "border-purple-400" },
  { name: "Immortal",     nameDE: "Unsterblich",    minLevel: 451, maxLevel: 470, color: "#06b6d4", gradient: "from-cyan-300 to-purple-600",    icon: "💫", border: "border-cyan-300" },
  { name: "Titan",        nameDE: "Titan",          minLevel: 471, maxLevel: 499, color: "#dc2626", gradient: "from-red-500 to-rose-400",        icon: "⚡", border: "border-red-500" },
  { name: "Godlike",      nameDE: "Gottgleich",     minLevel: 500, maxLevel: 500, color: "#fbbf24", gradient: "from-yellow-300 via-orange-400 to-red-500", icon: "🌟", border: "border-yellow-300" },
];

export function getRankForLevel(level: number): RankTier {
  for (let i = RANK_TIERS.length - 1; i >= 0; i--) {
    if (level >= RANK_TIERS[i].minLevel) return RANK_TIERS[i];
  }
  return RANK_TIERS[0];
}

export function getRankForXp(xp: number): RankTier {
  return getRankForLevel(levelFromXp(xp));
}

// ── Prestige System ───────────────────────────────────────

export const PRESTIGE_COLORS = [
  "#9ca3af", // P0 - Silver
  "#ef4444", // P1 - Red
  "#f97316", // P2 - Orange
  "#eab308", // P3 - Gold
  "#22c55e", // P4 - Emerald
  "#06b6d4", // P5 - Cyan
  "#8b5cf6", // P6 - Purple
  "#ec4899", // P7 - Pink
  "#f59e0b", // P8 - Amber
  "#0ea5e9", // P9 - Sky
  "#fbbf24", // P10 - Mythic Gold
];

export function prestigeColor(prestige: number): string {
  return PRESTIGE_COLORS[Math.min(prestige, PRESTIGE_COLORS.length - 1)];
}

// ── Combo System ──────────────────────────────────────────

export function comboMultiplier(combo: number): number {
  if (combo < 3)  return 1.0;
  if (combo < 5)  return 1.25;
  if (combo < 10) return 1.5;
  if (combo < 20) return 2.0;
  if (combo < 30) return 2.5;
  if (combo < 50) return 3.0;
  return 4.0;
}

export function comboLabel(combo: number): string {
  if (combo < 3)  return "";
  if (combo < 5)  return "Kombo!";
  if (combo < 10) return "Heiß!";
  if (combo < 20) return "Unstoppbar!";
  if (combo < 30) return "Legendär!";
  if (combo < 50) return "Göttergleich!";
  return "MYTHISCH!!!";
}

// ── Titles ────────────────────────────────────────────────

export interface Title {
  slug: string;
  name: string;
  description: string;
  color: string;
  rarity: "common" | "uncommon" | "rare" | "epic" | "legendary" | "mythic";
  unlockHint: string;
  icon: string;
}

export const ALL_TITLES: Title[] = [
  // Starter
  { slug: "erster_schritt",     name: "Erster Schritt",      description: "Willkommen bei MasterMind",      color: "#9ca3af", rarity: "common",    unlockHint: "Logge dich ein",             icon: "👣" },
  { slug: "fleissig",           name: "Fleißig",             description: "5 Aufgaben abgegeben",           color: "#22c55e", rarity: "common",    unlockHint: "5 Aufgaben abgeben",         icon: "📚" },
  { slug: "neuling",            name: "Neuling",             description: "Level 5 erreicht",               color: "#6b7280", rarity: "common",    unlockHint: "Level 5 erreichen",          icon: "🌱" },
  // Level Titles
  { slug: "scholar",            name: "Gelehrter",           description: "Level 50 erreicht",              color: "#0ea5e9", rarity: "uncommon",  unlockHint: "Level 50 erreichen",         icon: "📖" },
  { slug: "experte",            name: "Experte",             description: "Level 100 erreicht",             color: "#8b5cf6", rarity: "rare",      unlockHint: "Level 100 erreichen",        icon: "🔬" },
  { slug: "meister",            name: "Meister",             description: "Level 200 erreicht",             color: "#ef4444", rarity: "epic",      unlockHint: "Level 200 erreichen",        icon: "⚔️" },
  { slug: "grossmeister",       name: "Großmeister",         description: "Level 300 erreicht",             color: "#ec4899", rarity: "legendary", unlockHint: "Level 300 erreichen",        icon: "💎" },
  { slug: "legende",            name: "Legende",             description: "Level 400 erreicht",             color: "#eab308", rarity: "legendary", unlockHint: "Level 400 erreichen",        icon: "⭐" },
  { slug: "gottgleich",         name: "Gottgleich",          description: "Level 500 erreicht",             color: "#fbbf24", rarity: "mythic",    unlockHint: "Level 500 erreichen",        icon: "🌟" },
  // Streak Titles
  { slug: "durchhalter",        name: "Durchhalter",         description: "7 Tage Streak",                  color: "#f97316", rarity: "uncommon",  unlockHint: "7 Tage hintereinander lernen", icon: "🔥" },
  { slug: "unverzichtbar",      name: "Unverzichtbar",       description: "30 Tage Streak",                 color: "#ef4444", rarity: "rare",      unlockHint: "30 Tage Streak",             icon: "🔥" },
  { slug: "eisern",             name: "Eiserne Disziplin",   description: "100 Tage Streak",                color: "#06b6d4", rarity: "epic",      unlockHint: "100 Tage Streak",            icon: "⚡" },
  // XP Titles
  { slug: "xp_hunter",         name: "XP-Jäger",            description: "500 XP gesammelt",               color: "#8b5cf6", rarity: "common",    unlockHint: "500 XP sammeln",             icon: "⚡" },
  { slug: "xp_veteran",        name: "XP-Veteran",          description: "5000 XP gesammelt",              color: "#a855f7", rarity: "uncommon",  unlockHint: "5000 XP sammeln",            icon: "💜" },
  { slug: "xp_overlord",       name: "XP-Overlord",         description: "50000 XP gesammelt",             color: "#dc2626", rarity: "legendary", unlockHint: "50000 XP sammeln",           icon: "👹" },
  // Achievement Titles
  { slug: "achievement_hunter",name: "Achievement-Jäger",   description: "10 Achievements freigeschaltet", color: "#22c55e", rarity: "rare",      unlockHint: "10 Achievements freischalten", icon: "🏆" },
  { slug: "boss_slayer",       name: "Boss-Bezwinger",       description: "Ersten Boss besiegt",            color: "#ef4444", rarity: "epic",      unlockHint: "Boss-Battle gewinnen",       icon: "⚔️" },
  { slug: "speed_demon",       name: "Speed-Dämon",          description: "Aufgabe in Rekordzeit gelöst",   color: "#eab308", rarity: "rare",      unlockHint: "Sehr schnell lösen",         icon: "⚡" },
  { slug: "quiz_master",       name: "Quiz-Master",          description: "100 Fragen richtig",             color: "#0ea5e9", rarity: "epic",      unlockHint: "100 Fragen korrekt",         icon: "🎯" },
  { slug: "prestige_1",        name: "Wiedergeboren",        description: "Prestige 1 erreicht",            color: "#ef4444", rarity: "legendary", unlockHint: "Level 500 + Prestige",       icon: "♻️" },
  // Season Titles
  { slug: "season_champion",   name: "Saison-Champion",      description: "Saison Top 3 Abschluss",         color: "#fbbf24", rarity: "legendary", unlockHint: "Saison-Top-3",               icon: "🏆" },
  // Mythic
  { slug: "the_one",           name: "The One",              description: "Schulbester aller Zeiten",       color: "#fbbf24", rarity: "mythic",    unlockHint: "Nr. 1 in der Schule",        icon: "🌟" },
];

export const RARITY_COLORS: Record<string, string> = {
  common:    "#9ca3af",
  uncommon:  "#22c55e",
  rare:      "#3b82f6",
  epic:      "#a855f7",
  legendary: "#f59e0b",
  mythic:    "#ec4899",
};

export const RARITY_LABELS: Record<string, string> = {
  common:    "Gewöhnlich",
  uncommon:  "Ungewöhnlich",
  rare:      "Selten",
  epic:      "Episch",
  legendary: "Legendär",
  mythic:    "Mythisch",
};

// ── Quests ────────────────────────────────────────────────

export interface QuestDef {
  slug: string;
  title: string;
  description: string;
  lore: string;
  type: "daily" | "weekly" | "monthly" | "event" | "hidden" | "story";
  category: string;
  targetCount: number;
  xpReward: number;
  icon: string;
  difficulty: "easy" | "normal" | "hard" | "epic" | "legendary";
  rarity: "common" | "uncommon" | "rare" | "epic" | "legendary";
  titleReward?: string;
}

export const DAILY_QUEST_POOL: QuestDef[] = [
  { slug: "daily_login",      title: "Tägliches Einchecken",   description: "Logge dich ein",                  lore: "Der erste Schritt zum Sieg.",                type: "daily", category: "login",      targetCount: 1,  xpReward: 20,  icon: "☀️", difficulty: "easy",      rarity: "common" },
  { slug: "daily_exercise_3", title: "Übungs-Sprint",          description: "Löse 3 Übungsaufgaben",           lore: "Übung macht den Meister.",                   type: "daily", category: "exercise",   targetCount: 3,  xpReward: 50,  icon: "⚡", difficulty: "easy",      rarity: "common" },
  { slug: "daily_exercise_5", title: "Aufgaben-Kette",         description: "Löse 5 Übungsaufgaben",           lore: "Fünf Schritte zum Erfolg.",                  type: "daily", category: "exercise",   targetCount: 5,  xpReward: 80,  icon: "🔗", difficulty: "normal",    rarity: "common" },
  { slug: "daily_flashcard_10",title: "Karteikarten-Runde",    description: "Beantworte 10 Karteikarten",      lore: "Wiederholung ist der Schlüssel.",             type: "daily", category: "flashcard",  targetCount: 10, xpReward: 60,  icon: "🃏", difficulty: "easy",      rarity: "common" },
  { slug: "daily_flashcard_20",title: "Karten-Marathon",       description: "Beantworte 20 Karteikarten",      lore: "Dein Gedächtnis wird stärker.",               type: "daily", category: "flashcard",  targetCount: 20, xpReward: 100, icon: "🃏", difficulty: "normal",    rarity: "uncommon" },
  { slug: "daily_submission",  title: "Aufgaben-Abgabe",       description: "Gib eine Aufgabe ab",             lore: "Abgabe ist besser als Perfektion.",           type: "daily", category: "submission", targetCount: 1,  xpReward: 40,  icon: "📤", difficulty: "normal",    rarity: "common" },
  { slug: "daily_streak",      title: "Streak erhalten",       description: "Halte deinen Streak aufrecht",    lore: "Konstanz schlägt Talent.",                   type: "daily", category: "streak",     targetCount: 1,  xpReward: 30,  icon: "🔥", difficulty: "easy",      rarity: "common" },
  { slug: "daily_combo_5",     title: "Kombo-Starter",         description: "Erreiche ein 5er-Kombo",          lore: "Fünf Richtige in Folge!",                    type: "daily", category: "exercise",   targetCount: 1,  xpReward: 75,  icon: "⚡", difficulty: "normal",    rarity: "uncommon" },
  { slug: "daily_perfect",     title: "Fehlerlos",             description: "Löse 5 Aufgaben ohne Fehler",     lore: "Perfektion ist erreichbar.",                 type: "daily", category: "exercise",   targetCount: 5,  xpReward: 120, icon: "✨", difficulty: "hard",      rarity: "rare" },
  { slug: "daily_duel",        title: "Duell-Abend",           description: "Gewinne ein Duell",               lore: "Herausforderungen schweißen zusammen.",      type: "daily", category: "duel",       targetCount: 1,  xpReward: 100, icon: "⚔️", difficulty: "normal",    rarity: "uncommon" },
];

export const WEEKLY_QUEST_POOL: QuestDef[] = [
  { slug: "weekly_exercise_25", title: "Wöchentlicher Athlet",  description: "Löse 25 Übungsaufgaben",         lore: "Eine Woche voller Siege.",                   type: "weekly", category: "exercise",   targetCount: 25, xpReward: 300, icon: "🏋️", difficulty: "hard",     rarity: "uncommon" },
  { slug: "weekly_exercise_50", title: "Übungs-Titan",          description: "Löse 50 Übungsaufgaben",         lore: "Titanenhafter Fleiß.",                       type: "weekly", category: "exercise",   targetCount: 50, xpReward: 600, icon: "💪", difficulty: "epic",     rarity: "rare" },
  { slug: "weekly_flashcard_100", title: "Karten-Legende",      description: "100 Karteikarten beantwortet",   lore: "Hundert ist nur der Anfang.",                type: "weekly", category: "flashcard",  targetCount: 100, xpReward: 400, icon: "🃏", difficulty: "hard",    rarity: "uncommon" },
  { slug: "weekly_streak_7",    title: "Wochenheld",            description: "7 Tage Streak aufrechterhalten", lore: "Eine ganze Woche ohne Aussetzer.",            type: "weekly", category: "streak",     targetCount: 7,  xpReward: 500, icon: "🔥", difficulty: "hard",     rarity: "rare", titleReward: "durchhalter" },
  { slug: "weekly_submission_5",title: "Fleißige Hände",        description: "5 Aufgaben abgegeben",           lore: "Wer viel gibt, bekommt viel.",                type: "weekly", category: "submission", targetCount: 5,  xpReward: 350, icon: "📤", difficulty: "normal",   rarity: "uncommon" },
  { slug: "weekly_duel_5",      title: "Duell-Veteran",         description: "5 Duelle gewonnen",              lore: "Kampf gegen die Besten.",                    type: "weekly", category: "duel",       targetCount: 5,  xpReward: 450, icon: "⚔️", difficulty: "hard",    rarity: "rare" },
  { slug: "weekly_combo_10",    title: "Kombo-König",           description: "10er-Kombo erreichen",           lore: "Zehn Richtige – unschlagbar.",                type: "weekly", category: "exercise",   targetCount: 1,  xpReward: 400, icon: "👑", difficulty: "epic",     rarity: "epic" },
  { slug: "weekly_allrounder",  title: "Allrounder",            description: "3 verschiedene Fächer üben",     lore: "Vielseitigkeit ist Stärke.",                 type: "weekly", category: "exercise",   targetCount: 3,  xpReward: 350, icon: "🌟", difficulty: "normal",   rarity: "uncommon" },
];

export const MONTHLY_QUEST_POOL: QuestDef[] = [
  { slug: "monthly_exercise_200", title: "Monatlicher Krieger",description: "200 Übungsaufgaben lösen",        lore: "Ein ganzer Monat voller Siege.",             type: "monthly", category: "exercise",  targetCount: 200, xpReward: 2000, icon: "⚔️", difficulty: "legendary", rarity: "legendary" },
  { slug: "monthly_streak_30",   title: "Monatschampion",      description: "30 Tage Streak",                  lore: "30 Tage ohne Unterbrechung.",                type: "monthly", category: "streak",    targetCount: 30,  xpReward: 3000, icon: "🏆", difficulty: "legendary", rarity: "legendary", titleReward: "unverzichtbar" },
  { slug: "monthly_submission_20",title: "Aufgaben-Legende",   description: "20 Aufgaben abgeben",             lore: "Legender Fleiß.",                            type: "monthly", category: "submission",targetCount: 20,  xpReward: 1500, icon: "📚", difficulty: "epic",      rarity: "epic" },
  { slug: "monthly_flashcard_500",title: "Gedächtnis-God",     description: "500 Karteikarten beantwortet",   lore: "Dein Gedächtnis ist unfehlbar.",             type: "monthly", category: "flashcard", targetCount: 500, xpReward: 2500, icon: "🧠", difficulty: "epic",      rarity: "epic" },
  { slug: "monthly_xp_5000",     title: "XP-Titan",            description: "5000 XP in einem Monat",         lore: "Fünftausend in 30 Tagen.",                   type: "monthly", category: "xp",        targetCount: 5000,xpReward: 4000, icon: "⚡", difficulty: "legendary", rarity: "legendary", titleReward: "xp_veteran" },
];

export const HIDDEN_QUEST_POOL: QuestDef[] = [
  { slug: "hidden_night_owl",   title: "???",                  description: "???",                             lore: "Manche lernen wenn andere schlafen.",        type: "hidden", category: "login",    targetCount: 1,  xpReward: 200, icon: "🦉", difficulty: "epic",      rarity: "rare" },
  { slug: "hidden_speed_run",   title: "???",                  description: "???",                             lore: "Blitzschnell durch die Aufgaben.",           type: "hidden", category: "exercise", targetCount: 10, xpReward: 300, icon: "⚡", difficulty: "epic",      rarity: "epic" },
  { slug: "hidden_perfectionist",title: "???",                 description: "???",                             lore: "Null Fehler. Null Kompromisse.",             type: "hidden", category: "exercise", targetCount: 20, xpReward: 500, icon: "💎", difficulty: "legendary", rarity: "legendary" },
];

// ── Season Pass Tiers ─────────────────────────────────────

export interface SeasonTier {
  tier: number;
  xpRequired: number;
  reward: string;
  rewardType: "xp" | "title" | "cosmetic" | "powerup";
  icon: string;
  isPremium: boolean;
}

export function generateSeasonTiers(seasonNumber: number): SeasonTier[] {
  const tiers: SeasonTier[] = [];
  for (let t = 1; t <= 50; t++) {
    const xpRequired = t * 200 + (t * t * 10);
    const isPremium = t % 10 === 0;
    let reward = `${t * 25} XP`;
    let rewardType: SeasonTier["rewardType"] = "xp";
    let icon = "⚡";
    if (t === 10) { reward = "Titel: Saison-Held";        rewardType = "title";    icon = "🏅"; }
    if (t === 20) { reward = "XP-Booster ×1.5 (1 Tag)";   rewardType = "powerup";  icon = "🚀"; }
    if (t === 30) { reward = "Titel: Saison-Veteran";      rewardType = "title";    icon = "🎖️"; }
    if (t === 40) { reward = "XP-Booster ×2 (3 Tage)";    rewardType = "powerup";  icon = "💥"; }
    if (t === 50) { reward = "Titel: Saison-Champion";     rewardType = "title";    icon = "🏆"; }
    tiers.push({ tier: t, xpRequired, reward, rewardType, icon, isPremium });
  }
  return tiers;
}

// ── Daily Login Rewards ───────────────────────────────────

export const LOGIN_REWARD_SCHEDULE: { day: number; xp: number; bonus: string; icon: string }[] = [
  { day: 1, xp: 20,  bonus: "",                    icon: "☀️" },
  { day: 2, xp: 30,  bonus: "",                    icon: "⚡" },
  { day: 3, xp: 50,  bonus: "+5 XP Bonus",         icon: "🎯" },
  { day: 4, xp: 40,  bonus: "",                    icon: "📚" },
  { day: 5, xp: 60,  bonus: "+10 XP Bonus",        icon: "🔥" },
  { day: 6, xp: 80,  bonus: "+20 XP Bonus",        icon: "💎" },
  { day: 7, xp: 150, bonus: "Wochenbonus! ×2 XP",  icon: "🏆" },
];

// ── Boss Index (75 Bosse mit fixen Tiers) ─────────────────

export interface BossIndexEntry {
  slug: string;
  name: string;
  icon: string;
  tier: BossTier;
  subject: string;
  description: string;
  lore: string;
}

export const BOSS_INDEX: BossIndexEntry[] = [
  // ─ Common (20) ─────────────────────────────────────────
  { slug: "rechenfehler_kobold",    tier: "common",    icon: "👺", name: "Zahlenschatten",          subject: "Mathematik",  description: "Geist der Unschärfe, der Rechenwege verdunkelt",       lore: "Er taucht auf wenn die Konzentration nachlässt — und dreht Zahlen ins Falsche."      },
  { slug: "tippfehler_geist",       tier: "common",    icon: "👻", name: "Schriftpest",             subject: "Deutsch",     description: "Unsichtbares Wesen das Buchstaben korrumpiert",         lore: "Kein Text ist vor ihr sicher. Sie hinterlässt Spuren in jedem Wort."                },
  { slug: "vokabel_wicht",          tier: "common",    icon: "🤧", name: "Gedankenschleier",        subject: "Englisch",    description: "Legt einen Nebel über erlernte Wörter",                 lore: "Was du heute lernst, löscht er morgen. Leise. Unaufhaltsam."                        },
  { slug: "komma_kobold",           tier: "common",    icon: "🍄", name: "Chaoskeim",               subject: "Deutsch",     description: "Winziges Wesen, das aus Ordnung Chaos macht",           lore: "Er braucht nur einen falschen Beistrich, um einen Satz zu zerstören."               },
  { slug: "additions_geist",        tier: "common",    icon: "➕", name: "Rechenfluch",             subject: "Mathematik",  description: "Ein alter Fluch, der sich in Rechnungen versteckt",    lore: "Aus der Dunkelheit mathematischer Fehler geboren. Er addiert falsch."               },
  { slug: "diktat_unhold",          tier: "common",    icon: "📝", name: "Tintenklaue",             subject: "Deutsch",     description: "Korrumpiert das geschriebene Wort",                     lore: "Ihre Klauen hinterlassen Spuren in jedem Diktat, das je geschrieben wurde."         },
  { slug: "bruch_popanz",           tier: "common",    icon: "🐸", name: "Bruchdämon",              subject: "Mathematik",  description: "Verdreht Zähler und Nenner nach Belieben",              lore: "Er macht Brüche unlösbar — und lacht über jeden Fehler."                            },
  { slug: "winkel_grummel",         tier: "common",    icon: "📐", name: "Winkelfinsternis",        subject: "Mathematik",  description: "Verbirgt Winkel in einem Schleier aus Dunkel",          lore: "90° oder 270°? In seiner Gegenwart verliert jede Messung ihren Sinn."               },
  { slug: "einmaleins_riese",       tier: "common",    icon: "🔢", name: "Der Erste Wächter",       subject: "Mathematik",  description: "Uralt und träge — doch tödlich für Unvorbereite",      lore: "Er bewacht die Grundrechenarten. Wer ihn unterschätzt, scheitert an Schritt 1."     },
  { slug: "aufsatz_affe",           tier: "common",    icon: "🐒", name: "Wortfresser",             subject: "Deutsch",     description: "Verschlingt Argumente und reißt Strukturen nieder",    lore: "Er frisst Thesen und spuckt Wirrwarr aus. Kein Aufsatz bleibt heil."               },
  { slug: "silben_schlange",        tier: "common",    icon: "🐍", name: "Silbengift",              subject: "Deutsch",     description: "Injiziert Fehler in Trennungen und Silbenfolgen",       lore: "Ihr Gift schleicht sich in jede Silbe — unmerklich, tödlich für Noten."             },
  { slug: "woerter_wirbelwind",     tier: "common",    icon: "🌪️", name: "Sprachbrand",             subject: "Englisch",    description: "Verbrennt Sprachregeln mit roher Kraft",               lore: "to, two, too — er macht aus drei Wörtern eine Katastrophe."                        },
  { slug: "natur_kobold",           tier: "common",    icon: "🌿", name: "Dornenwurm",              subject: "Biologie",    description: "Parasit des biologischen Wissens",                      lore: "Er gräbt sich in Pflanzenbezeichnungen und verdreht Namen."                        },
  { slug: "tier_troll",             tier: "common",    icon: "🐊", name: "Klauenschatten",          subject: "Biologie",    description: "Dunkler Bewacher falscher Tierklassen",                  lore: "Säugetier oder Reptil? Er entscheidet, und es ist immer falsch."                   },
  { slug: "formel_faulpelz",        tier: "common",    icon: "💤", name: "Formeldunkel",            subject: "Chemie",      description: "Verbirgt chemische Formeln im Nichts",                  lore: "H₂O oder H₃O⁺? In seinem Dunkel verschwimmt die Wahrheit."                        },
  { slug: "histoerchen_heinz",      tier: "common",    icon: "📜", name: "Zeitfälscher",            subject: "Geschichte",  description: "Manipuliert Jahreszahlen bis zur Unkenntlichkeit",      lore: "Er war bei jedem Ereignis dabei — und erinnert sich an nichts korrekt."            },
  { slug: "code_kueken",            tier: "common",    icon: "🐣", name: "Byteschatten",            subject: "Informatik",  description: "Korrumpiert Code im Verborgenen",                       lore: "Ein Schatten im Quellcode. Zeile 1 — Syntaxfehler. Immer."                         },
  { slug: "lese_lulatsch",          tier: "common",    icon: "📖", name: "Schleiergeist",           subject: "Deutsch",     description: "Legt einen Schleier über das Verständnis",              lore: "Er verrutscht Bedeutungen wenn du liest. Niemand merkt es, bis es zu spät ist."    },
  { slug: "zeiger_zwerg",           tier: "common",    icon: "🕐", name: "Uhrenfluch",              subject: "Mathematik",  description: "Alter Fluch der alle Zeitberechnungen verdreht",        lore: "Viertel nach oder vor? Er existiert, damit du nie sicher bist."                    },
  { slug: "daten_wicht",            tier: "common",    icon: "💾", name: "Datenpest",               subject: "Informatik",  description: "Infiziert gespeicherte Daten mit Fehlern",              lore: "Ctrl+S schützt dich nicht. Die Pest ist bereits im System."                        },
  // ─ Uncommon (15) ───────────────────────────────────────
  { slug: "algebra_kobold",         tier: "uncommon",  icon: "🧮", name: "Gleichungshexer",         subject: "Mathematik",  description: "Verhext Gleichungen und macht sie unlösbar",            lore: "x = ? Er kennt die Antwort. Er wird sie dir nicht sagen."                          },
  { slug: "grammatik_gespenst",     tier: "uncommon",  icon: "👻", name: "Grammatikwraith",         subject: "Deutsch",     description: "Ein Wraith aus toten Grammatikregeln",                  lore: "Er verfolgt jeden Satz — und stirbt nicht, wenn du ihn ignorierst."                },
  { slug: "vokabel_verdreher",      tier: "uncommon",  icon: "🌀", name: "Bedeutungsdieb",          subject: "Englisch",    description: "Stiehlt die wahre Bedeutung von Wörtern",               lore: "False friends existieren, weil er sie erschaffen hat."                             },
  { slug: "redewendungs_raeuber",   tier: "uncommon",  icon: "🦅", name: "Sprachverderber",         subject: "Deutsch",     description: "Verdirbt Redewendungen von innen heraus",               lore: "Den Nagel auf den Kopf — er reißt den Nagel heraus."                               },
  { slug: "gleichungs_geist",       tier: "uncommon",  icon: "📊", name: "Gleichungsteufel",        subject: "Mathematik",  description: "Teufel der linearen und quadratischen Gleichungen",     lore: "y = mx + b wird in seiner Gegenwart zu einem Irrtum."                              },
  { slug: "bio_blender",            tier: "uncommon",  icon: "🧬", name: "Genkorruptor",            subject: "Biologie",    description: "Korrumpiert genetische Informationen",                  lore: "Er hat Mendels Erbsen vertauscht. Er tut es immer noch."                           },
  { slug: "physik_poltergeist",     tier: "uncommon",  icon: "💨", name: "Kraftfeldpolter",         subject: "Physik",      description: "Tobt durch Kraftfelder und reißt Formeln nieder",       lore: "Kräfte, Beschleunigung, Impuls — er bringt alles aus dem Gleichgewicht."           },
  { slug: "element_elf",            tier: "uncommon",  icon: "🧪", name: "Elektronenjäger",         subject: "Chemie",      description: "Jagt und entfernt Elektronen aus Formeln",              lore: "Na = Natrium? Er hat das schon immer bezweifelt."                                  },
  { slug: "jahres_geist",           tier: "uncommon",  icon: "📅", name: "Jahrhundertjäger",        subject: "Geschichte",  description: "Jagt historische Wahrheiten durch die Jahrhunderte",   lore: "1914 oder 1918? Beide falsch. Er hat die Zeit umgeschrieben."                      },
  { slug: "stochastik_schreck",     tier: "uncommon",  icon: "🎲", name: "Zufallsdämon",            subject: "Mathematik",  description: "Macht Wahrscheinlichkeiten zur reinen Willkür",         lore: "50 %? Für ihn ist jede Zahl eine Lüge — außer seiner."                            },
  { slug: "funktions_fresser",      tier: "uncommon",  icon: "📈", name: "Graphenbrecher",          subject: "Mathematik",  description: "Bricht Funktionsgraphen und vernichtet Nullstellen",    lore: "Er frisst Schnittpunkte. Kein Graph überlebt ihn unberührt."                       },
  { slug: "poesie_phantom",         tier: "uncommon",  icon: "🎭", name: "Reimtöter",               subject: "Deutsch",     description: "Tötet Verse und bricht Metren",                         lore: "Kein Gedicht hat je seinen Blick überlebt. Er nennt sich Kritiker."                },
  { slug: "kurven_kobold",          tier: "uncommon",  icon: "📉", name: "Geometrieschänder",       subject: "Mathematik",  description: "Schändet geometrische Figuren bis zur Unkenntlichkeit", lore: "Ein Kreis? Er verwandelt ihn in ein Oval und schweigt."                            },
  { slug: "algorithmen_geist",      tier: "uncommon",  icon: "🔮", name: "Codebrecher",             subject: "Informatik",  description: "Bricht Algorithmen mit einem einzigen Fehler",          lore: "Sortieren scheitert. Suchen scheitert. Er ist die Ursache."                        },
  { slug: "ausdruck_ausrufer",      tier: "uncommon",  icon: "📢", name: "Rhetoriktöter",           subject: "Deutsch",     description: "Vernichtet Stilmittel und sprachliche Eleganz",         lore: "Metapher oder Ironie — es ist ihm egal. Er tötet beides."                          },
  // ─ Rare (12) ───────────────────────────────────────────
  { slug: "gleichungs_ghul",        tier: "rare",      icon: "🧟", name: "Algebraghul",             subject: "Mathematik",  description: "Untoter Feind aller quadratischen Gleichungen",         lore: "Er frisst Diskriminanten zum Frühstück und lacht über jede Wurzel."                },
  { slug: "syntax_specter",         tier: "rare",      icon: "👁️", name: "Syntaxspecter",           subject: "Deutsch",     description: "Geisterhafter Wächter zerbrochener Satzkonstruktionen", lore: "Er lebt in jedem Nebensatz — und niemand sieht ihn kommen."                       },
  { slug: "grammar_goblin",         tier: "rare",      icon: "🧌", name: "Grammatikgreif",          subject: "Englisch",    description: "Greif der englischen Grammatik, wild und unberechenbar", lore: "Present Perfect und Simple Past — er tauscht sie aus. Täglich."                  },
  { slug: "zellteilung_zombie",     tier: "rare",      icon: "🧫", name: "Zellenzerstörer",         subject: "Biologie",    description: "Untotes Wesen das Zellteilung sabotiert",               lore: "Interphase, Prophase, Metaphase — er mischt sie, bis nichts mehr stimmt."          },
  { slug: "wellen_wraith",          tier: "rare",      icon: "🌊", name: "Wellen-Wraith",           subject: "Physik",      description: "Wraith der Wellenmechanik aus den Tiefen der Physik",   lore: "Frequenz und Amplitude — für ihn sind das Lügen. Alles ist gleich."               },
  { slug: "reaktions_raecher",      tier: "rare",      icon: "⚗️", name: "Elementarbrecher",        subject: "Chemie",      description: "Bricht chemische Gleichgewichte mit bloßer Existenz",   lore: "Keine Reaktionsgleichung überlebt ihn ausgeglichen. Das ist sein Werk."            },
  { slug: "historien_horror",       tier: "rare",      icon: "🏛️", name: "Chronospeiniger",         subject: "Geschichte",  description: "Peinigt die Chronologie der Geschichte",                lore: "Ursache und Wirkung — er dreht sie permanent um. Die Geschichte weint."            },
  { slug: "logarithmen_lich",       tier: "rare",      icon: "💀", name: "Das Logarithmen-Lich",    subject: "Mathematik",  description: "Unsterblicher Lich aus dem Reich der Potenzen",         lore: "log₂(8) = 3? Er besteht auf einer anderen Antwort. Für die Ewigkeit."             },
  { slug: "photosyn_phaenomen",     tier: "rare",      icon: "🌱", name: "Lebensentzieher",         subject: "Biologie",    description: "Entzieht Lebewesen ihre biologische Essenz",            lore: "CO₂ + H₂O + Licht → Chaos. Er hat die Formel gelöscht."                           },
  { slug: "binaer_bestie",          tier: "rare",      icon: "💻", name: "Byteverschlinger",        subject: "Informatik",  description: "Verschlingt Binärdaten und korrumpiert Speicher",       lore: "0 und 1 — manchmal macht er daraus eine 2. Niemand weiß warum."                   },
  { slug: "optik_oger",             tier: "rare",      icon: "🔭", name: "Lichtbrecher",            subject: "Physik",      description: "Bricht Lichtstrahlen in unmögliche Winkel",             lore: "Reflexion? Refraktion? Er bricht Licht einfach weil er es kann."                   },
  { slug: "analyse_ungeheuer",      tier: "rare",      icon: "🔬", name: "Textverschlinger",        subject: "Deutsch",     description: "Verschlingt Textanalysen und lässt nur Trümmer übrig",  lore: "Struktur, Inhalt, Sprache — er zerstört die Reihenfolge, bis nichts mehr steht."  },
  // ─ Epic (10) ───────────────────────────────────────────
  { slug: "algebra_daemon",         tier: "epic",      icon: "👹", name: "Malachar der Algebradämon",  subject: "Mathematik", description: "Uralter Dämon, der die Welt der Gleichungen regiert",  lore: "Er existiert seit der Erfindung der negativen Zahlen. Kein x entkommt ihm."        },
  { slug: "grammatik_gorgon",       tier: "epic",      icon: "🐲", name: "Grammatikgorgon Medea",      subject: "Deutsch",    description: "Mythische Gorgon, ihr Blick versteinert Relativsätze", lore: "Sie hat Schiller gelesen. Und ihn für schlecht befunden."                          },
  { slug: "vokabel_vampir",         tier: "epic",      icon: "🧛", name: "Graf Vox der Gedankenvampir",subject: "Englisch",   description: "Vampirfürst, der Vokabeln aus Gedanken saugt",          lore: "Er hat die Sprache selbst erschaffen — nur um sie zu korrumpieren."                },
  { slug: "dna_drache",             tier: "epic",      icon: "🧬", name: "Helixdrache",               subject: "Biologie",   description: "Drache, dessen Schuppen aus doppelter DNA bestehen",   lore: "Seine Schuppen sind reine Erbinformation. Falsch transkribiert."                   },
  { slug: "physik_phantasm",        tier: "epic",      icon: "⚡", name: "Quantenphantom",            subject: "Physik",     description: "Existiert und nicht-existiert gleichzeitig",            lore: "Schrödingers Alptraum. Er ist in jedem Zustand zugleich — außer besiegt."          },
  { slug: "chemie_chimaere",        tier: "epic",      icon: "🧪", name: "Elementarchimäre",          subject: "Chemie",     description: "Chimäre aus falsch kombinierten Elementen",             lore: "Sie entstand aus einer fehlerhaften Reaktionsgleichung. Sie ist nicht korrigierbar." },
  { slug: "geschichte_golem",       tier: "epic",      icon: "🗿", name: "Chronosgolem",              subject: "Geschichte", description: "Golem aus versteinerten Jahreszahlen und falschen Daten",lore: "Er erinnert sich an alles, was du vergessen hast. Und nutzt es gegen dich."       },
  { slug: "code_krake",             tier: "epic",      icon: "🐙", name: "Die Datenkrake",            subject: "Informatik", description: "Digitales Ungeheuer aus Millionen fehlerhafter Zeilen", lore: "Sie entstand aus jedem Commit, das ohne Tests gepusht wurde."                      },
  { slug: "analysis_azmodan",       tier: "epic",      icon: "🌌", name: "Azmodan, Fürst der Kurven", subject: "Mathematik", description: "Dämonenfürst, der Grenzwerte ins Unendliche schickt",   lore: "Er hat alle Grenzwerte gesprengt. Die Analysis weint."                             },
  { slug: "wortschatz_wyvern",      tier: "epic",      icon: "🐉", name: "Wyrm des Vergessens",       subject: "Deutsch",    description: "Uralter Wyrm, der Wortschätze ins Vergessen treibt",   lore: "Ihr Feueratem verbrennt Synonyme. Kein Wort überlebt sie zweimal."                 },
  // ─ Legendary (7) ───────────────────────────────────────
  { slug: "mathe_monarch",          tier: "legendary", icon: "👑", name: "Zahlenkönig Xerath",       subject: "Mathematik",  description: "Uralter König, der über alle Zahlen regiert",           lore: "Er herrscht seit dem Ursprung der Mathematik. Kein Theorem ist vor ihm sicher."    },
  { slug: "deutsch_daemon",         tier: "legendary", icon: "📜", name: "Dunkler Sprachfürst",      subject: "Deutsch",     description: "Uralter Fürst der deutschen Sprache und ihrer Dunkelheit",lore: "Er hat Luther übersetzt. Und die Bibel danach korrigiert."                         },
  { slug: "englisch_emperor",       tier: "legendary", icon: "🦁", name: "Imperiator der Sprache",   subject: "Englisch",    description: "Imperialer Herrscher über alle Sprachformen",           lore: "Er hat Shakespeare erschaffen — nur um ihn am Ende zu vernichten."                  },
  { slug: "bio_behemoth",           tier: "legendary", icon: "🦕", name: "Urzeitbehemoth",           subject: "Biologie",    description: "Urwesen aus der Zeit vor dem Leben selbst",             lore: "Älter als die ersten Zellen. Größer als die Evolution. Gefährlicher als ein Virus." },
  { slug: "physik_phoenix",         tier: "legendary", icon: "🔥", name: "Phönix der Entropie",      subject: "Physik",      description: "Unsterblicher Phönix der Unordnung und des Chaos",     lore: "Er verbrennt in Gleichungen und entsteht aus Fehlern neu — für immer."             },
  { slug: "chemie_cerberus",        tier: "legendary", icon: "🐕", name: "Cerberus der Elemente",    subject: "Chemie",      description: "Dreiköpfiger Wächter der chemischen Unterwelt",         lore: "Drei Köpfe für Anorganik, Organik, Biochemie. Er lässt keinen durch."              },
  { slug: "informatik_imperator",   tier: "legendary", icon: "🤖", name: "Der Digitale Tyrann",      subject: "Informatik",  description: "Tyrannischer Herrscher über das digitale Reich",        lore: "Er hat das erste Programm geschrieben. Es war voller Fehler. Absichtlich."         },
  // ─ Mythic (6) ──────────────────────────────────────────
  { slug: "der_grosse_rechner",     tier: "mythic",    icon: "🌠", name: "KALKULON",                 subject: "Mathematik",  description: "Gottgleiche Rechenmaschine aus dem Anfang der Zeit",   lore: "Er hat Pi berechnet. Er hat Pi verändert. Niemand hat es bemerkt."                 },
  { slug: "der_schwarze_dichter",   tier: "mythic",    icon: "🖤", name: "Der Schwarze Prophet",     subject: "Deutsch",     description: "Mythischer Prophet, dessen Worte Erinnerungen löschen", lore: "Seine Verse sind Waffen. Wer sie liest, vergisst alles, was er je gelernt hat."   },
  { slug: "the_last_linguist",      tier: "mythic",    icon: "🌐", name: "The Last Tongue",          subject: "Englisch",    description: "The final speaker of all languages — and all silence", lore: "He has spoken every tongue that ever existed. He forgot them all. On purpose."     },
  { slug: "die_zellenmutter",       tier: "mythic",    icon: "🦠", name: "Urmutter Null",            subject: "Biologie",    description: "Urmutter aller lebenden und toten Zellen",              lore: "Sie hat das erste Leben erschaffen. Sie kann es auslöschen. Sie überlegt noch."   },
  { slug: "der_quantenriese",       tier: "mythic",    icon: "⚛️", name: "Schrödingers Herrscher",   subject: "Physik",      description: "Gottgleicher Herrscher aller Quantenzustände",          lore: "Er existiert in jedem Zustand gleichzeitig — außer in dem, in dem er besiegt ist." },
  { slug: "das_perioden_phantom",   tier: "mythic",    icon: "🔮", name: "Phantom Element 119",      subject: "Chemie",      description: "Geisterhaftes Element jenseits des Periodensystems",    lore: "Es steht nicht auf dem Periodensystem. Es existiert trotzdem. Es wartet."          },
  // ─ Secret (5) ──────────────────────────────────────────
  { slug: "omega_prime",            tier: "secret",    icon: "🌟", name: "OMEGA-PRIME",              subject: "Alle Fächer", description: "Die letzte Instanz — geboren aus dem Scheitern aller",  lore: "Er wurde aus dem Versagen jedes Schülers aller Zeiten erschaffen. Er kennt dich."  },
  { slug: "der_dunkle_lehrer",      tier: "secret",    icon: "👨‍🏫", name: "Magister Mortis",          subject: "Alle Fächer", description: "Der Meister des ewigen Scheiterns",                     lore: "Er gibt immer eine 6. Egal wie gut du bist. Er ist der Tod der Note."               },
  { slug: "erzfeind_des_wissens",   tier: "secret",    icon: "📚", name: "NULLVERSTAND",             subject: "Alle Fächer", description: "Die absolute Verneinung allen Wissens",                 lore: "Er existierte vor dem ersten Buch. Er wird existieren nach dem letzten."            },
  { slug: "die_pruefungs_gottheit", tier: "secret",    icon: "📋", name: "Der Richter",              subject: "Alle Fächer", description: "Richtergottheit, die über jede Prüfung urteilt",        lore: "Er war bei jeder Prüfung dabei. Kein Schüler hat je seine Gnade erhalten."         },
  { slug: "mastermind_boss",        tier: "secret",    icon: "🧠", name: "MASTERMIND",               subject: "Alle Fächer", description: "Das System selbst — der wahre Endgegner",               lore: "Du glaubtest, du kämpfst gegen Bosse. Du kämpfst gegen das Wissen selbst."         },
];

const TIER_TO_TITLE_RARITY: Record<BossTier, Title["rarity"]> = {
  common:    "common",
  uncommon:  "uncommon", 
  rare:      "rare",
  epic:      "epic",
  legendary: "legendary",
  mythic:    "mythic",
  secret:    "mythic",
};

export function getBossSlayerTitles(): Title[] {
  return BOSS_INDEX.map((boss) => ({
    slug:        `boss_mvp_${boss.slug}`,
    name:        `${boss.name}-Bezwinger`,
    description: `${boss.name} als MVP-Kill besiegt`,
    color:       BOSS_TIERS[boss.tier].color,
    rarity:      TIER_TO_TITLE_RARITY[boss.tier],
    unlockHint:  `${boss.name} besiegen und MVP sein`,
    icon:        boss.icon,
  }));
}

export function getAllTitles(): Title[] {
  return [...ALL_TITLES, ...getBossSlayerTitles()];
}

// ── Skill Trees ───────────────────────────────────────────

export interface SkillNodeDef {
  slug: string;
  title: string;
  description: string;
  tier: number; // 0 = core hub, 1–4 = subject tiers
  requiredXp: number;
  icon: string;
  color: string;
  parentSlug: string | null;
  xpBonus: number;
  subjectKey?: string; // matches exercise subject key (e.g. "mathematik")
  unlocksGrade?: number; // highest grade this node unlocks (T2→8, T3→11, T4→13)
}

export interface SubjectSkillConfig {
  key: string;
  label: string;
  icon: string;
  color: string;
  slugP: string;
  tiers: { title: string; icon: string }[];
}

export const CORE_NODE: SkillNodeDef = {
  slug: "core",
  title: "Skill-Baum",
  description: "Schalte den Skill-Baum frei, um alle Fach-Skills zu starten",
  tier: 0,
  requiredXp: 0,
  icon: "🌟",
  color: "#f59e0b",
  parentSlug: null,
  xpBonus: 10,
};

export const SUBJECT_SKILL_CONFIGS: SubjectSkillConfig[] = [
  { key: "mathematik", label: "Mathematik", icon: "➕", color: "#6366f1", slugP: "math",
    tiers: [{ title: "Grundlagen",    icon: "📐" }, { title: "Mittelstufe",   icon: "📊" }, { title: "Oberstufe",    icon: "📈" }, { title: "Mathe-Meister", icon: "🏆" }] },
  { key: "deutsch", label: "Deutsch", icon: "📖", color: "#dc2626", slugP: "de",
    tiers: [{ title: "Sprachbasis",   icon: "📝" }, { title: "Grammatik",     icon: "✏️" }, { title: "Literatur",    icon: "📚" }, { title: "Schreib-Meister", icon: "🖊️" }] },
  { key: "englisch", label: "Englisch", icon: "🌍", color: "#0369a1", slugP: "en",
    tiers: [{ title: "Grundvokabular",icon: "🔤" }, { title: "Grammar",       icon: "📖" }, { title: "Advanced",     icon: "🗣️" }, { title: "English Master",  icon: "🌐" }] },
  { key: "physik", label: "Physik", icon: "⚡", color: "#7c3aed", slugP: "ph",
    tiers: [{ title: "Einführung",    icon: "⚛️" }, { title: "Mechanik",      icon: "⚙️" }, { title: "Elektrizität", icon: "⚡" }, { title: "Physik-Gott",     icon: "🔭" }] },
  { key: "chemie", label: "Chemie", icon: "🧪", color: "#059669", slugP: "ch",
    tiers: [{ title: "Grundlagen",    icon: "🧪" }, { title: "Reaktionen",    icon: "⚗️" }, { title: "Organisch",    icon: "🔬" }, { title: "Chemie-Meister",  icon: "💎" }] },
  { key: "biologie", label: "Biologie", icon: "🌱", color: "#16a34a", slugP: "bio",
    tiers: [{ title: "Grundlagen",    icon: "🌱" }, { title: "Zelle & Gen",   icon: "🧬" }, { title: "Evolution",    icon: "🦕" }, { title: "Bio-Meister",     icon: "🔬" }] },
  { key: "geschichte", label: "Geschichte", icon: "🏛️", color: "#b91c1c", slugP: "ge",
    tiers: [{ title: "Antike",        icon: "🏛️" }, { title: "Mittelalter",   icon: "⚔️" }, { title: "Neuzeit",      icon: "🗺️" }, { title: "Historiker",      icon: "📜" }] },
  { key: "informatik", label: "Informatik", icon: "💻", color: "#1d4ed8", slugP: "it",
    tiers: [{ title: "Grundlagen",    icon: "💻" }, { title: "Algorithmen",   icon: "🔄" }, { title: "Programmierung",icon: "⌨️" }, { title: "IT-Meister",      icon: "🖥️" }] },
  { key: "geografie", label: "Geografie", icon: "🌐", color: "#0d9488", slugP: "geo",
    tiers: [{ title: "Grundlagen",    icon: "🌍" }, { title: "Landschaften",  icon: "⛰️" }, { title: "Klimazonen",   icon: "🌦️" }, { title: "Geo-Meister",     icon: "🗺️" }] },
  { key: "wirtschaft", label: "Wirtschaft", icon: "📈", color: "#ea580c", slugP: "wi",
    tiers: [{ title: "Grundlagen",    icon: "📈" }, { title: "Markt",         icon: "🏪" }, { title: "VWL & BWL",    icon: "💹" }, { title: "Ökonom",          icon: "💰" }] },
  { key: "musik", label: "Musik", icon: "🎵", color: "#db2777", slugP: "mu",
    tiers: [{ title: "Grundlagen",    icon: "🎵" }, { title: "Musiktheorie",  icon: "🎼" }, { title: "Geschichte",   icon: "🎹" }, { title: "Virtuose",        icon: "🎸" }] },
  { key: "sport", label: "Sport", icon: "🏃", color: "#65a30d", slugP: "sp",
    tiers: [{ title: "Grundlagen",    icon: "🏃" }, { title: "Teamspiele",    icon: "⚽" }, { title: "Training",     icon: "🏋️" }, { title: "Champion",        icon: "🥇" }] },
];

const TIER_XP      = [0,   300, 1000, 3000] as const;
const TIER_BONUS   = [5,   10,  20,   40  ] as const;
const TIER_GRADE   = [undefined, 8, 11, 13 ] as const;
const TIER_GRADES_LABEL = ["Klasse 1–5", "bis Klasse 8", "bis Klasse 11", "bis Klasse 13"] as const;

function buildSubjectTree(cfg: SubjectSkillConfig): SkillNodeDef[] {
  return cfg.tiers.map((t, i) => ({
    slug: `${cfg.slugP}_${i + 1}`,
    title: t.title,
    description: `+${TIER_BONUS[i]} XP auf ${cfg.label} · ${TIER_GRADES_LABEL[i]}`,
    tier: i + 1,
    requiredXp: TIER_XP[i],
    icon: t.icon,
    color: cfg.color,
    parentSlug: i === 0 ? "core" : `${cfg.slugP}_${i}`,
    xpBonus: TIER_BONUS[i],
    subjectKey: cfg.key,
    unlocksGrade: TIER_GRADE[i],
  }));
}

export const ALL_SKILL_TREES: Record<string, SkillNodeDef[]> = {
  core: [CORE_NODE],
  ...Object.fromEntries(SUBJECT_SKILL_CONFIGS.map((cfg) => [cfg.key, buildSubjectTree(cfg)])),
};

export function getMaxUnlockedGrade(subjectKey: string, unlockedSlugs: Set<string>): number {
  const tree = ALL_SKILL_TREES[subjectKey] ?? [];
  let max = 5;
  for (const node of tree) {
    if (unlockedSlugs.has(node.slug) && node.unlocksGrade && node.unlocksGrade > max) {
      max = node.unlocksGrade;
    }
  }
  return max;
}

// ── Helper ────────────────────────────────────────────────

export function formatXp(xp: number): string {
  if (xp >= 1_000_000) return `${(xp / 1_000_000).toFixed(1)}M`;
  if (xp >= 1000) return `${(xp / 1000).toFixed(1)}K`;
  return String(xp);
}

export function getTitleBySlug(slug: string): Title | undefined {
  return getAllTitles().find((t) => t.slug === slug);
}
