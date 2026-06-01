import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  ClipboardList,
  FileCheck,
  Shield,
  UserCircle,
  Users,
} from "lucide-react";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Sekretariat" };

const DAY_LABELS = ["Mo", "Di", "Mi", "Do", "Fr"];

// Returns Monday of the current week
function getWeekStart(today: Date): Date {
  const d = new Date(today);
  const day = d.getDay(); // 0 = Sun, 1 = Mon …
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export default async function SekretariatPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const role = effectiveRole(session);
  if (
    role !== "secretary" &&
    role !== "rector" &&
    role !== "vice_rector" &&
    role !== "admin" &&
    role !== "super"
  ) {
    redirect("/login");
  }

  const schoolId = session.schoolId ?? "";

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayEnd = new Date(today);
  todayEnd.setHours(23, 59, 59, 999);

  const weekStart = getWeekStart(today);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 4); // Friday
  weekEnd.setHours(23, 59, 59, 999);

  const [pendingAbsences, pendingAtteste, todayStudents, recentStudents, weekAbsencesRaw] =
    await Promise.all([
      // Pending absences created today (unconfirmed, created today)
      prisma.absence.count({
        where: {
          schoolId,
          status: "pending",
          createdAt: { gte: today, lte: todayEnd },
        },
      }),
      // All pending atteste (status = "pending" across all time)
      prisma.absence.count({
        where: { schoolId, status: "pending" },
      }),
      // New student enrollments created today
      prisma.user.count({
        where: {
          schoolId,
          role: "student",
          createdAt: { gte: today, lte: todayEnd },
        },
      }),
      // Last 5 newly created students
      prisma.user.findMany({
        where: { schoolId, role: "student" },
        select: {
          id: true,
          name: true,
          klasse: true,
          createdAt: true,
          schoolClass: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      // All absences this week — we'll group in JS
      prisma.absence.findMany({
        where: {
          schoolId,
          fromDate: { gte: weekStart, lte: weekEnd },
        },
        select: { fromDate: true },
      }),
    ]);

  // Build Mon–Fri counts for this week
  const weekCounts: number[] = [0, 0, 0, 0, 0]; // index 0 = Mon
  for (const abs of weekAbsencesRaw) {
    const d = new Date(abs.fromDate);
    d.setHours(0, 0, 0, 0);
    const diffDays = Math.round((d.getTime() - weekStart.getTime()) / 86400000);
    if (diffDays >= 0 && diffDays <= 4) weekCounts[diffDays]++;
  }
  const maxWeekCount = Math.max(...weekCounts, 1);

  const quickActions = [
    { href: "/sekretariat/neuanmeldung", label: "Neue Anmeldung", icon: UserCircle },
    { href: "/sekretariat/fehlzeiten", label: "Fehlzeiten", icon: ClipboardList },
    { href: "/sekretariat/atteste", label: "Atteste", icon: Shield },
    { href: "/sekretariat/zeugnisse", label: "Zeugnisse", icon: FileCheck },
    { href: "/sekretariat/klassen", label: "Klassen", icon: BookOpen },
    { href: "/sekretariat/schueler", label: "Schüler", icon: Users },
  ];

  const fmtDate = (d: Date) =>
    d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">Portal</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Sekretariat</h1>
        <p className="mt-1 text-sm text-muted-fg">
          {today.toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </p>
      </header>

      {/* Today at a glance */}
      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-fg">Heute auf einen Blick</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Card>
            <CardBody className="py-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-mono text-2xl font-bold">{pendingAbsences}</p>
                  <p className="mt-0.5 text-xs text-muted-fg">Neue Fehlzeiten heute</p>
                </div>
                {pendingAbsences > 0 && (
                  <Badge variant="warning">Ausstehend</Badge>
                )}
              </div>
              <Link
                href="/sekretariat/fehlzeiten"
                className="mt-3 flex items-center gap-1 text-xs font-medium text-muted-fg hover:text-brand"
              >
                Fehlzeiten öffnen <ArrowRight className="size-3" />
              </Link>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="py-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-mono text-2xl font-bold">{todayStudents}</p>
                  <p className="mt-0.5 text-xs text-muted-fg">Neue Schüler heute</p>
                </div>
                {todayStudents > 0 && (
                  <Badge variant="success">Neu</Badge>
                )}
              </div>
              <Link
                href="/sekretariat/neuanmeldung"
                className="mt-3 flex items-center gap-1 text-xs font-medium text-muted-fg hover:text-brand"
              >
                Anmeldung öffnen <ArrowRight className="size-3" />
              </Link>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="py-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-mono text-2xl font-bold">{pendingAtteste}</p>
                  <p className="mt-0.5 text-xs text-muted-fg">Ausstehende Atteste</p>
                </div>
                {pendingAtteste > 0 && (
                  <Badge variant="warning">Offen</Badge>
                )}
              </div>
              <Link
                href="/sekretariat/atteste"
                className="mt-3 flex items-center gap-1 text-xs font-medium text-muted-fg hover:text-brand"
              >
                Atteste öffnen <ArrowRight className="size-3" />
              </Link>
            </CardBody>
          </Card>
        </div>
      </section>

      {/* Quick actions */}
      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-fg">Schnellzugriff</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {quickActions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="group flex items-center gap-3 border border-border bg-bg p-4 transition-colors hover:border-brand hover:bg-brand/5"
            >
              <action.icon className="size-5 shrink-0 text-muted-fg group-hover:text-brand" strokeWidth={1.5} />
              <span className="text-sm font-medium group-hover:text-brand">{action.label}</span>
              <ArrowRight className="ml-auto size-3.5 text-muted-fg/50 group-hover:text-brand" />
            </Link>
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent registrations */}
        <Card>
          <CardHeader>
            <CardTitle>Letzte Anmeldungen</CardTitle>
            <Link
              href="/sekretariat/schueler"
              className="flex items-center gap-1 text-xs text-muted-fg hover:text-brand"
            >
              Alle <ArrowRight className="size-3" />
            </Link>
          </CardHeader>
          <CardBody className="pt-0">
            {recentStudents.length === 0 ? (
              <p className="text-sm text-muted-fg">Noch keine Schüler eingetragen.</p>
            ) : (
              <div className="divide-y divide-border">
                {recentStudents.map((student) => (
                  <div key={student.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{student.name}</p>
                      <p className="text-xs text-muted-fg">{fmtDate(student.createdAt)}</p>
                    </div>
                    {(student.schoolClass?.name ?? student.klasse) && (
                      <Badge variant="neutral">
                        {student.schoolClass?.name ?? student.klasse}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        {/* Absences this week — mini bar chart */}
        <Card>
          <CardHeader>
            <CardTitle>Fehlzeiten diese Woche</CardTitle>
            <Link
              href="/sekretariat/fehlzeiten"
              className="flex items-center gap-1 text-xs text-muted-fg hover:text-brand"
            >
              Details <ArrowRight className="size-3" />
            </Link>
          </CardHeader>
          <CardBody className="pt-0">
            <div className="flex h-28 items-end gap-2">
              {weekCounts.map((count, i) => {
                const barHeight = Math.max(4, Math.round((count / maxWeekCount) * 96));
                const isToday =
                  weekStart.getTime() + i * 86400000 === today.getTime();
                return (
                  <div key={i} className="flex flex-1 flex-col items-center gap-1">
                    <span className="text-xs font-mono text-muted-fg">{count > 0 ? count : ""}</span>
                    <div
                      className={`w-full transition-all ${isToday ? "bg-brand" : "bg-surface-2"}`}
                      style={{ height: `${barHeight}px` }}
                      title={`${DAY_LABELS[i]}: ${count} Fehlzeit${count !== 1 ? "en" : ""}`}
                    />
                    <span
                      className={`text-xs font-medium ${isToday ? "text-brand" : "text-muted-fg"}`}
                    >
                      {DAY_LABELS[i]}
                    </span>
                  </div>
                );
              })}
            </div>
            <p className="mt-3 text-xs text-muted-fg">
              {weekAbsencesRaw.length} Fehlzeit{weekAbsencesRaw.length !== 1 ? "en" : ""} diese Woche (
              {weekStart.toLocaleDateString("de-DE", { day: "numeric", month: "numeric" })} –{" "}
              {weekEnd.toLocaleDateString("de-DE", { day: "numeric", month: "numeric" })})
            </p>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
