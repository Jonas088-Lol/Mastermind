/* Copyright 2026 Elian Schock, Jonas Schwenk */

/**
 * Farbvoreinstellungen („ab Werk") für das Schul-Branding.
 *
 * Eine Voreinstellung ist ein fertiges **Paar** aus Primär- und Sekundärfarbe —
 * genau das, was die App als Farbverlauf nutzt. Schulen, die nicht selbst
 * personalisieren wollen, wählen hier eine komplette Kombination aus.
 */
export interface BrandPreset {
  id: string;
  name: string;
  mood: string;
  /** Primärfarbe (links im Verlauf). */
  accent: string;
  /** Sekundärfarbe (rechts im Verlauf). */
  secondary: string;
  /** Dunklere Variante der Primärfarbe für Hover-Zustände. */
  accentDark?: string;
}

export type PresetGroup = {
  label: string;
  presets: BrandPreset[];
};

/**
 * Die Haus-Voreinstellung von MasterMind: pastell-hellblau → pastell-hellgrün.
 * Steht in der Oberfläche bewusst ganz oben, noch über allen Gruppen.
 */
export const MASTERMIND_PRESET: BrandPreset = {
  id: "mastermind",
  name: "MasterMind",
  mood: "Standard · Pastell-Blau → Pastell-Grün",
  accent: "#8AD3F0",
  secondary: "#8CE3BE",
  accentDark: "#5CBBDE",
};

export const PRESET_GROUPS: PresetGroup[] = [
  {
    label: "Blau & Kühl",
    presets: [
      // Früher „MasterMind" — umbenannt, da die Haus-Voreinstellung jetzt pastell ist.
      { id: "indigo", name: "Indigo",      mood: "Klassisch · Indigo",     accent: "#4F46E5", secondary: "#818CF8", accentDark: "#4338CA" },
      { id: "royal",  name: "Royal Blue",  mood: "Klassisch · Blau",       accent: "#2563EB", secondary: "#60A5FA", accentDark: "#1D4ED8" },
      { id: "ocean",  name: "Ozean",       mood: "Frisch · Himmelblau",    accent: "#0284C7", secondary: "#38BDF8", accentDark: "#0369A1" },
      { id: "arctic", name: "Arktis",      mood: "Klar · Cyan",            accent: "#0891B2", secondary: "#67E8F9", accentDark: "#0E7490" },
    ],
  },
  {
    label: "Grün & Natur",
    presets: [
      { id: "petrol",  name: "Petrol",     mood: "Vertrauensvoll · Teal",  accent: "#0D9488", secondary: "#5EEAD4", accentDark: "#0F766E" },
      { id: "emerald", name: "Smaragd",    mood: "Vital · Grün",           accent: "#059669", secondary: "#6EE7B7", accentDark: "#047857" },
      { id: "forest",  name: "Wald",       mood: "Natürlich · Dunkelgrün", accent: "#16A34A", secondary: "#86EFAC", accentDark: "#15803D" },
      { id: "spring",  name: "Frühling",   mood: "Energetisch · Limette",  accent: "#65A30D", secondary: "#BEF264", accentDark: "#4D7C0F" },
    ],
  },
  {
    label: "Warm & Lebhaft",
    presets: [
      { id: "amber",   name: "Bernstein",  mood: "Warm · Gold",            accent: "#D97706", secondary: "#FCD34D", accentDark: "#B45309" },
      { id: "sunset",  name: "Sonnenuntergang", mood: "Dynamisch · Orange", accent: "#EA580C", secondary: "#FDBA74", accentDark: "#C2410C" },
      { id: "crimson", name: "Rubinrot",   mood: "Kraft · Rot",            accent: "#DC2626", secondary: "#FCA5A5", accentDark: "#B91C1C" },
      { id: "rose",    name: "Rose",       mood: "Lebendig · Rosa-Rot",    accent: "#E11D48", secondary: "#FDA4AF", accentDark: "#BE123C" },
    ],
  },
  {
    label: "Kreativ & Violett",
    presets: [
      { id: "coral",    name: "Koralle",   mood: "Kreativ · Pink",         accent: "#DB2777", secondary: "#F9A8D4", accentDark: "#BE185D" },
      { id: "amethyst", name: "Amethyst",  mood: "Innovativ · Violett",    accent: "#7C3AED", secondary: "#C4B5FD", accentDark: "#6D28D9" },
      { id: "lavender", name: "Lavendel",  mood: "Sanft · Hellviolett",    accent: "#8B5CF6", secondary: "#DDD6FE", accentDark: "#7C3AED" },
      { id: "plum",     name: "Pflaume",   mood: "Edel · Magenta",         accent: "#9333EA", secondary: "#E9D5FF", accentDark: "#7E22CE" },
    ],
  },
  {
    label: "Neutral & Elegant",
    presets: [
      { id: "slate",    name: "Schiefer",  mood: "Elegant · Blaugrau",     accent: "#475569", secondary: "#94A3B8", accentDark: "#334155" },
      { id: "graphite", name: "Graphit",   mood: "Minimal · Grau",         accent: "#52525B", secondary: "#A1A1AA", accentDark: "#3F3F46" },
      { id: "onyx",     name: "Onyx",      mood: "Premium · Dunkelgrau",   accent: "#374151", secondary: "#9CA3AF", accentDark: "#1F2937" },
      { id: "coffee",   name: "Espresso",  mood: "Warm · Braun",           accent: "#92400E", secondary: "#FCD9B6", accentDark: "#78350F" },
    ],
  },
];

/** Haus-Voreinstellung zuerst, danach alle Gruppen-Presets. */
export const ALL_PRESETS: BrandPreset[] = [
  MASTERMIND_PRESET,
  ...PRESET_GROUPS.flatMap((g) => g.presets),
];

/** Voreinstellung anhand der Primärfarbe finden (Rückwärtskompatibilität). */
export function findPreset(accent: string): BrandPreset | undefined {
  return ALL_PRESETS.find((p) => p.accent.toLowerCase() === accent.toLowerCase());
}

/** Voreinstellung anhand des kompletten Farbpaars finden. */
export function findPresetByPair(accent: string, secondary: string): BrandPreset | undefined {
  const a = accent.toLowerCase();
  const s = secondary.toLowerCase();
  return ALL_PRESETS.find(
    (p) => p.accent.toLowerCase() === a && p.secondary.toLowerCase() === s,
  );
}
