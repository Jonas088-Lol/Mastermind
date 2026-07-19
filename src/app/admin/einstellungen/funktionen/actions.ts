/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession, ROLE_HOME } from "@/lib/session";
import { auditLog } from "@/lib/audit";
import { canManageSchool, canAccessArea } from "@/lib/school-admin";

const FEATURE_KEYS = [
  "aufgaben", "noten", "stundenplan", "fehlzeiten", "nachrichten",
  "ranking", "duelle", "boss", "karteikarten", "uebungen", "heft",
  "vokabeln", "tutor", "community", "lernen", "klausur",
] as const;

export async function saveFeatureSettings(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canManageSchool(effectiveRole(session))) redirect(ROLE_HOME[effectiveRole(session)]);
  if (!canAccessArea(effectiveRole(session), "einstellungen")) redirect("/admin");

  const adminUser = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { schoolId: true },
  });
  const schoolId = adminUser?.schoolId;
  if (!schoolId) return;

  const disabled: string[] = [];
  const windows: Record<string, { from: string; to: string }> = {};

  for (const key of FEATURE_KEYS) {
    const enabled = formData.get(`feature_${key}`) === "on";
    if (!enabled) {
      disabled.push(key);
    }
    const from = (formData.get(`window_${key}_from`) as string | null)?.trim();
    const to = (formData.get(`window_${key}_to`) as string | null)?.trim();
    if (from && to) {
      windows[key] = { from, to };
    }
  }

  const featureSettings = JSON.stringify({ disabled, windows });

  await prisma.school.update({
    where: { id: schoolId },
    data: { featureSettings },
  });

  await auditLog({
    actorId: session.userId,
    action: "school.settings_changed",
    schoolId,
    details: { type: "feature_settings", disabled, windowCount: Object.keys(windows).length },
  });
}
