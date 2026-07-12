/* Copyright 2026 Elian Schock, Jonas Schwenk */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const BYPASS_TOKEN = process.env.MAINTENANCE_BYPASS_TOKEN ?? "";
const ALLOWED_EMAILS = (process.env.MAINTENANCE_ALLOWED_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export async function POST(req: NextRequest) {
  if (!BYPASS_TOKEN) {
    return NextResponse.json({ error: "Kein Bypass konfiguriert" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as { email?: unknown; password?: unknown };
  const { email, password } = body;
  if (
    typeof email !== "string" ||
    typeof password !== "string" ||
    !ALLOWED_EMAILS.includes(email.trim().toLowerCase()) ||
    password !== BYPASS_TOKEN
  ) {
    return NextResponse.json({ error: "Ungültige Zugangsdaten" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set("mm_maint_bypass", BYPASS_TOKEN, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24, // 24h
    secure: process.env.NODE_ENV === "production",
  });
  return res;
}
