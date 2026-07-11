"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { rateLimit } from "@/lib/security/rate-limit";
import { awardCoins } from "@/lib/coins";
import { getDocumentTemplate } from "./templates";

async function requireStudent() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "student") redirect("/");
  return session;
}

export async function createDocument(): Promise<void> {
  const session = await requireStudent();
  // Missbrauchsschutz: max. 30 neue Dokumente/Stunde (verhindert Dauer-Anlegen).
  const rl = await rateLimit({ scope: "create-doc", key: session.userId, limit: 30, windowSec: 3600 });
  if (!rl.ok) redirect("/app/dokumente");
  const doc = await prisma.document.create({
    data: { userId: session.userId },
  });
  awardCoins(session.userId, "office_dokument_erstellt", undefined, doc.id).catch(() => undefined);
  redirect(`/app/dokumente/${doc.id}`);
}

export async function createDocumentFromTemplate(templateKey: string): Promise<void> {
  const session = await requireStudent();
  const template = getDocumentTemplate(String(templateKey).trim().slice(0, 100));
  if (!template) redirect("/app/dokumente");
  // Missbrauchsschutz: gleiches Limit wie createDocument (30 neue Dokumente/Stunde).
  const rl = await rateLimit({ scope: "create-doc", key: session.userId, limit: 30, windowSec: 3600 });
  if (!rl.ok) redirect("/app/dokumente");
  const doc = await prisma.document.create({
    data: { userId: session.userId, title: template.title, content: template.content },
  });
  awardCoins(session.userId, "office_dokument_erstellt", undefined, doc.id).catch(() => undefined);
  redirect(`/app/dokumente/${doc.id}`);
}

export async function renameDocument(documentId: string, title: string): Promise<void> {
  const session = await requireStudent();
  const doc = await prisma.document.findUnique({ where: { id: documentId } });
  if (!doc || doc.userId !== session.userId) return;
  await prisma.document.update({
    where: { id: documentId },
    data: { title: title.trim().slice(0, 200) || "Unbenanntes Dokument" },
  });
  revalidatePath("/app/dokumente");
}

export async function saveDocumentContent(documentId: string, content: string): Promise<void> {
  const session = await requireStudent();
  const doc = await prisma.document.findUnique({ where: { id: documentId } });
  if (!doc || doc.userId !== session.userId) return;
  await prisma.document.update({ where: { id: documentId }, data: { content } });
}

export async function deleteDocument(documentId: string): Promise<void> {
  const session = await requireStudent();
  const doc = await prisma.document.findUnique({ where: { id: documentId } });
  if (!doc || doc.userId !== session.userId) redirect("/app/dokumente");
  await prisma.document.delete({ where: { id: documentId } });
  redirect("/app/dokumente");
}
