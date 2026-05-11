import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Award, BookOpen, Users } from "lucide-react";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";

export const metadata: Metadata = { title: "Schulleitung" };

export default async function RektorPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const role = effectiveRole(session);
  if (role !== "rector" && role !== "vice_rector" && role !== "admin" && role !== "super") {
    redirect("/login");
  }

  const [
    studentCount,
    teacherCount,
    classCount,
    avgGrade,
    absenceCountThisMonth,
  ] = await Promise.all([
    prisma.user.count({ where: { schoolId: session.schoolId ?? "", role: "student" } }),
    prisma.user.count({ where: { schoolId: session.schoolId ?? "", role: "teacher" } }),
    prisma.schoolClass.count({ where: { schoolId: session.schoolId ?? "" } }),
    prisma.grade.aggregate({
      where: { student: { schoolId: session.schoolId ?? "" } },
      _avg: { value: true },
    }),
    prisma.absence.count({
      where: {
        student: { schoolId: session.schoolId ?? "" },
        fromDate: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
      },
    }),
  ]);

  const stats = [
    { label: "Schüler", value: studentCount, icon: Users, suffix: "" },
    { label: "Lehrkräfte", value: teacherCount, icon: BookOpen, suffix: "" },
    { label: "Klassen", value: classCount, icon: BookOpen, suffix: "" },
    {
      label: "Ø Note",
      value: avgGrade._avg.value ? avgGrade._avg.value.toFixed(1) : "—",
      icon: Award,
      suffix: "",
    },
    { label: "Fehlzeiten (Monat)", value: absenceCountThisMonth, icon: Users, suffix: "" },
  ];

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">Schulleitung</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Schulübersicht</h1>
        <p className="mt-1 text-sm text-muted-fg">
          {role === "vice_rector" ? "Konrektor/in" : "Schulleiter/in"}
        </p>
      </header>

      <div className="grid gap-px border border-border bg-border sm:grid-cols-3 lg:grid-cols-5">
        {stats.map((s) => (
          <div key={s.label} className="bg-bg p-5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-fg">{s.label}</p>
            <p className="mt-3 font-mono text-3xl font-bold">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/rektor/statistiken"
          className="group flex items-center justify-between border border-border bg-bg p-5 hover:border-brand hover:bg-brand/5"
        >
          <div>
            <p className="font-semibold">Detailstatistiken</p>
            <p className="mt-0.5 text-sm text-muted-fg">Noten, Fehlzeiten, Entwicklung</p>
          </div>
          <ArrowRight className="size-4 text-muted-fg group-hover:text-brand" />
        </Link>
        <Link
          href="/rektor/broadcast"
          className="group flex items-center justify-between border border-border bg-bg p-5 hover:border-brand hover:bg-brand/5"
        >
          <div>
            <p className="font-semibold">Broadcast-Nachricht</p>
            <p className="mt-0.5 text-sm text-muted-fg">An alle Lehrer, Schüler oder Eltern</p>
          </div>
          <ArrowRight className="size-4 text-muted-fg group-hover:text-brand" />
        </Link>
      </div>
    </div>
  );
}
