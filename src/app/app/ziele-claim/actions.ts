"use server";

import { revalidatePath } from "next/cache";
import { effectiveRole, getSession } from "@/lib/session";
import { claimDailyGoal, claimWeeklyGoal } from "@/lib/learning-goals";

export async function claimDaily(): Promise<void> {
  const session = await getSession();
  if (!session || effectiveRole(session) !== "student") return;

  await claimDailyGoal(session.userId);
  revalidatePath("/app");
}

export async function claimWeekly(): Promise<void> {
  const session = await getSession();
  if (!session || effectiveRole(session) !== "student") return;

  await claimWeeklyGoal(session.userId);
  revalidatePath("/app");
}
