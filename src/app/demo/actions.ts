/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { ROLE_HOME, setSession, type Role } from "@/lib/session";
import { rateLimit } from "@/lib/security/rate-limit";
import { verifyDemoLogin, listDemoAccounts } from "@/lib/demo";

export type DemoOpenResult =
  | { ok: true; accounts: { id: string; role: string; label: string }[] }
  | { ok: false; reason: "invalid" | "pending" | "expired" | "ratelimited"; date?: string };

/** Schritt 1: Name + Passwort prüfen, bei aktivem Zugang die Account-Liste zurückgeben. */
export async function openDemo(schoolName: string, password: string): Promise<DemoOpenResult> {
  const rl = await rateLimit({ scope: "demo-login", key: schoolName.trim().toLowerCase().slice(0, 60) || "x", limit: 8, windowSec: 300 });
  if (!rl.ok) return { ok: false, reason: "ratelimited" };

  const demo = await verifyDemoLogin(schoolName, password);
  if (!demo) return { ok: false, reason: "invalid" };
  if (demo.window.pending) {
    const d = new Date(demo.window.start);
    return { ok: false, reason: "pending", date: d.toLocaleDateString("de-DE", { day: "numeric", month: "long", year: "numeric" }) };
  }
  if (demo.window.expired) return { ok: false, reason: "expired" };

  const accounts = await listDemoAccounts(demo.demoSchoolId);
  return { ok: true, accounts };
}

/** Schritt 2: Als gewählter Demo-Account anmelden (Name+Passwort erneut prüfen). */
export async function loginDemoAccount(schoolName: string, password: string, userId: string): Promise<{ error: string } | void> {
  const demo = await verifyDemoLogin(schoolName, password);
  if (!demo || !demo.window.active) return { error: "Demo-Zugang ist nicht (mehr) aktiv." };

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, role: true, schoolId: true },
  });
  if (!user || user.schoolId !== demo.demoSchoolId || !user.email.endsWith("@demo.local")) {
    return { error: "Ungültiger Demo-Account." };
  }

  await setSession({ email: user.email, realRole: user.role as Role });
  redirect(ROLE_HOME[user.role as Role]);
}
