/* Copyright 2026 Elian Schock, Jonas Schwenk */
import { prisma } from "@/lib/db/client";
import { safeJsonParse } from "@/lib/safe-json";

/**
 * Arbeitsweise der Lehrkraft — zusammengefasst oder getrennt.
 *
 * Manche Lehrkräfte wollen einen einzigen Einstieg zum Erstellen, andere die
 * gewohnten einzelnen Reiter. Beides ist gültig, deshalb entscheidet es jede
 * Person für sich. Liegt im vorhandenen `User.prefs`-JSON — keine Migration.
 */
export type WorkspaceMode = "unified" | "separate";

/** Standard: getrennt — ändert für bestehende Nutzer nichts an der Navigation. */
export const DEFAULT_WORKSPACE_MODE: WorkspaceMode = "separate";

interface UserPrefs {
  workspaceMode?: WorkspaceMode;
  [key: string]: unknown;
}

function isMode(v: unknown): v is WorkspaceMode {
  return v === "unified" || v === "separate";
}

export async function getWorkspaceMode(userId: string): Promise<WorkspaceMode> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { prefs: true },
  });
  const prefs = safeJsonParse<UserPrefs>(user?.prefs ?? null, {});
  return isMode(prefs.workspaceMode) ? prefs.workspaceMode : DEFAULT_WORKSPACE_MODE;
}

/** Read-modify-write: andere prefs-Felder (z. B. `nav`) bleiben erhalten. */
export async function saveWorkspaceMode(
  userId: string,
  mode: WorkspaceMode,
): Promise<void> {
  if (!isMode(mode)) return;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { prefs: true },
  });
  const prefs = safeJsonParse<UserPrefs>(user?.prefs ?? null, {});
  await prisma.user.update({
    where: { id: userId },
    data: { prefs: JSON.stringify({ ...prefs, workspaceMode: mode }) },
  });
}
