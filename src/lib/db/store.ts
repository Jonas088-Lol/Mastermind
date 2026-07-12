/* Copyright 2026 Elian Schock, Jonas Schwenk */
/**
 * Persistenter Store gegen Prisma + SQLite.
 *
 * Public-API ist identisch zur ehemaligen JSON-File-Version, sodass alle
 * Aufrufer (Server-Actions, Pages) ohne Änderung weiterlaufen. User werden
 * per E-Mail referenziert; intern wird auf User.id aufgelöst.
 *
 * Production: SQLite gegen Postgres tauschen — Provider in
 * `prisma/schema.prisma` ändern und `prisma migrate deploy` laufen.
 */

import { prisma } from "@/lib/db/client";

const QUOTA_LIMIT = 50;
const QUOTA_WINDOW_DAYS = 7;

function nextReset(): Date {
  const d = new Date();
  d.setDate(d.getDate() + QUOTA_WINDOW_DAYS);
  d.setHours(0, 0, 0, 0);
  return d;
}

async function getUserId(email: string): Promise<string | null> {
  const u = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    select: { id: true },
  });
  return u?.id ?? null;
}

/* ── Tasks ─────────────────────────────────────────────────────── */

export async function isTaskDone(
  email: string,
  taskId: string
): Promise<boolean> {
  const userId = await getUserId(email);
  if (!userId) return false;
  const row = await prisma.taskCompletion.findUnique({
    where: { userId_taskId: { userId, taskId } },
    select: { id: true },
  });
  return Boolean(row);
}

export async function getDoneTaskIds(email: string): Promise<Set<string>> {
  const userId = await getUserId(email);
  if (!userId) return new Set();
  const rows = await prisma.taskCompletion.findMany({
    where: { userId },
    select: { taskId: true },
  });
  return new Set(rows.map((r) => r.taskId));
}

export async function setTaskDone(
  email: string,
  taskId: string,
  done: boolean
): Promise<void> {
  const userId = await getUserId(email);
  if (!userId) return;
  if (done) {
    await prisma.taskCompletion.upsert({
      where: { userId_taskId: { userId, taskId } },
      update: { doneAt: new Date() },
      create: { userId, taskId },
    });
  } else {
    await prisma.taskCompletion
      .delete({ where: { userId_taskId: { userId, taskId } } })
      .catch(() => undefined);
  }
}

/* ── Notifications ─────────────────────────────────────────────── */

export async function getReadNotificationIds(
  email: string
): Promise<Set<string>> {
  const userId = await getUserId(email);
  if (!userId) return new Set();
  const rows = await prisma.notificationRead.findMany({
    where: { userId },
    select: { notificationId: true },
  });
  return new Set(rows.map((r) => r.notificationId));
}

export async function markNotificationsRead(
  email: string,
  ids: string[]
): Promise<void> {
  if (ids.length === 0) return;
  const userId = await getUserId(email);
  if (!userId) return;
  // upsert in bulk via individual ops — SQLite schluckt das problemlos
  await prisma.$transaction(
    ids.map((notificationId) =>
      prisma.notificationRead.upsert({
        where: { userId_notificationId: { userId, notificationId } },
        update: {},
        create: { userId, notificationId },
      })
    )
  );
}

/* ── AI Quota ──────────────────────────────────────────────────── */

export async function getAiQuota(email: string): Promise<{
  used: number;
  limit: number;
  resetAt: string;
}> {
  const userId = await getUserId(email);
  if (!userId) {
    return { used: 0, limit: QUOTA_LIMIT, resetAt: nextReset().toISOString() };
  }
  const entry = await prisma.aiQuotaEntry.findUnique({ where: { userId } });
  if (!entry || entry.resetAt < new Date()) {
    return { used: 0, limit: QUOTA_LIMIT, resetAt: nextReset().toISOString() };
  }
  return {
    used: entry.used,
    limit: QUOTA_LIMIT,
    resetAt: entry.resetAt.toISOString(),
  };
}

export async function incrementAiQuota(email: string): Promise<{
  used: number;
  limit: number;
  exceeded: boolean;
}> {
  const userId = await getUserId(email);
  if (!userId) {
    return { used: 0, limit: QUOTA_LIMIT, exceeded: false };
  }

  const existing = await prisma.aiQuotaEntry.findUnique({ where: { userId } });
  const fresh = !existing || existing.resetAt < new Date();
  const used = (fresh ? 0 : existing.used) + 1;
  const resetAt = fresh ? nextReset() : existing.resetAt;

  await prisma.aiQuotaEntry.upsert({
    where: { userId },
    update: { used, resetAt },
    create: { userId, used, resetAt },
  });

  return { used, limit: QUOTA_LIMIT, exceeded: used > QUOTA_LIMIT };
}
