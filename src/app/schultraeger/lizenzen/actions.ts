"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { getEnabledDlcs, setEnabledDlcs } from "@/lib/features";

const VALID_PLANS = ["basic", "pro", "enterprise"] as const;
type Plan = (typeof VALID_PLANS)[number];

function isValidPlan(value: string): value is Plan {
  return (VALID_PLANS as readonly string[]).includes(value);
}

async function requireSchultraeger() {
  const session = await getSession();
  if (!session) redirect("/login");
  const role = effectiveRole(session);
  if (role !== "school_company" && role !== "super") redirect("/login");
  return session;
}

export async function updateSchoolPlan(schoolId: string, formData: FormData): Promise<void> {
  await requireSchultraeger();
  const plan = formData.get("plan");
  if (typeof plan !== "string" || !isValidPlan(plan)) return;
  await prisma.school.update({ where: { id: schoolId }, data: { plan } });
  revalidatePath("/schultraeger/lizenzen");
}

export async function toggleDlc(schoolId: string, formData: FormData): Promise<void> {
  await requireSchultraeger();
  const featureId = formData.get("featureId") as string;
  const enabled = formData.get("enabled") === "true";
  if (!featureId) return;

  const school = await prisma.school.findUnique({ where: { id: schoolId }, select: { featureSettings: true } });
  if (!school) return;

  const current = getEnabledDlcs(school.featureSettings);
  const updated = enabled
    ? Array.from(new Set([...current, featureId]))
    : current.filter((id) => id !== featureId);

  await prisma.school.update({
    where: { id: schoolId },
    data: { featureSettings: setEnabledDlcs(school.featureSettings, updated) },
  });

  revalidatePath("/schultraeger/lizenzen");
}
