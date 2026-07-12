/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { MAIL_COOKIE, getMailCredentials, mailToken } from "@/lib/mail-session";

export async function loginMail(formData: FormData): Promise<void> {
  const username = formData.get("username")?.toString().trim() ?? "";
  const password = formData.get("password")?.toString() ?? "";
  const redirectTo = formData.get("redirect")?.toString() ?? "/mails";

  const { user, pass } = getMailCredentials();

  if (username !== user || password !== pass) {
    const dest = `/mails/login?error=1${redirectTo !== "/mails" ? `&redirect=${encodeURIComponent(redirectTo)}` : ""}`;
    redirect(dest);
  }

  const jar = await cookies();
  jar.set(MAIL_COOKIE, mailToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  const destination = redirectTo.startsWith("/mails") ? redirectTo : "/mails";
  redirect(destination);
}
