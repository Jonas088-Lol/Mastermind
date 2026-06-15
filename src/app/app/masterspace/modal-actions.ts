"use server";

import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { redirect } from "next/navigation";

async function requireSession() {
  const session = await getSession();
  if (!session || !["student", "teacher", "admin", "secretary", "rector", "vice_rector"].includes(effectiveRole(session))) {
    redirect("/login");
  }
  return session;
}

export async function createSpaceModal(
  formData: FormData
): Promise<{ spaceId: string; channelId: string } | null> {
  const session = await requireSession();
  if (!session.schoolId) return null;

  const name = String(formData.get("name") ?? "").trim().slice(0, 50);
  const description = String(formData.get("description") ?? "").trim().slice(0, 200);
  const emoji = String(formData.get("emoji") ?? "🏠").trim().slice(0, 2);
  if (!name) return null;

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

  return { spaceId: space.id, channelId: space.channels[0]?.id ?? "" };
}

export async function joinSpaceModal(
  spaceId: string
): Promise<{ spaceId: string; channelId: string } | null> {
  const session = await requireSession();
  if (!session.schoolId) return null;

  const space = await prisma.space.findFirst({
    where: { id: spaceId, schoolId: session.schoolId, isPublic: true },
  });
  if (!space) return null;

  await prisma.spaceMember.upsert({
    where: { spaceId_userId: { spaceId, userId: session.userId } },
    update: {},
    create: { spaceId, userId: session.userId, role: "member" },
  });

  const firstChannel = await prisma.spaceChannel.findFirst({
    where: { spaceId },
    orderBy: { position: "asc" },
  });

  return { spaceId, channelId: firstChannel?.id ?? "" };
}

export async function createChannelModal(
  formData: FormData
): Promise<{ channelId: string } | null> {
  const session = await requireSession();

  const spaceId = String(formData.get("spaceId") ?? "").trim();
  const name = String(formData.get("name") ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .slice(0, 40);
  if (!spaceId || !name) return null;

  const membership = await prisma.spaceMember.findFirst({
    where: { spaceId, userId: session.userId, role: { in: ["owner", "admin"] } },
  });
  if (!membership) return null;

  const last = await prisma.spaceChannel.findFirst({
    where: { spaceId },
    orderBy: { position: "desc" },
  });
  const channel = await prisma.spaceChannel.create({
    data: { spaceId, name, position: (last?.position ?? -1) + 1 },
    select: { id: true },
  });

  return { channelId: channel.id };
}

export async function sendChannelMessageModal(
  channelId: string,
  content: string
): Promise<void> {
  const session = await requireSession();
  const trimmed = content.trim().slice(0, 2000);
  if (!channelId || !trimmed) return;

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
    data: { channelId, authorId: session.userId, content: trimmed },
  });
}

export async function sendDmModal(recipientId: string, content: string): Promise<void> {
  const session = await requireSession();
  const trimmed = content.trim().slice(0, 2000);
  if (!recipientId || !trimmed || recipientId === session.userId) return;

  const [a, b] = [session.userId, recipientId].sort();
  const convo = await prisma.directConversation.upsert({
    where: { userAId_userBId: { userAId: a, userBId: b } },
    update: { updatedAt: new Date() },
    create: { userAId: a, userBId: b },
  });

  await prisma.directMessage.create({
    data: { conversationId: convo.id, authorId: session.userId, content: trimmed },
  });
}
