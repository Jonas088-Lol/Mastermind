import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";

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
  // Optionaler Shared-Secret-Schutz
  const secret = process.env.RESEND_INBOUND_SECRET;
  if (secret) {
    const sig = req.headers.get("resend-signature") ?? req.headers.get("x-resend-signature");
    if (sig !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  let payload: ResendInboundPayload;
  try {
    payload = (await req.json()) as ResendInboundPayload;
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
      bodyHtml: html ?? null,
      messageId,
      inReplyTo,
      threadKey,
    },
  });

  return NextResponse.json({ ok: true });
}
