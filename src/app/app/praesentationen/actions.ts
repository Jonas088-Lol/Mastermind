/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { canUseOffice, officeBasePath } from "@/lib/office";
import { onPptxCreated } from "@/lib/tree-quest-engine";
import { awardCoins } from "@/lib/coins";
import { rateLimit } from "@/lib/security/rate-limit";
import { getTemplate } from "./templates";

async function requireOffice() {
  const session = await getSession();
  if (!session) redirect("/login");
  const role = effectiveRole(session);
  if (!canUseOffice(role)) redirect("/");
  // Basis-Pfad: jede Rolle bleibt in ihrer eigenen Ansicht.
  return { session, role, base: officeBasePath(role) };
}

export async function createPresentation(): Promise<void> {
  const { session, role, base } = await requireOffice();
  // Missbrauchsschutz: max. 30 neue Präsentationen/Stunde (wie Dokumente/Tabellen).
  const rl = await rateLimit({ scope: "create-pres", key: session.userId, limit: 30, windowSec: 3600 });
  if (!rl.ok) redirect(`${base}/praesentationen`);
  const pres = await prisma.presentation.create({
    data: { userId: session.userId },
  });
  if (role === "student") awardCoins(session.userId, "office_dokument_erstellt", undefined, pres.id).catch(() => undefined);
  redirect(`${base}/praesentationen/${pres.id}`);
}

export async function createPresentationFromTemplate(key: string): Promise<void> {
  const { session, role, base } = await requireOffice();
  const template = getTemplate(String(key ?? "").trim().slice(0, 50));
  if (!template) redirect(`${base}/praesentationen`);
  // Missbrauchsschutz: gleiches Limit wie createPresentation.
  const rl = await rateLimit({ scope: "create-pres", key: session.userId, limit: 30, windowSec: 3600 });
  if (!rl.ok) redirect(`${base}/praesentationen`);
  const pres = await prisma.presentation.create({
    data: {
      userId: session.userId,
      title: template.title,
      slides: JSON.stringify(template.slides),
    },
  });
  if (role === "student") awardCoins(session.userId, "office_dokument_erstellt", undefined, pres.id).catch(() => undefined);
  redirect(`${base}/praesentationen/${pres.id}`);
}

export async function renamePresentation(presentationId: string, title: string): Promise<void> {
  const { session, role, base } = await requireOffice();
  const pres = await prisma.presentation.findUnique({ where: { id: presentationId } });
  if (!pres || pres.userId !== session.userId) return;
  await prisma.presentation.update({
    where: { id: presentationId },
    data: { title: title.trim() || "Unbenannte Präsentation" },
  });
  revalidatePath(`${base}/praesentationen`);
}

export async function savePresentationSlides(presentationId: string, slides: string): Promise<void> {
  const { session, role, base } = await requireOffice();
  if (typeof slides !== "string" || slides.length > 2_000_000) return;
  const pres = await prisma.presentation.findUnique({ where: { id: presentationId } });
  if (!pres || pres.userId !== session.userId) return;
  await prisma.presentation.update({ where: { id: presentationId }, data: { slides } });
  // Count as a completed presentation if slides are non-empty
  if (slides && slides !== "[]") {
    onPptxCreated(session.userId).catch(() => undefined);
  }
}

export async function deletePresentation(presentationId: string): Promise<void> {
  const { session, role, base } = await requireOffice();
  const pres = await prisma.presentation.findUnique({ where: { id: presentationId } });
  if (!pres || pres.userId !== session.userId) redirect(`${base}/praesentationen`);
  await prisma.presentation.delete({ where: { id: presentationId } });
  redirect(`${base}/praesentationen`);
}
