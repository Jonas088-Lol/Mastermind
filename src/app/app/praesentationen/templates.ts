/* Copyright 2026 Elian Schock, Jonas Schwenk */
// Folien-Vorlagen für die Präsentations-Galerie.
// Struktur muss zu den Typen in [id]/PresentationEditor.tsx passen
// (SlideElement / Slide, Positionen in Prozent des 16:9-Canvas).

type TplAlign = "left" | "center" | "right";

interface TplElement {
  id: string;
  type: "text" | "title" | "subtitle" | "image" | "shape";
  x: number; y: number; w: number; h: number;
  content: string;
  fontSize: number;
  fontFamily: string;
  color: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  align: TplAlign;
  bg: string;
  opacity: number;
  shapeType?: "rect" | "circle" | "triangle";
}

interface TplSlide {
  id: string;
  background: string;
  elements: TplElement[];
  notes: string;
}

export interface PresentationTemplate {
  key: string;
  name: string;
  emoji: string;
  description: string;
  title: string;
  slides: TplSlide[];
}

const BASE: Omit<TplElement, "id" | "type" | "x" | "y" | "w" | "h" | "content"> = {
  fontSize: 18,
  fontFamily: "Arial",
  color: "#1a1a1a",
  bold: false,
  italic: false,
  underline: false,
  align: "left",
  bg: "transparent",
  opacity: 1,
};

function el(
  id: string,
  type: TplElement["type"],
  x: number, y: number, w: number, h: number,
  content: string,
  overrides: Partial<TplElement> = {},
): TplElement {
  return { ...BASE, id, type, x, y, w, h, content, ...overrides };
}

function titleEl(id: string, content: string, color = "#1a1a1a"): TplElement {
  return el(id, "title", 8, 8, 84, 14, content, { fontSize: 34, bold: true, align: "left", color });
}

function bodyEl(id: string, x: number, y: number, w: number, h: number, content: string, color = "#374151"): TplElement {
  return el(id, "text", x, y, w, h, content, { fontSize: 18, color });
}

export const PRESENTATION_TEMPLATES: PresentationTemplate[] = [
  {
    key: "referat",
    name: "Referat",
    emoji: "📚",
    description: "Klassischer Aufbau mit Gliederung und Quellen",
    title: "Referat: [Thema]",
    slides: [
      {
        id: "ref-1",
        background: "#f0f9ff",
        notes: "Begrüßung, Thema und Name nennen.",
        elements: [
          el("ref-1-t", "title", 10, 30, 80, 16, "[Thema des Referats]", { fontSize: 42, bold: true, align: "center", color: "#0c4a6e" }),
          el("ref-1-s", "subtitle", 15, 52, 70, 10, "[Dein Name] · [Fach] · [Datum]", { fontSize: 20, align: "center", color: "#0369a1" }),
        ],
      },
      {
        id: "ref-2",
        background: "#ffffff",
        notes: "Kurz durch die Gliederung führen.",
        elements: [
          titleEl("ref-2-t", "Gliederung", "#0c4a6e"),
          bodyEl("ref-2-b", 12, 28, 76, 55, "1. [Einleitung]\n2. [Hauptpunkt 1]\n3. [Hauptpunkt 2]\n4. [Fazit]\n5. Quellen"),
        ],
      },
      {
        id: "ref-3",
        background: "#ffffff",
        notes: "",
        elements: [
          titleEl("ref-3-t", "[Hauptpunkt 1]", "#0c4a6e"),
          bodyEl("ref-3-b", 8, 28, 50, 55, "• [Wichtiger Fakt]\n• [Erklärung]\n• [Beispiel]"),
          el("ref-3-img", "image", 62, 28, 32, 45, "", { align: "center", color: "#6b7280" }),
        ],
      },
      {
        id: "ref-4",
        background: "#ffffff",
        notes: "",
        elements: [
          titleEl("ref-4-t", "[Hauptpunkt 2]", "#0c4a6e"),
          bodyEl("ref-4-b", 8, 28, 84, 55, "• [Wichtiger Fakt]\n• [Erklärung]\n• [Beispiel]"),
        ],
      },
      {
        id: "ref-5",
        background: "#f0f9ff",
        notes: "Quellen sauber angeben!",
        elements: [
          titleEl("ref-5-t", "Quellen", "#0c4a6e"),
          bodyEl("ref-5-b", 10, 28, 80, 55, "• [Buch: Autor, Titel, Jahr]\n• [Webseite: Name, URL, Abrufdatum]\n• [Weitere Quelle]", "#475569"),
        ],
      },
    ],
  },
  {
    key: "buchvorstellung",
    name: "Buchvorstellung",
    emoji: "📖",
    description: "Buch, Figuren, Handlung und eigene Meinung",
    title: "Buchvorstellung: [Buchtitel]",
    slides: [
      {
        id: "buch-1",
        background: "#fdf4ff",
        notes: "Buch hochhalten und Titel + Autor:in nennen.",
        elements: [
          el("buch-1-t", "title", 10, 28, 80, 16, "[Buchtitel]", { fontSize: 42, bold: true, align: "center", color: "#701a75" }),
          el("buch-1-s", "subtitle", 15, 50, 70, 10, "von [Autor:in] · vorgestellt von [Dein Name]", { fontSize: 20, align: "center", color: "#a21caf" }),
        ],
      },
      {
        id: "buch-2",
        background: "#ffffff",
        notes: "",
        elements: [
          titleEl("buch-2-t", "Das Buch", "#701a75"),
          bodyEl("buch-2-b", 8, 28, 50, 55, "• Autor:in: [Name]\n• Erschienen: [Jahr]\n• Seiten: [Anzahl]\n• Genre: [z. B. Abenteuer]"),
          el("buch-2-img", "image", 64, 26, 28, 55, "", { align: "center", color: "#6b7280" }),
        ],
      },
      {
        id: "buch-3",
        background: "#ffffff",
        notes: "",
        elements: [
          titleEl("buch-3-t", "Die Figuren", "#701a75"),
          bodyEl("buch-3-b", 8, 28, 84, 55, "• [Hauptfigur]: [kurze Beschreibung]\n• [Zweite Figur]: [kurze Beschreibung]\n• [Weitere Figur]: [kurze Beschreibung]"),
        ],
      },
      {
        id: "buch-4",
        background: "#ffffff",
        notes: "Nicht das Ende verraten!",
        elements: [
          titleEl("buch-4-t", "Worum geht es?", "#701a75"),
          bodyEl("buch-4-b", 8, 28, 84, 55, "[Kurze Zusammenfassung der Handlung — ohne das Ende zu verraten!]"),
        ],
      },
      {
        id: "buch-5",
        background: "#fdf4ff",
        notes: "",
        elements: [
          titleEl("buch-5-t", "Meine Meinung", "#701a75"),
          bodyEl("buch-5-b", 8, 28, 84, 45, "• [Was mir gefallen hat]\n• [Was mir nicht gefallen hat]\n• [Für wen ist das Buch geeignet?]"),
          el("buch-5-star", "text", 8, 76, 84, 10, "Meine Bewertung: [⭐⭐⭐⭐☆]", { fontSize: 20, bold: true, color: "#a21caf" }),
        ],
      },
    ],
  },
  {
    key: "projekt-pitch",
    name: "Projekt-Pitch",
    emoji: "🚀",
    description: "Idee überzeugend präsentieren",
    title: "Pitch: [Projektname]",
    slides: [
      {
        id: "pitch-1",
        background: "#fff7ed",
        notes: "Mit einem starken Satz starten.",
        elements: [
          el("pitch-1-t", "title", 10, 28, 80, 16, "[Projektname]", { fontSize: 44, bold: true, align: "center", color: "#9a3412" }),
          el("pitch-1-s", "subtitle", 15, 50, 70, 10, "[Ein Satz, der neugierig macht]", { fontSize: 20, italic: true, align: "center", color: "#c2410c" }),
        ],
      },
      {
        id: "pitch-2",
        background: "#ffffff",
        notes: "",
        elements: [
          titleEl("pitch-2-t", "Das Problem", "#9a3412"),
          bodyEl("pitch-2-b", 8, 28, 84, 55, "• [Welches Problem gibt es?]\n• [Wen betrifft es?]\n• [Warum ist es wichtig?]"),
        ],
      },
      {
        id: "pitch-3",
        background: "#ffffff",
        notes: "",
        elements: [
          titleEl("pitch-3-t", "Unsere Lösung", "#9a3412"),
          bodyEl("pitch-3-b", 8, 28, 50, 55, "• [Was ist die Idee?]\n• [Wie funktioniert sie?]\n• [Was macht sie besonders?]"),
          el("pitch-3-img", "image", 62, 28, 32, 45, "", { align: "center", color: "#6b7280" }),
        ],
      },
      {
        id: "pitch-4",
        background: "#ffffff",
        notes: "",
        elements: [
          titleEl("pitch-4-t", "Der Plan", "#9a3412"),
          bodyEl("pitch-4-b", 8, 28, 84, 55, "1. [Erster Schritt]\n2. [Zweiter Schritt]\n3. [Dritter Schritt]\n\nWas wir brauchen: [Material / Zeit / Unterstützung]"),
        ],
      },
      {
        id: "pitch-5",
        background: "#fff7ed",
        notes: "Mit klarem Aufruf enden.",
        elements: [
          el("pitch-5-t", "title", 10, 32, 80, 16, "Macht mit!", { fontSize: 40, bold: true, align: "center", color: "#9a3412" }),
          el("pitch-5-s", "subtitle", 15, 54, 70, 12, "[Was sollen die Zuhörer:innen jetzt tun?]", { fontSize: 20, align: "center", color: "#c2410c" }),
        ],
      },
    ],
  },
  {
    key: "experiment",
    name: "Experiment-Doku",
    emoji: "🧪",
    description: "Frage, Aufbau, Beobachtung, Erklärung",
    title: "Experiment: [Name des Versuchs]",
    slides: [
      {
        id: "exp-1",
        background: "#f0fdf4",
        notes: "",
        elements: [
          el("exp-1-t", "title", 10, 28, 80, 16, "[Name des Versuchs]", { fontSize: 42, bold: true, align: "center", color: "#14532d" }),
          el("exp-1-s", "subtitle", 15, 50, 70, 10, "[Dein Name] · [Fach] · [Datum]", { fontSize: 20, align: "center", color: "#15803d" }),
        ],
      },
      {
        id: "exp-2",
        background: "#ffffff",
        notes: "",
        elements: [
          titleEl("exp-2-t", "Fragestellung & Vermutung", "#14532d"),
          bodyEl("exp-2-b", 8, 28, 84, 55, "Frage: [Was wollen wir herausfinden?]\n\nVermutung (Hypothese): [Was glauben wir, wird passieren?]"),
        ],
      },
      {
        id: "exp-3",
        background: "#ffffff",
        notes: "",
        elements: [
          titleEl("exp-3-t", "Material & Aufbau", "#14532d"),
          bodyEl("exp-3-b", 8, 28, 50, 55, "Material:\n• [Gegenstand 1]\n• [Gegenstand 2]\n\nDurchführung:\n1. [Schritt 1]\n2. [Schritt 2]"),
          el("exp-3-img", "image", 62, 28, 32, 45, "", { align: "center", color: "#6b7280" }),
        ],
      },
      {
        id: "exp-4",
        background: "#ffffff",
        notes: "",
        elements: [
          titleEl("exp-4-t", "Beobachtung", "#14532d"),
          bodyEl("exp-4-b", 8, 28, 84, 55, "• [Was ist passiert?]\n• [Messwerte / Veränderungen]\n• [Besonderheiten]"),
        ],
      },
      {
        id: "exp-5",
        background: "#f0fdf4",
        notes: "Rückbezug auf die Vermutung.",
        elements: [
          titleEl("exp-5-t", "Erklärung & Fazit", "#14532d"),
          bodyEl("exp-5-b", 8, 28, 84, 55, "Erklärung: [Warum ist das passiert?]\n\nFazit: [Stimmte unsere Vermutung? Was haben wir gelernt?]"),
        ],
      },
    ],
  },
  {
    key: "praktikum",
    name: "Praktikums-Vortrag",
    emoji: "💼",
    description: "Betrieb, Aufgaben und Fazit zum Praktikum",
    title: "Mein Praktikum bei [Betrieb]",
    slides: [
      {
        id: "prak-1",
        background: "#eff6ff",
        notes: "",
        elements: [
          el("prak-1-t", "title", 10, 28, 80, 16, "Mein Praktikum bei [Betrieb]", { fontSize: 38, bold: true, align: "center", color: "#1e3a8a" }),
          el("prak-1-s", "subtitle", 15, 50, 70, 10, "[Dein Name] · [Zeitraum]", { fontSize: 20, align: "center", color: "#1d4ed8" }),
        ],
      },
      {
        id: "prak-2",
        background: "#ffffff",
        notes: "",
        elements: [
          titleEl("prak-2-t", "Der Betrieb", "#1e3a8a"),
          bodyEl("prak-2-b", 8, 28, 50, 55, "• Branche: [z. B. Handwerk]\n• Ort: [Stadt]\n• Mitarbeiter: [Anzahl]\n• Besonderheit: [Was macht der Betrieb?]"),
          el("prak-2-img", "image", 62, 28, 32, 45, "", { align: "center", color: "#6b7280" }),
        ],
      },
      {
        id: "prak-3",
        background: "#ffffff",
        notes: "",
        elements: [
          titleEl("prak-3-t", "Meine Aufgaben", "#1e3a8a"),
          bodyEl("prak-3-b", 8, 28, 84, 55, "• [Aufgabe 1]\n• [Aufgabe 2]\n• [Aufgabe 3]\n\nEin typischer Tag: [kurz beschreiben]"),
        ],
      },
      {
        id: "prak-4",
        background: "#ffffff",
        notes: "",
        elements: [
          titleEl("prak-4-t", "Das habe ich gelernt", "#1e3a8a"),
          bodyEl("prak-4-b", 8, 28, 84, 55, "• [Neue Fähigkeit]\n• [Überraschende Erkenntnis]\n• [Was war schwierig?]"),
        ],
      },
      {
        id: "prak-5",
        background: "#eff6ff",
        notes: "",
        elements: [
          titleEl("prak-5-t", "Mein Fazit", "#1e3a8a"),
          bodyEl("prak-5-b", 8, 28, 84, 55, "• [Hat mir das Praktikum gefallen?]\n• [Kann ich mir den Beruf vorstellen?]\n• [Empfehlung für andere]"),
        ],
      },
    ],
  },
  {
    key: "quiz-show",
    name: "Quiz-Show",
    emoji: "🎯",
    description: "Fragen und Auflösungen für die Klasse",
    title: "Quiz: [Thema]",
    slides: [
      {
        id: "quiz-1",
        background: "#fefce8",
        notes: "Regeln erklären: Wer zuerst die Hand hebt, darf antworten.",
        elements: [
          el("quiz-1-t", "title", 10, 28, 80, 16, "Das große [Thema]-Quiz", { fontSize: 42, bold: true, align: "center", color: "#713f12" }),
          el("quiz-1-s", "subtitle", 15, 50, 70, 10, "Wer weiß am meisten?", { fontSize: 22, align: "center", color: "#a16207" }),
        ],
      },
      {
        id: "quiz-2",
        background: "#ffffff",
        notes: "",
        elements: [
          titleEl("quiz-2-t", "Frage 1", "#713f12"),
          bodyEl("quiz-2-q", 8, 26, 84, 16, "[Deine erste Quizfrage?]", "#1a1a1a"),
          bodyEl("quiz-2-b", 12, 46, 76, 40, "A) [Antwort A]\nB) [Antwort B]\nC) [Antwort C]\nD) [Antwort D]"),
        ],
      },
      {
        id: "quiz-3",
        background: "#f0fdf4",
        notes: "",
        elements: [
          titleEl("quiz-3-t", "Auflösung Frage 1", "#14532d"),
          el("quiz-3-a", "text", 10, 32, 80, 14, "Richtig ist: [Buchstabe]) [richtige Antwort]", { fontSize: 24, bold: true, color: "#15803d" }),
          bodyEl("quiz-3-b", 10, 52, 80, 30, "[Kurze Erklärung, warum das stimmt]"),
        ],
      },
      {
        id: "quiz-4",
        background: "#ffffff",
        notes: "",
        elements: [
          titleEl("quiz-4-t", "Frage 2", "#713f12"),
          bodyEl("quiz-4-q", 8, 26, 84, 16, "[Deine zweite Quizfrage?]", "#1a1a1a"),
          bodyEl("quiz-4-b", 12, 46, 76, 40, "A) [Antwort A]\nB) [Antwort B]\nC) [Antwort C]\nD) [Antwort D]"),
        ],
      },
      {
        id: "quiz-5",
        background: "#f0fdf4",
        notes: "",
        elements: [
          titleEl("quiz-5-t", "Auflösung Frage 2", "#14532d"),
          el("quiz-5-a", "text", 10, 32, 80, 14, "Richtig ist: [Buchstabe]) [richtige Antwort]", { fontSize: 24, bold: true, color: "#15803d" }),
          bodyEl("quiz-5-b", 10, 52, 80, 30, "[Kurze Erklärung, warum das stimmt]"),
        ],
      },
      {
        id: "quiz-6",
        background: "#fefce8",
        notes: "Gewinner:in feiern!",
        elements: [
          el("quiz-6-t", "title", 10, 32, 80, 16, "🏆 Und gewonnen hat …", { fontSize: 40, bold: true, align: "center", color: "#713f12" }),
          el("quiz-6-s", "subtitle", 15, 54, 70, 10, "Danke fürs Mitspielen!", { fontSize: 22, align: "center", color: "#a16207" }),
        ],
      },
    ],
  },
];

export function getTemplate(key: string): PresentationTemplate | undefined {
  return PRESENTATION_TEMPLATES.find((t) => t.key === key);
}
