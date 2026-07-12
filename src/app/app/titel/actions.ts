/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";

export async function equipTitle(slug: string): Promise<void> {
  const session = await getSession();
  if (!session || effectiveRole(session) !== "student") return;

  // Verify user owns this title
  const owned = await prisma.userTitle.findFirst({
    where: { userId: session.userId, titleSlug: slug },
  });
  if (!owned) return;

  await prisma.user.update({
    where: { id: session.userId },
    data: { equippedTitle: slug },
  });

  revalidatePath("/app/titel");
  revalidatePath("/app/profil");
}

export async function unequipTitle(): Promise<void> {
  const session = await getSession();
  if (!session || effectiveRole(session) !== "student") return;

  await prisma.user.update({
    where: { id: session.userId },
    data: { equippedTitle: null },
  });

  revalidatePath("/app/titel");
  revalidatePath("/app/profil");
}
