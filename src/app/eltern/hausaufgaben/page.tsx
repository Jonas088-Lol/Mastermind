import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ArrowRight, CheckCircle2, Clock, BookOpen } from "lucide-react";
import type { Metadata } from "next";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";

export const metadata: Metadata = { title: "Hausaufgaben · Eltern" };

interface PageProps {
  searchParams: Promise<{ week?: string }>;
}

function getWeekBounds(offset: number) {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(now.getDate() + diff + offset * 7);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return { monday, sunday };
}

export default async function ElternHausaufgabenPage({ searchParams }: PageProps) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "parent") redirect("/");

  const { week } = await searchParams;
  const offset = parseInt(week ?? "0", 10) || 0;
  const { monday, sunday } = getWeekBounds(offset);

  // Find linked children
  const links = await prisma.parentStudentLink.findMany({
    where: { parentId: session.userId },
    include: {
      student: {
        select: {
          id: true,
          name: true,
          classId: true,
        },
      },
    },
  });

  const children = links.map((l) => l.student).filter((s) => s.classId);

  const fmt = (d: Date) => d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
  const weekLabel = `${fmt(monday)} – ${fmt(sunday)}`;

  // Fetch homework for each child in parallel
  const childrenWithHomework = await Promise.all(
    children.map(async (child) => {
      const homework = await prisma.homework.findMany({
        where: {
          classId: child.classId!,
          dueAt: { gte: monday, lte: sunday },
        },
        include: {
          subject: { select: { name: true, color: true } },
          completions: {
            where: { studentId: child.id },
            select: { done: true, fileUrl: true, fileName: true, doneAt: true },
          },
        },
        orderBy: { dueAt: "asc" },
      });
      return { child, homework };
    })
  );

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Hausaufgaben</h1>
        <p className="mt-1 text-sm text-muted-fg">Übersicht für Ihre Kinder</p>
      </header>

      {/* Week navigation */}
      <div className="flex items-center gap-3">
        <Link
          href={`?week=${offset - 1}`}
          className="grid size-8 place-items-center rounded-lg border border-border bg-surface text-muted-fg transition-colors hover:text-fg"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <span className="min-w-36 text-center text-sm font-semibold">{weekLabel}</span>
        <Link
          href={`?week=${offset + 1}`}
          className="grid size-8 place-items-center rounded-lg border border-border bg-surface text-muted-fg transition-colors hover:text-fg"
        >
          <ArrowRight className="size-4" />
        </Link>
        {offset !== 0 && (
          <Link href="?" className="text-xs text-brand hover:underline">
            Aktuelle Woche
          </Link>
        )}
      </div>

      {children.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border p-12 text-center">
          <BookOpen className="size-10 text-muted-fg/40" />
          <p className="font-semibold text-muted-fg">Keine verknüpften Kinder</p>
          <p className="text-sm text-muted-fg">
            Wenden Sie sich an die Schulverwaltung, um Ihr Konto mit Ihrem Kind zu verknüpfen.
          </p>
        </div>
      )}

      {childrenWithHomework.map(({ child, homework }) => (
        <section key={child.id} className="flex flex-col gap-3">
          <h2 className="text-base font-bold text-fg">{child.name}</h2>

          {homework.length === 0 ? (
            <div className="flex items-center gap-3 rounded-xl border border-dashed border-border p-5 text-sm text-muted-fg">
              <CheckCircle2 className="size-5 text-green-500/60 shrink-0" />
              Keine Hausaufgaben diese Woche
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {homework.map((hw) => {
                const completion = hw.completions[0];
                const isDone = completion?.done ?? false;

                return (
                  <div
                    key={hw.id}
                    className="flex items-start gap-4 rounded-xl border border-border bg-surface p-4"
                    style={{ borderLeftColor: hw.subject.color, borderLeftWidth: 3 }}
                  >
                    <div className="mt-0.5 shrink-0">
                      {isDone ? (
                        <CheckCircle2 className="size-5 text-green-500" />
                      ) : (
                        <Clock className="size-5 text-amber-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-semibold ${isDone ? "text-muted-fg line-through" : "text-fg"}`}>
                        {hw.title}
                      </p>
                      <p className="text-xs text-muted-fg">
                        {hw.subject.name} ·{" "}
                        {new Date(hw.dueAt).toLocaleDateString("de-DE", {
                          weekday: "short",
                          day: "2-digit",
                          month: "2-digit",
                        })}{" "}
                        {new Date(hw.dueAt).toLocaleTimeString("de-DE", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}{" "}
                        Uhr
                      </p>
                      {hw.description && (
                        <p className="mt-1 text-sm text-muted-fg">{hw.description}</p>
                      )}
                      {isDone && completion?.doneAt && (
                        <p className="mt-1 text-xs text-green-600">
                          Erledigt am{" "}
                          {new Date(completion.doneAt).toLocaleDateString("de-DE", {
                            day: "2-digit",
                            month: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}{" "}
                          Uhr
                        </p>
                      )}
                    </div>
                    <div className="shrink-0">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          isDone
                            ? "bg-green-500/10 text-green-600"
                            : "bg-amber-400/10 text-amber-600"
                        }`}
                      >
                        {isDone ? "Erledigt" : "Offen"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
