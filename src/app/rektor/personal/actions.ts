"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";

export async function updateStaffRole(userId: string, newRole: string): Promise<void> {
  const session = await getSession();
  if (!session) redirect("/login");
  const role = effectiveRole(session);
  if (!["rector", "vice_rector", "admin", "super"].includes(role)) redirect("/login");

  // Valid roles for school staff
  const validRoles = ["teacher", "admin", "secretary", "rector", "vice_rector"];
  if (!validRoles.includes(newRole)) return;

  await prisma.user.updateMany({
    where: { id: userId, schoolId: session.schoolId ?? "" },
    data: { role: newRole },
  });
  revalidatePath("/rektor/personal");
}
