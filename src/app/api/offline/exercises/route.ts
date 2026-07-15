/* Copyright 2026 Elian Schock, Jonas Schwenk */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { getSession } from "@/lib/session";

/**
 * Offline-Content-Export.
 *
 * Liefert alle Übungsinhalte (Fächer → Themen → Fragen) als JSON, damit sie in
 * die Flutter-App als gebündeltes Asset (`assets/exercises.json`) übernommen
 * werden können. So funktionieren Übungen später offline ohne Server.
 *
 * Nutzung beim App-Build:
 *   curl -H "Cookie: <session>" https://<host>/api/offline/exercises \
 *     -o flutter_app/assets/exercises.json
 *
 * KI, Uploads, Chat, Ranking sind bewusst NICHT enthalten — die bleiben online.
 */
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const topics = await prisma.exerciseTopic.findMany({
    orderBy: [{ subject: "asc" }, { grade: "asc" }, { order: "asc" }],
    select: {
      id: true,
      subject: true,
      grade: true,
      title: true,
      description: true,
      order: true,
      questions: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          type: true,
          question: true,
          options: true,
          correct: true,
          explanation: true,
          order: true,
        },
      },
    },
  });

  return NextResponse.json(
    {
      version: 1,
      generatedAt: new Date().toISOString(),
      topicCount: topics.length,
      topics,
    },
    {
      headers: {
        // Als Datei-Download / bündelbar; kurzes Caching serverseitig.
        "Cache-Control": "private, max-age=300",
      },
    },
  );
}
