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
  { slug: "rechenfehler_kobold",    tier: "common",    icon: "👺", name: "Rechenfehler-Kobold",      subject: "Mathematik",  description: "Kleiner Kobold der Rechenfehler einbaut",              lore: "Er schleicht sich in Lösungsblätter und dreht Zahlen um."                           },
  { slug: "tippfehler_geist",       tier: "common",    icon: "👻", name: "Tipp-Fehler-Geist",        subject: "Deutsch",     description: "Geist der Tippfehler in Texte zaubert",                lore: "Er erscheint in jedem Diktat und macht aus 'Strasse' 'Strase'."                     },
  { slug: "vokabel_wicht",          tier: "common",    icon: "🤧", name: "Vokabel-Wicht",            subject: "Englisch",    description: "Kleines Wesen das Vokabeln klaut",                      lore: "Er versteckt die Wörter die du lernen solltest."                                    },
  { slug: "komma_kobold",           tier: "common",    icon: "🍄", name: "Komma-Kobold",             subject: "Deutsch",     description: "Setzt Kommas an die falsche Stelle",                    lore: "Kein Komma ist vor ihm sicher — er liebt das Chaos."                                },
  { slug: "additions_geist",        tier: "common",    icon: "➕", name: "Additions-Geist",          subject: "Mathematik",  description: "Addiert Zahlen falsch",                                 lore: "Er liebt es wenn Schüler im Kopf rechnen müssen."                                   },
  { slug: "diktat_unhold",          tier: "common",    icon: "📝", name: "Diktat-Unhold",            subject: "Deutsch",     description: "Meister aller Diktatfehler",                            lore: "Jedes Diktat ist sein Werk."                                                        },
  { slug: "bruch_popanz",           tier: "common",    icon: "🐸", name: "Bruch-Popanz",             subject: "Mathematik",  description: "Verwirrt bei Bruchrechnungen",                          lore: "Zähler und Nenner wechselt er nach Belieben."                                       },
  { slug: "winkel_grummel",         tier: "common",    icon: "📐", name: "Winkel-Grummel",           subject: "Mathematik",  description: "Todesfeind aller Winkelberechnungen",                   lore: "90 Grad? 180 Grad? Er kümmert das nicht."                                           },
  { slug: "einmaleins_riese",       tier: "common",    icon: "🔢", name: "Einmaleins-Riese",         subject: "Mathematik",  description: "Riesiger Durcheinander-Bringer des 1×1",                lore: "7×8=56? Nicht wenn er in der Nähe ist."                                             },
  { slug: "aufsatz_affe",           tier: "common",    icon: "🐒", name: "Aufsatz-Affe",             subject: "Deutsch",     description: "Saboteur aller Schulaufsätze",                          lore: "Er schreibt die Einleitung um wenn du nicht hinschaust."                             },
  { slug: "silben_schlange",        tier: "common",    icon: "🐍", name: "Silben-Schlange",          subject: "Deutsch",     description: "Zertrennt Silben an falschen Stellen",                  lore: "Sie schlängelt sich durch jeden Text und hinterlässt Chaos."                        },
  { slug: "woerter_wirbelwind",     tier: "common",    icon: "🌪️", name: "Wörter-Wirbelwind",        subject: "Englisch",    description: "Verwirrt englische Vokabeln",                           lore: "to/two/too — alles das gleiche für ihn."                                            },
  { slug: "natur_kobold",           tier: "common",    icon: "🌿", name: "Natur-Kobold",             subject: "Biologie",    description: "Kleiner Störer im Biologieunterricht",                  lore: "Er tauscht Pflanzenbezeichnungen aus wenn niemand hinschaut."                        },
  { slug: "tier_troll",             tier: "common",    icon: "🐊", name: "Tier-Troll",               subject: "Biologie",    description: "Troll der Tierklassen durcheinander bringt",            lore: "Säugetier oder Reptil? Er weiß es auch nicht genau."                                },
  { slug: "formel_faulpelz",        tier: "common",    icon: "💤", name: "Formel-Faulpelz",          subject: "Chemie",      description: "Faulpelz der chemische Formeln vergisst",               lore: "H₂O? H₃O? Wer weiß das schon — er jedenfalls nicht."                               },
  { slug: "histoerchen_heinz",      tier: "common",    icon: "📜", name: "Histörchen-Heinz",         subject: "Geschichte",  description: "Verwechselt wichtige Jahreszahlen",                     lore: "1492 oder 1942? Egal, sagt er."                                                     },
  { slug: "code_kueken",            tier: "common",    icon: "🐣", name: "Code-Küken",               subject: "Informatik",  description: "Anfänger-Fehlermacher im Code",                         lore: "Syntaxfehler in Zeile 1 — immer."                                                   },
  { slug: "lese_lulatsch",          tier: "common",    icon: "📖", name: "Lese-Lulatsch",            subject: "Deutsch",     description: "Macht Textverständnis schwer",                          lore: "Er verrutscht die Sätze wenn du sie liest."                                         },
  { slug: "zeiger_zwerg",           tier: "common",    icon: "🕐", name: "Zeiger-Zwerg",             subject: "Mathematik",  description: "Durcheinander-Bringer der Uhrzeiten",                   lore: "Viertel nach oder viertel vor? Alles das Selbe für ihn."                            },
  { slug: "daten_wicht",            tier: "common",    icon: "💾", name: "Daten-Wicht",              subject: "Informatik",  description: "Klaut gespeicherte Daten",                              lore: "Ctrl+S hilft nicht gegen ihn."                                                      },
  // ─ Uncommon (15) ───────────────────────────────────────
  { slug: "algebra_kobold",         tier: "uncommon",  icon: "🧮", name: "Algebra-Kobold",           subject: "Mathematik",  description: "Verstrickt Schüler in Gleichungen",                     lore: "x=? Er weiß es, sagt es aber nie."                                                  },
  { slug: "grammatik_gespenst",     tier: "uncommon",  icon: "👻", name: "Grammatik-Gespenst",       subject: "Deutsch",     description: "Geist der Grammatikfehler",                             lore: "Nominativ, Akkusativ — er verwechselt alles."                                       },
  { slug: "vokabel_verdreher",      tier: "uncommon",  icon: "🌀", name: "Vokabel-Verdreher",        subject: "Englisch",    description: "Dreht englische Wortbedeutungen um",                    lore: "False friends sind sein Lieblingswerk."                                             },
  { slug: "redewendungs_raeuber",   tier: "uncommon",  icon: "🦅", name: "Redewendungs-Räuber",      subject: "Deutsch",     description: "Klaut den Sinn von Redewendungen",                      lore: "Den Nagel auf den Kopf? Er trifft ihn nie."                                         },
  { slug: "gleichungs_geist",       tier: "uncommon",  icon: "📊", name: "Gleichungs-Geist",         subject: "Mathematik",  description: "Geist der linearen Gleichungen",                        lore: "y=mx+b wird in seiner Nähe zu y=mx-b."                                              },
  { slug: "bio_blender",            tier: "uncommon",  icon: "🧬", name: "Bio-Blender",              subject: "Biologie",    description: "Mischt Biologiekonzepte durcheinander",                 lore: "Mendels Erbsenversuche hat er komplett durcheinandergebracht."                      },
  { slug: "physik_poltergeist",     tier: "uncommon",  icon: "💨", name: "Physik-Poltergeist",       subject: "Physik",      description: "Tobt in Physikstunden",                                 lore: "Kräfte, Beschleunigung — er stört alle Berechnungen."                               },
  { slug: "element_elf",            tier: "uncommon",  icon: "🧪", name: "Element-Elf",              subject: "Chemie",      description: "Verwirrt beim Periodensystem",                          lore: "Na = Natrium? Für ihn ist das Unsinn."                                              },
  { slug: "jahres_geist",           tier: "uncommon",  icon: "📅", name: "Jahres-Geist",             subject: "Geschichte",  description: "Verschiebt wichtige Jahreszahlen",                      lore: "1914 oder 1918? Beides falsch, laut ihm."                                           },
  { slug: "stochastik_schreck",     tier: "uncommon",  icon: "🎲", name: "Stochastik-Schreck",       subject: "Mathematik",  description: "Macht Wahrscheinlichkeiten unmöglich",                  lore: "50%? Nein, er besteht auf 49,7%."                                                   },
  { slug: "funktions_fresser",      tier: "uncommon",  icon: "📈", name: "Funktions-Fresser",        subject: "Mathematik",  description: "Frisst Graphen und Nullstellen auf",                    lore: "Kein Schnittpunkt ist vor ihm sicher."                                              },
  { slug: "poesie_phantom",         tier: "uncommon",  icon: "🎭", name: "Poesie-Phantom",           subject: "Deutsch",     description: "Stört beim Analysieren von Gedichten",                  lore: "Metapher oder Metonymie? Er wechselt sie täglich."                                  },
  { slug: "kurven_kobold",          tier: "uncommon",  icon: "📉", name: "Kurven-Kobold",            subject: "Mathematik",  description: "Verbiegt geometrische Figuren",                         lore: "Ein Kreis? Hat er zu einem Oval gemacht."                                           },
  { slug: "algorithmen_geist",      tier: "uncommon",  icon: "🔮", name: "Algorithmen-Geist",        subject: "Informatik",  description: "Verwirrt einfache Algorithmen",                         lore: "Sortieren? Nicht in seiner Nähe."                                                   },
  { slug: "ausdruck_ausrufer",      tier: "uncommon",  icon: "📢", name: "Ausdruck-Ausrufer",        subject: "Deutsch",     description: "Brüllt falsche Stilmittel heraus",                      lore: "Metapher! Nein — Personifikation! Er entscheidet sich nie."                         },
  // ─ Rare (12) ───────────────────────────────────────────
  { slug: "gleichungs_ghul",        tier: "rare",      icon: "🧟", name: "Gleichungs-Ghul",          subject: "Mathematik",  description: "Ghul der quadratischen Gleichungen",                    lore: "Er frisst Diskriminanten zum Frühstück."                                            },
  { slug: "syntax_specter",         tier: "rare",      icon: "👁️", name: "Syntax-Specter",           subject: "Deutsch",     description: "Geisterhafter Feind aller Satzkonstruktionen",          lore: "Nebensätze sind sein Spezialgebiet."                                                },
  { slug: "grammar_goblin",         tier: "rare",      icon: "🧌", name: "Grammar-Goblin",           subject: "Englisch",    description: "Goblin der englischen Grammatik",                       lore: "Present Perfect und Simple Past — er vertauscht sie ständig."                      },
  { slug: "zellteilung_zombie",     tier: "rare",      icon: "🧫", name: "Zellteilung-Zombie",       subject: "Biologie",    description: "Zombie der Mitose und Meiose",                          lore: "Interphase, Prophase — er lässt sie alle vermischen."                               },
  { slug: "wellen_wraith",          tier: "rare",      icon: "🌊", name: "Wellen-Wraith",            subject: "Physik",      description: "Geist der Wellenlehre",                                 lore: "Frequenz, Amplitude — alles gleich für ihn."                                        },
  { slug: "reaktions_raecher",      tier: "rare",      icon: "⚗️", name: "Reaktions-Rächer",         subject: "Chemie",      description: "Rächer der unausgeglichenen Reaktionen",                lore: "Er lässt keine Reaktionsgleichung ausgeglichen."                                    },
  { slug: "historien_horror",       tier: "rare",      icon: "🏛️", name: "Historien-Horror",         subject: "Geschichte",  description: "Horror der Geschichtsanalyse",                          lore: "Ursache und Wirkung — er dreht sie permanent um."                                   },
  { slug: "logarithmen_lich",       tier: "rare",      icon: "💀", name: "Logarithmen-Lich",         subject: "Mathematik",  description: "Unsterblicher Feind des Logarithmus",                   lore: "log₂(8) = 3? Er besteht auf 4."                                                    },
  { slug: "photosyn_phaenomen",     tier: "rare",      icon: "🌱", name: "Photosynthese-Phänomen",   subject: "Biologie",    description: "Phänomenales Hindernis der Biologie",                   lore: "CO₂ + H₂O + Licht → ??? Er weiß es nicht."                                         },
  { slug: "binaer_bestie",          tier: "rare",      icon: "💻", name: "Binär-Bestie",             subject: "Informatik",  description: "Bestie des Binärsystems",                               lore: "0 und 1 — er macht daraus manchmal 2."                                              },
  { slug: "optik_oger",             tier: "rare",      icon: "🔭", name: "Optik-Oger",               subject: "Physik",      description: "Oger der Lichtbrechung",                                lore: "Reflexion? Refraktion? Er mag beides nicht."                                        },
  { slug: "analyse_ungeheuer",      tier: "rare",      icon: "🔬", name: "Analyse-Ungeheuer",        subject: "Deutsch",     description: "Ungeheuer das Textanalysen sabotiert",                  lore: "Struktur, Inhalt, Sprache — er bringt alles durcheinander."                         },
  // ─ Epic (10) ───────────────────────────────────────────
  { slug: "algebra_daemon",         tier: "epic",      icon: "👹", name: "Algebra-Daemon",           subject: "Mathematik",  description: "Mächtiger Daemon der Gleichungen und Formeln",          lore: "Er existiert seit der Erfindung negativer Zahlen und hält die Unbekannten gefangen." },
  { slug: "grammatik_gorgon",       tier: "epic",      icon: "🐲", name: "Grammatik-Gorgon",         subject: "Deutsch",     description: "Gorgon der deutschen Grammatik",                        lore: "Ihr Blick lässt Relativsätze zu Stein werden."                                      },
  { slug: "vokabel_vampir",         tier: "epic",      icon: "🧛", name: "Vokabel-Vampir",           subject: "Englisch",    description: "Vampir der englischen Sprache",                         lore: "Er saugt dir die Vokabeln aus dem Gedächtnis."                                      },
  { slug: "dna_drache",             tier: "epic",      icon: "🧬", name: "DNA-Drache",               subject: "Biologie",    description: "Mächtiger Drache der Genetik",                          lore: "Seine Schuppen sind aus doppelter Helix geformt."                                   },
  { slug: "physik_phantasm",        tier: "epic",      icon: "⚡", name: "Physik-Phantasm",          subject: "Physik",      description: "Phantastisches Wesen der Quantenphysik",                lore: "Er existiert und nicht-existiert gleichzeitig — Schrödingers Alptraum."             },
  { slug: "chemie_chimaere",        tier: "epic",      icon: "🧪", name: "Chemie-Chimäre",           subject: "Chemie",      description: "Ein chemisches Monster aus falschen Formeln",            lore: "Entstanden aus einer falsch aufgestellten Reaktionsgleichung."                      },
  { slug: "geschichte_golem",       tier: "epic",      icon: "🗿", name: "Geschichte-Golem",         subject: "Geschichte",  description: "Wächter der vergessenen Jahreszahlen",                  lore: "Er erinnert sich an jedes Datum, das du vergessen hast."                            },
  { slug: "code_krake",             tier: "epic",      icon: "🐙", name: "Code-Krake",               subject: "Informatik",  description: "Ein digitales Ungeheuer aus kaputtem Code",             lore: "Entstanden aus Millionen Zeilen fehlerhafter Programme."                            },
  { slug: "analysis_azmodan",       tier: "epic",      icon: "🌌", name: "Analysis-Azmodan",         subject: "Mathematik",  description: "Dämonenfürst der Analysis",                              lore: "Grenzwerte — er hat sie alle gesprengt."                                            },
  { slug: "wortschatz_wyvern",      tier: "epic",      icon: "🐉", name: "Wortschatz-Wyvern",        subject: "Deutsch",     description: "Wyvern die Wortschätze frisst",                         lore: "Ihr Feueratem verbrennt Synonyme und Antonyme."                                     },
  // ─ Legendary (7) ───────────────────────────────────────
  { slug: "mathe_monarch",          tier: "legendary", icon: "👑", name: "Mathe-Monarch",            subject: "Mathematik",  description: "Monarch aller Mathematik-Disziplinen",                  lore: "Er regiert über alle Zahlen seit der Antike."                                       },
  { slug: "deutsch_daemon",         tier: "legendary", icon: "📜", name: "Deutsch-Dämon",            subject: "Deutsch",     description: "Uralter Dämon der deutschen Sprache",                   lore: "Kein Aufsatz überlebt seinen Blick unbeschadet."                                    },
  { slug: "englisch_emperor",       tier: "legendary", icon: "🦁", name: "Englisch-Emperor",         subject: "Englisch",    description: "Kaiser der englischen Sprache",                         lore: "Er hat Shakespeare erschaffen — und zerstört."                                      },
  { slug: "bio_behemoth",           tier: "legendary", icon: "🦕", name: "Bio-Behemoth",             subject: "Biologie",    description: "Riesiges biologisches Urwesen",                         lore: "Größer als ein Dinosaurier, gefährlicher als ein Virus."                            },
  { slug: "physik_phoenix",         tier: "legendary", icon: "🔥", name: "Physik-Phönix",            subject: "Physik",      description: "Unsterblicher Vogel der Physik",                        lore: "Er verbrennt und entsteht aus den Gleichungen immer wieder neu."                    },
  { slug: "chemie_cerberus",        tier: "legendary", icon: "🐕", name: "Chemie-Cerberus",          subject: "Chemie",      description: "Dreiköpfiger Wächter der Chemie",                       lore: "Drei Köpfe: Anorganik, Organik, Biochemie."                                         },
  { slug: "informatik_imperator",   tier: "legendary", icon: "🤖", name: "Informatik-Imperator",     subject: "Informatik",  description: "Kaiser des digitalen Zeitalters",                       lore: "Er hat das erste Computerprogramm korrumpiert."                                     },
  // ─ Mythic (6) ──────────────────────────────────────────
  { slug: "der_grosse_rechner",     tier: "mythic",    icon: "🌠", name: "Der Große Rechner",        subject: "Mathematik",  description: "Mythisches Rechenwesen aus uralter Zeit",               lore: "Er hat Pi erfunden — und macht es nun irrational für immer."                        },
  { slug: "der_schwarze_dichter",   tier: "mythic",    icon: "🖤", name: "Der Schwarze Dichter",     subject: "Deutsch",     description: "Mythischer Dichter der Finsternis",                     lore: "Seine Verse löschen Erinnerungen aus."                                              },
  { slug: "the_last_linguist",      tier: "mythic",    icon: "🌐", name: "The Last Linguist",        subject: "Englisch",    description: "The final guardian of language",                        lore: "He has spoken every tongue — and forgotten them all."                               },
  { slug: "die_zellenmutter",       tier: "mythic",    icon: "🦠", name: "Die Zellenmutter",         subject: "Biologie",    description: "Urmutter aller Zellen",                                 lore: "Sie hat das erste Leben erschaffen — und kann es auslöschen."                       },
  { slug: "der_quantenriese",       tier: "mythic",    icon: "⚛️", name: "Der Quantenriese",         subject: "Physik",      description: "Gigant der Quantenphysik",                              lore: "Er existiert in allen Zuständen gleichzeitig."                                      },
  { slug: "das_perioden_phantom",   tier: "mythic",    icon: "🔮", name: "Das Perioden-Phantom",     subject: "Chemie",      description: "Geisterhafter Hüter des Periodensystems",               lore: "Er wohnt zwischen den Elementen — unsichtbar aber allgegenwärtig."                  },
  // ─ Secret (5) ──────────────────────────────────────────
  { slug: "omega_prime",            tier: "secret",    icon: "🌟", name: "OMEGA-PRIME",              subject: "Alle Fächer", description: "Der ultimative Endgegner aller Schüler",                lore: "Er wurde aus dem Scheitern jedes Schülers aller Zeiten geboren."                    },
  { slug: "der_dunkle_lehrer",      tier: "secret",    icon: "👨‍🏫", name: "Der Dunkle Lehrer",        subject: "Alle Fächer", description: "Ein Lehrer der das Böse verkörpert",                    lore: "Er gibt immer eine 6 — egal wie gut du bist."                                       },
  { slug: "erzfeind_des_wissens",   tier: "secret",    icon: "📚", name: "Erzfeind des Wissens",     subject: "Alle Fächer", description: "Urzeitlicher Feind allen Lernens",                      lore: "Er war schon vor dem ersten Buch da."                                               },
  { slug: "die_pruefungs_gottheit", tier: "secret",    icon: "📋", name: "Die Prüfungs-Gottheit",    subject: "Alle Fächer", description: "Gottheit aller Prüfungsangst",                          lore: "Sie erschafft Prüfungen die niemand bestehen kann."                                 },
  { slug: "mastermind_boss",        tier: "secret",    icon: "🧠", name: "MASTERMIND",               subject: "Alle Fächer", description: "Der Boss hinter allen Bossen",                          lore: "Das System selbst ist der wahre Endgegner."                                         },
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
  tier: number;
  requiredXp: number;
  icon: string;
  color: string;
  parentSlug: string | null;
  xpBonus: number;
}

export const MATH_SKILL_TREE: SkillNodeDef[] = [
  { slug: "math_basics",      title: "Grundlagen",       description: "+5 XP auf Mathe-Aufgaben",          tier: 1, requiredXp: 0,    icon: "➕", color: "#6366f1", parentSlug: null,          xpBonus: 5  },
  { slug: "math_equations",   title: "Gleichungen",      description: "+10 XP auf Gleichungs-Aufgaben",   tier: 2, requiredXp: 100,  icon: "🟰", color: "#7c3aed", parentSlug: "math_basics", xpBonus: 10 },
  { slug: "math_geometry",    title: "Geometrie",        description: "+10 XP auf Geometrie-Aufgaben",    tier: 2, requiredXp: 100,  icon: "📐", color: "#7c3aed", parentSlug: "math_basics", xpBonus: 10 },
  { slug: "math_analysis",    title: "Analysis",         description: "+20 XP auf Analysis-Aufgaben",     tier: 3, requiredXp: 500,  icon: "📈", color: "#4f46e5", parentSlug: "math_equations", xpBonus: 20 },
  { slug: "math_stochastic",  title: "Stochastik",       description: "+20 XP auf Wahrscheinlichkeit",    tier: 3, requiredXp: 500,  icon: "🎲", color: "#4f46e5", parentSlug: "math_equations", xpBonus: 20 },
  { slug: "math_master",      title: "Mathe-Meister",    description: "+50 XP auf alle Mathe-Aufgaben",   tier: 4, requiredXp: 2000, icon: "🏆", color: "#3730a3", parentSlug: "math_analysis", xpBonus: 50 },
];

export const ALL_SKILL_TREES: Record<string, SkillNodeDef[]> = {
  Mathematik: MATH_SKILL_TREE,
  Deutsch: [
    { slug: "de_basics",     title: "Sprachgrundlagen", description: "+5 XP auf Deutsch-Aufgaben",   tier: 1, requiredXp: 0,    icon: "📝", color: "#dc2626", parentSlug: null,          xpBonus: 5  },
    { slug: "de_grammar",    title: "Grammatik",        description: "+10 XP auf Grammatik",         tier: 2, requiredXp: 100,  icon: "✏️", color: "#b91c1c", parentSlug: "de_basics",   xpBonus: 10 },
    { slug: "de_essay",      title: "Aufsatz",          description: "+15 XP auf Aufsatz-Aufgaben",  tier: 3, requiredXp: 400,  icon: "📄", color: "#991b1b", parentSlug: "de_grammar",  xpBonus: 15 },
    { slug: "de_literature", title: "Literatur",        description: "+20 XP auf Literatur",         tier: 3, requiredXp: 400,  icon: "📚", color: "#991b1b", parentSlug: "de_grammar",  xpBonus: 20 },
    { slug: "de_master",     title: "Schreib-Meister",  description: "+40 XP auf Deutsch-Aufgaben",  tier: 4, requiredXp: 2000, icon: "🖊️", color: "#7f1d1d", parentSlug: "de_essay",    xpBonus: 40 },
  ],
  Englisch: [
    { slug: "en_basics",     title: "Grundvokabular",   description: "+5 XP auf Englisch-Aufgaben",  tier: 1, requiredXp: 0,    icon: "🇬🇧", color: "#0369a1", parentSlug: null,          xpBonus: 5  },
    { slug: "en_grammar",    title: "English Grammar",  description: "+10 XP auf Grammatik-Aufg.",   tier: 2, requiredXp: 100,  icon: "📖", color: "#0284c7", parentSlug: "en_basics",   xpBonus: 10 },
    { slug: "en_vocab",      title: "Advanced Vocab",   description: "+15 XP auf Vokabel-Aufgaben",  tier: 2, requiredXp: 100,  icon: "🔤", color: "#0284c7", parentSlug: "en_basics",   xpBonus: 15 },
    { slug: "en_master",     title: "English Master",   description: "+40 XP auf Englisch-Aufgaben", tier: 4, requiredXp: 2000, icon: "🌐", color: "#075985", parentSlug: "en_vocab",    xpBonus: 40 },
  ],
  Physik: [
    { slug: "ph_basics",     title: "Physik-Einführung",description: "+5 XP auf Physik-Aufgaben",    tier: 1, requiredXp: 0,    icon: "⚛️", color: "#7c3aed", parentSlug: null,          xpBonus: 5  },
    { slug: "ph_mechanics",  title: "Mechanik",         description: "+10 XP auf Mechanik",          tier: 2, requiredXp: 200,  icon: "⚙️", color: "#6d28d9", parentSlug: "ph_basics",   xpBonus: 10 },
    { slug: "ph_electricity",title: "Elektrizität",     description: "+15 XP auf Elektrik-Aufg.",    tier: 2, requiredXp: 200,  icon: "⚡", color: "#6d28d9", parentSlug: "ph_basics",   xpBonus: 15 },
    { slug: "ph_master",     title: "Physik-Gott",      description: "+50 XP auf Physik-Aufgaben",   tier: 4, requiredXp: 3000, icon: "🔭", color: "#4c1d95", parentSlug: "ph_electricity", xpBonus: 50 },
  ],
};

// ── Helper ────────────────────────────────────────────────

export function formatXp(xp: number): string {
  if (xp >= 1_000_000) return `${(xp / 1_000_000).toFixed(1)}M`;
  if (xp >= 1000) return `${(xp / 1000).toFixed(1)}K`;
  return String(xp);
}

export function getTitleBySlug(slug: string): Title | undefined {
  return getAllTitles().find((t) => t.slug === slug);
}
