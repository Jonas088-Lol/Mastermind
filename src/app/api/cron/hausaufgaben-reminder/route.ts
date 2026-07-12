/* Copyright 2026 Elian Schock, Jonas Schwenk */
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/client";
import { pushToUsers } from "@/lib/push";
import { logger } from "@/lib/logger";

export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }

  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);
  const in72h = new Date(now.getTime() + 72 * 60 * 60 * 1000);

  let notified48 = 0;
  let notified24 = 0;

  // ── 48h reminder → notify students who haven't finished ────────────────
  const due48 = await prisma.homework.findMany({
    where: {
      dueAt: { gte: in24h, lte: in72h },
      notifiedAt48h: false,
    },
    include: {
      subject: { select: { name: true } },
      completions: {
        where: { done: false },
        select: { studentId: true },
      },
    },
  });

  for (const hw of due48) {
    const studentIds = hw.completions.map((c) => c.studentId);
    if (studentIds.length > 0) {
      pushToUsers(studentIds, {
        title: "Hausaufgabe in 48h fällig",
        body: `${hw.subject.name}: ${hw.title}`,
        url: "/app/hausaufgaben",
      }).catch((err) => logger.warn("cron 48h push failed", { error: String(err) }));
      notified48 += studentIds.length;
    }

    await prisma.homework.update({
      where: { id: hw.id },
      data: { notifiedAt48h: true },
    });
  }

  // ── 24h reminder → notify students AND parents who haven't finished ────
  const due24 = await prisma.homework.findMany({
    where: {
      dueAt: { gte: now, lte: in48h },
      notifiedAt24h: false,
    },
    include: {
      subject: { select: { name: true } },
      completions: {
        where: { done: false },
        select: {
          studentId: true,
          student: {
            select: {
              studentParents: { select: { parentId: true } },
            },
          },
        },
      },
    },
  });

  for (const hw of due24) {
    const studentIds = hw.completions.map((c) => c.studentId);
    const parentIds = [
      ...new Set(
        hw.completions.flatMap((c) => c.student.studentParents.map((p) => p.parentId))
      ),
    ];

    const recipients = [...new Set([...studentIds, ...parentIds])];
    if (recipients.length > 0) {
      pushToUsers(recipients, {
        title: "Hausaufgabe in 24h fällig",
        body: `${hw.subject.name}: ${hw.title}`,
        url: studentIds.includes(recipients[0]) ? "/app/hausaufgaben" : "/eltern/hausaufgaben",
      }).catch((err) => logger.warn("cron 24h push failed", { error: String(err) }));
      notified24 += recipients.length;
    }

    await prisma.homework.update({
      where: { id: hw.id },
      data: { notifiedAt24h: true },
    });
  }

  logger.info("hausaufgaben-reminder cron done", { notified48, notified24 });
  return Response.json({ ok: true, notified48, notified24 });
}
