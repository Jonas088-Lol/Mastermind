export type DlcFeature = {
  id: string;
  name: string;
  description: string;
  category: string;
  pricePerMonth: number; // EUR, enterprise single-feature price
  enterpriseOnly?: boolean; // only available as enterprise DLC, not in Pro
};

export const DLC_FEATURES: DlcFeature[] = [
  // KI
  { id: "ki_tutor",       name: "KI-Tutor",           description: "KI-Lernassistent & Erklärungen",     category: "KI",           pricePerMonth: 1.99 },
  { id: "ki_korrekturen", name: "KI-Korrekturen",      description: "KI-gestützte Aufgabenbewertung",     category: "KI",           pricePerMonth: 2.49 },
  // Lernen
  { id: "karteikarten",   name: "Karteikarten",        description: "Spaced-Repetition Lernkarten",       category: "Lernen",       pricePerMonth: 0.99 },
  { id: "uebungen",       name: "Übungen & Lernpfade", description: "Interaktive Aufgaben & Lernpfade",   category: "Lernen",       pricePerMonth: 1.49 },
  { id: "vokabeln",       name: "Vokabeltrainer",      description: "Vokabeln lernen mit KI-Hilfe",       category: "Lernen",       pricePerMonth: 0.99 },
  { id: "heft",           name: "Digitales Heft",      description: "Block-Editor Notizhefte",            category: "Lernen",       pricePerMonth: 0.99 },
  { id: "office",         name: "Office-Tools",        description: "Dokumente, Tabellen, Präsentationen",category: "Lernen",       pricePerMonth: 2.99 },
  // Gamification
  { id: "duelle",         name: "Lernduell",           description: "Schüler-vs-Schüler Quiz-Duelle",     category: "Gamification", pricePerMonth: 0.99 },
  { id: "ranking",        name: "Ranking",             description: "XP-Ranglisten & Bestenlisten",       category: "Gamification", pricePerMonth: 0.99 },
  { id: "boss_battles",   name: "Boss Battles",        description: "Gemeinsame Gamification-Events",     category: "Gamification", pricePerMonth: 0.99 },
  { id: "shop",           name: "Münzen-Shop",         description: "Virtuelle Belohnungsökonomie",       category: "Gamification", pricePerMonth: 0.99 },
  { id: "saison",         name: "Saison-Pass",         description: "Saisonale Herausforderungen",        category: "Gamification", pricePerMonth: 1.49 },
  // Kommunikation
  { id: "nachrichten",    name: "Nachrichten",         description: "Internes Nachrichtensystem",         category: "Kommunikation",pricePerMonth: 1.49 },
  { id: "community",      name: "Community-Notizen",   description: "Geteilte Lernnotizen",               category: "Kommunikation",pricePerMonth: 0.99 },
  { id: "masterspace",    name: "MasterSpace",         description: "Discord-ähnliche Lernräume & Chats", category: "Kommunikation",pricePerMonth: 2.99 },
  // Schule
  { id: "arbeitsblätter", name: "Arbeitsblätter",      description: "Digitale Arbeitsblätter erstellen",  category: "Schule",       pricePerMonth: 1.99 },
  { id: "mannschaften",   name: "Schulmannschaften",   description: "Sport- und Teamverwaltung",          category: "Schule",       pricePerMonth: 0.49 },
  { id: "eltern",         name: "Eltern-Portal",       description: "Elterngespräche & Noten-Einblick",   category: "Schule",       pricePerMonth: 1.99 },
  { id: "anzeigetafel",   name: "Anzeigetafel",        description: "Digitale Stundenplan-Anzeige",       category: "Schule",       pricePerMonth: 0.49 },
  // Enterprise-only
  { id: "sso",            name: "SSO / Entra ID",      description: "Single Sign-On Integration",         category: "Enterprise",   pricePerMonth: 3.99, enterpriseOnly: true },
];

export const DLC_CATEGORIES = Array.from(new Set(DLC_FEATURES.map((f) => f.category)));

// Features included in Basic plan
const BASIC_FEATURES = new Set(["karteikarten", "uebungen", "heft", "nachrichten", "vokabeln"]);

// Features that are enterprise-only (not in Pro)
const ENTERPRISE_ONLY = new Set(DLC_FEATURES.filter((f) => f.enterpriseOnly).map((f) => f.id));

export function hasFeature(plan: string, featureSettings: string, featureId: string): boolean {
  if (plan === "pro") {
    return !ENTERPRISE_ONLY.has(featureId);
  }
  if (plan === "enterprise") {
    try {
      const settings = JSON.parse(featureSettings || "{}") as { dlcs?: string[] };
      return (settings.dlcs ?? []).includes(featureId);
    } catch {
      return false;
    }
  }
  // Basic
  return BASIC_FEATURES.has(featureId);
}

export function getEnabledDlcs(featureSettings: string): string[] {
  try {
    const s = JSON.parse(featureSettings || "{}") as { dlcs?: string[] };
    return s.dlcs ?? [];
  } catch {
    return [];
  }
}

export function setEnabledDlcs(featureSettings: string, dlcs: string[]): string {
  try {
    const s = JSON.parse(featureSettings || "{}") as Record<string, unknown>;
    return JSON.stringify({ ...s, dlcs });
  } catch {
    return JSON.stringify({ dlcs });
  }
}

export function enterpriseTotalPrice(enabledDlcs: string[]): number {
  return enabledDlcs.reduce((sum, id) => {
    const f = DLC_FEATURES.find((x) => x.id === id);
    return sum + (f?.pricePerMonth ?? 0);
  }, 0);
}

// Reference: Pro all-in price is always cheaper than picking all DLCs individually
export const PRO_MONTHLY_PRICE = 14.99;
export const BASIC_MONTHLY_PRICE = 4.99;
