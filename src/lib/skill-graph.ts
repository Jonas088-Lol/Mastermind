// ── Mega Skill Graph — ~120 nodes, ~80 days of study ────────────────────────

export const MASTERY_LABELS = ["Gesperrt", "Bronze", "Silber", "Gold"] as const;
export const MASTERY_COLORS = ["#1f2937", "#92400e", "#4b5563", "#92400e"] as const;
export const MASTERY_BADGE_COLORS = ["#374151", "#cd7f32", "#9ca3af", "#f59e0b"] as const;
export const MASTERY_GLOW   = ["transparent", "#cd7f3244", "#9ca3af33", "#f59e0b44"] as const;
export const MASTERY_ICONS  = ["🔒", "🥉", "🥈", "🥇"] as const;
export type  MasteryLevel   = 0 | 1 | 2 | 3;

// Exercises needed per mastery tier: [bronze, silver, gold]
// Higher tiers of the tree need progressively more practice
const MR: Record<number, [number, number, number]> = {
  1: [2,  4,  8 ],
  2: [3,  6,  10],
  3: [3,  7,  12],
  4: [4,  9,  15],
  5: [5, 11,  18],
  6: [6, 13,  22],
  7: [8, 18,  28],
  8: [10, 22, 35],
};

const FUSION_MR: [number, number, number] = [5, 12, 20];
const ELITE_MR:  [number, number, number] = [8, 20, 35];
const LEGEND_MR: [number, number, number] = [15, 30, 50];

// XP cost to unlock each tier
const TIER_XP = [0, 120, 280, 520, 900, 1500, 2400, 3800, 5500] as const;

export interface SkillNode {
  slug:          string;
  title:         string;
  desc:          string;
  flavor?:       string;
  subject:       string | null;   // null = fusion/legendary
  subjects?:     string[];        // subjects involved (for fusion)
  icon:          string;
  color:         string;
  x:             number;
  y:             number;
  prerequisites: string[];
  requiredXp:    number;
  masteryReqs:   [number, number, number];
  unlocksGrade?: number;
  type:          "hub" | "subject" | "fusion" | "legendary";
  tier?:         number;
}

// ── Layout constants ─────────────────────────────────────────────────────────
// 12 subject columns, 300px apart, centered on hub (x=0)
// Math=-1650 ... Sport=+1650
const COL: Record<string, number> = {
  mathematik: -1650, physik: -1350, chemie: -1050, biologie: -750,
  informatik: -450,  geografie: -150,
  deutsch:     150,  englisch:   450, geschichte: 750,
  wirtschaft: 1050,  musik:     1350, sport:      1650,
};

// Tier y-positions (hub at y=0, first tier at y=320)
const TY = [320, 590, 860, 1130, 1400, 1670, 1940, 2210];

// Subject accent colors
const SC: Record<string, string> = {
  mathematik: "#818cf8", physik: "#a78bfa", chemie: "#34d399",   biologie: "#4ade80",
  informatik: "#60a5fa", geografie: "#2dd4bf",
  deutsch:    "#f87171", englisch:  "#38bdf8", geschichte: "#fb923c",
  wirtschaft: "#fb923c", musik:     "#f472b6", sport:      "#a3e635",
};

// ── Subject tier data ─────────────────────────────────────────────────────────
interface TierDef {
  title: string; desc: string; icon: string;
  flavor?: string; unlocksGrade?: number;
}

const SUBJECT_TIERS: Record<string, TierDef[]> = {
  mathematik: [
    { title: "Zahlen & Grundrechnen",         icon: "🔢", desc: "Addition, Subtraktion, Multiplikation, Division — die vier Grundoperationen", flavor: "Jede Reise beginnt mit einem ersten Schritt." },
    { title: "Brüche & Dezimalzahlen",         icon: "½",  desc: "Bruchrechnung, Dezimalzahlen, Prozentrechnungen" },
    { title: "Geometrie Grundlagen",           icon: "📐", desc: "Flächen, Winkel, Dreiecke, Kreise und Grundkonstruktionen" },
    { title: "Algebra & Gleichungen",          icon: "✏️", desc: "Lineare Gleichungen, Terme, Variablen, Ungleichungen", unlocksGrade: 8 },
    { title: "Funktionen & Koordinaten",       icon: "📈", desc: "Lineare Funktionen, Koordinatensystem, Geraden, Steigung" },
    { title: "Quadratische Gleichungen",       icon: "⚡", desc: "Parabeln, p-q-Formel, Scheitelpunkt und Transformation", unlocksGrade: 11, flavor: "Die Parabel — Bogen zwischen Erde und Himmel." },
    { title: "Analysis Grundlagen",            icon: "∫",  desc: "Grenzwerte, Ableitungsregeln, Tangenten, Extremwerte" },
    { title: "Differenzial- & Integralrechnung", icon: "🏆", desc: "Stammfunktionen, Kurvendiskussion, Flächenberechnung, Rotation", unlocksGrade: 13, flavor: "Die Sprache des Universums ist die Mathematik." },
  ],
  physik: [
    { title: "Größen & Messung",               icon: "📏", desc: "SI-Einheiten, Messgeräte, Fehlerrechnung und Genauigkeit" },
    { title: "Mechanik Grundlagen",            icon: "⚙️", desc: "Kräfte, Newton'sche Gesetze, Reibung, schiefe Ebene" },
    { title: "Energie & Arbeit",               icon: "⚡", desc: "Kinetische & potenzielle Energie, Leistung, Wirkungsgrad" },
    { title: "Wellen & Schwingungen",          icon: "〜",  desc: "Periodische Vorgänge, Frequenz, Wellenlänge, Schall", unlocksGrade: 8 },
    { title: "Wärmelehre",                     icon: "🌡️", desc: "Temperatur, Wärmeübertragung, Ausdehnung, ideales Gas" },
    { title: "Elektromagnetismus",             icon: "🧲", desc: "Elektrisches Feld, Magnetfeld, Induktion, Lorentzkraft", unlocksGrade: 11 },
    { title: "Optik & Quantenphysik",          icon: "🔭", desc: "Reflexion, Brechung, Photoeffekt, Wellennatur des Lichts" },
    { title: "Relativitätstheorie & Kern",     icon: "⚛️", desc: "Spezielle Relativitätstheorie, Kernspaltung, Radioaktivität", unlocksGrade: 13, flavor: "E=mc² — vier Zeichen, die alles verändern." },
  ],
  chemie: [
    { title: "Stoffe & Eigenschaften",         icon: "🧪", desc: "Aggregatzustände, Reinstoffe, Gemische, Trennverfahren" },
    { title: "Atombau Grundlagen",             icon: "⚛️", desc: "Protonen, Neutronen, Elektronen, Bohrsches Atommodell" },
    { title: "Chemische Bindungen",            icon: "🔗", desc: "Ionenbindung, Kovalenz, Metallbindung, Elektronegativität" },
    { title: "Reaktionsgleichungen",           icon: "⚗️", desc: "Oxidation, Reduktion, Exotherm/Endotherm, Katalysatoren", unlocksGrade: 8 },
    { title: "Organische Chemie Basis",        icon: "🌿", desc: "Alkane, Alkene, Alkohole, funktionelle Gruppen" },
    { title: "Säuren, Basen & Salze",          icon: "💧", desc: "pH-Wert, Titration, Neutralisation, Löslichkeitsprodukt", unlocksGrade: 11, flavor: "Gleichgewicht im Reaktionsraum." },
    { title: "Elektrochemie",                  icon: "🔋", desc: "Galvanische Zellen, Elektrolyse, Nernst-Gleichung" },
    { title: "Biochemie & Makromoleküle",      icon: "🧬", desc: "Proteine, Kohlenhydrate, Lipide, DNA-Struktur", unlocksGrade: 13 },
  ],
  biologie: [
    { title: "Zellbiologie Grundlagen",        icon: "🔬", desc: "Prokaryoten, Eukaryoten, Organellen, Zellmembran" },
    { title: "Pflanzen & Tiere",               icon: "🌱", desc: "Fotosynthese, Atmung, Tierkörperbau, Anpassungen" },
    { title: "Ökosysteme & Nahrungsnetze",     icon: "🌍", desc: "Nahrungskette, Biozönose, Produzenten und Konsumenten" },
    { title: "Genetik Grundlagen",             icon: "🧬", desc: "Mendel'sche Gesetze, Chromosomen, Mitose, Meiose", unlocksGrade: 8 },
    { title: "Evolutionstheorie",              icon: "🦕", desc: "Selektion, Mutation, Adaptation, Artbildung, Fossilien" },
    { title: "Humangenetik & Medizin",         icon: "🫀", desc: "Erbkrankheiten, Immunsystem, Hormonsystem, Neurologie", unlocksGrade: 11, flavor: "Das Buch des Lebens — jeder Mensch einzigartig." },
    { title: "Molekularbiologie",              icon: "🧫", desc: "DNA-Replikation, Transkription, Translation, CRISPR" },
    { title: "Biotechnologie",                 icon: "💉", desc: "Gentechnik, PCR, Klonierung, CRISPR-Cas9 Anwendungen", unlocksGrade: 13 },
  ],
  informatik: [
    { title: "Algorithmen Grundlagen",         icon: "💻", desc: "Pseudocode, Ablaufpläne, Sequenz, Verzweigung, Schleife" },
    { title: "Datenstrukturen Basis",          icon: "📦", desc: "Arrays, Listen, Stacks, Queues, grundlegende Operationen" },
    { title: "Programmierparadigmen",          icon: "⌨️", desc: "Imperativ, Funktional, Deklarativ — Vergleich & Anwendung" },
    { title: "Objektorientierung",             icon: "🏗️", desc: "Klassen, Objekte, Vererbung, Polymorphismus, Kapselung", unlocksGrade: 8 },
    { title: "Datenbanken",                    icon: "🗄️", desc: "SQL, Relationen, Normalisierung, JOIN, Abfrageoptimierung" },
    { title: "Netzwerke & Sicherheit",         icon: "🌐", desc: "TCP/IP, HTTP, Verschlüsselung, Firewalls, Protokolle", unlocksGrade: 11 },
    { title: "Algorithmen Theorie",            icon: "🔄", desc: "Sortieralgorithmen, Graphenalgorithmen, O-Notation, NP" },
    { title: "Künstliche Intelligenz",         icon: "🤖", desc: "Machine Learning, neuronale Netze, Entscheidungsbäume", unlocksGrade: 13, flavor: "Die Maschine lernt — der Mensch entscheidet." },
  ],
  geografie: [
    { title: "Karte & Orientierung",           icon: "🗺️", desc: "Koordinatensystem, Maßstab, topografische Karten, GPS" },
    { title: "Naturräume Europas",             icon: "🏔️", desc: "Gebirge, Tiefebenen, Flüsse, Küstenformen Europas" },
    { title: "Klimazonen & Biome",             icon: "🌦️", desc: "Tropen, Subtropen, gemäßigte Zonen, polare Gebiete" },
    { title: "Bevölkerungsgeografie",          icon: "👥", desc: "Bevölkerungsdichte, Migration, Urbanisierung, Demografie", unlocksGrade: 8 },
    { title: "Wirtschaftsgeografie",           icon: "🏭", desc: "Primär-, Sekundär-, Tertiärsektor, Globalisierungsräume" },
    { title: "Globalisierung & Handelsströme", icon: "📦", desc: "Welthandel, Rohstoffe, Schwellenländer, Entwicklung", unlocksGrade: 11 },
    { title: "Geopolitik & Konflikte",         icon: "🌏", desc: "Ressourcenkonflikte, geopolitische Einflusssphären, UN" },
    { title: "Umwelt & Nachhaltigkeit",        icon: "♻️", desc: "Klimawandel, erneuerbare Energien, SDGs, CO₂-Bilanz", unlocksGrade: 13, flavor: "Die Erde als gemeinsames Haus der Menschheit." },
  ],
  deutsch: [
    { title: "Grammatik Grundlagen",           icon: "📝", desc: "Wortarten, Satzglieder, Genus, Kasus, Numerus" },
    { title: "Rechtschreibung & Zeichensetzung", icon: "✍️", desc: "Getrennt-/Zusammenschreibung, Kommaregeln, ss/ß" },
    { title: "Aufsatz & Erörterung",           icon: "📄", desc: "Beschreiben, Erzählen, Erörtern, Argumentationsstruktur" },
    { title: "Lektüreanalyse",                 icon: "📚", desc: "Figurencharakterisierung, Textanalyse, Interpretation", unlocksGrade: 8, flavor: "Hinter jedem Text verbirgt sich eine Welt." },
    { title: "Lyrik & Rhetorik",               icon: "🎭", desc: "Gedichtanalyse, Stilmittel, rhetorische Figuren, Metrum" },
    { title: "Literaturepochen",               icon: "🏺", desc: "Sturm & Drang, Romantik, Realismus, Expressionismus", unlocksGrade: 11 },
    { title: "Sprachanalyse & Pragmatik",      icon: "🔍", desc: "Sprechakte, Textlinguistik, Kommunikationsmodelle" },
    { title: "Wissenschaftliches Schreiben",   icon: "🖊️", desc: "Exposé, Hausarbeit, Quellenarbeit, akademischer Stil", unlocksGrade: 13 },
  ],
  englisch: [
    { title: "Vokabular & Basics",             icon: "🔤", desc: "Grundvokabular, Aussprache, einfache Sätze, Alltagssprache" },
    { title: "Grammar Grundlagen",             icon: "📖", desc: "Tenses (Simple, Progressive, Perfect), Modals, Conditionals" },
    { title: "Reading Comprehension",          icon: "📰", desc: "Textverständnis, Infer meaning, Skimming & Scanning" },
    { title: "Writing Skills",                 icon: "✉️", desc: "Essay, informal & formal letter, report, email-writing", unlocksGrade: 8 },
    { title: "Advanced Grammar",               icon: "🗣️", desc: "Subjunctive, passive voice, relative clauses, inversion" },
    { title: "Culture & Civilisation",         icon: "🌍", desc: "British & American culture, history, society, media", unlocksGrade: 11 },
    { title: "Academic English",               icon: "🎓", desc: "Abstract, research paper, argumentation, citation styles" },
    { title: "Advanced Literature",            icon: "📜", desc: "Shakespeare, Orwell, Fitzgerald — literary analysis & context", unlocksGrade: 13, flavor: "To be or not to be — that is the question." },
  ],
  geschichte: [
    { title: "Antike Grundlagen",              icon: "🏛️", desc: "Griechenland, Rom, Ägypten — Hochkulturen und ihr Erbe" },
    { title: "Mittelalter",                    icon: "⚔️", desc: "Feudalismus, Kreuzzüge, Pest, Kirchenmacht, Ritter" },
    { title: "Frühe Neuzeit",                  icon: "🗺️", desc: "Reformation, Entdeckungszeitalter, Absolutismus, Barock" },
    { title: "Industrialisierung & 19. Jhd",   icon: "🏭", desc: "Industrielle Revolution, Nationalismus, Imperialismus", unlocksGrade: 8 },
    { title: "Erster & Zweiter Weltkrieg",     icon: "🕊️", desc: "Ursachen, Verlauf, Holocaust, Kriegsende, Folgen", flavor: "Wer die Vergangenheit nicht kennt, ist verdammt, sie zu wiederholen." },
    { title: "Kalter Krieg & Ost-West",        icon: "🌐", desc: "NATO vs. Warschauer Pakt, Korea, Vietnam, Kuba-Krise, Mauer", unlocksGrade: 11 },
    { title: "Dekolonisierung & 3. Welt",      icon: "🌍", desc: "Unabhängigkeitsbewegungen, neue Staaten, Entwicklungsprobleme" },
    { title: "Zeitgeschichte & Politik",       icon: "📰", desc: "Wiedervereinigung, 9/11, Digitalisierung, aktuelle Krisen", unlocksGrade: 13 },
  ],
  wirtschaft: [
    { title: "Grundbegriffe VWL",              icon: "📈", desc: "Wirtschaftskreislauf, BIP, Knappheit, Opportunitätskosten" },
    { title: "Angebot & Nachfrage",            icon: "📊", desc: "Gleichgewichtspreis, Elastizität, Marktversagen, Intervention" },
    { title: "Unternehmensformen",             icon: "🏢", desc: "GmbH, AG, OHG — Haftung, Kapital, Entscheidungsstruktur" },
    { title: "Finanzwirtschaft Basis",         icon: "💰", desc: "Zinsen, Kredite, Aktien, Anleihen, Risikoabwägung", unlocksGrade: 8 },
    { title: "Makroökonomie",                  icon: "🌍", desc: "Inflation, Deflation, Konjunkturzyklen, Geldpolitik, EZB" },
    { title: "Internationale Wirtschaft",      icon: "✈️", desc: "Freihandel, Protektionismus, WTO, Handelsbilanzen", unlocksGrade: 11, flavor: "Globaler Markt — lokale Konsequenzen." },
    { title: "Wirtschaftspolitik",             icon: "🏛️", desc: "Fiskalpolitik, Stabilitätspakt, Sozialstaat, Umverteilung" },
    { title: "Wirtschaftsethik & Nachhaltigkeit", icon: "♻️", desc: "CSR, ESG, Circular Economy, Stakeholder-Theorie", unlocksGrade: 13 },
  ],
  musik: [
    { title: "Noten & Rhythmus",               icon: "🎵", desc: "Notenwerte, Takt, Rhythmus, Pausen, Lese- und Schreibübungen" },
    { title: "Musiktheorie Grundlagen",        icon: "🎼", desc: "Tonleitern, Intervalle, Akkorde, Dur und Moll" },
    { title: "Harmonielehre",                  icon: "🎹", desc: "Kadenzen, Funktionsharmonik, Modulationen, Stufentheorie" },
    { title: "Musikgeschichte Überblick",      icon: "🎻", desc: "Barock, Klassik, Romantik — Epochen und Komponisten", unlocksGrade: 8 },
    { title: "Formenlehre",                    icon: "🎶", desc: "Sonate, Fuge, Rondo, Lied — Makrostruktur von Werken" },
    { title: "Zeitgenössische Musik",          icon: "🎸", desc: "Jazz, Rock, Pop, Elektronische Musik, Zwölftonmusik", unlocksGrade: 11 },
    { title: "Musikanalyse",                   icon: "🔍", desc: "Partiturlesen, Motivanalyse, Hermeneutik, Hörprotokoll" },
    { title: "Komposition & Arrangement",      icon: "🎺", desc: "Melodik, Kontrapunkt, Orchestrierung, digitale Komposition", unlocksGrade: 13, flavor: "Musik ist die Stille zwischen den Tönen." },
  ],
  sport: [
    { title: "Grundmotorik & Kondition",       icon: "🏃", desc: "Ausdauer, Kraft, Schnelligkeit, Koordination, Beweglichkeit" },
    { title: "Sportliche Techniken",           icon: "⚽", desc: "Techniktraining Leichtathletik, Ballsportarten, Turnen" },
    { title: "Taktik & Strategie",             icon: "🏀", desc: "Mannschaftstaktik, Positions- und Raumkonzepte, Spielanalyse" },
    { title: "Sportwissenschaft Grundlagen",   icon: "🏋️", desc: "Energiestoffwechsel, Trainingsprinzipien, Superkompensation", unlocksGrade: 8 },
    { title: "Sportbiologie",                  icon: "🫀", desc: "Herzkreislauf, Muskelphysiologie, VO2max, Laktatdiagnostik" },
    { title: "Trainingsplanung",               icon: "📋", desc: "Periodisierung, Mesozyklus, Mikroplanung, Belastungssteuerung", unlocksGrade: 11 },
    { title: "Leistungsdiagnostik",            icon: "📊", desc: "Fitness-Tests, Leistungsprofile, GPS-Analyse, Spielermonitoring" },
    { title: "Sportpsychologie & Coaching",    icon: "🧠", desc: "Mentales Training, Stressmanagement, Führung, Motivation", unlocksGrade: 13 },
  ],
};

// ── Build subject tier nodes ─────────────────────────────────────────────────
const SLUG_PREFIX: Record<string, string> = {
  mathematik: "m", physik: "ph", chemie: "ch", biologie: "bio",
  informatik: "it", geografie: "geo",
  deutsch: "de", englisch: "en", geschichte: "ge",
  wirtschaft: "wi", musik: "mu", sport: "sp",
};

function buildSubjectNodes(): SkillNode[] {
  const nodes: SkillNode[] = [];
  for (const [subject, tiers] of Object.entries(SUBJECT_TIERS)) {
    const x     = COL[subject]!;
    const color = SC[subject]!;
    const p     = SLUG_PREFIX[subject]!;
    tiers.forEach((t, i) => {
      nodes.push({
        slug:          `${p}_${i + 1}`,
        title:         t.title,
        desc:          t.desc,
        flavor:        t.flavor,
        subject,
        icon:          t.icon,
        color,
        x,
        y:             TY[i]!,
        prerequisites: i === 0 ? ["hub"] : [`${p}_${i}`],
        requiredXp:    TIER_XP[i]!,
        masteryReqs:   MR[i + 1]!,
        unlocksGrade:  t.unlocksGrade,
        type:          "subject",
        tier:          i + 1,
      });
    });
  }
  return nodes;
}

// ── Fusion nodes ─────────────────────────────────────────────────────────────
const FUSION_COLOR    = "#f59e0b";
const LEGENDARY_COLOR = "#fbbf24";

const FUSION_NODES: SkillNode[] = [
  // ── MINT left side ──
  {
    slug: "mint_basis", title: "MINT Basis", type: "fusion",
    desc: "Grundlegendes Verständnis von Mathematik und Physik als gemeinsame Sprache der Naturwissenschaften",
    flavor: "Zwei Welten, eine Sprache.",
    subject: null, subjects: ["mathematik", "physik"],
    icon: "🔬", color: FUSION_COLOR,
    x: -1500, y: 530, prerequisites: ["m_2", "ph_2"],
    requiredXp: 200, masteryReqs: FUSION_MR,
  },
  {
    slug: "mint_advanced", title: "MINT Fortgeschritten", type: "fusion",
    desc: "Vertieftes naturwissenschaftliches Denken: Mathematik, Physik und Chemie als einheitliches System",
    subject: null, subjects: ["mathematik", "physik", "chemie"],
    icon: "⚗️", color: FUSION_COLOR,
    x: -1200, y: 1070, prerequisites: ["m_4", "ph_4", "ch_3", "mint_basis"],
    requiredXp: 600, masteryReqs: FUSION_MR,
  },
  {
    slug: "mint_master", title: "MINT Meister", type: "fusion",
    desc: "Exzellenz in den Naturwissenschaften — Fächer weben zu einem Gesamtbild zusammen",
    flavor: "Wo Zahlen aufhören, beginnt das Verstehen.",
    subject: null, subjects: ["mathematik", "physik", "chemie"],
    icon: "🌌", color: FUSION_COLOR,
    x: -1200, y: 1600, prerequisites: ["m_6", "ph_6", "ch_5", "mint_advanced"],
    requiredXp: 1800, masteryReqs: ELITE_MR,
  },
  {
    slug: "naturwiss", title: "Naturwissenschaftler", type: "fusion",
    desc: "Lebende Systeme, Reaktionen und Kräfte — Biologie, Chemie und Physik im Verbund",
    subject: null, subjects: ["biologie", "chemie", "physik"],
    icon: "🧫", color: "#22d3ee",
    x: -900, y: 1340, prerequisites: ["bio_5", "ch_5", "ph_5"],
    requiredXp: 1200, masteryReqs: FUSION_MR,
  },
  {
    slug: "naturmaster", title: "Natur-Meister", type: "fusion",
    desc: "Vollständige Beherrschung aller Naturwissenschaften — der Wissenschaftler par excellence",
    flavor: "Die Natur verbirgt keine Geheimnisse vor denen, die suchen.",
    subject: null, subjects: ["biologie", "chemie", "physik", "mathematik"],
    icon: "🔭", color: "#22d3ee",
    x: -1050, y: 1940, prerequisites: ["naturwiss", "mint_master"],
    requiredXp: 2800, masteryReqs: ELITE_MR,
  },
  {
    slug: "digitalmint", title: "Digital-MINT", type: "fusion",
    desc: "Informatik und Mathematik als Werkzeuge der modernen Wissenschaft und Industrie",
    subject: null, subjects: ["informatik", "mathematik"],
    icon: "💡", color: "#60a5fa",
    x: -600, y: 1070, prerequisites: ["it_4", "m_4"],
    requiredXp: 700, masteryReqs: FUSION_MR,
  },
  {
    slug: "ki_pioneer", title: "KI-Pionier", type: "fusion",
    desc: "Algorithmen, Mathematik und Netzwerke verschmelzen zur Kunst der künstlichen Intelligenz",
    flavor: "Die Zukunft gehört denen, die sie programmieren.",
    subject: null, subjects: ["informatik", "mathematik"],
    icon: "🤖", color: "#60a5fa",
    x: -450, y: 1670, prerequisites: ["it_6", "m_5", "digitalmint"],
    requiredXp: 2000, masteryReqs: ELITE_MR,
  },
  {
    slug: "geo_forscher", title: "Geo-Naturwissenschaftler", type: "fusion",
    desc: "Geografie, Biologie und Chemie — das Ökosystem Erde in seiner ganzen Komplexität",
    subject: null, subjects: ["geografie", "biologie", "chemie"],
    icon: "🌿", color: "#2dd4bf",
    x: -450, y: 1000, prerequisites: ["geo_4", "bio_3", "ch_2"],
    requiredXp: 600, masteryReqs: FUSION_MR,
  },

  // ── Sprachen rechte Seite ──
  {
    slug: "sprachtalent", title: "Sprachtalent", type: "fusion",
    desc: "Deutsch und Englisch gemeinsam meistern — strukturelles Sprachgefühl für beide Kulturen",
    subject: null, subjects: ["deutsch", "englisch"],
    icon: "🗣️", color: "#e879f9",
    x: 300, y: 800, prerequisites: ["de_3", "en_3"],
    requiredXp: 350, masteryReqs: FUSION_MR,
  },
  {
    slug: "sprachmeister", title: "Sprachmeister", type: "fusion",
    desc: "Rhetorische Brillanz in zwei Sprachen — literarische Analyse und akademisches Schreiben",
    subject: null, subjects: ["deutsch", "englisch"],
    icon: "✒️", color: "#e879f9",
    x: 300, y: 1380, prerequisites: ["de_5", "en_5", "sprachtalent"],
    requiredXp: 1200, masteryReqs: FUSION_MR,
  },
  {
    slug: "sprachgott", title: "Sprachgott", type: "fusion",
    desc: "Vollständige Sprachkompetenz auf höchstem Niveau — Literatur, Wissenschaft und Kommunikation",
    flavor: "Im Anfang war das Wort.",
    subject: null, subjects: ["deutsch", "englisch"],
    icon: "📜", color: "#e879f9",
    x: 300, y: 1870, prerequisites: ["de_7", "en_7", "sprachmeister"],
    requiredXp: 2500, masteryReqs: ELITE_MR,
  },
  {
    slug: "historiker", title: "Historiker", type: "fusion",
    desc: "Geschichte und Geografie zusammen — räumliche und zeitliche Dimensionen menschlicher Entwicklung",
    subject: null, subjects: ["geschichte", "geografie"],
    icon: "🏛️", color: "#fb923c",
    x: 900, y: 1000, prerequisites: ["ge_4", "geo_3"],
    requiredXp: 550, masteryReqs: FUSION_MR,
  },
  {
    slug: "globalist", title: "Globalist", type: "fusion",
    desc: "Weltpolitik, Handelsströme und Kulturen — der große Blick auf das Zusammenspiel der Nationen",
    flavor: "Die Welt ist ein Dorf — für die, die sie verstehen.",
    subject: null, subjects: ["geschichte", "geografie", "englisch"],
    icon: "🌐", color: "#fb923c",
    x: 900, y: 1530, prerequisites: ["ge_6", "geo_5", "en_5", "historiker"],
    requiredXp: 1800, masteryReqs: ELITE_MR,
  },
  {
    slug: "oekonom_pro", title: "Ökonom", type: "fusion",
    desc: "Wirtschaftliche Modelle und mathematische Analyse — Zahlen im Dienst der Gesellschaft",
    subject: null, subjects: ["wirtschaft", "mathematik"],
    icon: "📊", color: "#f97316",
    x: 1200, y: 1000, prerequisites: ["wi_4", "m_3"],
    requiredXp: 550, masteryReqs: FUSION_MR,
  },
  {
    slug: "finanzgott", title: "Finanzgenie", type: "fusion",
    desc: "Fortgeschrittene Ökonometrie, internationale Märkte und komplexe Finanzinstrumente",
    subject: null, subjects: ["wirtschaft", "mathematik"],
    icon: "💹", color: "#f97316",
    x: 1200, y: 1600, prerequisites: ["wi_6", "m_6", "oekonom_pro"],
    requiredXp: 2200, masteryReqs: ELITE_MR,
  },
  {
    slug: "kulturgott", title: "Kulturmensch", type: "fusion",
    desc: "Musik, Sprache und Geschichte — das kulturelle Fundament einer gebildeten Persönlichkeit",
    subject: null, subjects: ["musik", "deutsch", "geschichte"],
    icon: "🎭", color: "#f472b6",
    x: 1500, y: 1000, prerequisites: ["mu_4", "de_4", "ge_3"],
    requiredXp: 650, masteryReqs: FUSION_MR,
  },
  {
    slug: "sportwiss", title: "Sportwissenschaftler", type: "fusion",
    desc: "Sport trifft Biologie — Trainingswissenschaft auf physiologischer Grundlage",
    subject: null, subjects: ["sport", "biologie"],
    icon: "🏅", color: "#a3e635",
    x: 1650, y: 1200, prerequisites: ["sp_4", "bio_3"],
    requiredXp: 500, masteryReqs: FUSION_MR,
  },

  // ── Renaissance-Knoten (Zentrum) ──
  {
    slug: "renaissance_i", title: "Renaissance Basis", type: "fusion",
    desc: "Grundkenntnisse in mindestens fünf verschiedenen Disziplinen — der universell Gebildete beginnt hier",
    flavor: "Scientia potestas est — Wissen ist Macht.",
    subject: null, subjects: ["mathematik", "deutsch", "englisch", "geschichte", "informatik"],
    icon: "🌟", color: "#fbbf24",
    x: 0, y: 880, prerequisites: ["m_3", "de_3", "en_3", "ge_3", "it_2"],
    requiredXp: 450, masteryReqs: FUSION_MR,
  },
  {
    slug: "renaissance_ii", title: "Renaissance Fortgeschritten", type: "fusion",
    desc: "Fundiertes Wissen in sieben Fächern — Interdisziplinarität als Stärke, nicht Schwäche",
    flavor: "Wer viel weiß, weiß, wie viel er nicht weiß.",
    subject: null, subjects: ["mathematik", "deutsch", "englisch", "geschichte", "physik", "biologie"],
    icon: "✨", color: "#fbbf24",
    x: 0, y: 1450,
    prerequisites: ["m_5", "de_5", "en_5", "ge_5", "ph_4", "bio_4", "renaissance_i"],
    requiredXp: 1500, masteryReqs: ELITE_MR,
  },
  {
    slug: "renaissance_iii", title: "Renaissance Meister", type: "fusion",
    desc: "Meisterschaft in acht Disziplinen — der vollständig gebildete Mensch des 21. Jahrhunderts",
    flavor: "Per aspera ad astra — durch Mühen zu den Sternen.",
    subject: null,
    subjects: ["mathematik", "deutsch", "englisch", "geschichte", "physik", "biologie", "informatik"],
    icon: "🌠", color: "#fbbf24",
    x: 0, y: 2020,
    prerequisites: ["m_7", "de_7", "en_7", "ge_7", "ph_6", "bio_6", "it_6", "renaissance_ii"],
    requiredXp: 4000, masteryReqs: ELITE_MR,
  },
];

// ── Legendary nodes ──────────────────────────────────────────────────────────
const LEGENDARY_NODES: SkillNode[] = [
  {
    slug: "weiser", title: "Der Weise", type: "legendary",
    desc: "Naturwissenschaften, Sprachen und globales Denken vereint — die Weisheit des Gelehrten",
    flavor: "Sophia — die höchste Form des Verstehens.",
    subject: null, icon: "🌿", color: LEGENDARY_COLOR,
    x: -600, y: 2680,
    prerequisites: ["naturmaster", "sprachgott", "globalist", "renaissance_iii"],
    requiredXp: 5000, masteryReqs: LEGEND_MR,
  },
  {
    slug: "digital_gott", title: "Digital-Visionär", type: "legendary",
    desc: "KI, Finanzmathematik und Renaissance-Bildung — der Architekt der digitalen Zukunft",
    flavor: "Die Zukunft ist bereits hier — sie ist nur ungleich verteilt.",
    subject: null, icon: "💡", color: LEGENDARY_COLOR,
    x: 600, y: 2680,
    prerequisites: ["ki_pioneer", "finanzgott", "renaissance_ii", "it_7"],
    requiredXp: 5000, masteryReqs: LEGEND_MR,
  },
  {
    slug: "mastermind_node", title: "MASTERMIND", type: "legendary",
    desc: "Der Gipfel aller Erkenntnis. Du hast alle Fächer gemeistert und die Grenzen des Lernbaren ausgeschöpft.",
    flavor: "Omnia vincit labor — Arbeit besiegt alles. Du hast es bewiesen.",
    subject: null, icon: "🧠", color: "#ff6b6b",
    x: 0, y: 3000,
    prerequisites: ["weiser", "digital_gott", "renaissance_iii", "kulturgott", "sprachgott", "sportwiss"],
    requiredXp: 8000, masteryReqs: LEGEND_MR,
  },
];

// ── Hub node ─────────────────────────────────────────────────────────────────
const HUB_NODE: SkillNode = {
  slug: "hub", title: "Der Ursprung", type: "hub",
  desc: "Der Anfang aller Erkenntnis. Schalte den Skill-Baum frei und wähle deinen Weg.",
  flavor: "Alle Wege beginnen hier.",
  subject: null, icon: "⚡", color: "#f59e0b",
  x: 0, y: 0, prerequisites: [],
  requiredXp: 0, masteryReqs: [1, 2, 3],
};

// ── Assemble the full graph ───────────────────────────────────────────────────
export const SKILL_GRAPH: SkillNode[] = [
  HUB_NODE,
  ...buildSubjectNodes(),
  ...FUSION_NODES,
  ...LEGENDARY_NODES,
];

export const SKILL_MAP = new Map<string, SkillNode>(
  SKILL_GRAPH.map((n) => [n.slug, n])
);

// ── Grade unlocking ───────────────────────────────────────────────────────────
export function getMaxUnlockedGradeFromMastery(
  subject: string,
  masteryMap: Record<string, { tier: number }>,
): number {
  let max = 5;
  for (const node of SKILL_GRAPH) {
    if (node.subject === subject && node.unlocksGrade) {
      const m = masteryMap[node.slug];
      if (m && m.tier >= 1 && node.unlocksGrade > max) max = node.unlocksGrade;
    }
  }
  return max;
}

// ── Grade for question fetching per tier slot ────────────────────────────────
export function gradeForTier(tier: number): number {
  return Math.min(13, 4 + tier); // T1→5, T2→6, ..., T8→12
}

// ── Total nodes / progress stats ─────────────────────────────────────────────
export const TOTAL_NODES       = SKILL_GRAPH.length;
export const TOTAL_MASTERY_PTS = SKILL_GRAPH.length * 3; // max gold on each node
