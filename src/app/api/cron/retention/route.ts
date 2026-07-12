/* Copyright 2026 Elian Schock, Jonas Schwenk */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { eraseUser } from "@/lib/privacy/data-subject";
import { auditLog } from "@/lib/audit";
import { logger } from "@/lib/logger";

// GET /api/cron/retention — Data-Retention (Art. 5 Abs. 1 lit. e DSGVO).
// Anonymisiert Konten, die seit RETENTION_MONTHS inaktiv sind. Konservativ:
// nur Schüler/Eltern, lange Frist, über den zentralen eraseUser-Dienst.
//
// ⚠ Die konkrete Aufbewahrungsfrist ist eine rechtliche/organisatorische
//   Entscheidung (DSB). Default 36 Monate; per ENV RETENTION_MONTHS anpassbar.
//   Solange RETENTION_DRY_RUN != "false" wird NUR protokolliert, nicht gelöscht.
export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) return new Response("Unauthorized", { status: 401 });

  const months = Number(process.env.RETENTION_MONTHS ?? "36");
  const dryRun = process.env.RETENTION_DRY_RUN !== "false"; // default: dry-run
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - months);

  // Kandidaten: lange inaktiv, kein Lehr-/Admin-Konto, noch nicht anonymisiert.
  const candidates = await prisma.user.findMany({
    where: {
      role: { in: ["student", "parent"] },
      email: { not: { endsWith: "@deleted.invalid" } },
      OR: [
        { lastSeenAt: { lt: cutoff } },
        { AND: [{ lastSeenAt: null }, { createdAt: { lt: cutoff } }] },
      ],
    },
    select: { id: true },
    take: 500, // Batch-Grenze pro Lauf
  });

  if (dryRun) {
    logger.info("retention: dry-run", { wouldErase: candidates.length, cutoffMonths: months });
    return NextResponse.json({ dryRun: true, wouldErase: candidates.length });
  }

  let erased = 0;
  for (const c of candidates) {
    try {
      await eraseUser(c.id);
      erased++;
    } catch (e) {
      logger.warn("retention: erase failed", { userId: c.id, error: String(e) });
    }
  }

  await auditLog({
    action: "data.deletion_request",
    details: { kind: "retention-job", erased, cutoffMonths: months },
  }).catch(() => undefined);

  logger.info("retention: done", { erased });
  return NextResponse.json({ dryRun: false, erased });
}
