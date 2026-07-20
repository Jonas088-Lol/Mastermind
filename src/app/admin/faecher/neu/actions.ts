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

  // Bei „Sonstiges" zählt der frei eingegebene Text.
  const custom = (formData.get("customCategory") as string | null)?.trim() ?? "";
  const category =
    rawCategory === CUSTOM_VALUE ? custom.slice(0, 40) || "allgemein" : rawCategory;

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
