/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use server";
import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { hashPassword } from "@/lib/auth/passwords";
import { effectiveRole, getSession } from "@/lib/session";
import { canManageSchool, canAccessArea } from "@/lib/school-admin";

type ImportRow = { name: string; email: string; klasse?: string; role: "student" | "teacher" };
type ImportResult = { created: number; skipped: number; errors: string[] };

export async function importUsers(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session || !canManageSchool(effectiveRole(session))) redirect("/login");
  if (!canAccessArea(effectiveRole(session), "import")) redirect("/admin");

  if (!session.schoolId) redirect("/admin");

  const csvRaw = String(formData.get("csv") ?? "");
  const defaultRole = (formData.get("role") === "teacher" ? "teacher" : "student") as "student" | "teacher";
  const schoolId = session.schoolId;

  const lines = csvRaw.split("\n").map(l => l.trim()).filter(Boolean);
  // Skip header if first line contains "name" or "email"
  const dataLines = lines[0]?.toLowerCase().includes("name") || lines[0]?.toLowerCase().includes("email")
    ? lines.slice(1) : lines;

  let created = 0; let skipped = 0; const errors: string[] = [];

  for (const line of dataLines) {
    const parts = line.split(/[,;]/).map(p => p.trim().replace(/^"|"$/g, ""));
    const [name, email, klasse] = parts;
    if (!name || !email || !email.includes("@")) { errors.push(`Ungültig: ${line}`); continue; }

    const existing = await prisma.user.findFirst({ where: { email } });
    if (existing) { skipped++; continue; }

    // Temporäres Passwort wie in admin/nutzer/neu — kein leerer Hash, sonst
    // ist Login unmöglich und kein Passwort-Reset-Flow greift.
    const tempPassword = randomBytes(8).toString("hex");
    const passwordHash = await hashPassword(tempPassword);

    await prisma.user.create({
      data: { name, email, role: defaultRole, schoolId, klasse: klasse || null, passwordHash },
    });
    created++;
  }

  revalidatePath("/admin/nutzer");
  // Store result in a simple way — use redirect with search params to show result
  redirect(`/admin/import?created=${created}&skipped=${skipped}&errors=${errors.length}`);
}
