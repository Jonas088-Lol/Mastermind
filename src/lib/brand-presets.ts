export interface BrandPreset {
  id: string;
  name: string;
  mood: string;
  accent: string;
  /** Darker shade for hover states (auto-derived if not set) */
  accentDark?: string;
}

export type PresetGroup = {
  label: string;
  presets: BrandPreset[];
};

export const PRESET_GROUPS: PresetGroup[] = [
  {
    label: "Blau & Kühl",
    presets: [
      { id: "mastermind", name: "MasterMind",   mood: "Standard · Indigo",      accent: "#4F46E5", accentDark: "#4338CA" },
      { id: "royal",      name: "Royal Blue",   mood: "Klassisch · Blau",        accent: "#2563EB", accentDark: "#1D4ED8" },
      { id: "ocean",      name: "Ozean",        mood: "Frisch · Himmelblau",     accent: "#0284C7", accentDark: "#0369A1" },
      { id: "arctic",     name: "Arktis",       mood: "Klar · Cyan",             accent: "#0891B2", accentDark: "#0E7490" },
    ],
  },
  {
    label: "Grün & Natur",
    presets: [
      { id: "petrol",     name: "Petrol",       mood: "Vertrauensvoll · Teal",   accent: "#0D9488", accentDark: "#0F766E" },
      { id: "emerald",    name: "Smaragd",      mood: "Vital · Grün",            accent: "#059669", accentDark: "#047857" },
      { id: "forest",     name: "Wald",         mood: "Natürlich · Dunkelgrün",  accent: "#16A34A", accentDark: "#15803D" },
      { id: "spring",     name: "Frühling",     mood: "Energetisch · Limette",   accent: "#65A30D", accentDark: "#4D7C0F" },
    ],
  },
  {
    label: "Warm & Lebhaft",
    presets: [
      { id: "amber",      name: "Bernstein",    mood: "Warm · Gold",             accent: "#D97706", accentDark: "#B45309" },
      { id: "sunset",     name: "Sonnenuntergang", mood: "Dynamisch · Orange",   accent: "#EA580C", accentDark: "#C2410C" },
      { id: "crimson",    name: "Rubinrot",     mood: "Kraft · Rot",             accent: "#DC2626", accentDark: "#B91C1C" },
      { id: "rose",       name: "Rose",         mood: "Lebendig · Rosa-Rot",     accent: "#E11D48", accentDark: "#BE123C" },
    ],
  },
  {
    label: "Kreativ & Violett",
    presets: [
      { id: "coral",      name: "Koralle",      mood: "Kreativ · Pink",          accent: "#DB2777", accentDark: "#BE185D" },
      { id: "amethyst",   name: "Amethyst",     mood: "Innovativ · Violett",     accent: "#7C3AED", accentDark: "#6D28D9" },
      { id: "lavender",   name: "Lavendel",     mood: "Sanft · Hellviolett",     accent: "#8B5CF6", accentDark: "#7C3AED" },
      { id: "plum",       name: "Pflaume",      mood: "Edel · Magenta",          accent: "#9333EA", accentDark: "#7E22CE" },
    ],
  },
  {
    label: "Neutral & Elegant",
    presets: [
      { id: "slate",      name: "Schiefer",     mood: "Elegant · Blaugrau",      accent: "#475569", accentDark: "#334155" },
      { id: "graphite",   name: "Graphit",      mood: "Minimal · Grau",          accent: "#52525B", accentDark: "#3F3F46" },
      { id: "onyx",       name: "Onyx",         mood: "Premium · Dunkelgrau",    accent: "#374151", accentDark: "#1F2937" },
      { id: "coffee",     name: "Espresso",     mood: "Warm · Braun",            accent: "#92400E", accentDark: "#78350F" },
    ],
  },
];

export const ALL_PRESETS: BrandPreset[] = PRESET_GROUPS.flatMap((g) => g.presets);

export function findPreset(accent: string): BrandPreset | undefined {
  return ALL_PRESETS.find((p) => p.accent.toLowerCase() === accent.toLowerCase());
}
