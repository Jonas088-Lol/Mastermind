"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";

const VALID_PLANS = ["basic", "pro", "enterprise"] as const;
type Plan = (typeof VALID_PLANS)[number];

function isValidPlan(value: string): value is Plan {
  return (VALID_PLANS as readonly string[]).includes(value);
}

// Used via .bind(null, schoolId) as a form action — Next.js passes FormData as second arg.
export async function updateSchoolPlan(schoolId: string, formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session) redirect("/login");
  const role = effectiveRole(session);
  if (role !== "school_company" && role !== "super") redirect("/login");

  const plan = formData.get("plan");
  if (typeof plan !== "string" || !isValidPlan(plan)) return;

  await prisma.school.update({
    where: { id: schoolId },
    data: { plan },
  });

  revalidatePath("/schultraeger/lizenzen");
}
