/* Copyright 2026 Elian Schock, Jonas Schwenk */
import { prisma } from "@/lib/db/client";
import { headers } from "next/headers";

export type AuditAction =
  | "user.role_changed"
  | "user.deleted"
  | "user.2fa_reset"
  | "user.password_reset"
  | "user.invite_sent"
  | "session.impersonation_start"
  | "session.impersonation_end"
  | "api_token.created"
  | "api_token.revoked"
  | "school.settings_changed"
  | "exam.tab_switch"
  | "data.export"
  | "data.deletion_request";

export async function auditLog(opts: {
  action: AuditAction;
  actorId?: string;
  targetId?: string;
  schoolId?: string;
  details?: Record<string, unknown>;
  ip?: string;
}): Promise<void> {
  try {
    let ip = opts.ip;
    if (!ip) {
      try {
        const hdrs = await headers();
        ip = hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? hdrs.get("x-real-ip") ?? undefined;
      } catch {
        // headers() not available outside request context
      }
    }
    await prisma.auditLog.create({
      data: {
        action: opts.action,
        actorId: opts.actorId,
        targetId: opts.targetId,
        schoolId: opts.schoolId,
        details: opts.details ? JSON.stringify(opts.details) : null,
        ip: ip ?? null,
      },
    });
  } catch {
    // Audit log failures must never crash the main operation
  }
}
