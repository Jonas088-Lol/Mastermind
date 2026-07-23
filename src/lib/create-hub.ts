/* Copyright 2026 Elian Schock, Jonas Schwenk */
import type { Capability } from "@/lib/permissions";

/**
 * Zentraler Katalog aller Erstell-Wege einer Lehrkraft.
 *
 * Bisher hing jede „Neu"-Aktion an ihrer eigenen Feature-Route — elf Stück,
 * ohne gemeinsamen Einstieg. Dieser Katalog bündelt sie an einer Stelle, damit
 * der Hub (/teach/erstellen) und die Navigation dieselbe Quelle nutzen.
 *
 * Wichtig: Das fasst nur die *Oberfläche* zusammen. Die Datenmodelle bleiben
 * getrennt — ein Zusammenlegen von Assignment/MasterTask/Homework wäre eine
 * Migration mit Datenverlust-Risiko und braucht eine eigene Entscheidung.
 */

/** Sinnvolle Gruppen — spiegeln wider, wonach Lehrkräfte tatsächlich suchen. */
export type CreateGroup = "aufgaben" | "material" | "lernen" | "unterricht";

export const CREATE_GROUP_LABEL: Record<CreateGroup, string> = {
  aufgaben: "Aufgaben & Hausaufgaben",
  material: "Material & Vorlagen",
  lernen: "Lerninhalte",
  unterricht: "Unterricht & Organisation",
};

export interface CreateAction {
  /** Stabile ID — auch der Schlüssel für Favoriten in den User-Prefs. */
  id: string;
  label: string;
  /** Ein Satz: Was entsteht dabei und wann nimmt man es? */
  description: string;
  href: string;
  group: CreateGroup;
  /** Icon-Name aus der Sidebar-Icon-Map. */
  icon: string;
  /** Reiter, der bei „Zusammengefasst" aus der Navigation verschwindet. */
  navHref?: string;
  /** Nur sichtbar, wenn die Schulleitung das Recht nicht entzogen hat. */
  capability?: Capability;
}

export const CREATE_ACTIONS: CreateAction[] = [
  {
    id: "assignment",
    label: "Aufgabe",
    description: "Benotbare Aufgabe für eine Klasse — mit Abgabe, Frist und Punkten.",
    href: "/teach/aufgaben/neu",
    group: "aufgaben",
    icon: "checkSquare",
    navHref: "/teach/aufgaben",
    capability: "teacher.create_exercises",
  },
  {
    id: "homework",
    label: "Hausaufgabe",
    description: "Kurze Hausaufgabe zum Abhaken — optional mit Upload.",
    href: "/teach/hausaufgaben/neu",
    group: "aufgaben",
    icon: "clipboardList",
    navHref: "/teach/hausaufgaben",
    capability: "teacher.create_exercises",
  },
  {
    id: "mastertask",
    label: "MasterTask",
    description: "Aufgabe mit Buch- und Seitenbezug, ohne Benotung.",
    href: "/teach/mastertask/neu",
    group: "aufgaben",
    icon: "bookMarked",
    navHref: "/teach/mastertask",
    capability: "teacher.create_exercises",
  },
  {
    id: "exercise",
    label: "Übung",
    description: "Freie Übung zu einem Thema — ohne Frist und Punkte.",
    href: "/teach/uebungen",
    group: "aufgaben",
    icon: "target",
    navHref: "/teach/uebungen",
    capability: "teacher.create_exercises",
  },
  {
    id: "worksheet",
    label: "Arbeitsblatt",
    description: "Arbeitsblatt aus einzelnen Aufgabenblöcken zusammenstellen.",
    href: "/teach/arbeitsblatter",
    group: "material",
    icon: "fileText",
    navHref: "/teach/arbeitsblatter",
  },
  {
    id: "worksheet-template",
    label: "Aus Vorlage",
    description: "Fertiges Arbeitsblatt als Kopie übernehmen und anpassen.",
    href: "/teach/arbeitsblatter/templates",
    group: "material",
    icon: "layers",
    navHref: "/teach/arbeitsblatter/templates",
  },
  {
    id: "template",
    label: "Aufgaben-Vorlage",
    description: "Aufgabe als wiederverwendbare Vorlage sichern — auch für Kollegium.",
    href: "/teach/vorlagen",
    group: "material",
    icon: "layers",
    navHref: "/teach/vorlagen",
  },
  {
    id: "serienbrief",
    label: "Serienbrief",
    description: "Einen Brief an viele — mit persönlichen Platzhaltern aus Tabelle oder Liste.",
    href: "/teach/serienbrief",
    group: "material",
    icon: "mail",
    navHref: "/teach/serienbrief",
    capability: "teacher.mail_merge",
  },
  {
    id: "ai",
    label: "KI-Generator",
    description: "Aufgaben von der KI vorschlagen lassen und an eine Klasse senden.",
    href: "/teach/generator",
    group: "material",
    icon: "sparkles",
    navHref: "/teach/generator",
    capability: "teacher.ai_generator",
  },
  {
    id: "path",
    label: "Lernpfad",
    description: "Mehrere Module zu einem aufeinander aufbauenden Pfad verketten.",
    href: "/teach/lernpfade/neu",
    group: "lernen",
    icon: "layers",
    navHref: "/teach/lernpfade",
  },
  {
    id: "boss",
    label: "Boss-Kampf",
    description: "Spielerische Wissensprüfung als Gruppen-Herausforderung.",
    href: "/teach/boss/neu",
    group: "lernen",
    icon: "swords",
    navHref: "/teach/boss",
  },
  {
    id: "grade",
    label: "Note",
    description: "Einzelne Note oder ganze Prüfung eintragen.",
    href: "/teach/noten/neu",
    group: "unterricht",
    icon: "lineChart",
  },
  {
    id: "lesson-log",
    label: "Klassenbuch-Eintrag",
    description: "Unterrichtsstunde dokumentieren.",
    href: "/teach/klassenbuch/neu",
    group: "unterricht",
    icon: "bookMarked",
  },
  {
    id: "incident",
    label: "Vorfall",
    description: "Besonderes Vorkommnis im Klassenbuch festhalten.",
    href: "/teach/klassenbuch/vorfall",
    group: "unterricht",
    icon: "clipboardEdit",
  },
  {
    id: "message",
    label: "Nachricht",
    description: "Nachricht an eine Person oder eine ganze Klasse.",
    href: "/teach/nachrichten/neu",
    group: "unterricht",
    icon: "messageSquare",
  },
];

export const CREATE_GROUP_ORDER: CreateGroup[] = [
  "aufgaben",
  "material",
  "lernen",
  "unterricht",
];

/** Nach Gruppen sortiert — leere Gruppen fallen raus. */
export function groupCreateActions(
  actions: CreateAction[],
): { group: CreateGroup; label: string; actions: CreateAction[] }[] {
  return CREATE_GROUP_ORDER.map((group) => ({
    group,
    label: CREATE_GROUP_LABEL[group],
    actions: actions.filter((a) => a.group === group),
  })).filter((g) => g.actions.length > 0);
}

/**
 * Reiter, die im Modus „Zusammengefasst" aus der Navigation verschwinden,
 * weil sie über den Hub erreichbar sind.
 *
 * Bewusst konservativ: Nur Routen, die *überwiegend* dem Erstellen dienen.
 * /teach/aufgaben, /teach/noten & Co. bleiben stehen — dort verwaltet und
 * korrigiert man, das Erstellen ist nur ein Teil davon.
 */
export const HUB_ABSORBED_HREFS: string[] = [
  "/teach/vorlagen",
  "/teach/arbeitsblatter/templates",
  "/teach/generator",
  "/teach/lernpfade",
  "/teach/boss",
];
