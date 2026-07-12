/* Copyright 2026 Elian Schock, Jonas Schwenk */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      klasse: true,
      createdAt: true,
      verifiedAt: true,
      studentGrades: {
        select: {
          value: true,
          type: true,
          weight: true,
          comment: true,
          date: true,
          subject: { select: { name: true } },
          teacher: { select: { name: true } },
        },
        orderBy: { date: "desc" },
      },
      studentSubmissions: {
        select: {
          content: true,
          status: true,
          submittedAt: true,
          assignment: { select: { title: true, dueAt: true } },
        },
        orderBy: { submittedAt: "desc" },
      },
      sentMessages: {
        select: { content: true, sentAt: true },
        orderBy: { sentAt: "desc" },
        take: 500,
      },
      xpLogs: {
        select: { amount: true, reason: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!user) return NextResponse.json({ error: "Nutzer nicht gefunden" }, { status: 404 });

  const payload = {
    exportedAt: new Date().toISOString(),
    profil: {
      id: user.id,
      name: user.name,
      email: user.email,
      rolle: user.role,
      klasse: user.klasse,
      registriertAm: user.createdAt.toISOString(),
      verifiziert: user.verifiedAt?.toISOString() ?? null,
    },
    noten: user.studentGrades.map((g) => ({
      fach: g.subject.name,
      note: g.value,
      typ: g.type,
      gewichtung: g.weight,
      kommentar: g.comment,
      lehrer: g.teacher.name,
      datum: g.date.toISOString(),
    })),
    abgaben: user.studentSubmissions.map((s) => ({
      aufgabe: s.assignment.title,
      faellig: s.assignment.dueAt.toISOString(),
      status: s.status,
      abgegebenAm: s.submittedAt?.toISOString() ?? null,
      inhalt: s.content,
    })),
    nachrichten: user.sentMessages.map((m) => ({
      inhalt: m.content,
      gesendetAm: m.sentAt.toISOString(),
    })),
    xpLog: user.xpLogs.map((x) => ({
      betrag: x.amount,
      grund: x.reason,
      datum: x.createdAt.toISOString(),
    })),
  };

  const date = new Date().toISOString().slice(0, 10);
  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="meine-daten-${date}.json"`,
    },
  });
}
