/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { ROLE_HOME, effectiveRole, getSession } from "@/lib/session";
import { SsoClientSecret } from "@/lib/privacy/field-encryption";
import { canManageSchool, canAccessArea } from "@/lib/school-admin";

const ALLOWED_PROVIDERS = ["entra", "google"] as const;
type Provider = (typeof ALLOWED_PROVIDERS)[number];

export async function saveSsoConfig(provider: Provider, formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canManageSchool(effectiveRole(session))) redirect(ROLE_HOME[effectiveRole(session)]);
  if (!canAccessArea(effectiveRole(session), "integrationen")) redirect("/admin");
  if (!session.schoolId) return;

  const school = await prisma.school.findUnique({
    where: { id: session.schoolId },
    select: { plan: true },
  });
  if (school?.plan !== "enterprise") return;

  const clientId = (formData.get("clientId") as string | null)?.trim() ?? "";
  const clientSecret = (formData.get("clientSecret") as string | null)?.trim() ?? "";
  const tenantId = (formData.get("tenantId") as string | null)?.trim() || null;
  const enabled = formData.get("enabled") === "on";

  if (!clientId || !clientSecret) return;

  const encSecret = SsoClientSecret.encrypt(clientSecret)!;
  await prisma.ssoConfig.upsert({
    where: { schoolId_provider: { schoolId: session.schoolId, provider } },
    create: { schoolId: session.schoolId, provider, clientId, clientSecret: encSecret, tenantId, enabled },
    update: { clientId, tenantId, enabled, ...(clientSecret !== "••••••••" ? { clientSecret: encSecret } : {}) },
  });

  revalidatePath("/admin/integrationen");
  redirect("/admin/integrationen");
}

export async function deleteSsoConfig(provider: Provider): Promise<void> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canManageSchool(effectiveRole(session))) redirect(ROLE_HOME[effectiveRole(session)]);
  if (!session.schoolId) return;

  await prisma.ssoConfig.deleteMany({
    where: { schoolId: session.schoolId, provider },
  });

  revalidatePath("/admin/integrationen");
}
