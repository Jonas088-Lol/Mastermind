/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { effectiveRole, getSession } from "@/lib/session";
import { saveWorkspaceMode, type WorkspaceMode } from "@/lib/workspace-prefs";

/** Schaltet zwischen „alles an einem Ort" und „getrennte Reiter" um. */
export async function setWorkspaceMode(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "teacher") redirect("/");

  const raw = String(formData.get("mode") ?? "");
  if (raw !== "unified" && raw !== "separate") return;

  await saveWorkspaceMode(session.userId, raw as WorkspaceMode);

  // Die Navigation hängt am Modus — Layout mit neu rendern.
  revalidatePath("/teach", "layout");
}
