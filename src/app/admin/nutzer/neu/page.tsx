/* Copyright 2026 Elian Schock, Jonas Schwenk */
import { randomBytes } from "node:crypto";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { hashPassword } from "@/lib/auth/passwords";
import { STUDENT_FEATURES, serializeStudentFeatures } from "@/lib/student-features";
import { canManageSchool } from "@/lib/school-admin";

export const metadata: Metadata = { title: "Nutzer einladen" };

async function inviteUser(formData: FormData) {
  "use server";
  const session = await getSession();
  if (!session) redirect("/login");
  const role = effectiveRole(session);
  if (role !== "admin" && role !== "super") redirect("/");

  const name = (formData.get("name") as string | null)?.trim() ?? "";
  const email = (formData.get("email") as string | null)?.trim().toLowerCase() ?? "";
  const userRole = (formData.get("role") as string | null) ?? "student";
  const klasse = (formData.get("klasse") as string | null)?.trim() || null;
  // Zusatzrollen (mehrfach kombinierbar) — nur für Schüler-Accounts relevant
  const features = userRole === "student"
    ? serializeStudentFeatures(formData.getAll("features").map(String))
    : null;

  if (!name || !email) return;

  const tempPassword = randomBytes(8).toString("hex");
  const passwordHash = await hashPassword(tempPassword);

  await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role: userRole,
      klasse,
      studentFeatures: features,
      schoolId: session.schoolId ?? null,
    },
  });

  revalidatePath("/admin/nutzer");
  redirect("/admin/nutzer");
}

export default async function NutzerNeuPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canManageSchool(effectiveRole(session)) && effectiveRole(session) !== "super") {
    redirect("/");
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link
          href="/admin"
          className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-fg transition-colors hover:text-fg"
        >
          <ArrowLeft className="size-3.5" />
          Zurück zum Admin
        </Link>
      </div>

      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">
          Nutzerverwaltung
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">
          Nutzer einladen
        </h1>
        <p className="mt-1 text-sm text-muted-fg">
          Ein temporäres Passwort wird automatisch generiert. Der Nutzer kann es
          nach dem ersten Login ändern.
        </p>
      </header>

      <form action={inviteUser} className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <label
            htmlFor="name"
            className="text-[10px] font-semibold uppercase tracking-wider text-muted-fg"
          >
            Name *
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            placeholder="z. B. Lukas Meier"
            className="border border-border bg-bg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label
            htmlFor="email"
            className="text-[10px] font-semibold uppercase tracking-wider text-muted-fg"
          >
            E-Mail-Adresse *
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            placeholder="lukas@schule.de"
            className="border border-border bg-bg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label
            htmlFor="role"
            className="text-[10px] font-semibold uppercase tracking-wider text-muted-fg"
          >
            Rolle *
          </label>
          <select
            id="role"
            name="role"
            required
            className="border border-border bg-bg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
          >
            <option value="student">Schüler</option>
            <option value="teacher">Lehrer</option>
            <option value="parent">Elternteil</option>
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-fg">
            Zusatzrollen (nur für Schüler, mehrere möglich)
          </span>
          <div className="flex flex-col gap-2 rounded-xl border border-border bg-bg p-3">
            {STUDENT_FEATURES.map((f) => (
              <label key={f.key} className="flex cursor-pointer items-start gap-2.5 text-sm">
                <input type="checkbox" name="features" value={f.key} className="mt-0.5 size-4 accent-brand" />
                <span>
                  <span className="font-semibold">{f.icon} {f.label}</span>
                  <span className="block text-xs text-muted-fg">{f.description}</span>
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label
            htmlFor="klasse"
            className="text-[10px] font-semibold uppercase tracking-wider text-muted-fg"
          >
            Klasse (optional)
          </label>
          <input
            id="klasse"
            name="klasse"
            type="text"
            placeholder="z. B. 9b"
            className="border border-border bg-bg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            className="border border-transparent bg-fg px-5 py-2.5 text-sm font-semibold text-bg transition-colors hover:bg-fg/90"
          >
            Nutzer anlegen
          </button>
          <Link
            href="/admin"
            className="px-5 py-2.5 text-sm font-medium text-muted-fg transition-colors hover:text-fg"
          >
            Abbrechen
          </Link>
        </div>
      </form>
    </div>
  );
}
