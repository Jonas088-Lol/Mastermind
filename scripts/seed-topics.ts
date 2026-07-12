/* Copyright 2026 Elian Schock, Jonas Schwenk */
/**
 * Comprehensive curriculum seed — ExerciseTopics + ExerciseQuestions
 * Run: npx tsx scripts/seed-topics.ts
 * Idempotent via upsert. Skips topics already in prisma/seed.ts.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type QuestionDef = {
  type: "mc" | "fill_blank" | "true_false" | "order" | "match";
  question: string;
  options: string | null;
  correct: string;
  explanation: string;
  order: number;
};

type TopicDef = {
  id: string;
  subject: string;
  grade: number;
  order: number;
  title: string;
  description: string;
  lesson: string;
  questions: QuestionDef[];
};

const topics: TopicDef[] = [
  // ═══════════════════════════════════════════════════════════════
  // MATHEMATIK
  // ═══════════════════════════════════════════════════════════════
  {
    id: "cur-mathe-1-zahlen",
    subject: "mathematik", grade: 1, order: 1,
    title: "Zahlen bis 20",
    description: "Zahlen bis 20 lesen, schreiben, zählen und vergleichen.",
    lesson: "## Zahlen bis 20\n\nWir lernen die Zahlen 1 bis 20 kennen.\n\n- Zählen vorwärts: 1, 2, 3 … 20\n- Zählen rückwärts: 20, 19, 18 … 1\n- **Größer als (>)** und **kleiner als (<)**\n\nBeispiel: 7 < 12 (7 ist kleiner als 12)",
    questions: [
      { type: "mc", question: "Welche Zahl kommt nach 9?", options: JSON.stringify(["8", "10", "11", "7"]), correct: "1", explanation: "Nach 9 kommt 10.", order: 1 },
      { type: "true_false", question: "15 ist größer als 12.", correct: "true", options: null, explanation: "15 > 12 — fünfzehn ist größer als zwölf.", order: 2 },
      { type: "fill_blank", question: "7 + 3 = ___", correct: JSON.stringify(["10"]), options: null, explanation: "7 + 3 = 10.", order: 3 },
      { type: "order", question: "Sortiere diese Zahlen vom Kleinsten zum Größten:", options: JSON.stringify(["14", "3", "9", "17"]), correct: JSON.stringify([1, 2, 0, 3]), explanation: "3 < 9 < 14 < 17.", order: 4 },
    ],
  },
  {
    id: "cur-mathe-2-addition",
    subject: "mathematik", grade: 2, order: 1,
    title: "Addition und Subtraktion bis 100",
    description: "Zweistellige Zahlen addieren und subtrahieren.",
    lesson: "## Addition bis 100\n\n**Schriftliche Addition:** Einer unter Einer, Zehner unter Zehner.\n\n```\n  47\n+ 35\n----\n  82\n```\n\nÜbertrag: 7+5=12 → schreibe 2, trage 1 über.",
    questions: [
      { type: "fill_blank", question: "34 + 25 = ___", correct: JSON.stringify(["59"]), options: null, explanation: "4+5=9, 30+20=50 → 59.", order: 1 },
      { type: "mc", question: "Was ergibt 70 − 38?", options: JSON.stringify(["32", "42", "28", "38"]), correct: "0", explanation: "70 − 38 = 32.", order: 2 },
      { type: "true_false", question: "52 + 48 = 100", correct: "true", options: null, explanation: "52 + 48 = 100.", order: 3 },
      { type: "fill_blank", question: "63 − ___ = 27", correct: JSON.stringify(["36"]), options: null, explanation: "63 − 36 = 27.", order: 4 },
    ],
  },
  {
    id: "cur-mathe-3-einmaleins",
    subject: "mathematik", grade: 3, order: 1,
    title: "Das Einmaleins",
    description: "Das kleine Einmaleins (1×1 bis 10×10) sicher beherrschen.",
    lesson: "## Das Einmaleins\n\nDas kleine 1×1: Jede Zahl von 1 bis 10 mit jeder anderen multiplizieren.\n\n**Tricks:**\n- ×2: Zahl verdoppeln\n- ×5: Ergebnis endet auf 0 oder 5\n- ×10: Null anhängen\n\nBeispiel: 7 × 8 = 56",
    questions: [
      { type: "fill_blank", question: "7 × 6 = ___", correct: JSON.stringify(["42"]), options: null, explanation: "7 × 6 = 42.", order: 1 },
      { type: "mc", question: "Was ist 8 × 9?", options: JSON.stringify(["63", "72", "81", "64"]), correct: "1", explanation: "8 × 9 = 72.", order: 2 },
      { type: "true_false", question: "6 × 7 = 42", correct: "true", options: null, explanation: "6 × 7 = 42.", order: 3 },
      { type: "fill_blank", question: "9 × ___ = 63", correct: JSON.stringify(["7"]), options: null, explanation: "63 ÷ 9 = 7.", order: 4 },
    ],
  },
  {
    id: "cur-mathe-4-geometrie",
    subject: "mathematik", grade: 4, order: 1,
    title: "Geometrische Formen",
    description: "Dreieck, Viereck, Kreis, Umfang und Flächeninhalt berechnen.",
    lesson: "## Geometrische Formen\n\n| Form | Umfang | Fläche |\n|------|--------|--------|\n| Quadrat (a) | 4·a | a² |\n| Rechteck (l,b) | 2·(l+b) | l·b |\n| Dreieck (a,b,c) | a+b+c | — |\n\nBeispiel Rechteck: l=5cm, b=3cm → U=16cm, A=15cm²",
    questions: [
      { type: "fill_blank", question: "Ein Quadrat hat die Seitenlänge 6 cm. Der Umfang beträgt ___ cm.", correct: JSON.stringify(["24"]), options: null, explanation: "U = 4 × 6 = 24 cm.", order: 1 },
      { type: "mc", question: "Was ist der Flächeninhalt eines Rechtecks mit l=8cm und b=4cm?", options: JSON.stringify(["24 cm²", "32 cm²", "12 cm²", "16 cm²"]), correct: "1", explanation: "A = 8 × 4 = 32 cm².", order: 2 },
      { type: "true_false", question: "Ein Dreieck hat 4 Seiten.", correct: "false", options: null, explanation: "Ein Dreieck hat genau 3 Seiten.", order: 3 },
      { type: "fill_blank", question: "Der Umfang eines Dreiecks mit den Seiten 3, 4 und 5 cm beträgt ___ cm.", correct: JSON.stringify(["12"]), options: null, explanation: "U = 3 + 4 + 5 = 12 cm.", order: 4 },
    ],
  },
  {
    id: "cur-mathe-6-prozent",
    subject: "mathematik", grade: 6, order: 1,
    title: "Prozentrechnung",
    description: "Prozentsatz, Grundwert und Prozentwert berechnen.",
    lesson: "## Prozentrechnung\n\n**Formeln:**\n- Prozentwert W = G × p ÷ 100\n- Grundwert G = W × 100 ÷ p\n- Prozentsatz p = W × 100 ÷ G\n\n**Beispiel:** 25% von 80 = 80 × 25 ÷ 100 = **20**",
    questions: [
      { type: "fill_blank", question: "25% von 80 = ___", correct: JSON.stringify(["20"]), options: null, explanation: "80 × 25 ÷ 100 = 20.", order: 1 },
      { type: "mc", question: "Ein Pullover kostet 60 €. Er wird um 10% reduziert. Neuer Preis?", options: JSON.stringify(["50 €", "54 €", "56 €", "45 €"]), correct: "1", explanation: "10% von 60 = 6 → 60 − 6 = 54 €.", order: 2 },
      { type: "true_false", question: "100% von 40 sind 40.", correct: "true", options: null, explanation: "100% entspricht dem Grundwert selbst.", order: 3 },
      { type: "fill_blank", question: "12 ist ___% von 60.", correct: JSON.stringify(["20"]), options: null, explanation: "12 × 100 ÷ 60 = 20%.", order: 4 },
    ],
  },
  {
    id: "cur-mathe-8-pythagoras",
    subject: "mathematik", grade: 8, order: 1,
    title: "Satz des Pythagoras",
    description: "Den Satz des Pythagoras verstehen und anwenden: a² + b² = c².",
    lesson: "## Satz des Pythagoras\n\nIn einem **rechtwinkligen Dreieck** gilt:\n\n`a² + b² = c²`\n\nDabei ist **c** die Hypotenuse (längste Seite, gegenüber dem rechten Winkel).\n\n**Beispiel:** a=3, b=4 → c² = 9+16 = 25 → c = 5",
    questions: [
      { type: "mc", question: "In einem rechtwinkligen Dreieck: a=6, b=8. Was ist c?", options: JSON.stringify(["10", "12", "14", "√28"]), correct: "0", explanation: "c² = 36+64 = 100 → c = 10.", order: 1 },
      { type: "true_false", question: "Im Satz des Pythagoras ist c stets die längste Seite.", correct: "true", options: null, explanation: "c ist die Hypotenuse — die Seite gegenüber dem rechten Winkel.", order: 2 },
      { type: "fill_blank", question: "a=5, c=13. Dann ist b = ___.", correct: JSON.stringify(["12"]), options: null, explanation: "b² = 169−25 = 144 → b = 12.", order: 3 },
      { type: "mc", question: "Welches Dreieck mit Seiten a=3, b=4, c=5 ist rechtwinklig?", options: JSON.stringify(["Nein, nicht rechtwinklig", "Ja, rechtwinklig", "Nur wenn man es dreht", "Unmöglich zu sagen"]), correct: "1", explanation: "3²+4²=9+16=25=5² ✓", order: 4 },
    ],
  },
  {
    id: "cur-mathe-10-analysis",
    subject: "mathematik", grade: 10, order: 1,
    title: "Differenzialrechnung — Grundlagen",
    description: "Ableitungsregeln: Potenzregel, Summenregel und Kettenregel.",
    lesson: "## Ableitung\n\n**Potenzregel:** f(x) = xⁿ → f'(x) = n·xⁿ⁻¹\n\n**Summenregel:** (f+g)' = f' + g'\n\n**Konstantenregel:** f(x) = c → f'(x) = 0\n\n**Beispiele:**\n- f(x) = x³ → f'(x) = 3x²\n- f(x) = 4x² + 3x → f'(x) = 8x + 3",
    questions: [
      { type: "fill_blank", question: "f(x) = x⁴ → f'(x) = ___", correct: JSON.stringify(["4x³"]), options: null, explanation: "Potenzregel: 4·x³.", order: 1 },
      { type: "mc", question: "Was ist die Ableitung von f(x) = 3x² + 2x − 5?", options: JSON.stringify(["6x + 2", "3x + 2", "6x² + 2", "3x"]), correct: "0", explanation: "f'(x) = 6x + 2.", order: 2 },
      { type: "true_false", question: "Die Ableitung einer Konstante ist 0.", correct: "true", options: null, explanation: "f(x) = c → f'(x) = 0.", order: 3 },
      { type: "fill_blank", question: "f(x) = 5x → f'(x) = ___", correct: JSON.stringify(["5"]), options: null, explanation: "f(x) = 5x¹ → f'(x) = 5·1·x⁰ = 5.", order: 4 },
    ],
  },
  {
    id: "cur-mathe-11-integral",
    subject: "mathematik", grade: 11, order: 1,
    title: "Integralrechnung",
    description: "Stammfunktion bestimmen, bestimmtes Integral und Flächeninhalt.",
    lesson: "## Integralrechnung\n\n**Stammfunktion:** Umkehrung der Ableitung.\n\n**Potenzregel:** ∫xⁿ dx = xⁿ⁺¹/(n+1) + C\n\n**Bestimmtes Integral:** ∫[a→b] f(x) dx = F(b) − F(a)\n\n**Beispiel:** ∫₀² x² dx = [x³/3]₀² = 8/3 − 0 = 8/3",
    questions: [
      { type: "fill_blank", question: "∫ x³ dx = ___", correct: JSON.stringify(["x⁴/4 + C"]), options: null, explanation: "Potenzregel rückwärts: x⁴/4 + C.", order: 1 },
      { type: "mc", question: "Was berechnet das bestimmte Integral ∫[a→b] f(x) dx geometrisch?", options: JSON.stringify(["Die Steigung bei x=a", "Den Flächeninhalt unter dem Graphen", "Die Nullstelle", "Das Maximum"]), correct: "1", explanation: "Das bestimmte Integral entspricht dem orientierten Flächeninhalt.", order: 2 },
      { type: "true_false", question: "Die Stammfunktion von f(x) = 1 ist F(x) = x.", correct: "true", options: null, explanation: "∫1 dx = x + C.", order: 3 },
      { type: "fill_blank", question: "∫ 2x dx = ___", correct: JSON.stringify(["x² + C"]), options: null, explanation: "∫ 2x dx = x² + C.", order: 4 },
    ],
  },
  {
    id: "cur-mathe-12-stochastik",
    subject: "mathematik", grade: 12, order: 1,
    title: "Stochastik — Wahrscheinlichkeit",
    description: "Wahrscheinlichkeitsrechnung: Laplace, bedingte Wahrscheinlichkeit, Binomialverteilung.",
    lesson: "## Wahrscheinlichkeit\n\n**Laplace-Wahrscheinlichkeit:**\nP(A) = günstige Ergebnisse / alle Ergebnisse\n\n**Gegenwahrscheinlichkeit:** P(Ā) = 1 − P(A)\n\n**Binomialverteilung:** P(X=k) = C(n,k) · pᵏ · (1-p)ⁿ⁻ᵏ\n\nBeispiel Münzwurf: P(Kopf) = 1/2",
    questions: [
      { type: "fill_blank", question: "Beim Würfeln mit einem fairen Würfel: P(6) = ___", correct: JSON.stringify(["1/6"]), options: null, explanation: "1 günstig von 6 möglichen Ergebnissen.", order: 1 },
      { type: "mc", question: "P(A) = 0,3. Was ist P(Ā)?", options: JSON.stringify(["0,3", "0,7", "0,6", "1,3"]), correct: "1", explanation: "P(Ā) = 1 − 0,3 = 0,7.", order: 2 },
      { type: "true_false", question: "Eine Wahrscheinlichkeit kann größer als 1 sein.", correct: "false", options: null, explanation: "Wahrscheinlichkeiten liegen immer zwischen 0 und 1.", order: 3 },
      { type: "fill_blank", question: "Beim 2-maligen Münzwurf: P(2× Kopf) = ___", correct: JSON.stringify(["1/4"]), options: null, explanation: "P = 1/2 × 1/2 = 1/4.", order: 4 },
    ],
  },
  {
    id: "cur-mathe-13-vektoren",
    subject: "mathematik", grade: 13, order: 1,
    title: "Vektoren und Geraden im Raum",
    description: "Vektoren addieren, Skalarprodukt und Geradengleichungen.",
    lesson: "## Vektoren\n\nEin **Vektor** beschreibt eine Verschiebung im Raum.\n\n**Addition:** (a₁,a₂,a₃) + (b₁,b₂,b₃) = (a₁+b₁, a₂+b₂, a₃+b₃)\n\n**Skalarprodukt:** a⃗·b⃗ = a₁b₁ + a₂b₂ + a₃b₃\n\nSind a⃗·b⃗ = 0, stehen die Vektoren **senkrecht** aufeinander.\n\n**Gerade:** g: x⃗ = p⃗ + t·v⃗",
    questions: [
      { type: "fill_blank", question: "(2,3,1) + (1,0,4) = ( ___ , ___ , ___ )", correct: JSON.stringify(["3", "3", "5"]), options: null, explanation: "Komponenten addieren: 2+1=3, 3+0=3, 1+4=5.", order: 1 },
      { type: "mc", question: "Was ergibt das Skalarprodukt (1,2,3)·(2,1,0)?", options: JSON.stringify(["0", "4", "11", "6"]), correct: "1", explanation: "1·2 + 2·1 + 3·0 = 2+2+0 = 4.", order: 2 },
      { type: "true_false", question: "Wenn das Skalarprodukt zweier Vektoren 0 ist, stehen sie senkrecht.", correct: "true", options: null, explanation: "a⃗⊥b⃗ ⟺ a⃗·b⃗ = 0.", order: 3 },
      { type: "mc", question: "Wie viele Parameter hat eine Geraden-Gleichung im 3D-Raum?", options: JSON.stringify(["0", "1", "2", "3"]), correct: "1", explanation: "Eine Gerade im Raum hat einen Parameter t.", order: 4 },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // DEUTSCH
  // ═══════════════════════════════════════════════════════════════
  {
    id: "cur-deutsch-1-buchstaben",
    subject: "deutsch", grade: 1, order: 1,
    title: "Buchstaben und Laute",
    description: "Alle Buchstaben des Alphabets kennen und Laute zuordnen.",
    lesson: "## Das Alphabet\n\n26 Buchstaben: A B C D E F G H I J K L M N O P Q R S T U V W X Y Z\n\n**Vokale:** a, e, i, o, u\n**Konsonanten:** alle anderen\n\n**Tipp:** Jeden Buchstaben in einem Wort hören: **S**onne → S",
    questions: [
      { type: "mc", question: "Welcher Buchstabe ist ein Vokal?", options: JSON.stringify(["B", "E", "K", "T"]), correct: "1", explanation: "E ist ein Vokal. Vokale: a, e, i, o, u.", order: 1 },
      { type: "fill_blank", question: "Das Alphabet hat ___ Buchstaben.", correct: JSON.stringify(["26"]), options: null, explanation: "Das deutsche Alphabet hat 26 Buchstaben.", order: 2 },
      { type: "true_false", question: "Das U ist ein Konsonant.", correct: "false", options: null, explanation: "U ist ein Vokal.", order: 3 },
      { type: "order", question: "Bringe diese Buchstaben in alphabetischer Reihenfolge:", options: JSON.stringify(["M", "A", "Z", "E"]), correct: JSON.stringify([1, 3, 0, 2]), explanation: "A, E, M, Z.", order: 4 },
    ],
  },
  {
    id: "cur-deutsch-2-satzbau",
    subject: "deutsch", grade: 2, order: 1,
    title: "Sätze schreiben",
    description: "Satzanfang groß, Satzzeichen, Subjekt und Prädikat.",
    lesson: "## Der Satz\n\nJeder Satz beginnt mit einem **großen Buchstaben** und endet mit einem **Satzzeichen**: . ? !\n\n**Subjekt** = Wer/Was macht etwas?\n**Prädikat** = Was tut das Subjekt?\n\nBeispiel: *Der Hund* [Subjekt] *bellt* [Prädikat].",
    questions: [
      { type: "mc", question: "Womit beginnt jeder Satz?", options: JSON.stringify(["Mit einem kleinen Buchstaben", "Mit einem großen Buchstaben", "Mit einem Komma", "Mit dem Prädikat"]), correct: "1", explanation: "Satzanfang immer groß schreiben.", order: 1 },
      { type: "true_false", question: "Ein Fragesatz endet mit einem Ausrufezeichen.", correct: "false", options: null, explanation: "Fragesätze enden mit einem Fragezeichen (?).", order: 2 },
      { type: "fill_blank", question: "Das ___ sagt aus, was das Subjekt tut.", correct: JSON.stringify(["Prädikat"]), options: null, explanation: "Das Prädikat ist das Verb im Satz.", order: 3 },
      { type: "mc", question: "In welchem Satz ist das Prädikat korrekt unterstrichen?\nDie Katze schläft im Korb.", options: JSON.stringify(["Die", "schläft", "Korb", "im"]), correct: "1", explanation: "'schläft' ist das Verb/Prädikat.", order: 4 },
    ],
  },
  {
    id: "cur-deutsch-3-rechtschreibung",
    subject: "deutsch", grade: 3, order: 1,
    title: "Groß- und Kleinschreibung",
    description: "Nomen groß schreiben, Satzanfang groß, alles andere klein.",
    lesson: "## Groß- und Kleinschreibung\n\n**Groß schreiben:**\n- Nomen (Substantive): *der Hund*, *die Schule*, *das Buch*\n- Satzanfänge\n- Das Anredepronomen *Sie*\n\n**Klein schreiben:**\n- Verben, Adjektive, Pronomen: *laufen, schön, er*",
    questions: [
      { type: "mc", question: "Welches Wort wird großgeschrieben?", options: JSON.stringify(["schnell", "laufen", "Baum", "blau"]), correct: "2", explanation: "Baum ist ein Nomen → Großschreibung.", order: 1 },
      { type: "true_false", question: "Das Verb 'spielen' wird großgeschrieben.", correct: "false", options: null, explanation: "Verben werden kleingeschrieben.", order: 2 },
      { type: "fill_blank", question: "Nomen erkennt man daran, dass man einen ___ davorstellen kann.", correct: JSON.stringify(["Artikel"]), options: null, explanation: "der/die/das → Artikel vor Nomen: die Schule, der Hund.", order: 3 },
      { type: "mc", question: "Welcher Satz ist korrekt?", options: JSON.stringify(["das kind spielt im Garten.", "Das Kind spielt im Garten.", "Das kind Spielt im garten.", "Das kind spielt Im Garten."]), correct: "1", explanation: "Kind ist ein Nomen → groß. Satzanfang groß. Verben und Präpositionen klein.", order: 4 },
    ],
  },
  {
    id: "cur-deutsch-4-text",
    subject: "deutsch", grade: 4, order: 1,
    title: "Texte lesen und verstehen",
    description: "Sinnentnehmend lesen, Fragen zum Text beantworten, Schlüsselwörter finden.",
    lesson: "## Texte verstehen\n\n**Strategien:**\n1. Titel lesen → Worum geht es?\n2. Text ganz lesen\n3. Schlüsselwörter unterstreichen\n4. Fragen beantworten → Antwort im Text suchen\n\n**Textarten:** Erzählung, Sachtext, Gedicht, Brief",
    questions: [
      { type: "mc", question: "Was ist ein Sachtext?", options: JSON.stringify(["Eine erfundene Geschichte", "Ein Text der Fakten erklärt", "Ein Gedicht", "Ein Brief"]), correct: "1", explanation: "Sachtexte informieren über die Wirklichkeit.", order: 1 },
      { type: "true_false", question: "Beim sinnentnehmenden Lesen sucht man die Antwort im Text.", correct: "true", options: null, explanation: "Die Antwort steht meistens direkt im Text.", order: 2 },
      { type: "order", question: "Welche Schritte beim Lesen sind sinnvoll?", options: JSON.stringify(["Fragen beantworten", "Schlüsselwörter markieren", "Titel lesen", "Text ganz lesen"]), correct: JSON.stringify([2, 3, 1, 0]), explanation: "Titel → lesen → markieren → beantworten.", order: 3 },
      { type: "fill_blank", question: "Ein Text der eine erfundene Geschichte erzählt heißt ___.", correct: JSON.stringify(["Erzählung"]), options: null, explanation: "Erzählungen schildern erfundene oder erlebte Ereignisse.", order: 4 },
    ],
  },
  {
    id: "cur-deutsch-6-aufsatz",
    subject: "deutsch", grade: 6, order: 1,
    title: "Erzählen — Der Aufsatz",
    description: "Einen spannenden Erzählaufsatz mit Einleitung, Hauptteil und Schluss schreiben.",
    lesson: "## Der Erzählaufsatz\n\n**Aufbau:**\n1. **Einleitung** — Wer? Wo? Wann? (Spannung aufbauen)\n2. **Hauptteil** — Was passiert? Höhepunkt\n3. **Schluss** — Wie endet es? Auflösung\n\n**Tipps:**\n- Direkte Rede einbauen\n- Adjektive für lebendige Bilder\n- Verschiedene Satzanfänge",
    questions: [
      { type: "order", question: "Bringe die Teile eines Aufsatzes in die richtige Reihenfolge:", options: JSON.stringify(["Schluss", "Hauptteil mit Höhepunkt", "Einleitung"]), correct: JSON.stringify([2, 1, 0]), explanation: "Einleitung → Hauptteil → Schluss.", order: 1 },
      { type: "mc", question: "Was gehört in die Einleitung eines Erzählaufsatzes?", options: JSON.stringify(["Der Höhepunkt", "Wer, Wo, Wann", "Die Auflösung", "Das Ende"]), correct: "1", explanation: "Die Einleitung stellt die Ausgangssituation vor.", order: 2 },
      { type: "true_false", question: "Direkte Rede macht einen Aufsatz lebendiger.", correct: "true", options: null, explanation: "Direkte Rede bringt Figuren zum Leben.", order: 3 },
      { type: "fill_blank", question: "Der spannendste Teil eines Aufsatzes heißt ___.", correct: JSON.stringify(["Höhepunkt"]), options: null, explanation: "Im Hauptteil gibt es einen Höhepunkt.", order: 4 },
    ],
  },
  {
    id: "cur-deutsch-7-grammatik",
    subject: "deutsch", grade: 7, order: 1,
    title: "Satzglieder",
    description: "Subjekt, Prädikat, Objekt und Adverbial bestimmen.",
    lesson: "## Satzglieder\n\n| Satzglied | Frage | Beispiel |\n|-----------|-------|----------|\n| Subjekt | Wer/Was? | *Der Hund* |\n| Prädikat | Was tut er? | *bellt* |\n| Akkusativobjekt | Wen/Was? | *den Ball* |\n| Dativobjekt | Wem? | *dem Kind* |\n| Adverbial | Wann/Wo/Wie? | *im Park* |",
    questions: [
      { type: "mc", question: "In 'Er gibt dem Freund ein Buch' — was ist 'dem Freund'?", options: JSON.stringify(["Subjekt", "Akkusativobjekt", "Dativobjekt", "Adverbial"]), correct: "2", explanation: "Wem gibt er? → dem Freund → Dativobjekt.", order: 1 },
      { type: "true_false", question: "Das Prädikat ist immer ein Verb.", correct: "true", options: null, explanation: "Das Prädikat enthält immer das finite Verb.", order: 2 },
      { type: "fill_blank", question: "Das Satzglied das auf die Frage 'Wen oder Was?' antwortet heißt ___.", correct: JSON.stringify(["Akkusativobjekt"]), options: null, explanation: "Akkusativobjekt beantwortet die Frage Wen/Was.", order: 3 },
      { type: "mc", question: "In 'Maria liest abends ein Buch' — was ist 'abends'?", options: JSON.stringify(["Subjekt", "Prädikat", "Objekt", "Adverbial"]), correct: "3", explanation: "'abends' beantwortet die Frage Wann? → Adverbial.", order: 4 },
    ],
  },
  {
    id: "cur-deutsch-8-analyse",
    subject: "deutsch", grade: 8, order: 1,
    title: "Gedichtanalyse",
    description: "Gedichte analysieren: Metrum, Reim, Strophen und sprachliche Mittel.",
    lesson: "## Gedichtanalyse\n\n**Formale Merkmale:**\n- Strophen (Absätze) und Verse (Zeilen)\n- Reimschema: aa bb (Paarreim), ab ab (Kreuzreim), ab ba (Umarmungsreim)\n- Metrum: Jambus (× /), Trochäus (/ ×)\n\n**Sprachliche Mittel:**\n- Metapher, Vergleich, Personifikation\n- Alliteration (gleiches Anlautbuchstabe)",
    questions: [
      { type: "mc", question: "Welches Reimschema hat 'Rosen blühn / am Teich / Vögel ziehn / und gleich'?", options: JSON.stringify(["Paarreim aa bb", "Kreuzreim ab ab", "Umarmungsreim ab ba", "Kein Reim"]), correct: "1", explanation: "ziehn/blühn (a), Teich/gleich (b) → ab ab = Kreuzreim.", order: 1 },
      { type: "true_false", question: "Eine Metapher ist ein direkter Vergleich mit 'wie'.", correct: "false", options: null, explanation: "Der Vergleich nutzt 'wie'. Eine Metapher überträgt direkt: 'Er ist ein Löwe'.", order: 2 },
      { type: "fill_blank", question: "Mehrere Verse bilden zusammen eine ___.", correct: JSON.stringify(["Strophe"]), options: null, explanation: "Strophen sind die Absätze eines Gedichts.", order: 3 },
      { type: "mc", question: "Was ist eine Alliteration?", options: JSON.stringify(["Wörter mit gleichem Endlaut", "Mehrere Wörter mit gleichem Anfangsbuchstaben", "Ein Vergleich mit 'wie'", "Wiederholung eines Wortes"]), correct: "1", explanation: "'Milch macht müde Männer munter' — alle beginnen mit M.", order: 4 },
    ],
  },
  {
    id: "cur-deutsch-10-interpretation",
    subject: "deutsch", grade: 10, order: 1,
    title: "Textinterpretation",
    description: "Literarische Texte interpretieren: Inhalt, Form, Intention und Kontext.",
    lesson: "## Textinterpretation\n\n**Schritte:**\n1. **Einleitung:** Autor, Titel, Entstehungszeit, Textsorte\n2. **Inhaltsangabe:** Kurze Zusammenfassung im Präsens\n3. **Analyse:** Sprachliche Mittel, Struktur\n4. **Interpretation:** Bedeutung, Aussage, Intention\n\n**Präsens** beim Schreiben über Literatur!",
    questions: [
      { type: "order", question: "Bringe die Schritte einer Interpretation in die richtige Reihenfolge:", options: JSON.stringify(["Interpretation", "Inhaltsangabe", "Analyse", "Einleitung"]), correct: JSON.stringify([3, 1, 2, 0]), explanation: "Einleitung → Inhaltsangabe → Analyse → Interpretation.", order: 1 },
      { type: "true_false", question: "Eine Inhaltsangabe schreibt man im Perfekt.", correct: "false", options: null, explanation: "Inhaltsangaben schreibt man im Präsens.", order: 2 },
      { type: "mc", question: "Was gehört in die Einleitung einer Interpretation?", options: JSON.stringify(["Eigene Meinung", "Autor, Titel, Entstehungszeit", "Alle sprachlichen Mittel", "Das Ende des Textes"]), correct: "1", explanation: "Die Einleitung nennt Autor, Titel, Entstehungszeit und Textsorte.", order: 3 },
      { type: "fill_blank", question: "Beim Schreiben über Literatur verwendet man das ___.", correct: JSON.stringify(["Präsens"]), options: null, explanation: "Literarisches Präsens: 'Der Autor beschreibt…'", order: 4 },
    ],
  },
  {
    id: "cur-deutsch-12-rhetorik",
    subject: "deutsch", grade: 12, order: 1,
    title: "Rhetorische Mittel und Argumentation",
    description: "Rhetorische Figuren erkennen und wirkungsvolle Argumente formulieren.",
    lesson: "## Rhetorische Mittel\n\n| Mittel | Beschreibung | Beispiel |\n|--------|-------------|----------|\n| Anapher | Wiederholung am Anfang | 'Ich fordere… Ich will…' |\n| Klimax | Steigerung | 'kommen, sehen, siegen' |\n| Rhetorische Frage | Frage ohne Antwort | 'Wer will das wirklich?' |\n| Antithese | Gegensatz | 'jung und alt' |",
    questions: [
      { type: "mc", question: "Was ist eine Anapher?", options: JSON.stringify(["Steigerung am Ende", "Wiederholung am Satzanfang", "Ein Vergleich", "Ein Gegensatz"]), correct: "1", explanation: "Anapher = Wiederholung am Anfang aufeinanderfolgender Sätze.", order: 1 },
      { type: "true_false", question: "Eine rhetorische Frage erwartet keine Antwort.", correct: "true", options: null, explanation: "Rhetorische Fragen dienen der Überzeugung, nicht der Information.", order: 2 },
      { type: "fill_blank", question: "'Veni, vidi, vici' ist ein Beispiel für eine ___.", correct: JSON.stringify(["Klimax"]), options: null, explanation: "Klimax = Steigerung: kommen < sehen < siegen.", order: 3 },
      { type: "mc", question: "Welches Mittel wird hier verwendet: 'Jung und Alt, Arm und Reich'?", options: JSON.stringify(["Anapher", "Klimax", "Antithese", "Metapher"]), correct: "2", explanation: "Antithese = Gegenüberstellung von Gegensätzen.", order: 4 },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // ENGLISCH
  // ═══════════════════════════════════════════════════════════════
  {
    id: "cur-englisch-3-basics",
    subject: "englisch", grade: 3, order: 1,
    title: "Grundvokabeln — Farben, Zahlen, Familie",
    description: "Erste Englischvokabeln: Farben, Zahlen 1–20, Familienmitglieder.",
    lesson: "## Grundvokabeln\n\n**Farben:** red, blue, green, yellow, orange, purple, pink, black, white\n\n**Zahlen:** one, two, three, four, five, six, seven, eight, nine, ten\n\n**Familie:** mother, father, sister, brother, grandmother, grandfather",
    questions: [
      { type: "mc", question: "Was bedeutet 'green' auf Deutsch?", options: JSON.stringify(["blau", "gelb", "grün", "rot"]), correct: "2", explanation: "green = grün.", order: 1 },
      { type: "fill_blank", question: "'Vater' heißt auf Englisch ___.", correct: JSON.stringify(["father"]), options: null, explanation: "father = Vater.", order: 2 },
      { type: "true_false", question: "'Eight' ist die englische Zahl für 8.", correct: "true", options: null, explanation: "eight = acht = 8.", order: 3 },
      { type: "match", question: "Ordne den deutschen Farben die englischen zu:", options: JSON.stringify({ left: ["rot", "blau", "weiß", "schwarz"], right: ["blue", "black", "red", "white"] }), correct: JSON.stringify([2, 0, 3, 1]), explanation: "rot=red, blau=blue, weiß=white, schwarz=black.", order: 4 },
    ],
  },
  {
    id: "cur-englisch-4-grammar",
    subject: "englisch", grade: 4, order: 1,
    title: "To be und To have",
    description: "Die Verben 'to be' (sein) und 'to have' (haben) konjugieren.",
    lesson: "## To be\n\n| Person | To be |\n|--------|-------|\n| I | am |\n| you | are |\n| he/she/it | is |\n| we/they | are |\n\n## To have\n\n| Person | To have |\n|--------|----------|\n| I/you/we/they | have |\n| he/she/it | has |",
    questions: [
      { type: "fill_blank", question: "She ___ happy.", correct: JSON.stringify(["is"]), options: null, explanation: "she → is (3. Person Singular).", order: 1 },
      { type: "mc", question: "Welche Form passt? 'They ___ a dog.'", options: JSON.stringify(["is", "am", "has", "have"]), correct: "3", explanation: "they → have.", order: 2 },
      { type: "true_false", question: "'He have a cat' ist korrekt.", correct: "false", options: null, explanation: "he/she/it → has: 'He has a cat.'", order: 3 },
      { type: "fill_blank", question: "I ___ tired.", correct: JSON.stringify(["am"]), options: null, explanation: "I → am.", order: 4 },
    ],
  },
  {
    id: "cur-englisch-6-past",
    subject: "englisch", grade: 6, order: 1,
    title: "Simple Past",
    description: "Regelmäßige und unregelmäßige Verben im Simple Past.",
    lesson: "## Simple Past\n\n**Verwendung:** Abgeschlossene Handlungen in der Vergangenheit.\n\n**Regelmäßig:** Verb + **-ed** → *worked, played, watched*\n\n**Unregelmäßig:** Lernvokabeln → *go→went, eat→ate, see→saw*\n\n**Negation:** did not (didn't) + Infinitiv\n\n**Frage:** Did + Subjekt + Infinitiv?",
    questions: [
      { type: "fill_blank", question: "She ___ (play) tennis yesterday.", correct: JSON.stringify(["played"]), options: null, explanation: "Regelmäßig: play + ed = played.", order: 1 },
      { type: "mc", question: "Past-Form von 'go'?", options: JSON.stringify(["goed", "gone", "went", "gode"]), correct: "2", explanation: "go ist unregelmäßig: went.", order: 2 },
      { type: "true_false", question: "Im Simple Past hängt man bei regelmäßigen Verben -ed an.", correct: "true", options: null, explanation: "work → worked, play → played.", order: 3 },
      { type: "fill_blank", question: "We ___ not ___ (see) the film.", correct: JSON.stringify(["did", "see"]), options: null, explanation: "Negation: did not + Infinitiv → did not see.", order: 4 },
    ],
  },
  {
    id: "cur-englisch-7-future",
    subject: "englisch", grade: 7, order: 1,
    title: "Will Future und Going to",
    description: "Zukunft mit will und be going to ausdrücken und unterscheiden.",
    lesson: "## Zukunft\n\n**Will Future:** spontane Entscheidungen, Vermutungen\n- *I think it will rain.*\n- *I'll help you!*\n\n**Going to:** geplante Absichten, Vorhersagen\n- *I am going to study medicine.*\n- *Look at those clouds — it's going to rain.*",
    questions: [
      { type: "mc", question: "Jemand entscheidet spontan zu helfen. Welche Form?", options: JSON.stringify(["I am going to help.", "I will help.", "I helped.", "I have helped."]), correct: "1", explanation: "Spontane Entscheidungen → will.", order: 1 },
      { type: "true_false", question: "'Going to' drückt einen bereits gefassten Plan aus.", correct: "true", options: null, explanation: "be going to = Plan oder Vorhaben.", order: 2 },
      { type: "fill_blank", question: "She ___ going to visit Paris next summer.", correct: JSON.stringify(["is"]), options: null, explanation: "be going to → she is going to.", order: 3 },
      { type: "fill_blank", question: "Spontane Entscheidung: 'I ___ answer that question.'", correct: JSON.stringify(["will"]), options: null, explanation: "Spontan → will.", order: 4 },
    ],
  },
  {
    id: "cur-englisch-8-conditional",
    subject: "englisch", grade: 8, order: 1,
    title: "If-Sätze (Conditional I und II)",
    description: "Reale (Type 1) und irreale (Type 2) Bedingungssätze bilden.",
    lesson: "## If-Sätze\n\n**Conditional I (real):** Wenn etwas wahrscheinlich passiert.\n*If it rains, I will take an umbrella.*\n→ If + Simple Present, will + Infinitiv\n\n**Conditional II (irreal):** Unwahrscheinlich oder unmöglich.\n*If I were rich, I would travel the world.*\n→ If + Simple Past, would + Infinitiv",
    questions: [
      { type: "mc", question: "Welcher Typ ist: 'If she studies, she will pass'?", options: JSON.stringify(["Conditional 0", "Conditional I", "Conditional II", "Conditional III"]), correct: "1", explanation: "Real/wahrscheinlich + will → Conditional I.", order: 1 },
      { type: "fill_blank", question: "If I ___ (be) you, I would apologize.", correct: JSON.stringify(["were"]), options: null, explanation: "Conditional II: If + Simple Past. 'were' für alle Personen bei 'be'.", order: 2 },
      { type: "true_false", question: "Im Conditional II verwendet man 'would' im Hauptsatz.", correct: "true", options: null, explanation: "Conditional II: would + Infinitiv.", order: 3 },
      { type: "fill_blank", question: "If it ___ (rain), we will cancel the trip.", correct: JSON.stringify(["rains"]), options: null, explanation: "Conditional I: if + Simple Present.", order: 4 },
    ],
  },
  {
    id: "cur-englisch-10-writing",
    subject: "englisch", grade: 10, order: 1,
    title: "Formal Writing — Letter und Email",
    description: "Formelle Briefe und E-Mails auf Englisch schreiben.",
    lesson: "## Formal Letter\n\n**Aufbau:**\n1. Sender's address (oben rechts)\n2. Date\n3. Recipient's address\n4. Salutation: *Dear Sir/Madam* oder *Dear Mr./Ms. Smith,*\n5. Body\n6. Closing: *Yours faithfully* (bei Sir/Madam) oder *Yours sincerely* (bei Namen)\n\n**Stil:** kein 'I think', besser: 'It is my belief that…'",
    questions: [
      { type: "mc", question: "Welche Schlussfloskel passt zu 'Dear Sir/Madam'?", options: JSON.stringify(["Yours sincerely", "Best wishes", "Yours faithfully", "Kind regards"]), correct: "2", explanation: "'Yours faithfully' → wenn man den Namen nicht kennt (Dear Sir/Madam).", order: 1 },
      { type: "true_false", question: "In formellen Briefen ist 'I think' ein angemessener Ausdruck.", correct: "false", options: null, explanation: "Formell besser: 'It is my belief that' oder 'I am of the opinion that'.", order: 2 },
      { type: "fill_blank", question: "Wenn man den Namen kennt: Dear Mr. Smith, → am Ende: Yours ___.", correct: JSON.stringify(["sincerely"]), options: null, explanation: "Yours sincerely → wenn man den Namen kennt.", order: 3 },
      { type: "order", question: "Ordne den Brief-Aufbau:", options: JSON.stringify(["Body", "Salutation", "Date", "Closing"]), correct: JSON.stringify([2, 1, 0, 3]), explanation: "Date → Salutation → Body → Closing.", order: 4 },
    ],
  },
  {
    id: "cur-englisch-12-advanced",
    subject: "englisch", grade: 12, order: 1,
    title: "Advanced Grammar — Passive und Reported Speech",
    description: "Passiv bilden und indirekte Rede (reported speech) anwenden.",
    lesson: "## Passiv\n\nBildung: **be + past participle**\n- Active: *They built the house.*\n- Passive: *The house was built.*\n\n## Reported Speech\n\nZeitenverschiebung beim Wechsel:\n- say → says/said\n- Präsens → Vergangenheit\n- will → would\n- can → could",
    questions: [
      { type: "mc", question: "Wie lautet 'They make the car in Germany' im Passiv?", options: JSON.stringify(["The car makes in Germany.", "The car is made in Germany.", "The car was made in Germany.", "The car made in Germany."]), correct: "1", explanation: "Passiv Präsens: is + past participle → is made.", order: 1 },
      { type: "fill_blank", question: "He said: 'I will come.' → He said he ___ come.", correct: JSON.stringify(["would"]), options: null, explanation: "Reported speech: will → would.", order: 2 },
      { type: "true_false", question: "Im Passiv ist der Fokus auf dem Subjekt, das die Handlung ausführt.", correct: "false", options: null, explanation: "Im Passiv liegt der Fokus auf der Handlung selbst, nicht auf dem Handelnden.", order: 3 },
      { type: "fill_blank", question: "'The window ___ broken by Tom.' (Vergangenheit Passiv)", correct: JSON.stringify(["was"]), options: null, explanation: "Passiv Vergangenheit: was + past participle.", order: 4 },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // PHYSIK
  // ═══════════════════════════════════════════════════════════════
  {
    id: "cur-physik-5-waerme",
    subject: "physik", grade: 5, order: 1,
    title: "Temperatur und Wärme",
    description: "Unterschied zwischen Temperatur und Wärme, Thermometer, Celsius.",
    lesson: "## Temperatur und Wärme\n\n**Temperatur** gibt an, wie warm oder kalt ein Körper ist. Einheit: **°C (Grad Celsius)**\n\n**Wärme** ist die Energie, die von einem warmen zu einem kalten Körper fließt.\n\nSiedepunkt Wasser: 100°C\nGefrierpunkt Wasser: 0°C\nKörpertemperatur: ~37°C",
    questions: [
      { type: "fill_blank", question: "Wasser siedet bei ___ °C.", correct: JSON.stringify(["100"]), options: null, explanation: "Siedepunkt von Wasser: 100°C bei Normaldruck.", order: 1 },
      { type: "mc", question: "Was misst ein Thermometer?", options: JSON.stringify(["Luftdruck", "Temperatur", "Wärme", "Gewicht"]), correct: "1", explanation: "Thermometer messen die Temperatur in °C.", order: 2 },
      { type: "true_false", question: "Wärme fließt vom kalten zum warmen Körper.", correct: "false", options: null, explanation: "Wärme fließt immer vom wärmeren zum kälteren Körper.", order: 3 },
      { type: "fill_blank", question: "Die Einheit der Temperatur im Alltag ist ___.", correct: JSON.stringify(["°C"]), options: null, explanation: "Im Alltag: Grad Celsius (°C).", order: 4 },
    ],
  },
  {
    id: "cur-physik-6-optik",
    subject: "physik", grade: 6, order: 1,
    title: "Optik — Licht und Schatten",
    description: "Lichtquellen, Lichtausbreitung, Schatten und Reflexion.",
    lesson: "## Optik\n\n**Licht breitet sich geradlinig aus** (Lichtstrahlen).\n\n**Lichtquellen:** Sonne, Glühbirne, Kerze\n**Reflexion:** Licht wird an Oberflächen zurückgeworfen.\n\n**Schatten:** Entsteht hinter einem undurchsichtigen Körper.\n- Kernschatten: kein Licht\n- Halbschatten: teilweise Licht",
    questions: [
      { type: "mc", question: "Wie breitet sich Licht aus?", options: JSON.stringify(["In Kurven", "Geradlinig", "Spiralförmig", "Unregelmäßig"]), correct: "1", explanation: "Licht breitet sich in geraden Linien (Lichtstrahlen) aus.", order: 1 },
      { type: "true_false", question: "Die Sonne ist eine Lichtquelle.", correct: "true", options: null, explanation: "Die Sonne sendet eigenes Licht aus → Lichtquelle.", order: 2 },
      { type: "fill_blank", question: "Der ___ ist der Bereich hinter einem Körper, in den kein Licht gelangt.", correct: JSON.stringify(["Kernschatten"]), options: null, explanation: "Kernschatten = kein direktes Licht.", order: 3 },
      { type: "mc", question: "Was passiert bei der Reflexion?", options: JSON.stringify(["Licht wird absorbiert", "Licht wird zurückgeworfen", "Licht erlischt", "Licht wird langsamer"]), correct: "1", explanation: "Reflexion = Licht prallt von einer Oberfläche zurück.", order: 4 },
    ],
  },
  {
    id: "cur-physik-8-energie",
    subject: "physik", grade: 8, order: 1,
    title: "Energie und Energieformen",
    description: "Kinetische, potenzielle und thermische Energie sowie Energieerhaltung.",
    lesson: "## Energie\n\n**Energieformen:**\n- **Kinetische Energie** (Bewegungsenergie): Eₖ = ½mv²\n- **Potenzielle Energie** (Lageenergie): Eₚ = mgh\n- **Thermische Energie** (Wärme)\n\n**Energieerhaltungssatz:** Energie kann nicht erzeugt oder vernichtet, nur umgewandelt werden.",
    questions: [
      { type: "mc", question: "Ein Stein liegt auf einem Tisch. Welche Energie hat er hauptsächlich?", options: JSON.stringify(["Kinetische Energie", "Potenzielle Energie", "Elektrische Energie", "Chemische Energie"]), correct: "1", explanation: "Ein ruhender erhöhter Körper hat Lageenergie (potenzielle Energie).", order: 1 },
      { type: "true_false", question: "Energie kann vernichtet werden.", correct: "false", options: null, explanation: "Energieerhaltungssatz: Energie wird nur umgewandelt, nicht vernichtet.", order: 2 },
      { type: "fill_blank", question: "Die Formel für kinetische Energie lautet Eₖ = ½ · m · ___²", correct: JSON.stringify(["v"]), options: null, explanation: "Eₖ = ½mv² mit v = Geschwindigkeit.", order: 3 },
      { type: "mc", question: "Was beschreibt der Energieerhaltungssatz?", options: JSON.stringify(["Energie entsteht aus dem Nichts", "Energie kann weder erzeugt noch vernichtet werden", "Kinetische Energie ist immer größer", "Wärme ist nutzlos"]), correct: "1", explanation: "Energie wird nur von einer Form in eine andere umgewandelt.", order: 4 },
    ],
  },
  {
    id: "cur-physik-10-mechanik",
    subject: "physik", grade: 10, order: 1,
    title: "Newtonsche Gesetze",
    description: "Die drei Newtonschen Axiome verstehen und anwenden.",
    lesson: "## Newtonsche Gesetze\n\n**1. Trägheitsgesetz:** Ein Körper bleibt in Ruhe oder gleichförmiger Bewegung, solange keine Kraft auf ihn wirkt.\n\n**2. Aktionsgesetz:** F = m · a\n\n**3. Reaktionsgesetz:** Actio = Reactio (jede Kraft hat eine gleich große Gegenkraft)",
    questions: [
      { type: "fill_blank", question: "Das 2. Newtonsche Gesetz: F = m · ___", correct: JSON.stringify(["a"]), options: null, explanation: "Kraft = Masse × Beschleunigung.", order: 1 },
      { type: "mc", question: "Ein Auto (m=1000 kg) beschleunigt mit a=2 m/s². Welche Kraft wirkt?", options: JSON.stringify(["500 N", "2000 N", "1002 N", "200 N"]), correct: "1", explanation: "F = m·a = 1000 · 2 = 2000 N.", order: 2 },
      { type: "true_false", question: "Actio und Reactio wirken auf denselben Körper.", correct: "false", options: null, explanation: "Actio und Reactio wirken auf verschiedene Körper.", order: 3 },
      { type: "mc", question: "Was beschreibt das Trägheitsgesetz?", options: JSON.stringify(["F = m·a", "Jede Kraft hat eine Gegenkraft", "Körper ohne Kraft bleiben in ihrem Bewegungszustand", "Energie bleibt erhalten"]), correct: "2", explanation: "1. Newtonsches Gesetz: Trägheit = keine Kraft → keine Zustandsänderung.", order: 4 },
    ],
  },
  {
    id: "cur-physik-11-schwingungen",
    subject: "physik", grade: 11, order: 1,
    title: "Schwingungen und Wellen",
    description: "Harmonische Schwingung, Periode, Frequenz und Wellengleichung.",
    lesson: "## Schwingungen\n\n**Periode T:** Zeit für eine vollständige Schwingung (Einheit: s)\n\n**Frequenz f:** Anzahl der Schwingungen pro Sekunde (Einheit: Hz)\n\nZusammenhang: **T = 1/f**\n\n**Wellenlänge λ:** Räumliche Periode einer Welle\n\n**Wellengleichung:** v = λ · f",
    questions: [
      { type: "fill_blank", question: "T = 1 / ___", correct: JSON.stringify(["f"]), options: null, explanation: "Periode T und Frequenz f sind reziprok: T = 1/f.", order: 1 },
      { type: "mc", question: "Eine Stimmgabel schwingt mit f=440 Hz. Wie lang ist eine Periode?", options: JSON.stringify(["0,44 s", "440 s", "1/440 s ≈ 0,00227 s", "22 s"]), correct: "2", explanation: "T = 1/f = 1/440 ≈ 0,00227 s.", order: 2 },
      { type: "true_false", question: "Die Einheit der Frequenz ist Hertz (Hz).", correct: "true", options: null, explanation: "1 Hz = 1 Schwingung pro Sekunde.", order: 3 },
      { type: "fill_blank", question: "Wellengeschwindigkeit v = λ · ___", correct: JSON.stringify(["f"]), options: null, explanation: "v = Wellenlänge × Frequenz.", order: 4 },
    ],
  },
  {
    id: "cur-physik-13-quantenphysik",
    subject: "physik", grade: 13, order: 1,
    title: "Quantenphysik — Photoeffekt",
    description: "Welle-Teilchen-Dualismus, Photoeffekt und Planck'sches Wirkungsquantum.",
    lesson: "## Quantenphysik\n\n**Photoeffekt:** Licht schlägt Elektronen aus einer Metalloberfläche.\n→ Beweist Teilchennatur des Lichts (Photonen)\n\n**Photon-Energie:** E = h · f\n(h = 6,626 × 10⁻³⁴ J·s — Planck'sches Wirkungsquantum)\n\n**Welle-Teilchen-Dualismus:** Licht hat Wellen- UND Teilcheneigenschaften.",
    questions: [
      { type: "mc", question: "Was beweist der Photoeffekt?", options: JSON.stringify(["Wellennatur des Lichts", "Teilchennatur des Lichts", "Reflexion", "Brechung"]), correct: "1", explanation: "Der Photoeffekt zeigt, dass Licht Energie in diskreten Paketen (Photonen) überträgt.", order: 1 },
      { type: "fill_blank", question: "Die Energie eines Photons: E = h · ___", correct: JSON.stringify(["f"]), options: null, explanation: "E = h·f mit h = Planck'sches Wirkungsquantum.", order: 2 },
      { type: "true_false", question: "Beim Photoeffekt lösen Elektronen Photonen aus der Metalloberfläche.", correct: "false", options: null, explanation: "Umgekehrt: Photonen (Licht) lösen Elektronen aus dem Metall.", order: 3 },
      { type: "mc", question: "Was besagt der Welle-Teilchen-Dualismus?", options: JSON.stringify(["Licht ist immer eine Welle", "Licht hat sowohl Wellen- als auch Teilcheneigenschaften", "Elektronen sind Wellen", "Photonen haben Masse"]), correct: "1", explanation: "Je nach Experiment zeigt Licht Wellen- oder Teilcheneigenschaften.", order: 4 },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // CHEMIE
  // ═══════════════════════════════════════════════════════════════
  {
    id: "cur-chemie-8-verbindungen",
    subject: "chemie", grade: 8, order: 1,
    title: "Ionenbindung und Salze",
    description: "Ionen, Ionenbindung und Eigenschaften von Salzen.",
    lesson: "## Ionenbindung\n\nEntsteht zwischen **Metallen** (geben Elektronen ab → Kationen +) und **Nichtmetallen** (nehmen Elektronen auf → Anionen −).\n\n**Beispiel NaCl (Kochsalz):**\n- Na gibt 1 Elektron ab → Na⁺\n- Cl nimmt 1 Elektron auf → Cl⁻\n- Elektrostatische Anziehung → Ionengitter\n\n**Eigenschaften:** hohe Schmelzpunkte, spröde, in Wasser leitfähig",
    questions: [
      { type: "mc", question: "Was passiert mit Natrium bei der Bildung von NaCl?", options: JSON.stringify(["Na nimmt 1 Elektron auf", "Na gibt 1 Elektron ab", "Na und Cl teilen Elektronen", "Na wird zu Cl"]), correct: "1", explanation: "Na (Metall) gibt Elektronen ab → Na⁺ (Kation).", order: 1 },
      { type: "true_false", question: "Salze leiten in wässriger Lösung elektrischen Strom.", correct: "true", options: null, explanation: "In Lösung dissoziieren Salze in Ionen → elektrisch leitfähig.", order: 2 },
      { type: "fill_blank", question: "Ionen mit positiver Ladung heißen ___.", correct: JSON.stringify(["Kationen"]), options: null, explanation: "Kationen = positive Ionen, Anionen = negative Ionen.", order: 3 },
      { type: "mc", question: "Welche Eigenschaft haben Salze typischerweise NICHT?", options: JSON.stringify(["Hohe Schmelzpunkte", "Spröde", "Gut verformbar wie Metalle", "In Wasser löslich"]), correct: "2", explanation: "Salze sind spröde — sie sind nicht verformbar wie Metalle.", order: 4 },
    ],
  },
  {
    id: "cur-chemie-10-saeurenlaugen",
    subject: "chemie", grade: 10, order: 1,
    title: "Säuren und Laugen",
    description: "pH-Wert, Säuren (H⁺-Donoren), Laugen (OH⁻-Spender) und Neutralisation.",
    lesson: "## Säuren und Laugen\n\n**pH-Skala:** 0–14\n- pH < 7: sauer (Säure)\n- pH = 7: neutral\n- pH > 7: basisch (Lauge)\n\n**Säuren:** geben H⁺ ab. Beispiele: HCl (Salzsäure), H₂SO₄ (Schwefelsäure)\n\n**Laugen:** geben OH⁻ ab. Beispiel: NaOH (Natronlauge)\n\n**Neutralisation:** Säure + Lauge → Salz + Wasser",
    questions: [
      { type: "mc", question: "Welchen pH-Wert hat eine starke Säure?", options: JSON.stringify(["pH 1", "pH 7", "pH 10", "pH 14"]), correct: "0", explanation: "Starke Säuren haben einen niedrigen pH-Wert (nahe 0).", order: 1 },
      { type: "true_false", question: "Natronlauge ist eine Säure.", correct: "false", options: null, explanation: "NaOH ist eine Lauge (Base) mit hohem pH-Wert.", order: 2 },
      { type: "fill_blank", question: "Bei der Neutralisation entstehen ___ und Wasser.", correct: JSON.stringify(["Salz"]), options: null, explanation: "Säure + Lauge → Salz + H₂O.", order: 3 },
      { type: "mc", question: "Orangensaft hat pH 3,5. Er ist:", options: JSON.stringify(["Neutral", "Sauer", "Basisch", "Alkalisch"]), correct: "1", explanation: "pH < 7 → sauer.", order: 4 },
    ],
  },
  {
    id: "cur-chemie-11-organisch",
    subject: "chemie", grade: 11, order: 1,
    title: "Organische Chemie — Alkane",
    description: "Homologe Reihe der Alkane, Strukturformeln und Nomenklatur.",
    lesson: "## Alkane\n\nAlkane sind gesättigte Kohlenwasserstoffe: nur Einfachbindungen.\n\n**Homologe Reihe (CₙH₂ₙ₊₂):**\n| n | Name | Formel |\n|---|------|--------|\n| 1 | Methan | CH₄ |\n| 2 | Ethan | C₂H₆ |\n| 3 | Propan | C₃H₈ |\n| 4 | Butan | C₄H₁₀ |\n\nMit steigender Kettenlänge: höhere Siedepunkte",
    questions: [
      { type: "fill_blank", question: "Methan hat die Formel ___.", correct: JSON.stringify(["CH₄"]), options: null, explanation: "Methan: 1 C-Atom, 4 H-Atome → CH₄.", order: 1 },
      { type: "mc", question: "Welches Alkan hat 3 C-Atome?", options: JSON.stringify(["Ethan", "Methan", "Propan", "Butan"]), correct: "2", explanation: "Propan: C₃H₈ — 3 Kohlenstoffatome.", order: 2 },
      { type: "true_false", question: "Alkane enthalten Doppelbindungen.", correct: "false", options: null, explanation: "Alkane sind gesättigt — nur Einfachbindungen (σ-Bindungen).", order: 3 },
      { type: "fill_blank", question: "Die allgemeine Formel der Alkane lautet CₙH___.", correct: JSON.stringify(["2n+2"]), options: null, explanation: "Allgemeine Formel: CₙH₂ₙ₊₂.", order: 4 },
    ],
  },
  {
    id: "cur-chemie-13-elektrochemie",
    subject: "chemie", grade: 13, order: 1,
    title: "Elektrochemie — Galvanische Zellen",
    description: "Redoxreaktionen, galvanische Zellen und Elektrolyse.",
    lesson: "## Elektrochemie\n\n**Redox:** Oxidation (Abgabe von e⁻) + Reduktion (Aufnahme von e⁻)\n\n**Galvanische Zelle (Batterie):**\n- Anode: Oxidation (negativer Pol)\n- Kathode: Reduktion (positiver Pol)\n- Elektronen fließen von Anode zu Kathode\n\n**Daniell-Element:** Zn/ZnSO₄ || CuSO₄/Cu — Spannung ~1,1 V",
    questions: [
      { type: "mc", question: "Was findet an der Anode statt?", options: JSON.stringify(["Reduktion", "Oxidation", "Neutralisation", "Elektrolyse"]), correct: "1", explanation: "Anode = Oxidation (Elektronen werden abgegeben).", order: 1 },
      { type: "true_false", question: "In einer galvanischen Zelle fließen Elektronen vom Minuspol zum Pluspol.", correct: "true", options: null, explanation: "Elektronen fließen von der Anode (−) zur Kathode (+).", order: 2 },
      { type: "fill_blank", question: "Bei einer Oxidation werden Elektronen ___.", correct: JSON.stringify(["abgegeben"]), options: null, explanation: "Oxidation = Elektronenabgabe (OIL: Oxidation Is Loss).", order: 3 },
      { type: "mc", question: "Welche Zelle wandelt chemische in elektrische Energie um?", options: JSON.stringify(["Elektrolysezelle", "Galvanische Zelle", "Brennstoffzelle", "Solarzelle"]), correct: "1", explanation: "Galvanische Zellen (Batterien) wandeln chemische in elektrische Energie um.", order: 4 },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // BIOLOGIE
  // ═══════════════════════════════════════════════════════════════
  {
    id: "cur-biologie-6-pflanzen",
    subject: "biologie", grade: 6, order: 1,
    title: "Aufbau und Funktion von Pflanzen",
    description: "Wurzel, Sprossachse, Blatt und Blüte — Aufgaben der Pflanzenorgane.",
    lesson: "## Pflanzenorgane\n\n| Organ | Aufgabe |\n|-------|---------|\n| Wurzel | Wasseraufnahme, Verankerung |\n| Sprossachse (Stängel) | Transport, Stützung |\n| Blatt | Photosynthese, Transpiration |\n| Blüte | Fortpflanzung |\n\nTransport: Wasser/Minerale nach oben (Xylem), Zucker nach unten (Phloem)",
    questions: [
      { type: "mc", question: "Welches Pflanzenorgan ist hauptsächlich für die Photosynthese zuständig?", options: JSON.stringify(["Wurzel", "Stängel", "Blatt", "Blüte"]), correct: "2", explanation: "Blätter enthalten die meisten Chloroplasten → Photosynthese.", order: 1 },
      { type: "true_false", question: "Die Wurzel verankert die Pflanze im Boden.", correct: "true", options: null, explanation: "Wurzeln dienen zur Verankerung und Wasseraufnahme.", order: 2 },
      { type: "fill_blank", question: "Blüten dienen der ___ der Pflanze.", correct: JSON.stringify(["Fortpflanzung"]), options: null, explanation: "Blüten sind Fortpflanzungsorgane.", order: 3 },
      { type: "match", question: "Ordne Organ und Hauptfunktion zu:", options: JSON.stringify({ left: ["Blatt", "Wurzel", "Blüte", "Stängel"], right: ["Transport", "Fortpflanzung", "Photosynthese", "Wasseraufnahme"] }), correct: JSON.stringify([2, 3, 1, 0]), explanation: "Blatt=Photosynthese, Wurzel=Wasseraufnahme, Blüte=Fortpflanzung, Stängel=Transport.", order: 4 },
    ],
  },
  {
    id: "cur-biologie-7-nervensystem",
    subject: "biologie", grade: 7, order: 1,
    title: "Das Nervensystem",
    description: "Zentrales und peripheres Nervensystem, Neuron, Reiz-Reaktions-Schema.",
    lesson: "## Nervensystem\n\n**ZNS (Zentrales Nervensystem):** Gehirn + Rückenmark\n\n**PNS (Peripheres Nervensystem):** alle anderen Nerven\n\n**Neuron (Nervenzelle):**\n- Zellkörper (Soma)\n- Dendriten (empfangen Impulse)\n- Axon (leitet Impulse weiter)\n\n**Reiz → Rezeptor → Nerv → Gehirn → Reaktion**",
    questions: [
      { type: "mc", question: "Was gehört zum ZNS?", options: JSON.stringify(["Nerven in den Armen", "Gehirn und Rückenmark", "Sinnesorgane", "Muskeln"]), correct: "1", explanation: "ZNS = Gehirn + Rückenmark.", order: 1 },
      { type: "fill_blank", question: "Dendriten empfangen Impulse, das ___ leitet sie weiter.", correct: JSON.stringify(["Axon"]), options: null, explanation: "Axon = langer Fortsatz, leitet Nervenimpulse weiter.", order: 2 },
      { type: "true_false", question: "Das periphere Nervensystem umfasst nur motorische Nerven.", correct: "false", options: null, explanation: "PNS umfasst sensible (sensorisch) UND motorische Nerven.", order: 3 },
      { type: "order", question: "Ordne das Reiz-Reaktions-Schema:", options: JSON.stringify(["Reaktion (Muskelzug)", "Reiz (Heiß!)", "Gehirn verarbeitet", "Rezeptor nimmt wahr"]), correct: JSON.stringify([1, 3, 2, 0]), explanation: "Reiz → Rezeptor → Gehirn → Reaktion.", order: 4 },
    ],
  },
  {
    id: "cur-biologie-8-evolution",
    subject: "biologie", grade: 8, order: 1,
    title: "Evolution und natürliche Selektion",
    description: "Darwins Evolutionstheorie, Selektion, Mutation und Anpassung.",
    lesson: "## Evolution\n\n**Charles Darwin (1809–1882):** Theorie der natürlichen Selektion\n\n**Prinzipien:**\n1. **Variation:** Individuen unterscheiden sich\n2. **Selektion:** Besser angepasste überleben häufiger\n3. **Vererbung:** Vorteilhafte Merkmale werden weitergegeben\n4. **Mutation:** Zufällige Änderungen in der DNA\n\n**Survival of the fittest** = Überleben der am besten Angepassten",
    questions: [
      { type: "mc", question: "Was beschreibt natürliche Selektion?", options: JSON.stringify(["Zufällige Veränderungen der DNA", "Besser angepasste Individuen überleben häufiger", "Gezielte Zucht durch Menschen", "Gleichmäßiges Überleben aller"]), correct: "1", explanation: "Natürliche Selektion = survival of the fittest.", order: 1 },
      { type: "true_false", question: "Mutationen sind immer schädlich.", correct: "false", options: null, explanation: "Mutationen können neutral, schädlich ODER vorteilhaft sein.", order: 2 },
      { type: "fill_blank", question: "Die Theorie der natürlichen Selektion wurde von Charles ___ entwickelt.", correct: JSON.stringify(["Darwin"]), options: null, explanation: "Charles Darwin veröffentlichte 1859 'On the Origin of Species'.", order: 3 },
      { type: "order", question: "Ordne die Evolutionsprinzipien:", options: JSON.stringify(["Besser Angepasste überleben", "Vorteilhafte Merkmale werden vererbt", "Individuen variieren", "Neue Mutationen entstehen"]), correct: JSON.stringify([2, 3, 0, 1]), explanation: "Variation → Mutation → Selektion → Vererbung.", order: 4 },
    ],
  },
  {
    id: "cur-biologie-10-oekologie",
    subject: "biologie", grade: 10, order: 1,
    title: "Ökologie — Nahrungsketten",
    description: "Produzenten, Konsumenten, Destruenten und Nahrungsnetze.",
    lesson: "## Ökologie\n\n**Nahrungskette:** Energie fließt von Produzenten zu Konsumenten.\n\n**Produzenten:** Pflanzen (Photosynthese)\n**Konsumenten I:** Pflanzenfresser (Herbivoren)\n**Konsumenten II:** Fleischfresser (Carnivoren)\n**Destruenten:** Zersetzer (Pilze, Bakterien)\n\nBei jedem Schritt gehen ~90% der Energie als Wärme verloren.",
    questions: [
      { type: "mc", question: "Was sind Produzenten in einem Ökosystem?", options: JSON.stringify(["Pflanzenfresser", "Pilze", "Grüne Pflanzen", "Fleischfresser"]), correct: "2", explanation: "Grüne Pflanzen produzieren durch Photosynthese organische Substanz.", order: 1 },
      { type: "true_false", question: "Bei jedem Schritt in der Nahrungskette wird Energie gewonnen.", correct: "false", options: null, explanation: "Bei jedem Schritt geht ca. 90% der Energie als Wärme verloren.", order: 2 },
      { type: "fill_blank", question: "Pilze und Bakterien, die Tote abbauen, heißen ___.", correct: JSON.stringify(["Destruenten"]), options: null, explanation: "Destruenten = Zersetzer, bauen tote organische Substanz ab.", order: 3 },
      { type: "order", question: "Ordne die Nahrungskette: Gras → ? → ? → ?", options: JSON.stringify(["Adler (K III)", "Hase (K I)", "Fuchs (K II)", "Gras (Produzent)"]), correct: JSON.stringify([3, 1, 2, 0]), explanation: "Gras → Hase → Fuchs → Adler.", order: 4 },
    ],
  },
  {
    id: "cur-biologie-12-immunsystem",
    subject: "biologie", grade: 12, order: 1,
    title: "Immunsystem",
    description: "Spezifische und unspezifische Abwehr, Antikörper und Impfung.",
    lesson: "## Immunsystem\n\n**Unspezifische Abwehr (angeboren):**\n- Haut als Barriere\n- Fresszellen (Phagozytose)\n- Fieber, Entzündung\n\n**Spezifische Abwehr (erworben):**\n- T-Lymphozyten (zelluläre Abwehr)\n- B-Lymphozyten → Antikörper\n- Gedächtniszellen → Immungedächtnis\n\n**Impfung:** Einbringen von Antigenen → Immungedächtnis aufbauen",
    questions: [
      { type: "mc", question: "Was produzieren B-Lymphozyten?", options: JSON.stringify(["Hormone", "Antikörper", "Enzyme", "Hämoglobin"]), correct: "1", explanation: "B-Lymphozyten differenzieren zu Plasmazellen und produzieren Antikörper.", order: 1 },
      { type: "true_false", question: "Die unspezifische Abwehr richtet sich gegen einen bestimmten Erreger.", correct: "false", options: null, explanation: "Die unspezifische Abwehr ist allgemein — sie unterscheidet nicht zwischen Erregern.", order: 2 },
      { type: "fill_blank", question: "Gedächtniszellen ermöglichen die schnelle Reaktion bei ___ Kontakt mit einem Erreger.", correct: JSON.stringify(["erneutem"]), options: null, explanation: "Das Immungedächtnis ermöglicht schnellere Reaktion bei Zweitkontakt.", order: 3 },
      { type: "mc", question: "Was ist das Ziel einer Impfung?", options: JSON.stringify(["Erreger abtöten", "Immungedächtnis aufbauen", "Antikörper direkt geben", "Fieber auslösen"]), correct: "1", explanation: "Impfungen stimulieren das Immunsystem, Gedächtniszellen zu bilden.", order: 4 },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // GESCHICHTE
  // ═══════════════════════════════════════════════════════════════
  {
    id: "cur-geschichte-5-griechen",
    subject: "geschichte", grade: 5, order: 1,
    title: "Das antike Griechenland",
    description: "Stadtstaaten, Demokratie, Olympische Spiele und griechische Kultur.",
    lesson: "## Antikes Griechenland\n\n**Stadtstaaten (Poleis):** Athen, Sparta — jede Polis regierte sich selbst.\n\n**Demokratie in Athen:** Alle Bürger durften mitentscheiden (Volksversammlung), aber: nur freie Männer.\n\n**Olympische Spiele:** Alle 4 Jahre zu Ehren des Zeus in Olympia (ab 776 v. Chr.)\n\n**Philosophen:** Sokrates, Platon, Aristoteles",
    questions: [
      { type: "mc", question: "Wie nennt man die griechischen Stadtstaaten?", options: JSON.stringify(["Legionen", "Poleis", "Provinzen", "Kolonien"]), correct: "1", explanation: "Poleis (Singular: Polis) = griechische Stadtstaaten.", order: 1 },
      { type: "true_false", question: "In der athenischen Demokratie durften alle Menschen wählen.", correct: "false", options: null, explanation: "Nur freie männliche Bürger hatten Stimmrecht — keine Frauen, Sklaven oder Fremde.", order: 2 },
      { type: "fill_blank", question: "Die Olympischen Spiele fanden alle ___ Jahre statt.", correct: JSON.stringify(["4"]), options: null, explanation: "Alle 4 Jahre zu Ehren des Göttervaters Zeus.", order: 3 },
      { type: "mc", question: "Wer war ein bekannter griechischer Philosoph?", options: JSON.stringify(["Julius Caesar", "Napoleon", "Sokrates", "Karl der Große"]), correct: "2", explanation: "Sokrates, Platon und Aristoteles sind bekannte griechische Philosophen.", order: 4 },
    ],
  },
  {
    id: "cur-geschichte-7-mittelalter",
    subject: "geschichte", grade: 7, order: 1,
    title: "Das Mittelalter — Feudalsystem",
    description: "Feudalordnung, Ritter, Burgen und die Rolle der Kirche im Mittelalter.",
    lesson: "## Mittelalter (500–1500 n. Chr.)\n\n**Feudalpyramide:**\n1. König\n2. Herzöge, Grafen\n3. Ritter\n4. Bauern (Leibeigene)\n\n**Kirche:** Enorme Macht — Papst oft mächtiger als König.\n**Kreuzzüge (1095–1291):** Militärische Feldzüge ins Heilige Land.",
    questions: [
      { type: "mc", question: "Wer stand an der Spitze des mittelalterlichen Feudalsystems?", options: JSON.stringify(["Ritter", "Papst", "König", "Adel"]), correct: "2", explanation: "Der König stand formal an der Spitze der Feudalpyramide.", order: 1 },
      { type: "true_false", question: "Im Mittelalter hatte die Kirche kaum politische Macht.", correct: "false", options: null, explanation: "Die Kirche hatte enorme Macht — Bischöfe und der Papst beeinflussten Politik.", order: 2 },
      { type: "fill_blank", question: "Die Kreuzzüge begannen im Jahr ___.", correct: JSON.stringify(["1095"]), options: null, explanation: "Der erste Kreuzzug wurde 1095 von Papst Urban II. ausgerufen.", order: 3 },
      { type: "order", question: "Ordne die Feudalpyramide von oben nach unten:", options: JSON.stringify(["Bauern", "Ritter", "König", "Herzöge"]), correct: JSON.stringify([2, 3, 1, 0]), explanation: "König → Herzöge/Grafen → Ritter → Bauern.", order: 4 },
    ],
  },
  {
    id: "cur-geschichte-8-revolution",
    subject: "geschichte", grade: 8, order: 1,
    title: "Französische Revolution",
    description: "Ursachen, Verlauf und Auswirkungen der Französischen Revolution 1789.",
    lesson: "## Französische Revolution (1789–1799)\n\n**Ursachen:**\n- Finanzielle Krise Frankreichs\n- Hunger und Armut\n- Aufklärungsideen (Freiheit, Gleichheit)\n\n**Ereignisse:**\n- 14. Juli 1789: Sturm auf die Bastille\n- Erklärung der Menschenrechte\n- Hinrichtung von König Ludwig XVI. (1793)\n\n**Motto:** Liberté, Égalité, Fraternité",
    questions: [
      { type: "fill_blank", question: "Der Sturm auf die Bastille fand am 14. ___ 1789 statt.", correct: JSON.stringify(["Juli"]), options: null, explanation: "14. Juli 1789 — Nationaler Feiertag Frankreichs.", order: 1 },
      { type: "mc", question: "Was bedeutet das Motto der Revolution 'Liberté, Égalité, Fraternité'?", options: JSON.stringify(["Frieden, Ordnung, Reichtum", "Freiheit, Gleichheit, Brüderlichkeit", "Gott, König, Vaterland", "Bildung, Arbeit, Fortschritt"]), correct: "1", explanation: "Liberté=Freiheit, Égalité=Gleichheit, Fraternité=Brüderlichkeit.", order: 2 },
      { type: "true_false", question: "König Ludwig XVI. überlebte die Französische Revolution.", correct: "false", options: null, explanation: "Ludwig XVI. wurde am 21. Januar 1793 guillotiniert.", order: 3 },
      { type: "mc", question: "Was war KEINE Ursache der Französischen Revolution?", options: JSON.stringify(["Hunger und Armut", "Aufklärungsideen", "Die Entdeckung Amerikas", "Finanzkrise"]), correct: "2", explanation: "Die Entdeckung Amerikas (1492) lag weit vor der Revolution.", order: 4 },
    ],
  },
  {
    id: "cur-geschichte-10-kaiserreich",
    subject: "geschichte", grade: 10, order: 1,
    title: "Deutsches Kaiserreich 1871–1918",
    description: "Gründung des Kaiserreichs, Bismarcks Politik und der Erste Weltkrieg.",
    lesson: "## Deutsches Kaiserreich\n\n**Gründung:** 18. Januar 1871 — nach dem Sieg über Frankreich im Deutsch-Französischen Krieg.\n**Ort:** Schloss Versailles, Hall of Mirrors.\nWilhelm I. → Kaiser, Bismarck → Reichskanzler\n\n**Bismarck:** Sozialpolitik (Kranken-/Rentenversicherung), Bündnispolitik\n\n**Ende:** 1918 — Niederlage im 1. Weltkrieg → Wilhelm II. dankt ab",
    questions: [
      { type: "fill_blank", question: "Das Deutsche Kaiserreich wurde am 18. Januar ___ ausgerufen.", correct: JSON.stringify(["1871"]), options: null, explanation: "18. Januar 1871 in Versailles.", order: 1 },
      { type: "mc", question: "Wer war der erste Reichskanzler des Deutschen Kaiserreichs?", options: JSON.stringify(["Wilhelm I.", "Bismarck", "Hindenburg", "Ludendorff"]), correct: "1", explanation: "Otto von Bismarck war erster Reichskanzler (1871–1890).", order: 2 },
      { type: "true_false", question: "Das Kaiserreich endete 1918 mit der Niederlage im 1. Weltkrieg.", correct: "true", options: null, explanation: "1918: Abdankung Wilhelms II. → Ende des Kaiserreichs.", order: 3 },
      { type: "mc", question: "Wo wurde das Kaiserreich ausgerufen?", options: JSON.stringify(["Berlin", "Frankfurt", "Versailles", "Hamburg"]), correct: "2", explanation: "Im Spiegelsaal von Schloss Versailles bei Paris.", order: 4 },
    ],
  },
  {
    id: "cur-geschichte-11-wk2",
    subject: "geschichte", grade: 11, order: 1,
    title: "Zweiter Weltkrieg",
    description: "Ursachen, Verlauf, Holocaust und Konsequenzen des Zweiten Weltkriegs.",
    lesson: "## Zweiter Weltkrieg (1939–1945)\n\n**Beginn:** 1. September 1939 — Überfall Deutschlands auf Polen\n\n**Holocaust:** Systematischer Genozid an 6 Millionen Juden und anderen Gruppen\n\n**Wendepunkte:**\n- Stalingrad (1942/43) — Niederlagen der Wehrmacht\n- D-Day (6. Juni 1944) — Landung der Alliierten\n\n**Ende:** 8. Mai 1945 — bedingungslose Kapitulation Deutschlands",
    questions: [
      { type: "fill_blank", question: "Der Zweite Weltkrieg begann am ___ September 1939.", correct: JSON.stringify(["1"]), options: null, explanation: "1. September 1939: Überfall auf Polen.", order: 1 },
      { type: "mc", question: "Wann kapitulierte Deutschland bedingungslos?", options: JSON.stringify(["1. Mai 1945", "8. Mai 1945", "9. November 1945", "15. August 1945"]), correct: "1", explanation: "8. Mai 1945 — Ende des 2. Weltkriegs in Europa.", order: 2 },
      { type: "true_false", question: "Der D-Day fand 1943 statt.", correct: "false", options: null, explanation: "D-Day = 6. Juni 1944 — Landung der Alliierten in der Normandie.", order: 3 },
      { type: "mc", question: "Wie viele Juden wurden im Holocaust ermordet?", options: JSON.stringify(["ca. 1 Million", "ca. 3 Millionen", "ca. 6 Millionen", "ca. 10 Millionen"]), correct: "2", explanation: "Der Holocaust kostete etwa 6 Millionen Juden das Leben.", order: 4 },
    ],
  },
  {
    id: "cur-geschichte-13-kalterkrieg",
    subject: "geschichte", grade: 13, order: 1,
    title: "Kalter Krieg und Wiedervereinigung",
    description: "Ost-West-Konflikt, Berliner Mauer, Kubakrise und Deutsche Einheit 1990.",
    lesson: "## Kalter Krieg (1947–1991)\n\n**Blöcke:** USA (NATO) vs. UdSSR (Warschauer Pakt)\n\n**Berliner Mauer:** 13. August 1961 – 9. November 1989\n\n**Kubakrise (1962):** Beinahe-Atomkrieg — UdSSR zieht Raketen ab\n\n**Deutsche Einheit:**\n- 9. Nov. 1989: Mauerfall\n- 3. Oktober 1990: Wiedervereinigung",
    questions: [
      { type: "fill_blank", question: "Die Berliner Mauer fiel am 9. November ___.", correct: JSON.stringify(["1989"]), options: null, explanation: "9. November 1989 — Mauerfall.", order: 1 },
      { type: "mc", question: "Wann fand die Deutsche Wiedervereinigung statt?", options: JSON.stringify(["3. Oktober 1989", "9. November 1989", "3. Oktober 1990", "1. Januar 1991"]), correct: "2", explanation: "3. Oktober 1990 — Tag der Deutschen Einheit.", order: 2 },
      { type: "true_false", question: "Die Kubakrise brachte die Welt an den Rand eines Atomkrieges.", correct: "true", options: null, explanation: "1962 standen USA und UdSSR kurz vor einem militärischen Konflikt.", order: 3 },
      { type: "mc", question: "Welche zwei Militärbündnisse standen sich im Kalten Krieg gegenüber?", options: JSON.stringify(["UNO und NATO", "NATO und Warschauer Pakt", "EU und ASEAN", "G7 und BRICS"]), correct: "1", explanation: "NATO (West/USA) vs. Warschauer Pakt (Ost/UdSSR).", order: 4 },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // INFORMATIK
  // ═══════════════════════════════════════════════════════════════
  {
    id: "cur-informatik-6-internet",
    subject: "informatik", grade: 6, order: 1,
    title: "Internet und WWW",
    description: "Wie das Internet funktioniert: IP-Adressen, Browser, HTTP und Sicherheit.",
    lesson: "## Internet\n\n**IP-Adresse:** Eindeutige Adresse jedes Geräts im Netz (z. B. 192.168.1.1)\n\n**DNS:** Übersetzt Domainnamen (google.de) in IP-Adressen\n\n**HTTP/HTTPS:** Protokoll zum Übertragen von Webseiten. HTTPS = verschlüsselt.\n\n**Browser:** Programm zum Anzeigen von Webseiten (Chrome, Firefox...)",
    questions: [
      { type: "mc", question: "Was macht der DNS?", options: JSON.stringify(["Webseiten anzeigen", "Domainnamen in IP-Adressen übersetzen", "Dateien komprimieren", "E-Mails versenden"]), correct: "1", explanation: "DNS = Domain Name System — übersetzt z.B. 'google.de' in eine IP-Adresse.", order: 1 },
      { type: "true_false", question: "HTTPS ist sicherer als HTTP.", correct: "true", options: null, explanation: "HTTPS verschlüsselt die Verbindung zwischen Browser und Server.", order: 2 },
      { type: "fill_blank", question: "Jedes Gerät im Internet hat eine eindeutige ___-Adresse.", correct: JSON.stringify(["IP"]), options: null, explanation: "IP-Adresse (Internet Protocol) identifiziert Geräte im Netz.", order: 3 },
      { type: "mc", question: "Was ist ein Browser?", options: JSON.stringify(["Eine Suchmaschine", "Programm zum Anzeigen von Webseiten", "Ein Betriebssystem", "Eine Programmiersprache"]), correct: "1", explanation: "Browser wie Chrome oder Firefox zeigen Webseiten an.", order: 4 },
    ],
  },
  {
    id: "cur-informatik-7-programmierung",
    subject: "informatik", grade: 7, order: 1,
    title: "Einführung in die Programmierung",
    description: "Scratch oder Python: Befehle, Schleifen und Bedingungen.",
    lesson: "## Programmierung\n\n**Programm** = Folge von Anweisungen für den Computer.\n\n**Python-Grundbefehle:**\n```python\nprint('Hallo')      # Ausgabe\nname = input()       # Eingabe\n```\n\n**Schleife:**\n```python\nfor i in range(5):\n    print(i)  # 0,1,2,3,4\n```\n\n**Bedingung:**\n```python\nif x > 0:\n    print('positiv')\nelse:\n    print('nicht positiv')\n```",
    questions: [
      { type: "mc", question: "Was macht print() in Python?", options: JSON.stringify(["Etwas drucken", "Eine Ausgabe auf dem Bildschirm anzeigen", "Einen Fehler ausgeben", "Die Variable löschen"]), correct: "1", explanation: "print() zeigt Text auf dem Bildschirm an.", order: 1 },
      { type: "fill_blank", question: "for i in range(3) wiederholt den Block ___ Mal.", correct: JSON.stringify(["3"]), options: null, explanation: "range(3) erzeugt 0, 1, 2 — also 3 Durchläufe.", order: 2 },
      { type: "true_false", question: "Eine for-Schleife muss immer genau 10 Mal durchlaufen.", correct: "false", options: null, explanation: "Die Anzahl der Durchläufe kann frei bestimmt werden.", order: 3 },
      { type: "fill_blank", question: "Das Schlüsselwort für eine Bedingung in Python ist ___.", correct: JSON.stringify(["if"]), options: null, explanation: "'if' leitet eine Bedingung ein.", order: 4 },
    ],
  },
  {
    id: "cur-informatik-9-datenbanken",
    subject: "informatik", grade: 9, order: 1,
    title: "Datenbanken und SQL",
    description: "Relationale Datenbanken, Tabellen, SELECT-Abfragen.",
    lesson: "## Datenbanken\n\nDaten werden in **Tabellen** gespeichert (Zeilen = Datensätze, Spalten = Felder).\n\n**SQL-Grundbefehle:**\n```sql\nSELECT * FROM Schüler;          -- alle Spalten\nSELECT Name FROM Schüler\n  WHERE Klasse = '9b';            -- Filter\nINSERT INTO Schüler VALUES (...); -- Einfügen\n```\n\n**Primärschlüssel:** Eindeutige ID jedes Datensatzes",
    questions: [
      { type: "mc", question: "Welcher SQL-Befehl liest Daten aus einer Tabelle?", options: JSON.stringify(["INSERT", "UPDATE", "SELECT", "DELETE"]), correct: "2", explanation: "SELECT ... FROM ... liest Daten aus einer Tabelle.", order: 1 },
      { type: "fill_blank", question: "Der Primärschlüssel identifiziert jeden Datensatz ___.", correct: JSON.stringify(["eindeutig"]), options: null, explanation: "Primärschlüssel = einzigartiger Identifier.", order: 2 },
      { type: "true_false", question: "'WHERE' in SQL filtert die Ergebnismenge.", correct: "true", options: null, explanation: "WHERE schränkt die Ergebnisse auf Zeilen ein, die eine Bedingung erfüllen.", order: 3 },
      { type: "mc", question: "Was bedeutet SELECT * ?", options: JSON.stringify(["Nur eine Spalte auswählen", "Alle Spalten auswählen", "Alle Zeilen löschen", "Neue Spalte hinzufügen"]), correct: "1", explanation: "* = alle Spalten.", order: 4 },
    ],
  },
  {
    id: "cur-informatik-11-netzwerke",
    subject: "informatik", grade: 11, order: 1,
    title: "Netzwerke und Protokolle",
    description: "OSI-Modell, TCP/IP, Routing und Netzwerktopologien.",
    lesson: "## Netzwerke\n\n**OSI-Modell:** 7 Schichten (Bitübertragung bis Anwendung)\n\n**TCP/IP:** Protokollsuite des Internets\n- **IP:** Adressierung und Routing\n- **TCP:** Zuverlässige Übertragung\n- **UDP:** Schnell, aber unzuverlässig\n\n**Router:** Leitet Pakete zwischen Netzwerken weiter.\n\n**Topologien:** Stern, Ring, Bus, Mesh",
    questions: [
      { type: "mc", question: "Was macht ein Router?", options: JSON.stringify(["Webseiten anzeigen", "Datenpakete zwischen Netzwerken weiterleiten", "WLAN-Signal erzeugen", "E-Mails verschicken"]), correct: "1", explanation: "Router leiten Pakete anhand von IP-Adressen zwischen Netzwerken.", order: 1 },
      { type: "true_false", question: "UDP garantiert die Zustellung von Datenpaketen.", correct: "false", options: null, explanation: "UDP ist schnell, aber verbindungslos — keine Zustellungsgarantie. Das macht TCP.", order: 2 },
      { type: "fill_blank", question: "Das OSI-Modell hat ___ Schichten.", correct: JSON.stringify(["7"]), options: null, explanation: "Das OSI-Referenzmodell hat 7 Schichten.", order: 3 },
      { type: "mc", question: "Welches Protokoll ist für zuverlässige Verbindungen zuständig?", options: JSON.stringify(["UDP", "IP", "TCP", "HTTP"]), correct: "2", explanation: "TCP (Transmission Control Protocol) garantiert fehlerfreie Übertragung.", order: 4 },
    ],
  },
  {
    id: "cur-informatik-13-kryptographie",
    subject: "informatik", grade: 13, order: 1,
    title: "Kryptographie und Datensicherheit",
    description: "Symmetrische und asymmetrische Verschlüsselung, RSA und Hashfunktionen.",
    lesson: "## Kryptographie\n\n**Symmetrisch:** Gleicher Schlüssel zum Ver- und Entschlüsseln (AES)\n- Vorteil: schnell\n- Nachteil: Schlüsselaustausch-Problem\n\n**Asymmetrisch:** Public Key + Private Key (RSA)\n- Public Key: für alle zugänglich\n- Private Key: geheim\n\n**Hashfunktion:** Einwegfunktion → gleiche Eingabe → immer gleiches Ergebnis (MD5, SHA-256)",
    questions: [
      { type: "mc", question: "Was ist der Vorteil symmetrischer Verschlüsselung?", options: JSON.stringify(["Kein Schlüsselaustausch nötig", "Sehr schnell", "Zwei verschiedene Schlüssel", "Immer sicherer"]), correct: "1", explanation: "Symmetrisch = schnell, aber das Schlüsselaustausch-Problem bleibt.", order: 1 },
      { type: "true_false", question: "Bei asymmetrischer Verschlüsselung ist der Public Key geheim.", correct: "false", options: null, explanation: "Der Public Key ist öffentlich zugänglich. Nur der Private Key ist geheim.", order: 2 },
      { type: "fill_blank", question: "Eine Hashfunktion ist eine ___-Funktion (nicht umkehrbar).", correct: JSON.stringify(["Einweg"]), options: null, explanation: "Hashfunktionen sind Einwegfunktionen — man kann nicht vom Hash auf die Eingabe schließen.", order: 3 },
      { type: "mc", question: "Welches Verfahren wird z.B. für HTTPS verwendet?", options: JSON.stringify(["Nur symmetrisch", "Nur asymmetrisch", "Kombination aus beiden", "Nur Hashing"]), correct: "2", explanation: "HTTPS nutzt asymmetrische Verschlüsselung für den Schlüsselaustausch, dann symmetrisch für den Datentransfer.", order: 4 },
    ],
  },
];

async function main() {
  console.log("Seeding curriculum topics…");
  let topicCount = 0;
  let questionCount = 0;

  for (const topic of topics) {
    const { questions, lesson, ...topicData } = topic;

    await prisma.exerciseTopic.upsert({
      where: { id: topic.id },
      update: {},
      create: topicData,
    });

    if (lesson) {
      const lessonExists = await prisma.exerciseLesson.findFirst({
        where: { topicId: topic.id },
      });
      if (!lessonExists) {
        await prisma.exerciseLesson.create({
          data: { topicId: topic.id, content: lesson, order: 1 },
        });
      }
    }

    for (const q of questions) {
      const qId = `${topic.id}-q${q.order}`;
      await prisma.exerciseQuestion.upsert({
        where: { id: qId },
        update: {},
        create: { id: qId, topicId: topic.id, ...q },
      });
      questionCount++;
    }

    topicCount++;
    console.log(`  ✓ ${topic.subject} Klasse ${topic.grade}: ${topic.title}`);
  }

  console.log(`\n✅ ${topicCount} Themen, ${questionCount} Fragen eingefügt.\n`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
