/* Copyright 2026 Elian Schock, Jonas Schwenk */
import { prisma } from "@/lib/db/client";
import { Prisma } from "@prisma/client";

/**
 * Setzt den RLS-Kontext (User/Schule/Rolle) für eine Transaktion und führt
 * darin die übergebene Arbeit aus. Nur damit greifen die Policies aus
 * `db/rls-policies.sql`.
 *
 * Nutzung (sobald RLS aktiviert ist):
 *   const grades = await withRlsContext(
 *     { userId, schoolId, role },
 *     (tx) => tx.grade.findMany({ where: { studentId: userId } })
 *   );
 *
 * `set_config(..., true)` bindet die Werte an die Transaktion (is_local),
 * sodass sie den Connection-Pool nicht "verschmutzen".
 *
 * Solange RLS in der DB NICHT aktiviert ist, verhält sich das wie eine normale
 * Transaktion — die set_config-Aufrufe sind dann folgenlos. Der Code ist damit
 * schon jetzt einsetzbar und aktiviert sich, sobald die Policies scharf sind.
 */
export async function withRlsContext<T>(
  ctx: { userId: string; schoolId?: string | null; role: string },
  work: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.user_id', ${ctx.userId}, true)`;
    await tx.$executeRaw`SELECT set_config('app.school_id', ${ctx.schoolId ?? ""}, true)`;
    await tx.$executeRaw`SELECT set_config('app.role', ${ctx.role}, true)`;
    return work(tx);
  });
}
