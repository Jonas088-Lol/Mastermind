"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { onPptxCreated } from "@/lib/tree-quest-engine";
import { awardCoins } from "@/lib/coins";
import { getTemplate } from "./templates";

async function requireStudent() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "student") redirect("/");
  return session;
}

export async function createPresentation(): Promise<void> {
  const session = await requireStudent();
  const pres = await prisma.presentation.create({
    data: { userId: session.userId },
  });
  awardCoins(session.userId, "office_dokument_erstellt", undefined, pres.id).catch(() => undefined);
  redirect(`/app/praesentationen/${pres.id}`);
}

export async function createPresentationFromTemplate(key: string): Promise<void> {
  const session = await requireStudent();
  const template = getTemplate(String(key ?? "").trim().slice(0, 50));
  if (!template) redirect("/app/praesentationen");
  const pres = await prisma.presentation.create({
    data: {
      userId: session.userId,
      title: template.title,
      slides: JSON.stringify(template.slides),
    },
  });
  awardCoins(session.userId, "office_dokument_erstellt", undefined, pres.id).catch(() => undefined);
  redirect(`/app/praesentationen/${pres.id}`);
}

export async function renamePresentation(presentationId: string, title: string): Promise<void> {
  const session = await requireStudent();
  const pres = await prisma.presentation.findUnique({ where: { id: presentationId } });
  if (!pres || pres.userId !== session.userId) return;
  await prisma.presentation.update({
    where: { id: presentationId },
    data: { title: title.trim() || "Unbenannte Präsentation" },
  });
  revalidatePath("/app/praesentationen");
}

export async function savePresentationSlides(presentationId: string, slides: string): Promise<void> {
  const session = await requireStudent();
  const pres = await prisma.presentation.findUnique({ where: { id: presentationId } });
  if (!pres || pres.userId !== session.userId) return;
  await prisma.presentation.update({ where: { id: presentationId }, data: { slides } });
  // Count as a completed presentation if slides are non-empty
  if (slides && slides !== "[]") {
    onPptxCreated(session.userId).catch(() => undefined);
  }
}

export async function deletePresentation(presentationId: string): Promise<void> {
  const session = await requireStudent();
  const pres = await prisma.presentation.findUnique({ where: { id: presentationId } });
  if (!pres || pres.userId !== session.userId) redirect("/app/praesentationen");
  await prisma.presentation.delete({ where: { id: presentationId } });
  redirect("/app/praesentationen");
}
