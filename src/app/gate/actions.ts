"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { GATE_COOKIE, gateToken } from "@/lib/gate";

const GATE_USER = "Admin";
const GATE_PASS = "Mm#9xP!2kRz$7Lv@Nd4Wc8Yb";

export async function loginGate(formData: FormData) {
  const username = formData.get("username")?.toString().trim() ?? "";
  const password = formData.get("password")?.toString() ?? "";
  const redirectTo = formData.get("redirect")?.toString() ?? "/";

  if (username !== GATE_USER || password !== GATE_PASS) {
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
