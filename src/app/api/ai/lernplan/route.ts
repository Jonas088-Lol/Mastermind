import { NextResponse } from "next/server";
import { effectiveRole, getSession } from "@/lib/session";
import { chatStream, isAiConfigured } from "@/lib/ai";
import { prisma } from "@/lib/db/client";
import { ipFromHeaders, rateLimit } from "@/lib/security/rate-limit";
import { incrementAiQuota } from "@/lib/db/store";

export const runtime = "nodejs";

const SYSTEM_PROMPT = `Du bist MasterMind-Lernplaner für deutsche Schüler:innen.

Aufgabe: Erstelle einen strukturierten Wochenlernplan als JSON-Objekt.

Ausgabeformat (IMMER nur valides JSON zurückgeben, keine Erklärungen davor/danach):
{
  "week": "KW XX – TT.MM. bis TT.MM.YYYY",
  "priorities": [
    { "subject": "Mathematik", "reason": "Note 4.2 – Hauptfokus diese Woche", "urgency": "hoch" }
  ],
  "dailyPlan": {
    "Montag":    [{ "subject": "...", "task": "...", "durationMin": 30 }],
    "Dienstag":  [...],
    "Mittwoch":  [...],
    "Donnerstag":[...],
    "Freitag":   [...]
  },
  "tips": ["Pomodoro-Methode empfohlen: 25 min lernen, 5 min Pause.", "..."],
  "estimatedHoursPerDay": 1.5
}

Regeln:
- Fächer mit schlechtesten Noten zuerst einplanen.
- Fällige Aufgaben priorisieren (früher fällig = dringlicher).
- Max. 2h Lernzeit pro Tag für Schüler:innen unter 16.
- Lernzeiten auf realistische Slots aufteilen (nicht alles auf einen Tag).
- "task" soll konkret sein: "Textaufgaben Kapitel 4, Übung 3-7" statt "Mathe lernen".
- Antwort MUSS valides JSON sein.`;

async function buildContext(userId: string): Promise<string> {
  const now = new Date();
  const in14days = new Date(now.getTime() + 14 * 86_400_000);

  const [grades, assignments, user] = await Promise.all([
    prisma.grade.findMany({
      where: { studentId: userId },
      include: { subject: { select: { name: true } } },
      orderBy: { date: "desc" },
      take: 50,
    }),
    prisma.assignment.findMany({
      where: {
        class: { students: { some: { id: userId } } },
        dueAt: { gte: now, lte: in14days },
      },
      include: {
        subject: { select: { name: true } },
        submissions: { where: { studentId: userId }, select: { status: true } },
      },
      orderBy: { dueAt: "asc" },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    }),
  ]);

  // Average grades per subject (lower = worse in German system)
  const bySubject = new Map<string, number[]>();
  for (const g of grades) {
    const n = g.subject.name;
    if (!bySubject.has(n)) bySubject.set(n, []);
    bySubject.get(n)!.push(g.value);
  }
  const subjectAvgs = Array.from(bySubject.entries())
    .map(([name, vals]) => ({
      name,
      avg: vals.reduce((a, b) => a + b, 0) / vals.length,
    }))
    .sort((a, b) => b.avg - a.avg); // worst first

  const today = now.toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" });
  const lines: string[] = [`Heute: ${today}`, `Schüler: ${user?.name ?? "Unbekannt"}`];

  if (subjectAvgs.length > 0) {
    lines.push("\nNotenübersicht (Durchschnitt, aufsteigend = besser):");
    for (const s of subjectAvgs) {
      lines.push(`- ${s.name}: Ø ${s.avg.toFixed(1)}`);
    }
  }

  const openAssignments = assignments.filter(
    (a) => !a.submissions.some((s) => s.status === "submitted" || s.status === "graded")
  );
  if (openAssignments.length > 0) {
    lines.push("\nOffene Aufgaben (nächste 14 Tage):");
    for (const a of openAssignments) {
      const due = a.dueAt.toLocaleDateString("de-DE", {
        weekday: "long",
        day: "numeric",
        month: "short",
      });
      lines.push(`- ${a.subject.name}: "${a.title}" — fällig ${due}`);
    }
  } else {
    lines.push("\nKeine offenen Aufgaben in den nächsten 14 Tagen.");
  }

  return lines.join("\n");
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }
  const role = effectiveRole(session);
  if (role !== "student" && role !== "super") {
    return NextResponse.json({ error: "Nur für Schüler" }, { status: 403 });
  }

  const userLimit = await rateLimit({
    scope: "ai-lernplan:user",
    key: session.userId,
    limit: 5,
    windowSec: 3600,
  });
  if (!userLimit.ok) {
    return NextResponse.json(
      { error: "Lernplan kann nur 5× pro Stunde neu generiert werden." },
      { status: 429, headers: { "Retry-After": String(userLimit.retryAfterSec) } }
    );
  }

  const ipLimit = await rateLimit({
    scope: "ai-lernplan:ip",
    key: ipFromHeaders(req.headers),
    limit: 20,
    windowSec: 3600,
  });
  if (!ipLimit.ok) {
    return NextResponse.json(
      { error: "IP-Rate-Limit erreicht." },
      { status: 429, headers: { "Retry-After": String(ipLimit.retryAfterSec) } }
    );
  }

  // Persistente KI-Quota (Anthropic-Kostenschutz), wie bei /api/ai/tutor.
  const quota = await incrementAiQuota(session.email);
  if (quota.exceeded) {
    return NextResponse.json(
      { error: "KI-Kontingent erreicht", used: quota.used, limit: quota.limit },
      { status: 429 }
    );
  }

  const context = await buildContext(session.userId);

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        controller.enqueue(
          encoder.encode(
            `event: meta\ndata: ${JSON.stringify({ configured: isAiConfigured() })}\n\n`
          )
        );

        for await (const chunk of chatStream({
          system: SYSTEM_PROMPT,
          messages: [{ role: "user", content: context }],
          maxTokens: 4096,
        })) {
          controller.enqueue(
            encoder.encode(`event: token\ndata: ${JSON.stringify(chunk)}\n\n`)
          );
        }

        controller.enqueue(encoder.encode(`event: done\ndata: {}\n\n`));
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unbekannter Fehler";
        controller.enqueue(
          encoder.encode(`event: error\ndata: ${JSON.stringify({ message })}\n\n`)
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
