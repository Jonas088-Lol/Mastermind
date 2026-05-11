"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { setTaskDone } from "@/lib/db/store";
import { effectiveRole, getSession } from "@/lib/session";

export async function toggleTaskDone(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/login");
  const role = effectiveRole(session);
  if (role !== "student" && role !== "super") {
    throw new Error("Nur Schüler:innen können Aufgaben abhaken");
  }

  const taskId = String(formData.get("taskId") ?? "");
  const next = formData.get("next") === "1";
  if (!taskId) throw new Error("taskId fehlt");

  await setTaskDone(session.email, taskId, next);
  revalidatePath("/app/aufgaben");
  revalidatePath("/app");
}
