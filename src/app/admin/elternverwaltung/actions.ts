"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";

export async function linkParentToStudent(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session || effectiveRole(session) !== "admin") redirect("/login");

  const parentId = formData.get("parentId") as string;
  const studentId = formData.get("studentId") as string;
  if (!parentId || !studentId) return;

  await prisma.parentStudentLink.upsert({
    where: { parentId_studentId: { parentId, studentId } },
    create: { parentId, studentId },
    update: {},
  });
  revalidatePath("/admin/elternverwaltung");
}

export async function unlinkParentFromStudent(linkId: string): Promise<void> {
  const session = await getSession();
  if (!session || effectiveRole(session) !== "admin") redirect("/login");

  const link = await prisma.parentStudentLink.findUnique({ where: { id: linkId } });
  if (!link) return;
  // Verify same school
  const [parent] = await Promise.all([
    prisma.user.findUnique({ where: { id: link.parentId }, select: { schoolId: true } }),
  ]);
  const adminUser = await prisma.user.findUnique({ where: { id: session.userId }, select: { schoolId: true } });
  if (parent?.schoolId !== adminUser?.schoolId) return;

  await prisma.parentStudentLink.delete({ where: { id: linkId } });
  revalidatePath("/admin/elternverwaltung");
}
