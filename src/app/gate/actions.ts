"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { GATE_COOKIE, GATE_USER, GATE_PASS, makeGateToken } from "@/lib/gate";

export async function loginGate(formData: FormData) {
  const username = formData.get("username")?.toString().trim() ?? "";
  const password = formData.get("password")?.toString() ?? "";
  const redirectTo = formData.get("redirect")?.toString() ?? "/";

  if (username !== GATE_USER || password !== GATE_PASS) {
    const errorUrl =
      redirectTo !== "/"
        ? `/gate?error=1&redirect=${encodeURIComponent(redirectTo)}`
        : "/gate?error=1";
    redirect(errorUrl);
  }

  const jar = await cookies();
  jar.set(GATE_COOKIE, makeGateToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  const destination = redirectTo.startsWith("/") ? redirectTo : "/";
  redirect(destination);
}
