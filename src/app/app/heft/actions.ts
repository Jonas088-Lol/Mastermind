"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";

export async function createNotebook(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "student") redirect("/");

  const title = ((formData.get("title") as string | null) ?? "").trim();
  const subject = ((formData.get("subject") as string | null) ?? "").trim() || null;
  const color = ((formData.get("color") as string | null) ?? "#6366f1").trim();
  const icon = ((formData.get("icon") as string | null) ?? "📓").trim();

  if (!title) return;

  const nb = await prisma.notebook.create({
    data: {
      userId: session.userId,
      title,
      subject,
      color,
      icon,
      pages: {
        create: { title: "Seite 1", content: "[]", order: 0 },
      },
    },
    include: { pages: true },
  });

  redirect(`/app/heft/${nb.id}/${nb.pages[0].id}`);
}

export async function renameNotebook(notebookId: string, title: string) {
  const session = await getSession();
  if (!session) return;

  const nb = await prisma.notebook.findUnique({ where: { id: notebookId } });
  if (!nb || nb.userId !== session.userId) return;

  await prisma.notebook.update({
    where: { id: notebookId },
    data: { title: title.trim() || nb.title },
  });

  revalidatePath(`/app/heft`);
  revalidatePath(`/app/heft/${notebookId}`);
}

export async function createPage(notebookId: string) {
  const session = await getSession();
  if (!session) redirect("/login");

  const nb = await prisma.notebook.findUnique({ where: { id: notebookId } });
  if (!nb || nb.userId !== session.userId) redirect("/app/heft");

  const count = await prisma.notebookPage.count({ where: { notebookId } });

  const page = await prisma.notebookPage.create({
    data: {
      notebookId,
      title: `Seite ${count + 1}`,
      content: "[]",
      order: count,
    },
  });

  redirect(`/app/heft/${notebookId}/${page.id}`);
}

export async function renamePage(pageId: string, title: string) {
  const session = await getSession();
  if (!session) return;

  const page = await prisma.notebookPage.findUnique({
    where: { id: pageId },
    include: { notebook: true },
  });
  if (!page || page.notebook.userId !== session.userId) return;

  await prisma.notebookPage.update({
    where: { id: pageId },
    data: { title: title.trim() || "Seite" },
  });

  revalidatePath(`/app/heft/${page.notebookId}/${pageId}`);
}

export async function deletePage(pageId: string) {
  const session = await getSession();
  if (!session) return;

  const page = await prisma.notebookPage.findUnique({
    where: { id: pageId },
    include: { notebook: { include: { pages: { orderBy: { order: "asc" } } } } },
  });
  if (!page || page.notebook.userId !== session.userId) return;
  if (page.notebook.pages.length <= 1) return;

  await prisma.notebookPage.delete({ where: { id: pageId } });

  const remaining = page.notebook.pages.filter((p) => p.id !== pageId);
  redirect(`/app/heft/${page.notebookId}/${remaining[0].id}`);
}

export async function savePageContent(pageId: string, content: string) {
  const session = await getSession();
  if (!session) return;

  const page = await prisma.notebookPage.findUnique({
    where: { id: pageId },
    include: { notebook: true },
  });
  if (!page || page.notebook.userId !== session.userId) return;

  await prisma.notebookPage.update({
    where: { id: pageId },
    data: { content, updatedAt: new Date() },
  });
}

export async function deleteNotebook(notebookId: string) {
  const session = await getSession();
  if (!session) redirect("/login");

  const nb = await prisma.notebook.findUnique({ where: { id: notebookId } });
  if (!nb || nb.userId !== session.userId) redirect("/app/heft");

  await prisma.notebook.delete({ where: { id: notebookId } });
  redirect("/app/heft");
}
