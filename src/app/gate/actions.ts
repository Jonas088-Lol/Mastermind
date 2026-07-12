/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { GATE_COOKIE, checkGateCredentials, makeGateToken } from "@/lib/gate";

export async function loginGate(formData: FormData) {
  const username = formData.get("username")?.toString().trim() ?? "";
  const password = formData.get("password")?.toString() ?? "";
  const redirectTo = formData.get("redirect")?.toString() ?? "/";

  if (!checkGateCredentials(username, password)) {
    const errorUrl =
      redirectTo !== "/"
        ? `/gate?error=1&redirect=${encodeURIComponent(redirectTo)}`
        : "/gate?error=1";
    redirect(errorUrl);
  }

  const jar = await cookies();
  jar.set(GATE_COOKIE, await makeGateToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  // Nur schema-relative interne Pfade zulassen — "//evil.com" (protokoll-relativ)
  // und "/\evil.com" würden sonst als Open-Redirect nach extern führen.
  const destination =
    redirectTo.startsWith("/") && !redirectTo.startsWith("//") && !redirectTo.startsWith("/\\")
      ? redirectTo
      : "/";
  redirect(destination);
}
