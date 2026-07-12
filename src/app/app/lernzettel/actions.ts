/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";

export async function createWikiEntry(formData: FormData) {
  const session = await getSession();
  if (!session || !session.schoolId) redirect("/login");

  const title = String(formData.get("title") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  const subject = String(formData.get("subject") ?? "").trim() || null;
  const tags = String(formData.get("tags") ?? "").trim();

  if (!title) return;

  const entry = await prisma.schoolWikiEntry.create({
    data: {
      title,
      content,
      subject,
      tags,
      authorId: session.userId,
      schoolId: session.schoolId,
    },
  });

  revalidatePath("/app/lernzettel");
  redirect(`/app/lernzettel/${entry.id}`);
}

export async function updateWikiEntry(id: string, formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/login");

  const entry = await prisma.schoolWikiEntry.findUnique({ where: { id } });
  if (!entry) return;

  const role = effectiveRole(session);
  const canEdit = entry.authorId === session.userId || role === "admin" || role === "teacher";
  if (!canEdit) return;

  const title = String(formData.get("title") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  const subject = String(formData.get("subject") ?? "").trim() || null;
  const tags = String(formData.get("tags") ?? "").trim();

  await prisma.schoolWikiEntry.update({
    where: { id },
    data: { title, content, subject, tags },
  });

  revalidatePath("/app/lernzettel");
  revalidatePath(`/app/lernzettel/${id}`);
  redirect(`/app/lernzettel/${id}`);
}

export async function deleteWikiEntry(id: string) {
  const session = await getSession();
  if (!session) return;

  const entry = await prisma.schoolWikiEntry.findUnique({ where: { id } });
  if (!entry) return;

  const role = effectiveRole(session);
  const canDelete = entry.authorId === session.userId || role === "admin";
  if (!canDelete) return;

  await prisma.schoolWikiEntry.delete({ where: { id } });
  revalidatePath("/app/lernzettel");
  redirect("/app/lernzettel");
}

export async function duplicateWikiEntry(id: string) {
  const session = await getSession();
  if (!session || !session.schoolId) redirect("/login");

  const entry = await prisma.schoolWikiEntry.findUnique({ where: { id } });
  if (!entry || entry.schoolId !== session.schoolId) return;

  const role = effectiveRole(session);
  const canDuplicate = entry.authorId === session.userId || role === "admin" || role === "teacher";
  if (!canDuplicate) return;

  const copy = await prisma.schoolWikiEntry.create({
    data: {
      title: `${entry.title} (Kopie)`.slice(0, 200),
      content: entry.content,
      subject: entry.subject,
      tags: entry.tags,
      authorId: session.userId,
      schoolId: session.schoolId,
    },
  });

  revalidatePath("/app/lernzettel");
  redirect(`/app/lernzettel/${copy.id}`);
}

export async function incrementViewCount(id: string) {
  await prisma.schoolWikiEntry.update({
    where: { id },
    data: { viewCount: { increment: 1 } },
  }).catch(() => null);
}
