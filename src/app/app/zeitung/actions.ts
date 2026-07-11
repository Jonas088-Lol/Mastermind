"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { getStudentFeatures } from "@/lib/student-features";
import { ARTICLE_COLORS } from "./colors";

async function requireEditor() {
  const session = await getSession();
  if (!session || effectiveRole(session) !== "student") redirect("/login");
  if (!session.schoolId) redirect("/app");
  const features = await getStudentFeatures(session.userId);
  if (!features.includes("schuelerzeitung")) redirect("/app/zeitung");
  return session;
}

function cleanArticleInput(formData: FormData) {
  const title = (formData.get("title") as string | null)?.trim().slice(0, 150) ?? "";
  const subtitle = (formData.get("subtitle") as string | null)?.trim().slice(0, 250) || null;
  const content = (formData.get("content") as string | null)?.trim().slice(0, 20_000) ?? "";
  const colorRaw = (formData.get("color") as string | null) ?? "";
  const color = ARTICLE_COLORS.includes(colorRaw) ? colorRaw : null;
  const coverRaw = (formData.get("coverUrl") as string | null)?.trim() || null;
  const coverUrl = coverRaw && (/^https:\/\//.test(coverRaw) || coverRaw.startsWith("/uploads/")) ? coverRaw.slice(0, 500) : null;
  return { title, subtitle, content, color, coverUrl };
}

export async function createArticle(formData: FormData): Promise<void> {
  const session = await requireEditor();
  const input = cleanArticleInput(formData);
  if (!input.title || !input.content) return;

  const me = await prisma.user.findUnique({ where: { id: session.userId }, select: { name: true } });
  await prisma.newspaperArticle.create({
    data: {
      schoolId: session.schoolId!,
      authorId: session.userId,
      authorName: me?.name ?? "Redaktion",
      ...input,
    },
  });
  revalidatePath("/app/zeitung");
  redirect("/app/zeitung");
}

export async function updateArticle(articleId: string, formData: FormData): Promise<void> {
  const session = await requireEditor();
  const article = await prisma.newspaperArticle.findUnique({ where: { id: articleId } });
  if (!article || article.schoolId !== session.schoolId || article.authorId !== session.userId) return;

  const input = cleanArticleInput(formData);
  if (!input.title || !input.content) return;

  await prisma.newspaperArticle.update({ where: { id: articleId }, data: input });
  revalidatePath("/app/zeitung");
  revalidatePath(`/app/zeitung/${articleId}`);
  redirect(`/app/zeitung/${articleId}`);
}

export async function deleteArticle(articleId: string): Promise<void> {
  const session = await getSession();
  if (!session) redirect("/login");
  const article = await prisma.newspaperArticle.findUnique({ where: { id: articleId } });
  if (!article || article.schoolId !== session.schoolId) return;

  // Löschen: Autor selbst — oder Schulpersonal (Moderation)
  const role = effectiveRole(session);
  const isStaff = ["admin", "rector", "vice_rector", "super"].includes(role);
  if (article.authorId !== session.userId && !isStaff) return;

  await prisma.newspaperArticle.delete({ where: { id: articleId } });
  revalidatePath("/app/zeitung");
  redirect("/app/zeitung");
}
