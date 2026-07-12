/* Copyright 2026 Elian Schock, Jonas Schwenk */
import {
  Award,
  GraduationCap,
  Mail,
  Settings,
  Sparkles,
  Users,
} from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Profil" };

export default async function TeachProfilPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "teacher") redirect("/");

  const [teacher, tscs, gradeStats, savedHours] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.userId },
      select: { name: true, email: true, school: { select: { name: true } } },
    }),
    prisma.teacherSubjectClass.findMany({
      where: { teacherId: session.userId },
      include: {
        class: {
          select: {
            id: true,
            name: true,
            _count: { select: { students: true } },
          },
        },
        subject: { select: { id: true, name: true } },
      },
      orderBy: [{ class: { name: "asc" } }, { subject: { name: "asc" } }],
    }),
    prisma.grade.aggregate({
      where: { teacherId: session.userId },
      _avg: { value: true },
      _count: { id: true },
    }),
    // Count AI-generated assignments as proxy for time saved (each ≈ 20 min)
    prisma.assignment.count({ where: { teacherId: session.userId } }),
  ]);

  if (!teacher) redirect("/login");

  // Deduplicate classes and subjects
  const classMap = new Map<string, { id: string; name: string; students: number; subjects: string[] }>();
  const subjectSet = new Set<string>();

  for (const tsc of tscs) {
    subjectSet.add(tsc.subject.name);
    if (!classMap.has(tsc.classId)) {
      classMap.set(tsc.classId, {
        id: tsc.class.id,
        name: tsc.class.name,
        students: tsc.class._count.students,
        subjects: [],
      });
    }
    const entry = classMap.get(tsc.classId)!;
    if (!entry.subjects.includes(tsc.subject.name)) {
      entry.subjects.push(tsc.subject.name);
    }
  }

  const classes = Array.from(classMap.values());
  const subjects = Array.from(subjectSet);
  const totalStudents = classes.reduce((sum, c) => sum + c.students, 0);
  const avgGrade = gradeStats._avg.value;
  // Rough estimate: 20 min per assignment created
  const timeSavedH = (savedHours * 20) / 60;

  const stats = [
    { label: "Klassen", value: String(classes.length), icon: GraduationCap, tone: "text-fg" },
    { label: "Schüler aktuell", value: String(totalStudents), icon: Users, tone: "text-brand" },
    {
      label: "Ø Notengebung",
      value: avgGrade != null ? avgGrade.toFixed(1).replace(".", ",") : "—",
      icon: Award,
      tone: "text-success",
    },
    {
      label: "Aufgaben erstellt",
      value: String(savedHours),
      icon: Sparkles,
      tone: "text-info",
    },
  ] as const;

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8">
      <header className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-end gap-5">
          <Avatar name={teacher.name} size="lg" className="size-20 text-2xl" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">
              Lehrer · {teacher.school?.name ?? "Schule"}
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">
              {teacher.name}
            </h1>
            {teacher.email && (
              <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-fg">
                <Mail className="size-3.5" />
                {teacher.email}
              </p>
            )}
          </div>
        </div>
        <Link
          href="/teach/einstellungen"
          className={buttonVariants({ variant: "ghost", size: "sm" })}
        >
          <Settings className="size-3.5" />
          Einstellungen
        </Link>
      </header>

      <section className="grid grid-cols-2 gap-px border border-border bg-border lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-bg p-5">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-fg">
                {s.label}
              </p>
              <s.icon className={cn("size-4", s.tone)} strokeWidth={1.75} />
            </div>
            <p className="mt-3 font-mono text-3xl font-bold tracking-tight">{s.value}</p>
          </div>
        ))}
      </section>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          {subjects.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Fächer</CardTitle></CardHeader>
              <CardBody>
                <div className="flex flex-wrap gap-1.5">
                  {subjects.map((s) => (
                    <Badge key={s} variant="brand">{s}</Badge>
                  ))}
                </div>
              </CardBody>
            </Card>
          )}

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Meine Klassen</CardTitle>
                <p className="mt-1 text-sm text-muted-fg">
                  {classes.length} {classes.length === 1 ? "Klasse" : "Klassen"} · {totalStudents} Schüler
                </p>
              </div>
            </CardHeader>
            {classes.length === 0 ? (
              <CardBody>
                <p className="text-sm text-muted-fg">Noch keine Klassen zugeordnet.</p>
              </CardBody>
            ) : (
              <CardBody className="px-0! pb-0!">
                <ul className="divide-y divide-border border-t border-border">
                  {classes.map((k) => (
                    <li
                      key={k.id}
                      className="flex items-center gap-4 px-5 py-3 transition-colors hover:bg-surface"
                    >
                      <div className="grid size-10 shrink-0 place-items-center bg-fg text-bg">
                        <span className="font-mono text-xs font-bold">{k.name}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold">{k.subjects.join(", ")}</p>
                        <p className="text-xs text-muted-fg">{k.students} Schüler</p>
                      </div>
                      <Link
                        href={`/teach/klassen/${encodeURIComponent(k.name)}`}
                        className={buttonVariants({ variant: "ghost", size: "sm" })}
                      >
                        Cockpit
                      </Link>
                    </li>
                  ))}
                </ul>
              </CardBody>
            )}
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Übersicht</CardTitle>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="border border-border bg-surface p-3">
              <p className="font-mono text-[10px] uppercase tracking-wider text-muted-fg">Noten vergeben</p>
              <p className="mt-1 font-mono text-2xl font-bold">{gradeStats._count.id}</p>
            </div>
            <div className="border border-border bg-surface p-3">
              <p className="font-mono text-[10px] uppercase tracking-wider text-muted-fg">Aufgaben erstellt</p>
              <p className="mt-1 font-mono text-2xl font-bold">{savedHours}</p>
            </div>
            <Link
              href="/teach/korrektur"
              className={cn(buttonVariants({ variant: "outline" }), "w-full justify-center")}
            >
              Zur Korrektur
            </Link>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
