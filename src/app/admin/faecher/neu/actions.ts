/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { safeJsonParse } from "@/lib/safe-json";
import { effectiveRole, getSession } from "@/lib/session";
import { canManageSchool, canAccessArea } from "@/lib/school-admin";

/** Kennzeichnet die Auswahl „Sonstiges" — siehe SubjectTypePicker. */
const CUSTOM_VALUE = "__custom";
const MAX_FAVORITES = 20;

async function requireSubjectAdmin() {
  const session = await getSession();
  if (!session || !canManageSchool(effectiveRole(session))) redirect("/login");
  if (!canAccessArea(effectiveRole(session), "faecher")) redirect("/admin");
  return session;
}

export async function createSubject(formData: FormData): Promise<void> {
  const session = await requireSubjectAdmin();
  if (!session.schoolId) return;

  const name = (formData.get("name") as string | null)?.trim() ?? "";
  const shortName = (formData.get("shortName") as string | null)?.trim().toUpperCase() ?? "";
  const color = (formData.get("color") as string | null)?.trim() ?? "#6366f1";
  const rawCategory = (formData.get("category") as string | null)?.trim() || "allgemein";

  // Der Fachtyp kann frei eingegeben sein („Sonstiges" oder ein gemerkter
  // eigener Typ) — deshalb immer kappen. CUSTOM_VALUE ist nur noch ein
  // Rückfall für alte Formulare ohne das versteckte Feld.
  const custom = (formData.get("customCategory") as string | null)?.trim() ?? "";
  const category = (
    rawCategory === CUSTOM_VALUE ? custom || "allgemein" : rawCategory
  ).slice(0, 40);

  if (!name || !shortName) return;

  await prisma.subject.create({
    data: { name, shortName, color, category, schoolId: session.schoolId },
  });

  revalidatePath("/admin/faecher");
  redirect("/admin/faecher");
}

/**
 * Eigenen Fachtyp merken bzw. wieder entfernen (Stern-Button).
 * Gibt die aktualisierte Liste zurück, damit die Oberfläche synchron bleibt.
 */
export async function toggleSubjectCategory(label: string): Promise<string[]> {
  const session = await requireSubjectAdmin();
  if (!session.schoolId) return [];

  const value = label.trim().slice(0, 40);
  if (!value) return [];

  const school = await prisma.school.findUnique({
    where: { id: session.schoolId },
    select: { subjectCategories: true },
  });

  const parsed = safeJsonParse<string[]>(school?.subjectCategories ?? null, []);
  const list = Array.isArray(parsed) ? parsed.filter((c) => typeof c === "string") : [];

  const exists = list.some((c) => c.toLowerCase() === value.toLowerCase());
  const next = exists
    ? list.filter((c) => c.toLowerCase() !== value.toLowerCase())
    : [...list, value].slice(-MAX_FAVORITES);

  await prisma.school.update({
    where: { id: session.schoolId },
    data: { subjectCategories: JSON.stringify(next) },
  });

  revalidatePath("/admin/faecher/neu");
  return next;
}

/** Gemerkte Fachtypen der Schule lesen — defensiv gegen kaputtes JSON. */
async function readCategories(schoolId: string): Promise<string[]> {
  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: { subjectCategories: true },
  });
  const parsed = safeJsonParse<string[]>(school?.subjectCategories ?? null, []);
  return Array.isArray(parsed) ? parsed.filter((c) => typeof c === "string") : [];
}

/**
 * Einen gemerkten Fachtyp umbenennen.
 *
 * Bereits angelegte Fächer behalten ihren alten Fachtyp-Text — deshalb werden
 * sie mit umgeschrieben, sonst zerfiele die Gruppierung in der Fächerliste.
 */
export async function renameSubjectCategory(
  oldLabel: string,
  newLabel: string,
): Promise<string[]> {
  const session = await requireSubjectAdmin();
  if (!session.schoolId) return [];

  const from = oldLabel.trim().slice(0, 40);
  const to = newLabel.trim().slice(0, 40);
  if (!from || !to || from === to) return readCategories(session.schoolId);

  const list = await readCategories(session.schoolId);
  if (!list.some((c) => c.toLowerCase() === from.toLowerCase())) return list;

  // Kein Duplikat erzeugen, wenn der neue Name schon existiert.
  const withoutBoth = list.filter(
    (c) => c.toLowerCase() !== from.toLowerCase() && c.toLowerCase() !== to.toLowerCase(),
  );
  const next = [...withoutBoth, to].slice(-MAX_FAVORITES);

  await prisma.$transaction([
    prisma.school.update({
      where: { id: session.schoolId },
      data: { subjectCategories: JSON.stringify(next) },
    }),
    prisma.subject.updateMany({
      where: { schoolId: session.schoolId, category: from },
      data: { category: to },
    }),
  ]);

  revalidatePath("/admin/faecher/neu");
  revalidatePath("/admin/faecher");
  return next;
}
