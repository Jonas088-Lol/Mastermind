/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { canUseOffice, officeBasePath } from "@/lib/office";
import { rateLimit } from "@/lib/security/rate-limit";
import { awardCoins } from "@/lib/coins";
import { getDocumentTemplate } from "./templates";

async function requireOffice() {
  const session = await getSession();
  if (!session) redirect("/login");
  const role = effectiveRole(session);
  if (!canUseOffice(role)) redirect("/");
  // Basis-Pfad: jede Rolle bleibt in ihrer eigenen Ansicht.
  return { session, role, base: officeBasePath(role) };
}

export async function createDocument(): Promise<void> {
  const { session, role, base } = await requireOffice();
  // Missbrauchsschutz: max. 30 neue Dokumente/Stunde (verhindert Dauer-Anlegen).
  const rl = await rateLimit({ scope: "create-doc", key: session.userId, limit: 30, windowSec: 3600 });
  if (!rl.ok) redirect(`${base}/dokumente`);
  const doc = await prisma.document.create({
    data: { userId: session.userId },
  });
  if (role === "student") awardCoins(session.userId, "office_dokument_erstellt", undefined, doc.id).catch(() => undefined);
  redirect(`${base}/dokumente/${doc.id}`);
}

export async function createDocumentFromTemplate(templateKey: string): Promise<void> {
  const { session, role, base } = await requireOffice();
  const template = getDocumentTemplate(String(templateKey).trim().slice(0, 100));
  if (!template) redirect(`${base}/dokumente`);
  // Missbrauchsschutz: gleiches Limit wie createDocument (30 neue Dokumente/Stunde).
  const rl = await rateLimit({ scope: "create-doc", key: session.userId, limit: 30, windowSec: 3600 });
  if (!rl.ok) redirect(`${base}/dokumente`);
  const doc = await prisma.document.create({
    data: { userId: session.userId, title: template.title, content: template.content },
  });
  if (role === "student") awardCoins(session.userId, "office_dokument_erstellt", undefined, doc.id).catch(() => undefined);
  redirect(`${base}/dokumente/${doc.id}`);
}

export async function renameDocument(documentId: string, title: string): Promise<void> {
  const { session, role, base } = await requireOffice();
  const doc = await prisma.document.findUnique({ where: { id: documentId } });
  if (!doc || doc.userId !== session.userId) return;
  await prisma.document.update({
    where: { id: documentId },
    data: { title: title.trim().slice(0, 200) || "Unbenanntes Dokument" },
  });
  revalidatePath(`${base}/dokumente`);
}

export async function saveDocumentContent(documentId: string, content: string): Promise<void> {
  const { session, role, base } = await requireOffice();
  if (typeof content !== "string" || content.length > 2_000_000) return;
  const doc = await prisma.document.findUnique({ where: { id: documentId } });
  if (!doc || doc.userId !== session.userId) return;
  await prisma.document.update({ where: { id: documentId }, data: { content } });
}

export async function deleteDocument(documentId: string): Promise<void> {
  const { session, role, base } = await requireOffice();
  const doc = await prisma.document.findUnique({ where: { id: documentId } });
  if (!doc || doc.userId !== session.userId) redirect(`${base}/dokumente`);
  await prisma.document.delete({ where: { id: documentId } });
  redirect(`${base}/dokumente`);
}
