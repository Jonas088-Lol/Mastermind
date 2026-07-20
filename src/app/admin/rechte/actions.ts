/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { canManageSchool, canAccessArea } from "@/lib/school-admin";
import { CAPABILITIES, type PermissionOverrides } from "@/lib/permissions";

/**
 * Speichert die Rollenrechte der Schule.
 *
 * Es wird nur gespeichert, was vom Standard abweicht — so wirken künftige
 * neue Fähigkeiten automatisch mit ihrem Standardwert.
 */
export async function saveRolePermissions(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session || !canManageSchool(effectiveRole(session))) redirect("/login");
  if (!canAccessArea(effectiveRole(session), "rechte")) redirect("/admin");
  if (!session.schoolId) redirect("/admin");

  const overrides: PermissionOverrides = {};

  for (const cap of CAPABILITIES) {
    // Checkbox gesetzt = erlaubt. Nicht gesetzt = verboten.
    const enabled = formData.get(cap.id) === "on";
    if (enabled === cap.default) continue; // Standard → nicht speichern
    overrides[cap.role] ??= {};
    overrides[cap.role][cap.id] = enabled;
  }

  await prisma.school.update({
    where: { id: session.schoolId },
    data: { rolePermissions: JSON.stringify(overrides) },
  });

  revalidatePath("/admin/rechte");
  // Betroffene Ansichten neu aufbauen, damit gesperrte Bereiche verschwinden.
  revalidatePath("/app", "layout");
  revalidatePath("/teach", "layout");
  redirect("/admin/rechte");
}
