import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

// GET — fetch own consent status
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const consent = await prisma.userConsent.findUnique({
    where: { userId: session.userId },
  });

  return NextResponse.json({ consent });
}

// POST — save consent decision (grant or revoke)
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { activityTracking, revoke } = body as {
    activityTracking?: boolean;
    revoke?: boolean;
  };

  if (revoke) {
    await prisma.userConsent.upsert({
      where: { userId: session.userId },
      update: {
        activityTracking: false,
        revokedAt: new Date(),
        consentedAt: null,
      },
      create: {
        userId: session.userId,
        activityTracking: false,
        revokedAt: new Date(),
      },
    });
    // Delete all stored activity data on revoke
    await prisma.activitySession.deleteMany({ where: { userId: session.userId } });
    return NextResponse.json({ ok: true, revoked: true });
  }

  // Grant consent
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    null;

  await prisma.userConsent.upsert({
    where: { userId: session.userId },
    update: {
      activityTracking: activityTracking ?? false,
      consentedAt: new Date(),
      revokedAt: null,
      version: "1.0",
      ipAddress: ip,
    },
    create: {
      userId: session.userId,
      activityTracking: activityTracking ?? false,
      consentedAt: new Date(),
      version: "1.0",
      ipAddress: ip,
    },
  });

  return NextResponse.json({ ok: true });
}
