/* Copyright 2026 Elian Schock, Jonas Schwenk */
/**
 * Zwischenzustand zwischen Passwort-OK und 2FA-Code-Eingabe.
 *
 * Eigenes signiertes Cookie, separat vom normalen Session-Cookie. Das
 * Pending-Cookie ist single-use und nur 5 Minuten gültig.
 */

import { cookies } from "next/headers";
import { signSession, verifySession } from "@/lib/auth/cookies";

const COOKIE = "mm_pending_2fa";
const TTL_SEC = 5 * 60;

interface PendingPayload {
  userId: string;
  email: string;
  exp: number; // epoch seconds
}

export async function setPending2FA(input: {
  userId: string;
  email: string;
}): Promise<void> {
  const store = await cookies();
  const exp = Math.floor(Date.now() / 1000) + TTL_SEC;
  store.set(
    COOKIE,
    signSession<PendingPayload>({
      userId: input.userId,
      email: input.email,
      exp,
    }),
    {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: TTL_SEC,
      secure: process.env.NODE_ENV === "production",
    }
  );
}

export async function getPending2FA(): Promise<{
  userId: string;
  email: string;
} | null> {
  const store = await cookies();
  const value = store.get(COOKIE)?.value;
  const parsed = verifySession<PendingPayload>(value);
  if (!parsed) return null;
  if (parsed.exp < Math.floor(Date.now() / 1000)) return null;
  if (typeof parsed.userId !== "string" || typeof parsed.email !== "string") {
    return null;
  }
  return { userId: parsed.userId, email: parsed.email };
}

export async function clearPending2FA(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE);
}
