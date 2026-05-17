import {
  CalendarClock,
  ChevronDown,
  MessageSquare,
  Plus,
  Trash2,
  UserCheck,
} from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { createMeetingNote, deleteMeetingNote } from "./actions";

export const metadata: Metadata = { title: "Elterngespräche · Lehrer" };

interface PageProps {
  searchParams: Promise<{ studentId?: string }>;
}

export default async function ElterngespraeChePage({ searchParams }: PageProps) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "teacher") redirect("/");

  const { studentId: filterStudentId } = await searchParams;

  // All students in teacher's classes
  const tscEntries = await prisma.teacherSubjectClass.findMany({
    where: { teacherId: session.userId },
    include: {
      class: {
        include: {
          students: { select: { id: true, name: true, schoolClass: { select: { name: true } } } },
        },
      },
    },
    distinct: ["classId"],
    orderBy: { class: { name: "asc" } },
  });

  const allStudents = Array.from(
    new Map(
      tscEntries.flatMap((t) =>
        t.class.students.map((s) => [
          s.id,
          { id: s.id, name: s.name, className: t.class.name },
        ])
      )
    ).values()
  ).sort((a, b) => a.name.localeCompare(b.name, "de"));

  // Meeting notes
  const notes = await prisma.teacherMeetingNote.findMany({
    where: {
      teacherId: session.userId,
      ...(filterStudentId ? { studentId: filterStudentId } : {}),
    },
    include: {
      student: {
        select: {
          id: true,
          name: true,
          schoolClass: { select: { name: true } },
        },
      },
    },
    orderBy: { meetingAt: "desc" },
  });

  const activeStudent = filterStudentId
    ? allStudents.find((s) => s.id === filterStudentId)
    : null;

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">
            Lehrer-Cockpit
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">
            Elterngespräche
          </h1>
          <p className="mt-1 text-sm text-muted-fg">
            {notes.length} Gespräche
            {activeStudent && (
              <>
                {" "}
                · Gefiltert:{" "}
                <span className="font-semibold text-fg">{activeStudent.name}</span>
                <a
                  href="/teach/elterngespraeche"
                  className="ml-2 text-xs text-muted-fg underline hover:text-fg"
                >
                  Filter entfernen
                </a>
              </>
            )}
          </p>
        </div>
      </header>

      <div className="grid gap-8 xl:grid-cols-[1fr_380px]">
        {/* Notes list */}
        <div className="space-y-4">
          {notes.length === 0 ? (
            <Card>
              <CardBody>
                <div className="flex flex-col items-center gap-3 py-8 text-center">
                  <MessageSquare className="size-8 text-muted-fg" strokeWidth={1.25} />
                  <p className="font-semibold">Keine Gespräche eingetragen</p>
                  <p className="text-sm text-muted-fg">
                    Trage dein erstes Elterngespräch über das Formular rechts ein.
                  </p>
                </div>
              </CardBody>
            </Card>
          ) : (
            notes.map((note) => (
              <NoteCard
                key={note.id}
                note={{
                  id: note.id,
                  studentName: note.student.name,
                  studentId: note.student.id,
                  className: note.student.schoolClass?.name ?? "—",
                  parentName: note.parentName,
                  meetingAt: note.meetingAt,
                  notes: note.notes,
                  followUp: note.followUp,
                }}
                deleteAction={deleteMeetingNote}
              />
            ))
          )}
        </div>

        {/* Create form */}
        <div className="space-y-4">
          {/* Filter by student */}
          <Card>
            <CardHeader>
              <CardTitle>
                <UserCheck className="inline size-4 mr-1.5" strokeWidth={1.75} />
                Nach Schüler filtern
              </CardTitle>
            </CardHeader>
            <CardBody>
              <div className="relative">
                <select
                  className="w-full appearance-none border border-border bg-bg px-3 py-2 pr-8 text-sm"
                  defaultValue={filterStudentId ?? ""}
                  onChange={undefined}
                  name="filterStudent"
                  onInput={undefined}
                >
                  <option value="">Alle Schüler</option>
                  {allStudents.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.className})
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-fg" />
              </div>
              <script
                dangerouslySetInnerHTML={{
                  __html: `
document.querySelector('[name="filterStudent"]')?.addEventListener('change', function(e){
  var val = e.target.value;
  window.location.href = val ? '/teach/elterngespraeche?studentId='+encodeURIComponent(val) : '/teach/elterngespraeche';
});
                  `.trim(),
                }}
              />
            </CardBody>
          </Card>

          {/* New note form */}
          <Card>
            <CardHeader>
              <CardTitle>
                <Plus className="inline size-4 mr-1.5" strokeWidth={1.75} />
                Neues Gespräch
              </CardTitle>
            </CardHeader>
            <CardBody>
              <form action={createMeetingNote} className="space-y-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-fg">
                    Schüler *
                  </label>
                  <div className="relative">
                    <select
                      name="studentId"
                      required
                      className="w-full appearance-none border border-border bg-bg px-3 py-2 pr-8 text-sm"
                    >
                      <option value="">Schüler auswählen …</option>
                      {allStudents.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.className})
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-fg" />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-fg">
                    Elternteil
                  </label>
                  <input
                    type="text"
                    name="parentName"
                    placeholder="z.B. Frau Müller"
                    className="border border-border bg-bg px-3 py-2 text-sm placeholder:text-muted-fg"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-fg">
                    Datum &amp; Uhrzeit *
                  </label>
                  <input
                    type="datetime-local"
                    name="meetingAt"
                    required
                    className="border border-border bg-bg px-3 py-2 text-sm"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-fg">
                    Gesprächsnotizen *
                  </label>
                  <textarea
                    name="notes"
                    required
                    rows={4}
                    placeholder="Was wurde besprochen …"
                    className="resize-y border border-border bg-bg px-3 py-2 text-sm placeholder:text-muted-fg"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-fg">
                    Follow-up (optional)
                  </label>
                  <textarea
                    name="followUp"
                    rows={2}
                    placeholder="Nächste Schritte …"
                    className="resize-y border border-border bg-bg px-3 py-2 text-sm placeholder:text-muted-fg"
                  />
                </div>

                <button
                  type="submit"
                  className="inline-flex w-full items-center justify-center gap-2 bg-fg px-4 py-2.5 text-sm font-semibold text-bg hover:opacity-90"
                >
                  <Plus className="size-4" />
                  Gespräch speichern
                </button>
              </form>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ── Note card ─────────────────────────────────────────────────────────────────

function NoteCard({
  note,
  deleteAction,
}: {
  note: {
    id: string;
    studentName: string;
    studentId: string;
    className: string;
    parentName: string | null;
    meetingAt: Date;
    notes: string;
    followUp: string | null;
  };
  deleteAction: (id: string) => Promise<void>;
}) {
  const dateStr = note.meetingAt.toLocaleDateString("de-DE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const timeStr = note.meetingAt.toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const excerpt =
    note.notes.length > 180 ? note.notes.slice(0, 180) + " …" : note.notes;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start gap-3">
          <div className="grid size-10 shrink-0 place-items-center bg-fg font-mono text-sm font-bold text-bg">
            {note.studentName
              .split(" ")
              .map((p) => p[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()}
          </div>
          <div>
            <CardTitle>
              <a
                href={`/teach/elterngespraeche?studentId=${note.studentId}`}
                className="hover:underline"
              >
                {note.studentName}
              </a>
            </CardTitle>
            <p className="mt-0.5 text-xs text-muted-fg">
              Klasse {note.className}
              {note.parentName && <> · {note.parentName}</>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-right">
            <p className="font-mono text-xs font-semibold">{dateStr}</p>
            <p className="font-mono text-[10px] text-muted-fg">{timeStr} Uhr</p>
          </div>
          <form action={deleteAction.bind(null, note.id)}>
            <button
              type="submit"
              className="ml-1 grid size-7 place-items-center text-muted-fg transition-colors hover:text-danger"
              title="Löschen"
            >
              <Trash2 className="size-3.5" />
            </button>
          </form>
        </div>
      </CardHeader>
      <CardBody>
        <p className="text-sm leading-relaxed text-fg">{excerpt}</p>
        {note.followUp && (
          <div className="mt-3 flex items-start gap-2 border-t border-border pt-3">
            <CalendarClock className="mt-0.5 size-4 shrink-0 text-warning" strokeWidth={1.75} />
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-warning">
                Follow-up
              </p>
              <p className="mt-0.5 text-sm text-muted-fg">{note.followUp}</p>
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
