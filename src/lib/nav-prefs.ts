/* Copyright 2026 Elian Schock, Jonas Schwenk */
import { prisma } from "@/lib/db/client";
import { safeJsonParse } from "@/lib/safe-json";
import type { NavOverride } from "@/lib/nav-categories";

/** Struktur in `User.prefs` — Navigation je Ansicht (Rolle). */
interface UserPrefs {
  nav?: Record<string, NavOverride>;
  [key: string]: unknown;
}

/** Liest die Navigations-Anpassungen eines Nutzers für eine Ansicht. */
export async function getNavOverride(
  userId: string,
  role: string,
): Promise<NavOverride | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { prefs: true },
  });
  const prefs = safeJsonParse<UserPrefs>(user?.prefs ?? null, {});
  return prefs.nav?.[role] ?? null;
}

/**
 * Speichert die Navigations-Anpassungen. Andere prefs-Felder bleiben erhalten
 * (read-modify-write auf dem JSON).
 */
export async function saveNavOverride(
  userId: string,
  role: string,
  override: NavOverride,
): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { prefs: true },
  });
  const prefs = safeJsonParse<UserPrefs>(user?.prefs ?? null, {});
  const nav = { ...(prefs.nav ?? {}), [role]: override };

  await prisma.user.update({
    where: { id: userId },
    data: { prefs: JSON.stringify({ ...prefs, nav }) },
  });
}
