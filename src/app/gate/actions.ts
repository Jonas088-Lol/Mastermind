"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { GATE_COOKIE, gateToken } from "@/lib/gate";

const GATE_USER = "Admin";
const GATE_PASS = "Mm#9xP!2kRz$7Lv@Nd4Wc8Yb";

export async function loginGate(formData: FormData) {
  const username = formData.get("username")?.toString().trim() ?? "";
  const password = formData.get("password")?.toString() ?? "";

  if (username !== GATE_USER || password !== GATE_PASS) {
    redirect("/gate?error=1");
  }

  const jar = await cookies();
  jar.set(GATE_COOKIE, gateToken(), {
    httpOnly: false, // JS needs to clear it on beforeunload (reload → gate)
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    // Session cookie — also cleared by GateClearer on every page reload
  });

  redirect("/");
}
