import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ClipboardEdit,
  Clock,
  Filter,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { cn } from "@/lib/utils";
import { AcceptButton } from "./AcceptButton";

export const metadata: Metadata = { title: "Korrektur" };

interface PageProps {
  searchParams: Promise<{ classId?: string; status?: string }>;
}

export default async function KorrekturPage({ searchParams }: PageProps) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "teacher") redirect("/");

  const { classId, status } = await searchParams;

  // All classes this teacher has assignments in
  const teacherClasses = await prisma.schoolClass.findMany({
    where: { assignments: { some: { teacherId: session.userId } } },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const where = {
    assignment: {
      teacherId: session.userId,
      ...(classId ? { classId } : {}),
    },
    status: status === "graded" ? "graded" : status === "late" ? "late" : { in: ["submitted", "open"] },
  };

  const submissions = await prisma.submission.findMany({
    where: {
      assignment: {
        teacherId: session.userId,
        ...(classId ? { classId } : {}),
      },
      ...(status === "graded"
        ? { status: "graded" }
        : status === "late"
        ? { status: "late" }
        : { status: { in: ["submitted", "open"] } }),
    },
    include: {
      student: {
        select: {
          name: true,
          schoolClass: { select: { name: true } },
        },
      },
      assignment: {
        select: {
          title: true,
          subject: { select: { name: true } },
          dueAt: true,
        },
      },
      grade: { select: { value: true } },
    },
    orderBy: [{ status: "asc" }, { submittedAt: "desc" }],
    take: 100,
  });

  const totalOpen = submissions.filter((s) => s.status === "submitted" || s.status === "open").length;
  const totalGraded = submissions.filter((s) => s.status === "graded").length;

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">Korrektur-Stapel</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">
            {totalOpen} Abgaben offen
          </h1>
          <p className="mt-1 text-sm text-muted-fg">{totalGraded} bereits bewertet</p>
        </div>
      </header>

      {/* Stats */}
      <section className="grid grid-cols-2 gap-px border border-border bg-border sm:grid-cols-3">
        <StatBox label="Offen" value={String(totalOpen)} tone="text-warning" icon={ClipboardEdit} />
        <StatBox label="Bewertet" value={String(totalGraded)} tone="text-success" icon={CheckCircle2} />
        <StatBox
          label="Gesamt"
          value={String(submissions.length)}
          tone="text-muted-fg"
          icon={Sparkles}
          className="col-span-2 sm:col-span-1"
        />
      </section>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-4 border border-border bg-bg p-4">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-fg">
          <Filter className="size-3.5" />
          Filter
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-fg">Klasse</span>
          <FilterChip href="/teach/korrektur" active={!classId}>Alle</FilterChip>
          {teacherClasses.map((c) => (
            <FilterChip key={c.id} href={`/teach/korrektur?classId=${c.id}${status ? `&status=${status}` : ""}`} active={classId === c.id}>
              {c.name}
            </FilterChip>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-fg">Status</span>
          {[
            { value: undefined, label: "Offen" },
            { value: "graded", label: "Bewertet" },
            { value: "late", label: "Verspätet" },
          ].map((opt) => (
            <FilterChip
              key={opt.label}
              href={`/teach/korrektur${classId ? `?classId=${classId}` : ""}${opt.value ? `${classId ? "&" : "?"}status=${opt.value}` : ""}`}
              active={status === opt.value || (!status && !opt.value)}
            >
              {opt.label}
            </FilterChip>
          ))}
        </div>
        {(classId || status) && (
          <Link href="/teach/korrektur" className="ml-auto text-xs font-medium text-muted-fg hover:text-fg">
            Zurücksetzen
          </Link>
        )}
      </div>

      {/* Submission list */}
      {submissions.length === 0 ? (
        <div className="grid place-items-center border border-dashed border-border bg-bg p-12 text-center">
          <CheckCircle2 className="size-8 text-success" strokeWidth={1.5} />
          <p className="mt-4 text-base font-semibold">Stapel leer</p>
          <p className="mt-1 text-sm text-muted-fg">Keine Abgaben mit diesem Filter.</p>
          <Link href="/teach/korrektur" className="mt-4 text-xs font-semibold text-brand hover:underline">
            Filter zurücksetzen
          </Link>
        </div>
      ) : (
        <div className="border border-border">
          <div className="hidden grid-cols-[auto_1fr_auto_auto_auto] items-center gap-4 border-b border-border bg-surface px-5 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-fg lg:grid">
            <span className="w-8" />
            <span>Schüler · Aufgabe</span>
            <span className="w-28">Abgegeben</span>
            <span className="w-24">Status</span>
            <span className="w-36 text-right">Aktion</span>
          </div>
          <ul className="divide-y divide-border">
            {submissions.map((s) => {
              const isLate = s.status === "late";
              const isGraded = s.status === "graded";
              const isSubmitted = s.status === "submitted";
              return (
                <li
                  key={s.id}
                  className="grid grid-cols-1 gap-4 px-5 py-4 transition-colors hover:bg-surface lg:grid-cols-[auto_1fr_auto_auto_auto] lg:items-center"
                >
                  <Avatar name={s.student.name} size="md" className="hidden lg:grid" />
                  <div className="flex items-start gap-3 lg:gap-0">
                    <Avatar name={s.student.name} size="sm" className="lg:hidden" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold">{s.student.name}</p>
                        <Badge variant="outline">
                          {s.student.schoolClass?.name ?? "—"} · {s.assignment.subject.name}
                        </Badge>
                        {isLate && <Badge variant="danger"><AlertTriangle className="size-3" />Verspätet</Badge>}
                      </div>
                      <p className="mt-1 truncate text-sm text-fg">{s.assignment.title}</p>
                      {s.submittedAt && (
                        <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-fg">
                          <Clock className="size-3" />
                          {s.submittedAt.toLocaleDateString("de-DE", { day: "numeric", month: "short", year: "numeric" })}
                          {" "}
                          {s.submittedAt.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })} Uhr
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="w-28 text-xs text-muted-fg">
                    {s.assignment.dueAt.toLocaleDateString("de-DE", { day: "numeric", month: "short" })} fällig
                  </div>

                  <div className="w-24">
                    {isGraded ? (
                      <Badge variant="success">
                        <CheckCircle2 className="size-3" />
                        Note {s.grade?.value.toFixed(1).replace(".", ",")}
                      </Badge>
                    ) : isLate ? (
                      <Badge variant="danger">Verspätet</Badge>
                    ) : isSubmitted ? (
                      <Badge variant="info">Abgegeben</Badge>
                    ) : (
                      <Badge variant="outline">Offen</Badge>
                    )}
                  </div>

                  <div className="flex w-full gap-2 lg:w-36 lg:justify-end">
                    <Link
                      href={`/teach/korrektur/${s.id}`}
                      className="inline-flex items-center gap-1.5 border border-border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-surface"
                    >
                      <ClipboardEdit className="size-3.5" />
                      Öffnen
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

function StatBox({
  label, value, tone, icon: Icon, className,
}: {
  label: string; value: string; tone: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  className?: string;
}) {
  return (
    <div className={cn("bg-bg p-5", className)}>
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-fg">{label}</p>
        <Icon className={cn("size-4", tone)} strokeWidth={1.75} />
      </div>
      <p className="mt-3 font-mono text-3xl font-bold tracking-tight">{value}</p>
    </div>
  );
}

function FilterChip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={cn(
        "px-2.5 py-1 text-xs font-medium transition-colors",
        active ? "bg-fg text-bg" : "border border-border bg-bg text-muted-fg hover:border-fg/30 hover:text-fg"
      )}
    >
      {children}
    </Link>
  );
}
