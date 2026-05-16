import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Award,
  BookOpen,
  CheckCircle2,
  Clock,
  Users,
} from "lucide-react";
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

  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  const [
    studentCount,
    teacherCount,
    classCount,
    avgGrade,
    absenceByStatus,
  ] = await Promise.all([
    prisma.user.count({ where: { schoolId: session.schoolId ?? "", role: "student" } }),
    prisma.user.count({ where: { schoolId: session.schoolId ?? "", role: "teacher" } }),
    prisma.schoolClass.count({ where: { schoolId: session.schoolId ?? "" } }),
    prisma.grade.aggregate({
      where: { student: { schoolId: session.schoolId ?? "" } },
      _avg: { value: true },
    }),
    prisma.absence.groupBy({
      by: ["status"],
      where: {
        student: { schoolId: session.schoolId ?? "" },
        fromDate: { gte: monthStart },
      },
      _count: { id: true },
    }),
  ]);

  const absenceMap = Object.fromEntries(absenceByStatus.map((a) => [a.status, a._count.id]));
  const totalAbsences = Object.values(absenceMap).reduce((s, v) => s + v, 0);
  const pendingAbsences = absenceMap.pending ?? 0;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">Schulleitung</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Schulübersicht</h1>
        <p className="mt-1 text-sm text-muted-fg">
          {role === "vice_rector" ? "Konrektor/in" : "Schulleiter/in"}
        </p>
      </header>

      {/* Primary stats */}
      <div className="grid gap-px border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Schüler", value: String(studentCount), icon: Users },
          { label: "Lehrkräfte", value: String(teacherCount), icon: BookOpen },
          { label: "Klassen", value: String(classCount), icon: BookOpen },
          {
            label: "Ø Note gesamt",
            value: avgGrade._avg.value ? avgGrade._avg.value.toFixed(1).replace(".", ",") : "—",
            icon: Award,
          },
        ].map((s) => (
          <div key={s.label} className="bg-bg p-5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-fg">{s.label}</p>
            <p className="mt-3 font-mono text-3xl font-bold">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Absence breakdown this month */}
      <div>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-muted-fg">
          Fehlzeiten diesen Monat
        </h2>
        <div className="grid gap-px border border-border bg-border sm:grid-cols-3">
          <div className="flex items-center gap-4 bg-bg p-5">
            <Clock className="size-5 text-warning" strokeWidth={1.75} />
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-fg">Ausstehend</p>
              <p className="mt-1 font-mono text-2xl font-bold text-warning">{pendingAbsences}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 bg-bg p-5">
            <CheckCircle2 className="size-5 text-success" strokeWidth={1.75} />
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-fg">Bestätigt</p>
              <p className="mt-1 font-mono text-2xl font-bold text-success">{absenceMap.confirmed ?? 0}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 bg-bg p-5">
            <AlertTriangle className="size-5 text-muted-fg" strokeWidth={1.75} />
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-fg">Gesamt</p>
              <p className="mt-1 font-mono text-2xl font-bold">{totalAbsences}</p>
            </div>
          </div>
        </div>
        {pendingAbsences > 0 && (
          <p className="mt-2 text-xs text-warning">
            {pendingAbsences} Fehlmeldung{pendingAbsences !== 1 ? "en" : ""} warte{pendingAbsences !== 1 ? "n" : "t"} auf Bestätigung
          </p>
        )}
      </div>

      {/* Quick links */}
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
          href="/rektor/personal"
          className="group flex items-center justify-between border border-border bg-bg p-5 hover:border-brand hover:bg-brand/5"
        >
          <div>
            <p className="font-semibold">Personal</p>
            <p className="mt-0.5 text-sm text-muted-fg">{teacherCount} Lehrkräfte verwalten</p>
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
        <Link
          href="/rektor/mannschaften"
          className="group flex items-center justify-between border border-border bg-bg p-5 hover:border-brand hover:bg-brand/5"
        >
          <div>
            <p className="font-semibold">Mannschaften</p>
            <p className="mt-0.5 text-sm text-muted-fg">Sportergebnisse & Teams</p>
          </div>
          <ArrowRight className="size-4 text-muted-fg group-hover:text-brand" />
        </Link>
      </div>
    </div>
  );
}
