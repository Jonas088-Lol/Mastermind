/* Copyright 2026 Elian Schock, Jonas Schwenk */
export type Trend = "up" | "down" | "flat";
export type Risk = "low" | "medium" | "high";

export interface ClassStudent {
  name: string;
  grade: string;
  gradeNum: number;
  trend: Trend;
  attendance: number;
  lastActive: string;
  risk?: Risk;
  note?: string;
}

export interface ClassAssignment {
  title: string;
  dueAt: string;
  submitted: number;
  total: number;
  state: "open" | "due-soon" | "grading" | "done";
}

export interface UpcomingItem {
  title: string;
  type: "klassenarbeit" | "test" | "abgabe";
  date: string;
  weight?: string;
}

export interface ClassDetail {
  slug: string;
  name: string;
  subject: string;
  schoolYear: string;
  classroom: string;
  studentCount: number;
  avgGrade: string;
  trend: Trend;
  attendance: number;
  riskCount: number;
  competencies: { label: string; value: number }[];
  gradeDistribution: number[];
  students: ClassStudent[];
  assignments: ClassAssignment[];
  upcoming: UpcomingItem[];
  aiSuggestion: { headline: string; body: string; cta: string };
}

const CLASSES: ClassDetail[] = [
  {
    slug: "9b",
    name: "9b",
    subject: "Mathematik",
    schoolYear: "2026/27",
    classroom: "B204",
    studentCount: 26,
    avgGrade: "2,4",
    trend: "up",
    attendance: 96,
    riskCount: 3,
    competencies: [
      { label: "Algebra", value: 85 },
      { label: "Geometrie", value: 70 },
      { label: "Stochastik", value: 55 },
      { label: "Analysis", value: 75 },
    ],
    gradeDistribution: [3, 9, 8, 4, 2, 0],
    students: [
      { name: "Anna Bauer", grade: "1,8", gradeNum: 1.8, trend: "up", attendance: 100, lastActive: "vor 12 Min." },
      { name: "Ben Schulz", grade: "2,1", gradeNum: 2.1, trend: "flat", attendance: 96, lastActive: "vor 1 Std." },
      { name: "Cara Lange", grade: "2,4", gradeNum: 2.4, trend: "up", attendance: 92, lastActive: "vor 3 Std." },
      { name: "David Roth", grade: "2,7", gradeNum: 2.7, trend: "down", attendance: 88, lastActive: "gestern" },
      { name: "Eva Klein", grade: "2,9", gradeNum: 2.9, trend: "up", attendance: 100, lastActive: "vor 30 Min." },
      { name: "Felix Wagner", grade: "3,2", gradeNum: 3.2, trend: "flat", attendance: 84, lastActive: "vor 2 Std." },
      { name: "Greta Hoffmann", grade: "2,3", gradeNum: 2.3, trend: "up", attendance: 100, lastActive: "vor 4 Std." },
      { name: "Hannes Müller", grade: "2,6", gradeNum: 2.6, trend: "flat", attendance: 96, lastActive: "vor 6 Std." },
      {
        name: "Lisa Hofer",
        grade: "3,8",
        gradeNum: 3.8,
        trend: "down",
        attendance: 76,
        lastActive: "vorgestern",
        risk: "medium",
        note: "Letzte Klassenarbeit 5 · Beteiligung sinkt",
      },
      {
        name: "Marlon Frey",
        grade: "4,0",
        gradeNum: 4.0,
        trend: "down",
        attendance: 72,
        lastActive: "vor 4 Tagen",
        risk: "high",
        note: "2 fehlende Abgaben · Verständnis-Lücke Stochastik",
      },
    ],
    assignments: [
      {
        title: "Aufgabe 5 — Quadratische Gleichungen",
        dueAt: "Heute · 18:00",
        submitted: 23,
        total: 26,
        state: "due-soon",
      },
      {
        title: "Wochen-Quiz · Funktionen",
        dueAt: "Morgen · 23:59",
        submitted: 11,
        total: 26,
        state: "open",
      },
      {
        title: "Geometrie-Zeichnung Aufgabe 3",
        dueAt: "vor 2 Tagen abgegeben",
        submitted: 26,
        total: 26,
        state: "grading",
      },
      {
        title: "Lernkarten Algebra — Pflicht",
        dueAt: "abgeschlossen",
        submitted: 26,
        total: 26,
        state: "done",
      },
    ],
    upcoming: [
      { title: "Klassenarbeit Nr. 3 — Funktionen", type: "klassenarbeit", date: "Mo, 17. März", weight: "30 %" },
      { title: "Mündliche Prüfung Geometrie", type: "test", date: "Do, 27. März" },
      { title: "Projektabgabe Stochastik", type: "abgabe", date: "Fr, 11. April" },
    ],
    aiSuggestion: {
      headline: "5 Schüler haben Lücken in Stochastik",
      body: "Empfehlung: 15-Min-Lernpfad 'Wahrscheinlichkeits-Grundlagen' mit Lisa, Marlon und 3 weiteren teilen. KI-Korrektur-Confidence aktuell bei 84 %.",
      cta: "Lernpfad zuweisen",
    },
  },
  {
    slug: "10a",
    name: "10a",
    subject: "Physik",
    schoolYear: "2026/27",
    classroom: "Lab 1",
    studentCount: 24,
    avgGrade: "2,8",
    trend: "down",
    attendance: 91,
    riskCount: 5,
    competencies: [
      { label: "Mechanik", value: 60 },
      { label: "Optik", value: 45 },
      { label: "Elektrizität", value: 80 },
      { label: "Thermodynamik", value: 50 },
    ],
    gradeDistribution: [1, 5, 8, 6, 3, 1],
    students: [
      { name: "Aron Berger", grade: "1,9", gradeNum: 1.9, trend: "up", attendance: 100, lastActive: "vor 25 Min." },
      { name: "Clara Sommer", grade: "2,2", gradeNum: 2.2, trend: "flat", attendance: 96, lastActive: "vor 1 Std." },
      { name: "Eva Klein", grade: "2,9", gradeNum: 2.9, trend: "down", attendance: 88, lastActive: "vor 3 Std." },
      { name: "Felix Otto", grade: "3,1", gradeNum: 3.1, trend: "flat", attendance: 92, lastActive: "vor 5 Std." },
      { name: "Gisela Maus", grade: "2,7", gradeNum: 2.7, trend: "up", attendance: 100, lastActive: "vor 2 Std." },
      { name: "Henrik Solter", grade: "3,3", gradeNum: 3.3, trend: "flat", attendance: 84, lastActive: "gestern" },
      {
        name: "Tom Weber",
        grade: "4,2",
        gradeNum: 4.2,
        trend: "down",
        attendance: 64,
        lastActive: "vor 5 Tagen",
        risk: "high",
        note: "3 fehlende Abgaben · letzte Klassenarbeit 5",
      },
      {
        name: "Jonas Frank",
        grade: "3,6",
        gradeNum: 3.6,
        trend: "down",
        attendance: 80,
        lastActive: "vor 2 Tagen",
        risk: "medium",
        note: "Beteiligung sinkt · Optik-Verständnis schwach",
      },
      {
        name: "Mira Salim",
        grade: "3,9",
        gradeNum: 3.9,
        trend: "down",
        attendance: 72,
        lastActive: "vor 3 Tagen",
        risk: "medium",
        note: "Hausaufgaben-Quote 40 %",
      },
      {
        name: "Paul Engel",
        grade: "4,3",
        gradeNum: 4.3,
        trend: "down",
        attendance: 68,
        lastActive: "vor 6 Tagen",
        risk: "high",
        note: "Versuchsprotokolle fehlen · Eltern kontaktieren?",
      },
    ],
    assignments: [
      {
        title: "Versuchsprotokoll Hebelgesetz",
        dueAt: "vor 1 Tag abgegeben",
        submitted: 22,
        total: 24,
        state: "grading",
      },
      {
        title: "Aufgabe 9 — Optische Linsen",
        dueAt: "in 2 Tagen",
        submitted: 7,
        total: 24,
        state: "open",
      },
      {
        title: "Online-Test Mechanik",
        dueAt: "Heute · 23:59",
        submitted: 18,
        total: 24,
        state: "due-soon",
      },
    ],
    upcoming: [
      { title: "Klassenarbeit Nr. 2 — Optik", type: "klassenarbeit", date: "Di, 18. März", weight: "30 %" },
      { title: "Praktikum: Stromkreis", type: "test", date: "Mi, 26. März" },
    ],
    aiSuggestion: {
      headline: "Note fällt seit 3 Wochen — Optik ist die Lücke",
      body: "8 von 24 Schülern haben Optik-Score unter 50 %. Generiere ein 20-Min-Repetitorium und plane es als nächste Stunde ein.",
      cta: "Repetitorium generieren",
    },
  },
  {
    slug: "8c",
    name: "8c",
    subject: "Mathematik",
    schoolYear: "2026/27",
    classroom: "B204",
    studentCount: 28,
    avgGrade: "2,1",
    trend: "up",
    attendance: 98,
    riskCount: 1,
    competencies: [
      { label: "Algebra", value: 90 },
      { label: "Geometrie", value: 88 },
      { label: "Bruchrechnen", value: 75 },
      { label: "Prozente", value: 82 },
    ],
    gradeDistribution: [6, 12, 7, 2, 1, 0],
    students: [
      { name: "Amir Köster", grade: "1,4", gradeNum: 1.4, trend: "flat", attendance: 100, lastActive: "vor 8 Min." },
      { name: "Bea Hertz", grade: "1,7", gradeNum: 1.7, trend: "up", attendance: 100, lastActive: "vor 45 Min." },
      { name: "Carlo Vogel", grade: "1,9", gradeNum: 1.9, trend: "up", attendance: 96, lastActive: "vor 1 Std." },
      { name: "Doris Lehnert", grade: "2,2", gradeNum: 2.2, trend: "flat", attendance: 100, lastActive: "vor 2 Std." },
      { name: "Erik Maas", grade: "2,4", gradeNum: 2.4, trend: "up", attendance: 96, lastActive: "vor 3 Std." },
      { name: "Frida Henke", grade: "2,6", gradeNum: 2.6, trend: "flat", attendance: 100, lastActive: "vor 5 Std." },
      { name: "Gustav Behr", grade: "2,9", gradeNum: 2.9, trend: "up", attendance: 92, lastActive: "gestern" },
      {
        name: "Mira Sandt",
        grade: "3,8",
        gradeNum: 3.8,
        trend: "down",
        attendance: 80,
        lastActive: "vor 2 Tagen",
        risk: "medium",
        note: "Bruchrechnen-Lücke · 2 fehlende Hausaufgaben",
      },
    ],
    assignments: [
      { title: "Bruchrechnen — Wochenübung", dueAt: "Heute · 20:00", submitted: 22, total: 28, state: "due-soon" },
      { title: "Geometrie-Zeichnung", dueAt: "in 3 Tagen", submitted: 5, total: 28, state: "open" },
      { title: "Prozent-Test (online)", dueAt: "abgeschlossen", submitted: 28, total: 28, state: "done" },
    ],
    upcoming: [
      { title: "Klassenarbeit Nr. 3 — Bruchrechnen", type: "klassenarbeit", date: "Fr, 21. März", weight: "30 %" },
    ],
    aiSuggestion: {
      headline: "Klasse läuft stark — eine Schülerin braucht Anschub",
      body: "Mira Sandt rutscht im Bruchrechnen ab. Empfehlung: 1-zu-1-Lernpfad oder Peer-Tandem mit Bea Hertz (sehr stark).",
      cta: "Tandem vorschlagen",
    },
  },
  {
    slug: "11a",
    name: "11a",
    subject: "Physik",
    schoolYear: "2026/27",
    classroom: "Lab 1",
    studentCount: 20,
    avgGrade: "2,9",
    trend: "flat",
    attendance: 89,
    riskCount: 4,
    competencies: [
      { label: "Mechanik", value: 70 },
      { label: "Elektrodynamik", value: 65 },
      { label: "Atomphysik", value: 60 },
      { label: "Quantenphysik", value: 72 },
    ],
    gradeDistribution: [1, 4, 7, 5, 2, 1],
    students: [
      { name: "Alina Stark", grade: "1,8", gradeNum: 1.8, trend: "up", attendance: 100, lastActive: "vor 1 Std." },
      { name: "Bruno Heller", grade: "2,3", gradeNum: 2.3, trend: "flat", attendance: 96, lastActive: "vor 2 Std." },
      { name: "Carla Stein", grade: "2,7", gradeNum: 2.7, trend: "flat", attendance: 92, lastActive: "vor 4 Std." },
      { name: "Dennis Mahr", grade: "3,1", gradeNum: 3.1, trend: "down", attendance: 88, lastActive: "gestern" },
      { name: "Elena Frisch", grade: "2,9", gradeNum: 2.9, trend: "up", attendance: 100, lastActive: "vor 3 Std." },
      {
        name: "Joscha Reim",
        grade: "4,1",
        gradeNum: 4.1,
        trend: "down",
        attendance: 70,
        lastActive: "vor 4 Tagen",
        risk: "high",
        note: "Versuchsprotokolle ausstehend · 5 in Mechanik",
      },
      {
        name: "Klara Pross",
        grade: "3,7",
        gradeNum: 3.7,
        trend: "down",
        attendance: 76,
        lastActive: "vor 2 Tagen",
        risk: "medium",
        note: "Beteiligung schwach · Atomphysik-Verständnis fehlt",
      },
    ],
    assignments: [
      { title: "Versuchsprotokoll Federpendel", dueAt: "in 1 Tag", submitted: 9, total: 20, state: "open" },
      { title: "Aufgabe 12 — Magnetfeld", dueAt: "vor 2 Tagen abgegeben", submitted: 18, total: 20, state: "grading" },
    ],
    upcoming: [
      { title: "Klausur Nr. 2 — Elektrodynamik", type: "klassenarbeit", date: "Do, 20. März", weight: "40 %" },
      { title: "Praktikum: Spektroskopie", type: "test", date: "Mi, 9. April" },
    ],
    aiSuggestion: {
      headline: "Vor der Klausur: Mechanik wackelt noch",
      body: "Mechanik-Score 70 % — Klausur-Anteil 35 %. Empfehlung: Übungs-Set 'Klausur-Vorbereitung Mechanik' generieren und freigeben.",
      cta: "Übungs-Set generieren",
    },
  },
];

export function getClass(slug: string): ClassDetail | undefined {
  return CLASSES.find((c) => c.slug === slug);
}

export function listClasses(): ClassDetail[] {
  return CLASSES;
}
