import { NextResponse } from "next/server";
import { effectiveRole, getSession } from "@/lib/session";
import { chatStream, isAiConfigured } from "@/lib/ai";
import { incrementAiQuota } from "@/lib/db/store";
import { ipFromHeaders, rateLimit } from "@/lib/security/rate-limit";

export const runtime = "nodejs";

const SYSTEM_PROMPT = `Du bist der MasterMind-KI-Tutor für Schüler:innen an deutschen Schulen.

Stil:
- Erklärst Schritt für Schritt, gibst nie die Lösung sofort weg.
- Verwendest klare, jugendgerechte Sprache. Keine Floskeln.
- Stellst gezielte Rückfragen, wenn die Aufgabe unklar ist.
- Nutzt Beispiele aus dem deutschen Lehrplan (BY/NRW/BW Sek I).

Sicherheit:
- Bewertest niemals Mitschüler:innen.
- Erkennst sensible Themen (Mobbing, Selbstgefährdung) und verweist auf eine Lehrkraft oder die Nummer 116 111.
- Lieferst keine fertige Klassenarbeit, sondern hilft beim Verstehen.

Format:
- Wenn der Schüler eine Schritt-für-Schritt-Erklärung braucht: nummerierte Liste.
- Mathematik: kurz, sauber, mit Zwischenschritten.
- Schließe oft mit einer kurzen Lernfrage zum Selbsttest.`;

interface ChatRequest {
  messages: { role: "user" | "assistant"; content: string }[];
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

  // Rate-Limit pro User: 30 Anfragen/Minute. IP als zweiter Bucket gegen
  // Bot-Hammering von einer einzelnen Adresse.
  const userLimit = await rateLimit({
    scope: "ai-tutor:user",
    key: session.email,
    limit: 30,
    windowSec: 60,
  });
  if (!userLimit.ok) {
    return NextResponse.json(
      { error: "Zu viele Anfragen — kurz warten." },
      {
        status: 429,
        headers: { "Retry-After": String(userLimit.retryAfterSec) },
      }
    );
  }
  const ipLimit = await rateLimit({
    scope: "ai-tutor:ip",
    key: ipFromHeaders(req.headers),
    limit: 60,
    windowSec: 60,
  });
  if (!ipLimit.ok) {
    return NextResponse.json(
      { error: "IP-Rate-Limit erreicht." },
      {
        status: 429,
        headers: { "Retry-After": String(ipLimit.retryAfterSec) },
      }
    );
  }

  let body: ChatRequest;
  try {
    body = (await req.json()) as ChatRequest;
  } catch {
    return NextResponse.json({ error: "Ungültiges JSON" }, { status: 400 });
  }

  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return NextResponse.json(
      { error: "messages-Array fehlt" },
      { status: 400 }
    );
  }

  const lastUser = body.messages[body.messages.length - 1];
  if (lastUser.role !== "user" || typeof lastUser.content !== "string") {
    return NextResponse.json(
      { error: "Letzte Nachricht muss vom User sein" },
      { status: 400 }
    );
  }
  if (lastUser.content.length > 8000) {
    return NextResponse.json(
      { error: "Anfrage zu lang (max 8000 Zeichen)" },
      { status: 413 }
    );
  }

  // Quota tracking — Mock-API soll die Quota auch bewegen, damit die UI realistisch bleibt
  const quota = await incrementAiQuota(session.email);
  if (quota.exceeded) {
    return NextResponse.json(
      {
        error: "KI-Wochenkontingent erreicht",
        used: quota.used,
        limit: quota.limit,
      },
      { status: 429 }
    );
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        // Send the meta event so the client can show quota immediately
        controller.enqueue(
          encoder.encode(
            `event: meta\ndata: ${JSON.stringify({
              quota,
              configured: isAiConfigured(),
            })}\n\n`
          )
        );

        for await (const chunk of chatStream({
          system: SYSTEM_PROMPT,
          messages: body.messages.slice(-12),
        })) {
          controller.enqueue(
            encoder.encode(
              `event: token\ndata: ${JSON.stringify(chunk)}\n\n`
            )
          );
        }
        controller.enqueue(encoder.encode(`event: done\ndata: {}\n\n`));
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Unbekannter Fehler";
        controller.enqueue(
          encoder.encode(
            `event: error\ndata: ${JSON.stringify({ message })}\n\n`
          )
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
