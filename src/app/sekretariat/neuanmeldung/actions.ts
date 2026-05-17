"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";

export async function registerNewStudent(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session) redirect("/login");
  const role = effectiveRole(session);
  if (!["secretary", "rector", "vice_rector", "admin", "super"].includes(role)) redirect("/login");

  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const classId = (formData.get("classId") as string) || null;
  const klasse = (formData.get("klasse") as string) || null;
  const parentEmail = (formData.get("parentEmail") as string) || null;

  if (!name || !email) return;

  const schoolId = session.schoolId!;

  const student = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash: "",
      role: "student",
      schoolId,
      classId: classId || null,
      klasse: klasse || null,
    },
  });

  if (parentEmail) {
    const parent = await prisma.user.findFirst({
      where: { email: parentEmail, schoolId, role: "parent" },
    });
    if (parent) {
      await prisma.parentStudentLink.upsert({
        where: { parentId_studentId: { parentId: parent.id, studentId: student.id } },
        create: { parentId: parent.id, studentId: student.id },
        update: {},
      });
    }
  }

  revalidatePath("/sekretariat/schueler");
  redirect("/sekretariat/schueler");
}
