"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { ROLE_HOME, effectiveRole, getSession } from "@/lib/session";

async function requireParent() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "parent") redirect(ROLE_HOME[effectiveRole(session)]);
  return session;
}

export async function createPromise(formData: FormData): Promise<void> {
  const session = await requireParent();

  const studentId = (formData.get("studentId") as string | null)?.trim() ?? "";
  const title = ((formData.get("title") as string | null)?.trim() ?? "").slice(0, 120);
  const rewardText = ((formData.get("rewardText") as string | null)?.trim() ?? "").slice(0, 240);

  if (!studentId || !title || !rewardText) return;

  const link = await prisma.parentStudentLink.findFirst({
    where: { parentId: session.userId, studentId },
  });
  if (!link) return;

  await prisma.rewardPromise.create({
    data: { parentId: session.userId, studentId, title, rewardText },
  });

  await prisma.appNotification.create({
    data: {
      userId: studentId,
      type: "reward_promise",
      title: "🎯 Neues Ziel von deinen Eltern",
      body: `${title} — Belohnung: ${rewardText}`,
      linkUrl: "/app/ziele",
    },
  }).catch(() => undefined);

  revalidatePath("/eltern/belohnungen");
  revalidatePath("/app/ziele");
}

export async function fulfillPromise(formData: FormData): Promise<void> {
  const session = await requireParent();

  const id = (formData.get("id") as string | null)?.trim() ?? "";
  if (!id) return;

  const promise = await prisma.rewardPromise.findFirst({
    where: { id, parentId: session.userId, status: "open" },
  });
  if (!promise) return;

  await prisma.rewardPromise.update({
    where: { id: promise.id },
    data: { status: "fulfilled", fulfilledAt: new Date() },
  });

  await prisma.appNotification.create({
    data: {
      userId: promise.studentId,
      type: "reward_promise",
      title: "🎁 Belohnung eingelöst",
      body: `Ziel erreicht: ${promise.title} — Belohnung: ${promise.rewardText}`,
      linkUrl: "/app/ziele",
    },
  }).catch(() => undefined);

  revalidatePath("/eltern/belohnungen");
  revalidatePath("/app/ziele");
}

export async function cancelPromise(formData: FormData): Promise<void> {
  const session = await requireParent();

  const id = (formData.get("id") as string | null)?.trim() ?? "";
  if (!id) return;

  const promise = await prisma.rewardPromise.findFirst({
    where: { id, parentId: session.userId, status: "open" },
  });
  if (!promise) return;

  await prisma.rewardPromise.update({
    where: { id: promise.id },
    data: { status: "cancelled" },
  });

  revalidatePath("/eltern/belohnungen");
  revalidatePath("/app/ziele");
}
