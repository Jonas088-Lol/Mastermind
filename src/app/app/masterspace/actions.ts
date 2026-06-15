"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";

async function requireSession() {
  const session = await getSession();
  if (!session || !["student", "teacher", "admin", "secretary", "rector", "vice_rector"].includes(effectiveRole(session))) {
    redirect("/login");
  }
  return session;
}

// ── Spaces ──────────────────────────────────────────────────

export async function createSpace(formData: FormData): Promise<void> {
  const session = await requireSession();
  if (!session.schoolId) return;

  const name = String(formData.get("name") ?? "").trim().slice(0, 50);
  const description = String(formData.get("description") ?? "").trim().slice(0, 200);
  const emoji = String(formData.get("emoji") ?? "🏠").trim().slice(0, 2);
  if (!name) return;

  const space = await prisma.space.create({
    data: {
      schoolId: session.schoolId,
      ownerId: session.userId,
      name,
      description: description || null,
      emoji: emoji || "🏠",
      channels: { create: [{ name: "allgemein", position: 0 }] },
      members: { create: [{ userId: session.userId, role: "owner" }] },
    },
    select: { id: true, channels: { select: { id: true }, take: 1 } },
  });

  revalidatePath("/app/masterspace");
  redirect(`/app/masterspace/${space.id}/${space.channels[0]?.id ?? ""}`);
}

export async function joinSpace(spaceId: string): Promise<void> {
  const session = await requireSession();
  if (!session.schoolId) return;

  const space = await prisma.space.findFirst({
    where: { id: spaceId, schoolId: session.schoolId, isPublic: true },
  });
  if (!space) return;

  await prisma.spaceMember.upsert({
    where: { spaceId_userId: { spaceId, userId: session.userId } },
    update: {},
    create: { spaceId, userId: session.userId, role: "member" },
  });

  const firstChannel = await prisma.spaceChannel.findFirst({
    where: { spaceId },
    orderBy: { position: "asc" },
  });

  revalidatePath("/app/masterspace");
  redirect(`/app/masterspace/${spaceId}/${firstChannel?.id ?? ""}`);
}

export async function createChannel(formData: FormData): Promise<void> {
  const session = await requireSession();

  const spaceId = String(formData.get("spaceId") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim().toLowerCase().replace(/\s+/g, "-").slice(0, 40);
  if (!spaceId || !name) return;

  const membership = await prisma.spaceMember.findFirst({
    where: { spaceId, userId: session.userId, role: { in: ["owner", "admin"] } },
  });
  if (!membership) return;

  const last = await prisma.spaceChannel.findFirst({ where: { spaceId }, orderBy: { position: "desc" } });
  await prisma.spaceChannel.create({ data: { spaceId, name, position: (last?.position ?? -1) + 1 } });

  revalidatePath(`/app/masterspace/${spaceId}`);
}

export async function sendSpaceMessage(formData: FormData): Promise<void> {
  const session = await requireSession();

  const channelId = String(formData.get("channelId") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim().slice(0, 2000);
  if (!channelId || !content) return;

  const channel = await prisma.spaceChannel.findUnique({
    where: { id: channelId },
    select: { spaceId: true },
  });
  if (!channel) return;

  const membership = await prisma.spaceMember.findFirst({
    where: { spaceId: channel.spaceId, userId: session.userId },
  });
  if (!membership) return;

  await prisma.spaceMessage.create({
    data: { channelId, authorId: session.userId, content },
  });

  revalidatePath(`/app/masterspace/${channel.spaceId}/${channelId}`);
}

// ── Direct Messages ─────────────────────────────────────────

export async function sendDirectMessage(formData: FormData): Promise<void> {
  const session = await requireSession();

  const recipientId = String(formData.get("recipientId") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim().slice(0, 2000);
  if (!recipientId || !content || recipientId === session.userId) return;

  const [a, b] = [session.userId, recipientId].sort();
  const convo = await prisma.directConversation.upsert({
    where: { userAId_userBId: { userAId: a, userBId: b } },
    update: { updatedAt: new Date() },
    create: { userAId: a, userBId: b },
  });

  await prisma.directMessage.create({
    data: { conversationId: convo.id, authorId: session.userId, content },
  });

  revalidatePath(`/app/masterspace/dm/${recipientId}`);
}
