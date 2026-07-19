/* Copyright 2026 Elian Schock, Jonas Schwenk */
import { ArrowLeft, ClipboardEdit } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession, ROLE_HOME } from "@/lib/session";
import { canManageSchool, canAccessArea } from "@/lib/school-admin";

export const metadata: Metadata = { title: "Abgaben · Admin" };

export default async function AdminAbgabenPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canManageSchool(effectiveRole(session))) redirect(ROLE_HOME[effectiveRole(session)]);
  if (!canAccessArea(effectiveRole(session), "abgaben")) redirect("/admin");

  const schoolId = session.schoolId;

  const pending = await prisma.submission.findMany({
    where: {
      status: "submitted",
      assignment: {
        teacher: { schoolId: schoolId ?? undefined },
      },
    },
    include: {
      student: { select: { name: true } },
      assignment: {
        include: {
          teacher: { select: { name: true } },
          subject: { select: { name: true, shortName: true, color: true } },
          class: { select: { name: true } },
        },
      },
    },
    orderBy: { submittedAt: "asc" },
  });

  const graded = await prisma.submission.count({
    where: {
      status: "graded",
      assignment: {
        teacher: { schoolId: schoolId ?? undefined },
      },
    },
  });

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <Link
        href="/admin"
        className="inline-flex w-fit items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-muted-fg transition-colors hover:text-fg"
      >
        <ArrowLeft className="size-3.5" />
        Admin
      </Link>

      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">Admin</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Abgaben</h1>
        <p className="mt-1 text-sm text-muted-fg">
          <span className="font-semibold text-fg">{pending.length} offen</span> · {graded} bereits bewertet
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Offene Korrekturen</CardTitle>
          <Badge variant={pending.length > 0 ? "warning" : "success"}>{pending.length} offen</Badge>
        </CardHeader>
        <CardBody className="px-0! pb-0!">
          {pending.length === 0 ? (
            <div className="flex flex-col items-center gap-3 border-t border-border px-5 py-12 text-center">
              <ClipboardEdit className="size-8 text-muted-fg/40" strokeWidth={1.5} />
              <p className="text-sm font-semibold">Keine offenen Korrekturen</p>
              <p className="text-xs text-muted-fg">Alle Abgaben wurden bewertet.</p>
            </div>
          ) : (
            <>
              <div className="hidden grid-cols-[1fr_1fr_160px_140px] items-center gap-4 border-b border-border bg-surface px-5 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-fg sm:grid">
                <span>Schüler · Aufgabe</span>
                <span>Lehrkraft</span>
                <span>Abgegeben</span>
                <span>Fach · Klasse</span>
              </div>
              <ul className="divide-y divide-border">
                {pending.map((s) => (
                  <li
                    key={s.id}
                    className="flex flex-wrap items-center gap-4 px-5 py-3.5 transition-colors hover:bg-surface"
                  >
                    <Avatar name={s.student.name} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{s.student.name}</p>
                      <p className="mt-0.5 truncate text-xs text-muted-fg">{s.assignment.title}</p>
                    </div>
                    <div className="hidden min-w-0 sm:block">
                      <p className="text-sm">{s.assignment.teacher.name}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-flex shrink-0 items-center px-1.5 py-0.5 text-[11px] font-semibold"
                        style={{
                          backgroundColor: s.assignment.subject.color + "22",
                          color: s.assignment.subject.color,
                        }}
                      >
                        {s.assignment.class.name} {s.assignment.subject.shortName}
                      </span>
                    </div>
                    <span className="font-mono text-xs text-muted-fg">
                      {s.submittedAt?.toLocaleDateString("de-DE", {
                        day: "numeric",
                        month: "short",
                      }) ?? "—"}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
