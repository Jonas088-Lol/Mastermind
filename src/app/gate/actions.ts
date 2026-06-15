"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { GATE_COOKIE, gateToken } from "@/lib/gate";

export async function loginGate(formData: FormData) {
  const username = formData.get("username")?.toString().trim() ?? "";
  const password = formData.get("password")?.toString() ?? "";
  const redirectTo = formData.get("redirect")?.toString() ?? "/";

  const validUser = process.env.GATE_USER ?? "Admin";
  const validPass = process.env.GATE_PASS ?? "";

  if (!validPass || username !== validUser || password !== validPass) {
    const errorUrl = redirectTo !== "/" ? `/gate?error=1&redirect=${encodeURIComponent(redirectTo)}` : "/gate?error=1";
    redirect(errorUrl);
  }

  const jar = await cookies();
  jar.set(GATE_COOKIE, gateToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 Tage
  });

  // Sicherheitscheck: nur relative Pfade erlaubt
  const destination = redirectTo.startsWith("/") ? redirectTo : "/";
  redirect(destination);
}
