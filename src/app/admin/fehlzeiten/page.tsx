/* Copyright 2026 Elian Schock, Jonas Schwenk */
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Calendar, CheckCircle2, Clock, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/db/client";
import { ROLE_HOME, effectiveRole, getSession } from "@/lib/session";
import { cn } from "@/lib/utils";
import { confirmAbsence, rejectAbsence } from "./actions";
import { canManageSchool, canAccessArea } from "@/lib/school-admin";

export const metadata: Metadata = { title: "Fehlzeiten · Admin" };

interface PageProps {
  searchParams: Promise<{ status?: string; classId?: string }>;
}

export default async function AdminFehlzeitenPage({ searchParams }: PageProps) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canManageSchool(effectiveRole(session))) redirect(ROLE_HOME[effectiveRole(session)]);
  if (!canAccessArea(effectiveRole(session), "fehlzeiten")) redirect("/admin");

  const { status: statusFilter, classId: classIdFilter } = await searchParams;

  const classes = await prisma.schoolClass.findMany({
    where: { schoolId: session.schoolId ?? "" },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const absences = await prisma.absence.findMany({
    where: {
      student: {
        schoolId: session.schoolId ?? "",
        ...(classIdFilter ? { classId: classIdFilter } : {}),
      },
      ...(statusFilter && ["pending", "confirmed", "rejected"].includes(statusFilter)
        ? { status: statusFilter }
        : {}),
    },
    include: {
      student: {
        select: { name: true, klasse: true, schoolClass: { select: { id: true, name: true } } },
      },
      reporter: { select: { name: true, role: true } },
      confirmedBy: { select: { name: true } },
    },
    orderBy: [{ status: "asc" }, { fromDate: "desc" }],
  });

  const pending = absences.filter((a) => a.status === "pending");
  const confirmed = absences.filter((a) => a.status === "confirmed");
  const rejected = absences.filter((a) => a.status === "rejected");

  const REPORTER_LABEL: Record<string, string> = {
    parent: "Elternteil",
    student: "Schüler/in",
    teacher: "Lehrkraft",
    admin: "Admin",
    secretary: "Sekretariat",
  };

  function formatRange(from: Date, to: Date) {
    const fmt = (d: Date) => d.toLocaleDateString("de-DE", { day: "numeric", month: "short" });
    return from.toDateString() === to.toDateString()
      ? fmt(from)
      : `${fmt(from)} – ${fmt(to)}`;
  }

  function dayCount(from: Date, to: Date) {
    return Math.ceil((to.getTime() - from.getTime()) / 86_400_000) + 1;
  }

  const STATUS_FILTERS = [
    { value: "", label: "Alle" },
    { value: "pending", label: "Ausstehend" },
    { value: "confirmed", label: "Bestätigt" },
    { value: "rejected", label: "Abgelehnt" },
  ];

  function filterHref(newStatus: string, newClassId?: string) {
    const params = new URLSearchParams();
    if (newStatus) params.set("status", newStatus);
    if (newClassId !== undefined ? newClassId : classIdFilter) {
      params.set("classId", newClassId !== undefined ? newClassId : classIdFilter ?? "");
    }
    const q = params.toString();
    return `/admin/fehlzeiten${q ? `?${q}` : ""}`;
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">Schul-Admin</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Fehlzeiten</h1>
        <p className="mt-1 text-sm text-muted-fg">
          {pending.length} ausstehend · {confirmed.length} bestätigt · {rejected.length} abgelehnt
        </p>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-px border border-border bg-border">
        <div className="flex items-center gap-4 bg-bg p-5">
          <Clock className="size-5 text-warning" strokeWidth={1.75} />
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-fg">Ausstehend</p>
            <p className="mt-1 font-mono text-2xl font-bold text-warning">{pending.length}</p>
          </div>
        </div>
        <div className="flex items-center gap-4 bg-bg p-5">
          <CheckCircle2 className="size-5 text-success" strokeWidth={1.75} />
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-fg">Bestätigt</p>
            <p className="mt-1 font-mono text-2xl font-bold text-success">{confirmed.length}</p>
          </div>
        </div>
        <div className="flex items-center gap-4 bg-bg p-5">
          <XCircle className="size-5 text-danger" strokeWidth={1.75} />
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-fg">Abgelehnt</p>
            <p className="mt-1 font-mono text-2xl font-bold text-danger">{rejected.length}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="flex flex-wrap gap-1.5">
          {STATUS_FILTERS.map((f) => (
            <Link
              key={f.value}
              href={filterHref(f.value)}
              className={cn(
                "border px-3 py-1.5 text-xs font-semibold transition-colors",
                (f.value === "" ? !statusFilter : statusFilter === f.value)
                  ? "border-fg bg-fg text-bg"
                  : "border-border text-muted-fg hover:border-fg/30 hover:text-fg"
              )}
            >
              {f.label}
            </Link>
          ))}
        </div>
        {classes.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            <Link
              href={filterHref(statusFilter ?? "", "")}
              className={cn(
                "border px-3 py-1.5 text-xs font-semibold transition-colors",
                !classIdFilter
                  ? "border-fg bg-fg text-bg"
                  : "border-border text-muted-fg hover:border-fg/30 hover:text-fg"
              )}
            >
              Alle Klassen
            </Link>
            {classes.map((c) => (
              <Link
                key={c.id}
                href={filterHref(statusFilter ?? "", c.id)}
                className={cn(
                  "border px-3 py-1.5 text-xs font-semibold transition-colors",
                  classIdFilter === c.id
                    ? "border-fg bg-fg text-bg"
                    : "border-border text-muted-fg hover:border-fg/30 hover:text-fg"
                )}
              >
                {c.name}
              </Link>
            ))}
          </div>
        )}
      </div>

      {absences.length === 0 ? (
        <Card>
          <CardBody>
            <p className="py-8 text-center text-sm text-muted-fg">Keine Fehlzeiten gefunden.</p>
          </CardBody>
        </Card>
      ) : (
        <>
          {pending.length > 0 && (
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Ausstehend</CardTitle>
                  <p className="mt-1 text-sm text-muted-fg">{pending.length} warten auf Bestätigung</p>
                </div>
                <Badge variant="warning">{pending.length} offen</Badge>
              </CardHeader>
              <CardBody className="px-0! pb-0!">
                <ul className="divide-y divide-border border-t border-border">
                  {pending.map((a) => (
                    <li key={a.id} className="flex items-start gap-4 px-5 py-4">
                      <div className="grid size-9 shrink-0 place-items-center bg-surface">
                        <Calendar className="size-4 text-muted-fg" strokeWidth={1.75} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold">{a.student.name}</p>
                          {a.student.schoolClass && (
                            <span className="text-xs text-muted-fg">Klasse {a.student.schoolClass.name}</span>
                          )}
                        </div>
                        <p className="mt-0.5 text-sm">
                          {formatRange(a.fromDate, a.toDate)}
                          <span className="ml-1.5 text-xs text-muted-fg">
                            ({dayCount(a.fromDate, a.toDate)} Tag{dayCount(a.fromDate, a.toDate) !== 1 ? "e" : ""})
                          </span>
                        </p>
                        {a.reason && <p className="mt-0.5 text-xs text-muted-fg">Grund: {a.reason}</p>}
                        <p className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-fg">
                          Gemeldet von {a.reporter.name} ({REPORTER_LABEL[a.reporter.role] ?? a.reporter.role})
                          · {a.createdAt.toLocaleDateString("de-DE", { day: "numeric", month: "short" })}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <form action={confirmAbsence.bind(null, a.id)}>
                          <Button type="submit" size="sm" variant="secondary">
                            <CheckCircle2 className="size-3.5 text-success" />
                            Bestätigen
                          </Button>
                        </form>
                        <form action={rejectAbsence.bind(null, a.id)}>
                          <Button type="submit" size="sm" variant="ghost">
                            <XCircle className="size-3.5 text-danger" />
                            Ablehnen
                          </Button>
                        </form>
                      </div>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          )}

          {(confirmed.length > 0 || rejected.length > 0) && (
            <Card>
              <CardHeader>
                <CardTitle>Bearbeitet</CardTitle>
              </CardHeader>
              <CardBody className="px-0! pb-0!">
                <ul className="divide-y divide-border border-t border-border">
                  {[...confirmed, ...rejected].map((a) => (
                    <li key={a.id} className="flex items-start gap-4 px-5 py-3.5">
                      <div className="grid size-9 shrink-0 place-items-center bg-surface">
                        {a.status === "confirmed"
                          ? <CheckCircle2 className="size-4 text-success" strokeWidth={1.75} />
                          : <XCircle className="size-4 text-danger" strokeWidth={1.75} />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold">{a.student.name}</p>
                          {a.student.schoolClass && (
                            <span className="text-xs text-muted-fg">Klasse {a.student.schoolClass.name}</span>
                          )}
                          <Badge variant={a.status === "confirmed" ? "success" : "danger"} className="ml-auto">
                            {a.status === "confirmed" ? "Bestätigt" : "Abgelehnt"}
                          </Badge>
                        </div>
                        <p className="mt-0.5 text-sm text-muted-fg">{formatRange(a.fromDate, a.toDate)}</p>
                        {a.reason && <p className="mt-0.5 text-xs text-muted-fg">Grund: {a.reason}</p>}
                        {a.confirmedBy && (
                          <p className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-fg">
                            {a.status === "confirmed" ? "Bestätigt" : "Abgelehnt"} von {a.confirmedBy.name}
                            {a.confirmedAt && ` · ${a.confirmedAt.toLocaleDateString("de-DE", { day: "numeric", month: "short" })}`}
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
