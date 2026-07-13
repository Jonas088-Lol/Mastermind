/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSession, isSuper } from "@/lib/session";
import { auditLog } from "@/lib/audit";
import { createDemoAccess } from "@/lib/demo";

export type CreateDemoResult =
  | { ok: true; schoolName: string; password: string; activatesLabel: string }
  | { ok: false; error: string };

export async function createDemo(formData: FormData): Promise<CreateDemoResult> {
  const session = await getSession();
  if (!session || !isSuper(session)) redirect("/login");

  const schoolName = String(formData.get("schoolName") ?? "").trim().slice(0, 120);
  if (!schoolName) return { ok: false, error: "Bitte einen Schulnamen eingeben." };

  const dateStr = String(formData.get("activatesAt") ?? "").trim();
  let activatesAt = new Date();
  if (dateStr) {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return { ok: false, error: "Ungültiges Datum." };
    activatesAt = d;
  }

  let created: { id: string; password: string };
  try {
    created = await createDemoAccess(schoolName, activatesAt);
  } catch (e) {
    const msg = e instanceof Error && e.message.includes("Field-Encryption")
      ? "Verschlüsselung nicht konfiguriert (FIELD_ENCRYPTION_KEYS fehlt auf dem Server)."
      : "Demo-Zugang konnte nicht erstellt werden.";
    return { ok: false, error: msg };
  }
  const { id, password } = created;
  await auditLog({
    actorId: session.userId,
    action: "demo.create",
    details: { demoAccessId: id, schoolName },
  }).catch(() => undefined);

  revalidatePath("/plattform/aktive-demos");
  return {
    ok: true,
    schoolName,
    password,
    activatesLabel: activatesAt.toLocaleDateString("de-DE", { day: "numeric", month: "long", year: "numeric" }),
  };
}
