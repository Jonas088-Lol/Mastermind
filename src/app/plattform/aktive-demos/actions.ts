/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/client";
import { getSession, isSuper } from "@/lib/session";
import { auditLog } from "@/lib/audit";
import { demoWindow, DEMO_DURATION_MS } from "@/lib/demo";

/** Verlängert einen Demo-Zugang um weitere 7 Tage (ab dem bisherigen Ende). */
export async function extendDemo(id: string): Promise<void> {
  const session = await getSession();
  if (!session || !isSuper(session)) redirect("/login");

  const demo = await prisma.demoAccess.findUnique({
    where: { id },
    select: { activatesAt: true, endsAt: true },
  });
  if (!demo) return;

  const win = demoWindow(demo.activatesAt, demo.endsAt);
  const newEnd = new Date(win.end + DEMO_DURATION_MS);
  await prisma.demoAccess.update({ where: { id }, data: { endsAt: newEnd } });
  await auditLog({ actorId: session.userId, action: "demo.extend", details: { demoAccessId: id } }).catch(() => undefined);

  revalidatePath("/plattform/aktive-demos");
}
