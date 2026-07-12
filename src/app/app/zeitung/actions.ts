/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { getStudentFeatures } from "@/lib/student-features";
import { ARTICLE_COLORS, KATEGORIEN } from "./colors";
import { awardXpCustom } from "@/lib/xp";
import { awardCoins } from "@/lib/coins";

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
  const categoryRaw = (formData.get("category") as string | null)?.trim() ?? "";
  const category = KATEGORIEN.some((k) => k.value === categoryRaw) ? categoryRaw : null;
  return { title, subtitle, content, color, coverUrl, category };
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
  // Belohnung: +25 XP und +15 Coins — gedeckelt auf 3 belohnte Artikel pro Tag,
  // damit Spam sich nicht lohnt.
  const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
  const rewardedToday = await prisma.xpLog.count({
    where: { userId: session.userId, reason: "zeitungsartikel", createdAt: { gte: startOfDay } },
  });
  if (rewardedToday < 3) {
    awardXpCustom(session.userId, 25, "zeitungsartikel").catch(() => undefined);
    awardCoins(session.userId, "zeitungsartikel").catch(() => undefined);
  }

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
  await prisma.newspaperComment.deleteMany({ where: { articleId } }).catch(() => undefined);
  revalidatePath("/app/zeitung");
  redirect("/app/zeitung");
}

// ── Kommentare ──────────────────────────────────────────────

export async function addComment(articleId: string, formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session || effectiveRole(session) !== "student") redirect("/login");

  const text = (formData.get("text") as string | null)?.trim().slice(0, 500) ?? "";
  if (!text) return;

  const article = await prisma.newspaperArticle.findUnique({ where: { id: articleId } });
  if (!article || article.schoolId !== session.schoolId || !article.published) return;

  // Schutz gegen Spam: max. 10 Kommentare pro Tag und User
  const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
  const todayCount = await prisma.newspaperComment.count({
    where: { userId: session.userId, createdAt: { gte: startOfDay } },
  });
  if (todayCount >= 10) return;

  const me = await prisma.user.findUnique({ where: { id: session.userId }, select: { name: true } });
  await prisma.newspaperComment.create({
    data: { articleId, userId: session.userId, userName: me?.name ?? "Unbekannt", text },
  });

  // Autor benachrichtigen (nicht bei eigenen Kommentaren)
  if (article.authorId !== session.userId) {
    await prisma.appNotification.create({
      data: {
        userId: article.authorId,
        type: "info",
        title: "💬 Neuer Kommentar zu deinem Artikel",
        body: `${me?.name ?? "Jemand"} hat „${article.title.slice(0, 80)}“ kommentiert: ${text.slice(0, 120)}`,
        linkUrl: `/app/zeitung/${articleId}`,
      },
    }).catch(() => undefined);
  }

  revalidatePath(`/app/zeitung/${articleId}`);
}

export async function deleteComment(commentId: string): Promise<void> {
  const session = await getSession();
  if (!session) redirect("/login");

  const comment = await prisma.newspaperComment.findUnique({ where: { id: commentId } });
  if (!comment) return;
  const article = await prisma.newspaperArticle.findUnique({ where: { id: comment.articleId } });
  if (!article || article.schoolId !== session.schoolId) return;

  // Löschen: eigener Kommentar, Artikel-Autor oder Schulpersonal (Moderation)
  const role = effectiveRole(session);
  const isStaff = ["admin", "rector", "vice_rector", "super"].includes(role);
  const isOwn = comment.userId === session.userId;
  const isArticleAuthor = article.authorId === session.userId;
  if (!isOwn && !isArticleAuthor && !isStaff) return;

  await prisma.newspaperComment.delete({ where: { id: commentId } });
  revalidatePath(`/app/zeitung/${comment.articleId}`);
}
