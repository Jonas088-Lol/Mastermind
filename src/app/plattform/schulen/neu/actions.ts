"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { getSession, isSuper } from "@/lib/session";

export async function createSchool(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session || !isSuper(session)) redirect("/login");

  const name           = (formData.get("name") as string | null)?.trim() ?? "";
  const slug           = (formData.get("slug") as string | null)?.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-") ?? "";
  const city           = (formData.get("city") as string | null)?.trim() || null;
  const bundeslandCode = (formData.get("bundeslandCode") as string | null)?.trim() || null;
  const plan           = (formData.get("plan") as string | null) ?? "basic";
  const seats          = parseInt((formData.get("seats") as string | null) ?? "100", 10);

  if (!name || !slug) return;

  const exists = await prisma.school.findUnique({ where: { slug } });
  if (exists) {
    throw new Error(`Slug "${slug}" ist bereits vergeben.`);
  }

  await prisma.school.create({
    data: { name, slug, city, bundeslandCode, plan, seats: isNaN(seats) ? 100 : seats },
  });

  redirect("/plattform/schulen");
}
