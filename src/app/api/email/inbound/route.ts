import { createHmac, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { sanitizeHtml } from "@/lib/security/sanitize-html";

// Timing-sicherer Vergleich zweier Strings
function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

// Resend sendet POST an diesen Endpunkt wenn eine E-Mail eingeht.
// Docs: https://resend.com/docs/dashboard/emails/inbound
//
// Einrichtung in Resend:
//   1. Domain verifizieren
//   2. Inbound-Route anlegen: MX-Record → resend.com, Webhook → /api/email/inbound
//   3. RESEND_INBOUND_SECRET als Shared Secret konfigurieren (optional, empfohlen)

interface ResendInboundPayload {
  from: string;
  to: string[];
  subject?: string;
  text?: string;
  html?: string;
  headers?: Record<string, string>;
  spf?: { status: string };
}

function extractName(address: string): { name: string | null; email: string } {
  // "Max Mustermann <max@schule.de>"  oder  "max@schule.de"
  const match = address.match(/^"?([^"<]+?)"?\s*<([^>]+)>$/);
  if (match) return { name: match[1].trim(), email: match[2].trim().toLowerCase() };
  return { name: null, email: address.trim().toLowerCase() };
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Shared-Secret ist PFLICHT. Ohne Konfiguration wird der Endpunkt geschlossen,
  // damit niemand anonym gefälschte Mails in Schul-Postfächer injizieren kann.
  const secret = process.env.RESEND_INBOUND_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Inbound not configured" }, { status: 503 });
  }

  // Raw-Body lesen (für HMAC-Verifikation nötig, bevor wir JSON parsen)
  const rawBody = await req.text();

  const provided =
    req.headers.get("x-inbound-signature") ??
    req.headers.get("resend-signature") ??
    req.headers.get("x-resend-signature") ??
    "";

  // Zwei akzeptierte Formen:
  //  (a) HMAC-SHA256 über den Raw-Body, hex — empfohlen
  //  (b) direktes Shared-Secret im Header — Fallback für einfache Setups
  const expectedHmac = createHmac("sha256", secret).update(rawBody).digest("hex");
  const authorized = safeEqual(provided, expectedHmac) || safeEqual(provided, secret);
  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: ResendInboundPayload;
  try {
    payload = JSON.parse(rawBody) as ResendInboundPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { from, to, subject, text, html, headers } = payload;
  if (!from || !to?.length) {
    return NextResponse.json({ error: "Missing from/to" }, { status: 400 });
  }

  const { name: fromName, email: fromAddress } = extractName(from);
  const toAddress = extractName(to[0]).email;

  // Schule anhand der Empfänger-Adresse ermitteln
  const school = await prisma.school.findFirst({
    where: { mailboxAddress: toAddress },
    select: { id: true },
  });

  if (!school) {
    // Keine Schule konfiguriert → still ignorieren
    return NextResponse.json({ ok: true });
  }

  const messageId = headers?.["message-id"] ?? null;
  const inReplyTo = headers?.["in-reply-to"] ?? null;

  // threadKey: erste Message-ID im Thread (in-reply-to, falls vorhanden, sonst eigene)
  let threadKey: string | null = inReplyTo ?? messageId ?? null;
  if (inReplyTo) {
    // Existierenden Thread-Schlüssel aus der referenzierten Mail übernehmen
    const parent = await prisma.mailboxEmail.findFirst({
      where: { schoolId: school.id, messageId: inReplyTo },
      select: { threadKey: true },
    });
    if (parent?.threadKey) threadKey = parent.threadKey;
  }

  await prisma.mailboxEmail.create({
    data: {
      schoolId: school.id,
      direction: "inbound",
      fromAddress,
      fromName,
      toAddress,
      subject: subject ?? "(kein Betreff)",
      bodyText: text ?? "",
      // HTML bereits beim Speichern säubern (Defense-in-Depth; die Render-Seiten
      // sanitizen zusätzlich). Verhindert Stored XSS aus eingehenden Mails.
      bodyHtml: html ? sanitizeHtml(html) : null,
      messageId,
      inReplyTo,
      threadKey,
    },
  });

  return NextResponse.json({ ok: true });
}
