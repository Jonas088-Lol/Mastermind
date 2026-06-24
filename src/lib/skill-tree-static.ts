/**
 * Static 80h skill tree — 12 ranks per subject.
 * Thresholds in minutes. Same for every user.
 */

/** XP earned when reaching rank N. Index 0 = reaching rank 2, index 10 = reaching rank 12. */
export const RANK_XP = [100, 200, 300, 500, 750, 1000, 1500, 2000, 3000, 4000, 5000];

/** XP awarded when the player ranks up to `rank` (rank 2–12). */
export function rankUpXp(rank: number): number {
  return RANK_XP[rank - 2] ?? 0;
}

export const SUBJECT_KEYS = [
  "mathematik",
  "deutsch",
  "englisch",
  "physik",
  "chemie",
  "biologie",
  "geschichte",
  "informatik",
] as const;

export type SubjectKey = (typeof SUBJECT_KEYS)[number];

export interface StaticRank {
  rank: number;      // 1–12
  title: string;
  minMinutes: number; // minutes needed to reach this rank
  icon: string;
}

export interface SubjectTree {
  key: SubjectKey;
  label: string;
  color: string;
  icon: string;
  ranks: StaticRank[];
}

// Minutes thresholds spreading 80 h (4 800 min) across 12 ranks
const THRESHOLDS = [0, 60, 180, 360, 600, 960, 1500, 2100, 2880, 3600, 4200, 4800];

function ranks(titles: string[]): StaticRank[] {
  return titles.map((title, i) => ({
    rank: i + 1,
    title,
    minMinutes: THRESHOLDS[i]!,
    icon: RANK_ICONS[i]!,
  }));
}

const RANK_ICONS = ["🌱", "📖", "✏️", "🔍", "💡", "⚡", "🔥", "🎯", "🏆", "💎", "🌟", "👑"];

export const STATIC_TREES: Record<SubjectKey, SubjectTree> = {
  mathematik: {
    key: "mathematik",
    label: "Mathematik",
    color: "#6366f1",
    icon: "∑",
    ranks: ranks([
      "Zahlen-Entdecker",
      "Grundrechner",
      "Bruch-Scout",
      "Geometrie-Lehrling",
      "Algebra-Forscher",
      "Gleichungs-Profi",
      "Funktions-Meister",
      "Statistik-Analyst",
      "Analysis-Lehrling",
      "Differenzialrechner",
      "Integral-Meister",
      "Mathematik-Experte",
    ]),
  },
  deutsch: {
    key: "deutsch",
    label: "Deutsch",
    color: "#f59e0b",
    icon: "Aa",
    ranks: ranks([
      "Buchstaben-Kind",
      "Wort-Künstler",
      "Satz-Meister",
      "Text-Leser",
      "Aufsatz-Schreiber",
      "Grammatik-Profi",
      "Literatur-Kenner",
      "Stil-Meister",
      "Sprach-Analytiker",
      "Rhetoriker",
      "Deutsch-Kenner",
      "Sprach-Experte",
    ]),
  },
  englisch: {
    key: "englisch",
    label: "Englisch",
    color: "#22c55e",
    icon: "En",
    ranks: ranks([
      "Beginner",
      "Word Collector",
      "Grammar Scout",
      "Sentence Builder",
      "Story Reader",
      "Fluent Speaker",
      "Essay Writer",
      "Literature Scout",
      "Advanced Writer",
      "Culture Expert",
      "Language Master",
      "English Expert",
    ]),
  },
  physik: {
    key: "physik",
    label: "Physik",
    color: "#06b6d4",
    icon: "⚛",
    ranks: ranks([
      "Beobachter",
      "Kräfte-Scout",
      "Mechanik-Lehrling",
      "Energie-Forscher",
      "Wellen-Entdecker",
      "Elektro-Scout",
      "Optik-Forscher",
      "Thermodynamiker",
      "Atom-Erkunder",
      "Quanten-Lehrling",
      "Physik-Kenner",
      "Physik-Experte",
    ]),
  },
  chemie: {
    key: "chemie",
    label: "Chemie",
    color: "#a855f7",
    icon: "⚗",
    ranks: ranks([
      "Neugieriger",
      "Stoff-Entdecker",
      "Teilchen-Scout",
      "Reaktions-Lehrling",
      "Säuren-Forscher",
      "Bindungs-Kenner",
      "Organik-Scout",
      "Analytiker",
      "Stöchiometer",
      "Gleichgewichts-Profi",
      "Chemie-Kenner",
      "Chemie-Experte",
    ]),
  },
  biologie: {
    key: "biologie",
    label: "Biologie",
    color: "#84cc16",
    icon: "🧬",
    ranks: ranks([
      "Naturkind",
      "Zell-Entdecker",
      "Pflanzen-Scout",
      "Tier-Forscher",
      "Ökologie-Lehrling",
      "Genetik-Scout",
      "Körper-Kenner",
      "Evolutions-Forscher",
      "Erbgut-Analyst",
      "System-Biologe",
      "Biologie-Kenner",
      "Biologie-Experte",
    ]),
  },
  geschichte: {
    key: "geschichte",
    label: "Geschichte",
    color: "#f97316",
    icon: "🏛",
    ranks: ranks([
      "Zeitreisender",
      "Antike-Scout",
      "Mittelalter-Forscher",
      "Neuzeit-Erkunder",
      "Revolution-Lehrling",
      "Weltkrieg-Analyst",
      "Zeitzeuge",
      "Historiker-Lehrling",
      "Quellen-Forscher",
      "Geschichts-Analytiker",
      "Epochen-Meister",
      "Geschichte-Experte",
    ]),
  },
  informatik: {
    key: "informatik",
    label: "Informatik",
    color: "#ec4899",
    icon: "</>" ,
    ranks: ranks([
      "Code-Entdecker",
      "Algorithmus-Lehrling",
      "Programmierer",
      "Daten-Scout",
      "Netzwerk-Forscher",
      "Datenbank-Kenner",
      "Web-Entwickler",
      "System-Architekt",
      "KI-Erkunder",
      "Security-Scout",
      "Informatik-Kenner",
      "Informatik-Experte",
    ]),
  },
};

export function getCurrentRank(tree: SubjectTree, totalMinutes: number): StaticRank {
  let current = tree.ranks[0]!;
  for (const r of tree.ranks) {
    if (totalMinutes >= r.minMinutes) current = r;
  }
  return current;
}

export function getNextRank(tree: SubjectTree, totalMinutes: number): StaticRank | null {
  for (const r of tree.ranks) {
    if (r.minMinutes > totalMinutes) return r;
  }
  return null;
}

/** Extract subject key from a page URL like /app/uebungen/mathematik/... */
export function subjectKeyFromPage(page: string): SubjectKey | null {
  const match = page.match(/\/app\/uebungen\/([^/]+)/);
  if (!match) return null;
  const key = match[1] as SubjectKey;
  return SUBJECT_KEYS.includes(key) ? key : null;
}
