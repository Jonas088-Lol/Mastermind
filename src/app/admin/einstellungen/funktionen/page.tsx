/* Copyright 2026 Elian Schock, Jonas Schwenk */
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { ROLE_HOME, effectiveRole, getSession } from "@/lib/session";
import { FeatureSettingsForm, type FeatureDef } from "./FeatureSettingsForm";
import { canManageSchool, canAccessArea } from "@/lib/school-admin";

export const metadata: Metadata = { title: "Funktionen · Admin-Einstellungen" };

const SCHOOL_FEATURES: FeatureDef[] = [
  { key: "aufgaben",    label: "Aufgaben",        desc: "Hausaufgaben und Tests" },
  { key: "noten",       label: "Noten",           desc: "Notenübersicht" },
  { key: "stundenplan", label: "Stundenplan",      desc: "Wochenstundenplan" },
  { key: "fehlzeiten",  label: "Fehlzeiten",       desc: "Fehlzeiten-Übersicht für Schüler" },
  { key: "nachrichten", label: "Nachrichten",      desc: "Interne Nachrichtenfunktion" },
  { key: "ranking",     label: "Ranking",          desc: "Klassen- und Schulranking" },
  { key: "duelle",      label: "Duelle",           desc: "Wissens-Duelle" },
  { key: "boss",        label: "Boss-Battles",     desc: "Klassen-Boss-Events" },
  { key: "karteikarten",label: "Karteikarten",     desc: "Lernkarten-System" },
  { key: "uebungen",    label: "Übungen",          desc: "Interaktive Quiz-Übungen" },
  { key: "heft",        label: "Hefte",            desc: "Digitale Notizbücher" },
  { key: "vokabeln",    label: "Vokabeln",         desc: "Vokabel-Trainer" },
  { key: "tutor",       label: "KI-Tutor",         desc: "KI-gestützter Lernassistent" },
  { key: "community",   label: "Community",        desc: "Community-Forum" },
  { key: "lernen",      label: "Lernpfade",        desc: "Strukturierte Lernpfade" },
  { key: "klausur",     label: "Online-Klausuren", desc: "Klausuren in der App schreiben mit Fokus-Tracking" },
];

export default async function AdminFunktionenPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canManageSchool(effectiveRole(session))) redirect(ROLE_HOME[effectiveRole(session)]);
  if (!canAccessArea(effectiveRole(session), "einstellungen")) redirect("/admin");

  const adminUser = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { schoolId: true },
  });
  const schoolId = adminUser?.schoolId;
  if (!schoolId) redirect("/admin");

  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: { featureSettings: true, name: true },
  });
  if (!school) redirect("/admin");

  let settings: { disabled: string[]; windows: Record<string, { from: string; to: string }> } = {
    disabled: [],
    windows: {},
  };
  try {
    const parsed = JSON.parse(school.featureSettings || "{}");
    settings = {
      disabled: Array.isArray(parsed.disabled) ? parsed.disabled : [],
      windows: parsed.windows && typeof parsed.windows === "object" ? parsed.windows : {},
    };
  } catch {
    // keep defaults
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">Admin-Einstellungen</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Funktionen verwalten</h1>
        <p className="mt-1 text-sm text-muted-fg">
          Aktiviere oder deaktiviere Features für Schüler von {school.name}. Optional kannst du Zeitfenster setzen.
        </p>
      </header>

      <FeatureSettingsForm features={SCHOOL_FEATURES} settings={settings} />
    </div>
  );
}
