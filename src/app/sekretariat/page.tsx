import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowRight, BookOpen, ClipboardList, Users } from "lucide-react";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";

export const metadata: Metadata = { title: "Sekretariat" };

export default async function SekretariatPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const role = effectiveRole(session);
  if (role !== "secretary" && role !== "rector" && role !== "vice_rector" && role !== "admin" && role !== "super") {
    redirect("/login");
  }

  const [classCount, studentCount, todayAbsences] = await Promise.all([
    prisma.schoolClass.count({ where: { schoolId: session.schoolId ?? "" } }),
    prisma.user.count({ where: { schoolId: session.schoolId ?? "", role: "student" } }),
    prisma.absence.count({
      where: {
        student: { schoolId: session.schoolId ?? "" },
        fromDate: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
          lte: new Date(new Date().setHours(23, 59, 59, 999)),
        },
      },
    }),
  ]);

  const tiles = [
    { href: "/sekretariat/klassen", label: "Klassenlisten", icon: BookOpen, value: classCount, suffix: "Klassen" },
    { href: "/sekretariat/schueler", label: "Schüler verwalten", icon: Users, value: studentCount, suffix: "Schüler" },
    { href: "/sekretariat/fehlzeiten", label: "Fehlzeiten heute", icon: ClipboardList, value: todayAbsences, suffix: "Einträge" },
  ];

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">Portal</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Sekretariat</h1>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        {tiles.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className="group flex flex-col gap-4 border border-border bg-bg p-6 transition-colors hover:border-brand hover:bg-brand/5"
          >
            <t.icon className="size-6 text-muted-fg" strokeWidth={1.5} />
            <div>
              <p className="font-mono text-3xl font-bold">{t.value}</p>
              <p className="mt-0.5 text-sm text-muted-fg">{t.suffix}</p>
            </div>
            <div className="flex items-center gap-1 text-xs font-medium text-muted-fg group-hover:text-brand">
              {t.label}
              <ArrowRight className="size-3.5" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
