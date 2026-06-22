"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { getSession, isSuper } from "@/lib/session";

export async function updateSchool(id: string, formData: FormData) {
  const session = await getSession();
  if (!session || !isSuper(session)) redirect("/login");

  const bundeslandCode = (formData.get("bundeslandCode") as string | null)?.trim() || null;
  const name           = (formData.get("name") as string | null)?.trim();
  const city           = (formData.get("city") as string | null)?.trim() || null;
  const plan           = (formData.get("plan") as string | null)?.trim();
  const seats          = parseInt((formData.get("seats") as string | null) ?? "0", 10);

  await prisma.school.update({
    where: { id },
    data: {
      ...(name           ? { name }           : {}),
      ...(city !== undefined ? { city }        : {}),
      ...(bundeslandCode !== undefined ? { bundeslandCode } : {}),
      ...(plan           ? { plan }            : {}),
      ...(seats > 0      ? { seats }           : {}),
    },
  });

  redirect(`/plattform/schulen/${id}`);
}
