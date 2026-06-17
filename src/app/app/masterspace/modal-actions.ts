"use server";

import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { awardCoins } from "@/lib/coins";

async function requireSession() {
  const session = await getSession();
  if (!session || !["student", "teacher", "admin", "secretary", "rector", "vice_rector"].includes(effectiveRole(session))) {
    redirect("/login");
  }
  return session;
}

// ── Space & Channels ──────────────────────────────────────────────────────

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
      channels: {
        create: [
          { name: "allgemein", type: "text", position: 0 },
          { name: "sprache", type: "voice", position: 1 },
        ],
      },
      members: { create: [{ userId: session.userId, role: "owner" }] },
    },
    select: { id: true, channels: { select: { id: true, type: true }, orderBy: { position: "asc" } } },
  });

  const textChannel = space.channels.find((c) => c.type === "text");
  return { spaceId: space.id, channelId: textChannel?.id ?? space.channels[0]?.id ?? "" };
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
    where: { spaceId, type: "text" },
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
  const type = String(formData.get("type") ?? "text") === "voice" ? "voice" : "text";
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
    data: { spaceId, name, type, position: (last?.position ?? -1) + 1 },
    select: { id: true },
  });

  return { channelId: channel.id };
}

// ── Messages ──────────────────────────────────────────────────────────────

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

export async function editMessageModal(messageId: string, content: string): Promise<void> {
  const session = await requireSession();
  const trimmed = content.trim().slice(0, 2000);
  if (!messageId || !trimmed) return;

  await prisma.spaceMessage.updateMany({
    where: { id: messageId, authorId: session.userId },
    data: { content: trimmed, editedAt: new Date() },
  });
}

export async function deleteMessageModal(messageId: string): Promise<void> {
  const session = await requireSession();

  await prisma.spaceMessage.deleteMany({
    where: { id: messageId, authorId: session.userId },
  });
}

export async function sendDmModal(recipientId: string, content: string): Promise<void> {
  const session = await requireSession();
  const trimmed = content.trim().slice(0, 2000);
  if (!recipientId || !trimmed || recipientId === session.userId) return;

  const recipientExists = await prisma.user.findUnique({
    where: { id: recipientId, schoolId: session.schoolId ?? "" },
    select: { id: true },
  });
  if (!recipientExists) return;

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

// ── Voice ─────────────────────────────────────────────────────────────────

export async function joinVoiceModal(channelId: string): Promise<void> {
  const session = await requireSession();

  const channel = await prisma.spaceChannel.findUnique({
    where: { id: channelId, type: "voice" },
    select: { spaceId: true },
  });
  if (!channel) return;

  const membership = await prisma.spaceMember.findFirst({
    where: { spaceId: channel.spaceId, userId: session.userId },
  });
  if (!membership) return;

  await prisma.voiceParticipant.upsert({
    where: { channelId_userId: { channelId, userId: session.userId } },
    update: { joinedAt: new Date() },
    create: { channelId, userId: session.userId },
  });
}

export async function leaveVoiceModal(channelId: string): Promise<void> {
  const session = await requireSession();
  await prisma.voiceParticipant.deleteMany({
    where: { channelId, userId: session.userId },
  });
}

export async function leaveAllVoiceModal(): Promise<void> {
  const session = await requireSession();
  await prisma.voiceParticipant.deleteMany({
    where: { userId: session.userId },
  });
}

export async function setMuteModal(channelId: string, isMuted: boolean): Promise<void> {
  const session = await requireSession();
  await prisma.voiceParticipant.updateMany({
    where: { channelId, userId: session.userId },
    data: { isMuted },
  });
}

export async function setDeafModal(channelId: string, isDeaf: boolean): Promise<void> {
  const session = await requireSession();
  await prisma.voiceParticipant.updateMany({
    where: { channelId, userId: session.userId },
    data: { isDeaf },
  });
}

export async function setScreenShareModal(
  channelId: string,
  isSharingScreen: boolean
): Promise<void> {
  const session = await requireSession();
  await prisma.voiceParticipant.updateMany({
    where: { channelId, userId: session.userId },
    data: { isSharingScreen },
  });
}

// ── Friends ───────────────────────────────────────────────────────────────

export async function sendFriendRequestModal(
  addresseeId: string
): Promise<{ ok: boolean; message?: string }> {
  const session = await requireSession();
  if (addresseeId === session.userId) return { ok: false, message: "Du kannst dich nicht selbst hinzufügen" };

  const addresseeExists = await prisma.user.findUnique({
    where: { id: addresseeId, schoolId: session.schoolId ?? "" },
    select: { id: true },
  });
  if (!addresseeExists) return { ok: false, message: "Benutzer nicht gefunden" };

  // Check if already exists in either direction
  const existing = await prisma.friendship.findFirst({
    where: {
      OR: [
        { requesterId: session.userId, addresseeId },
        { requesterId: addresseeId, addresseeId: session.userId },
      ],
    },
  });
  if (existing) {
    if (existing.status === "accepted") return { ok: false, message: "Bereits befreundet" };
    if (existing.status === "pending") return { ok: false, message: "Anfrage bereits gesendet" };
  }

  await prisma.friendship.create({
    data: { requesterId: session.userId, addresseeId },
  });
  return { ok: true };
}

export async function acceptFriendModal(friendshipId: string): Promise<void> {
  const session = await requireSession();
  const friendship = await prisma.friendship.findUnique({
    where: { id: friendshipId },
    select: { requesterId: true, addresseeId: true, status: true },
  });
  if (!friendship || friendship.addresseeId !== session.userId || friendship.status !== "pending") return;

  await prisma.friendship.update({
    where: { id: friendshipId },
    data: { status: "accepted" },
  });

  // Award coins to both users for making a new friend
  awardCoins(session.userId, "freund_eingeladen", undefined, friendshipId).catch(() => undefined);
  awardCoins(friendship.requesterId, "freund_eingeladen", undefined, friendshipId).catch(() => undefined);
}

export async function declineFriendModal(friendshipId: string): Promise<void> {
  const session = await requireSession();
  await prisma.friendship.deleteMany({
    where: {
      id: friendshipId,
      OR: [{ addresseeId: session.userId }, { requesterId: session.userId }],
    },
  });
}

export async function searchUsersModal(
  query: string
): Promise<{ id: string; name: string }[]> {
  const session = await requireSession();
  if (!query.trim() || !session.schoolId) return [];

  const users = await prisma.user.findMany({
    where: {
      schoolId: session.schoolId,
      id: { not: session.userId },
      name: { contains: query.trim() },
    },
    select: { id: true, name: true },
    take: 10,
  });
  return users;
}
