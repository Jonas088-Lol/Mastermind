"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/client";
import { getSession } from "@/lib/session";

// Favorisierte Fächer werden im User.prefs-JSON unter "favSubjects" gespeichert
export async function toggleFavoriteSubject(subjectId: string) {
  const session = await getSession();
  if (!session || !subjectId) return;

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { prefs: true },
  });

  let prefs: Record<string, unknown> = {};
  try {
    prefs = user?.prefs ? JSON.parse(user.prefs) : {};
  } catch { /* korruptes JSON — neu beginnen */ }

  const favs = new Set(Array.isArray(prefs.favSubjects) ? (prefs.favSubjects as string[]) : []);
  if (favs.has(subjectId)) favs.delete(subjectId);
  else favs.add(subjectId);
  prefs.favSubjects = [...favs];

  await prisma.user.update({
    where: { id: session.userId },
    data: { prefs: JSON.stringify(prefs) },
  });

  revalidatePath("/app/noten/verlauf");
  revalidatePath("/eltern/noten/verlauf");
  revalidatePath("/teach/noten/verlauf");
}

export async function getFavoriteSubjects(userId: string): Promise<string[]> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { prefs: true } });
  try {
    const prefs = user?.prefs ? JSON.parse(user.prefs) : {};
    return Array.isArray(prefs.favSubjects) ? prefs.favSubjects : [];
  } catch {
    return [];
  }
}
