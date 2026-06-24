/**
 * Static skill tree — 113 nodes total.
 * Hub (always unlocked) + 8 subjects × 14 nodes each.
 *
 * Layout per subject arm:
 *   4 core nodes along the arm axis (gateway → fork)
 *   5 Path-A nodes branching left of the arm
 *   5 Path-B nodes branching right of the arm
 *
 * Canvas: 2200 × 2200 with CENTER = 1100.
 * Positions are computed from (angleDeg, distAlongArm, perpOffset).
 */

export const CANVAS_SIZE = 2200;
export const CANVAS_CTR  = 1100;

export interface SkillNode {
  key:         string;
  label:       string;
  icon:        string;
  xpCost:      number;
  requires:    string[];   // prerequisite node keys
  x:           number;
  y:           number;
  color:       string;
  subjectKey:  string | null;
  isHub:       boolean;
  tier:        number;     // 0=hub, 1-4=core, 5-9=path
}

// ── Helpers ───────────────────────────────────────────────

function armXY(angleDeg: number, dist: number, perp = 0) {
  const a = (angleDeg * Math.PI) / 180;
  const p = a + Math.PI / 2;
  return {
    x: CANVAS_CTR + Math.cos(a) * dist + Math.cos(p) * perp,
    y: CANVAS_CTR + Math.sin(a) * dist + Math.sin(p) * perp,
  };
}

// XP costs by tier position (same for all subjects)
const CORE_COSTS = [100, 250, 500, 750] as const;
const PATH_COSTS = [1000, 1500, 2000, 2500, 3500] as const;

// Perpendicular offsets for path nodes (increases then settles)
const PERP = [70, 85, 95, 90, 85] as const;
// Distances along arm for core and path nodes
const CORE_DISTS = [180, 260, 340, 420] as const;
const PATH_DISTS = [500, 580, 660, 740, 820] as const;

interface SubjectDef {
  key:      string;
  color:    string;
  angle:    number;
  coreLabels:  [string, string, string, string];
  coreIcons:   [string, string, string, string];
  pathALabels: [string, string, string, string, string];
  pathAIcons:  [string, string, string, string, string];
  pathBLabels: [string, string, string, string, string];
  pathBIcons:  [string, string, string, string, string];
}

function buildSubject(def: SubjectDef): SkillNode[] {
  const { key, color, angle } = def;
  const nodes: SkillNode[] = [];

  // 4 core nodes
  for (let i = 0; i < 4; i++) {
    nodes.push({
      key:        `${key}_c${i + 1}`,
      label:      def.coreLabels[i]!,
      icon:       def.coreIcons[i]!,
      xpCost:     CORE_COSTS[i]!,
      requires:   i === 0 ? ["hub"] : [`${key}_c${i}`],
      color,
      subjectKey: key,
      tier:       i + 1,
      isHub:      false,
      ...armXY(angle, CORE_DISTS[i]!),
    });
  }

  // 5 Path-A nodes (negative perp = "left" of arm)
  for (let i = 0; i < 5; i++) {
    nodes.push({
      key:        `${key}_a${i + 1}`,
      label:      def.pathALabels[i]!,
      icon:       def.pathAIcons[i]!,
      xpCost:     PATH_COSTS[i]!,
      requires:   [i === 0 ? `${key}_c4` : `${key}_a${i}`],
      color,
      subjectKey: key,
      tier:       5 + i,
      isHub:      false,
      ...armXY(angle, PATH_DISTS[i]!, -PERP[i]!),
    });
  }

  // 5 Path-B nodes (positive perp = "right" of arm)
  for (let i = 0; i < 5; i++) {
    nodes.push({
      key:        `${key}_b${i + 1}`,
      label:      def.pathBLabels[i]!,
      icon:       def.pathBIcons[i]!,
      xpCost:     PATH_COSTS[i]!,
      requires:   [i === 0 ? `${key}_c4` : `${key}_b${i}`],
      color,
      subjectKey: key,
      tier:       5 + i,
      isHub:      false,
      ...armXY(angle, PATH_DISTS[i]!, PERP[i]!),
    });
  }

  return nodes;
}

// ── Subject definitions ───────────────────────────────────

const SUBJECTS: SubjectDef[] = [
  {
    key: "mathematik", color: "#6366f1", angle: -90,
    coreLabels:  ["Zahlen-Erwachen", "Grundrechnen", "Algebra & Terme", "Mathe-Weiche"],
    coreIcons:   ["🌱", "🔢", "📐", "⚡"],
    pathALabels: ["Funktionen", "Differenzialrechnung", "Integralrechnung", "Grenzwerte", "Analysis-Meister"],
    pathAIcons:  ["📈", "📉", "∫", "♾️", "🌟"],
    pathBLabels: ["Geometrie", "Trigonometrie", "Vektorrechnung", "Raumgeometrie", "Geometrie-Meister"],
    pathBIcons:  ["📏", "🔺", "➡️", "📦", "💎"],
  },
  {
    key: "deutsch", color: "#f59e0b", angle: -45,
    coreLabels:  ["Buchstaben-Welt", "Wort-Künstler", "Satz-Meister", "Sprach-Weiche"],
    coreIcons:   ["🌱", "✏️", "📝", "⚡"],
    pathALabels: ["Erste Texte", "Drama & Lyrik", "Literaturkenner", "Literaturkritiker", "Literatur-Meister"],
    pathAIcons:  ["📖", "🎭", "📚", "🖋️", "📜"],
    pathBLabels: ["Aufsatz-Scout", "Rhetoriker", "Stilist", "Essayist", "Schreib-Meister"],
    pathBIcons:  ["✍️", "🎤", "🏛️", "🖊️", "🎓"],
  },
  {
    key: "englisch", color: "#22c55e", angle: 0,
    coreLabels:  ["Beginner", "Vocabulary Builder", "Grammar Pro", "Skill Junction"],
    coreIcons:   ["🌱", "💬", "📖", "⚡"],
    pathALabels: ["Text Reader", "Comprehension", "Literature Scout", "Academic Writer", "English Scholar"],
    pathAIcons:  ["📚", "🔍", "🎓", "✍️", "🏅"],
    pathBLabels: ["Fluent Speaker", "Creative Writer", "Essay Master", "Advanced Comm.", "English Master"],
    pathBIcons:  ["🎙️", "💡", "🗺️", "🌍", "🏆"],
  },
  {
    key: "physik", color: "#06b6d4", angle: 45,
    coreLabels:  ["Beobachter", "Kräfte & Bewegung", "Energie-Forscher", "Physik-Weiche"],
    coreIcons:   ["🌱", "⚙️", "💡", "⚡"],
    pathALabels: ["Elektrizität", "Magnetismus", "Optik", "Elektromagnetik", "E-Physik-Meister"],
    pathAIcons:  ["🔌", "🧲", "🌈", "📡", "🔮"],
    pathBLabels: ["Thermodynamik", "Atom-Modell", "Kernphysik", "Quantenwelt", "Quanten-Meister"],
    pathBIcons:  ["🌡️", "🔬", "☢️", "⚛️", "🌌"],
  },
  {
    key: "chemie", color: "#a855f7", angle: 90,
    coreLabels:  ["Neugierling", "Stoff-Entdecker", "Reaktions-Scout", "Chemie-Weiche"],
    coreIcons:   ["🌱", "🧪", "⚗️", "⚡"],
    pathALabels: ["Organik-Einstieg", "Kohlenwasserstoffe", "Funktionelle Gruppen", "Polymere", "Organik-Meister"],
    pathAIcons:  ["🌿", "🛢️", "💊", "🧬", "🧫"],
    pathBLabels: ["Titrierung", "Spektroskopie", "Chromatografie", "Analytik-Profi", "Analytik-Meister"],
    pathBIcons:  ["⚖️", "🔭", "📊", "🏭", "🏅"],
  },
  {
    key: "biologie", color: "#84cc16", angle: 135,
    coreLabels:  ["Naturkind", "Zell-Entdecker", "Organismus-Scout", "Bio-Weiche"],
    coreIcons:   ["🌱", "🔬", "🧫", "⚡"],
    pathALabels: ["Erbgut & Gene", "Zellteilung", "Evolutionstheorie", "Artenvielfalt", "Genetik-Meister"],
    pathAIcons:  ["🧬", "🔄", "🦎", "🌍", "🦋"],
    pathBLabels: ["Ökosystem", "Nahrungsnetze", "Umweltschutz", "Klimafolgen", "Öko-Meister"],
    pathBIcons:  ["🌳", "🌊", "♻️", "🌡️", "🌿"],
  },
  {
    key: "geschichte", color: "#f97316", angle: 180,
    coreLabels:  ["Zeitreisender", "Antike Welt", "Mittelalter", "Epochen-Weiche"],
    coreIcons:   ["🌱", "🏛️", "⚔️", "⚡"],
    pathALabels: ["Absolutismus", "Revolutionen", "Industrialisierung", "Imperialismus", "Neuzeit-Meister"],
    pathAIcons:  ["👑", "🚩", "🏭", "🌐", "🗺️"],
    pathBLabels: ["Erster Weltkrieg", "Weimarer Rep.", "NS-Zeit & Holocaust", "Nachkriegszeit", "Moderne-Meister"],
    pathBIcons:  ["⚡", "🗳️", "🕊️", "🌍", "📜"],
  },
  {
    key: "informatik", color: "#ec4899", angle: -135,
    coreLabels:  ["Code-Entdecker", "Algorithmen", "Programmierung", "IT-Weiche"],
    coreIcons:   ["🌱", "💻", "🔧", "⚡"],
    pathALabels: ["HTML & CSS", "JavaScript", "Frameworks", "App-Entwicklung", "Web-Meister"],
    pathAIcons:  ["🌐", "🎨", "⚛️", "📱", "🚀"],
    pathBLabels: ["Datenstrukturen", "Machine Learning", "IT-Security", "Systemarchitektur", "IT-Meister"],
    pathBIcons:  ["🧠", "📊", "🔐", "🖥️", "🛡️"],
  },
];

// ── Build full node list ──────────────────────────────────

const HUB_NODE: SkillNode = {
  key: "hub", label: "MasterMind", icon: "★",
  xpCost: 0, requires: [], color: "#f59e0b",
  subjectKey: null, tier: 0, isHub: true,
  x: CANVAS_CTR, y: CANVAS_CTR,
};

export const SKILL_NODES: SkillNode[] = [
  HUB_NODE,
  ...SUBJECTS.flatMap(buildSubject),
];

export const SKILL_NODE_MAP = new Map<string, SkillNode>(
  SKILL_NODES.map((n) => [n.key, n])
);

// ── Subject label positions ───────────────────────────────

export const SUBJECT_LABEL_POSITIONS = SUBJECTS.map((def) => ({
  key: def.key,
  color: def.color,
  label: def.key.charAt(0).toUpperCase() + def.key.slice(1),
  ...(() => {
    const a = (def.angle * Math.PI) / 180;
    const dist = 880;
    return { x: CANVAS_CTR + Math.cos(a) * dist, y: CANVAS_CTR + Math.sin(a) * dist };
  })(),
  angle: def.angle,
}));

// ── Node state helpers ────────────────────────────────────

export type NodeState = "hidden" | "revealed" | "unlocked";

export function getNodeState(nodeKey: string, unlockedSet: Set<string>): NodeState {
  if (nodeKey === "hub" || unlockedSet.has(nodeKey)) return "unlocked";
  const node = SKILL_NODE_MAP.get(nodeKey);
  if (!node) return "hidden";
  // Revealed if any prerequisite is unlocked
  const anyPrereqUnlocked = node.requires.some(
    (req) => req === "hub" || unlockedSet.has(req)
  );
  return anyPrereqUnlocked ? "revealed" : "hidden";
}
