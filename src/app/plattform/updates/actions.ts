/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { setSetting, deleteSetting } from "@/lib/settings";
import { platformUpdateEmail, sendEmail, isEmailConfigured } from "@/lib/email";
import { auditLog } from "@/lib/audit";

async function requireSuper() {
  const session = await getSession();
  if (!session || effectiveRole(session) !== "super") redirect("/login");
  return session;
}

/** Veröffentlicht ein Update: In-App-Popup für alle + optional Mail an alle Nutzer. */
export async function publishUpdate(formData: FormData): Promise<void> {
  const session = await requireSuper();

  const title = String(formData.get("title") ?? "").trim().slice(0, 120);
  const body = String(formData.get("body") ?? "").trim().slice(0, 4000);
  const alsoEmail = formData.get("sendEmail") === "on";
  if (!title || !body) redirect("/plattform/updates?error=missing");

  const update = {
    id: randomBytes(8).toString("hex"),
    title,
    body,
    publishedAt: new Date().toISOString(),
  };
  await setSetting("PLATFORM_UPDATE", JSON.stringify(update), session.userId);

  let mailed = 0;
  if (alsoEmail && isEmailConfigured()) {
    // Alle echten Nutzer (Demo-Accounts haben keine erreichbaren Adressen).
    const users = await prisma.user.findMany({
      where: { email: { not: { endsWith: "@demo.local" } } },
      select: { email: true },
    });
    // In Blöcken senden, damit weder Resend-Rate-Limits noch die Action-Laufzeit reißen.
    const CHUNK = 20;
    for (let i = 0; i < users.length; i += CHUNK) {
      const results = await Promise.allSettled(
        users.slice(i, i + CHUNK).map((u) =>
          sendEmail(platformUpdateEmail({ email: u.email, title, body }))
        )
      );
      mailed += results.filter((r) => r.status === "fulfilled" && r.value.ok).length;
    }
  }

  await auditLog({
    action: "platform.update_published",
    actorId: session.userId,
    details: { updateId: update.id, title, mailed, email: alsoEmail },
  }).catch(() => undefined);

  revalidatePath("/plattform/updates");
  redirect(`/plattform/updates?ok=1&mailed=${mailed}`);
}

/** Nimmt das aktuelle Update zurück (Popup verschwindet für alle). */
export async function retractUpdate(): Promise<void> {
  const session = await requireSuper();
  await deleteSetting("PLATFORM_UPDATE");
  await auditLog({
    action: "platform.update_retracted",
    actorId: session.userId,
  }).catch(() => undefined);
  revalidatePath("/plattform/updates");
  redirect("/plattform/updates");
}
