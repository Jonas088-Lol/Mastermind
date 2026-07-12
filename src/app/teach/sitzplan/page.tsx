/* Copyright 2026 Elian Schock, Jonas Schwenk */
import { ChevronDown, Grid3X3, Users } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { cn } from "@/lib/utils";
import { saveSeatingPlan } from "./actions";

export const metadata: Metadata = { title: "Sitzplan · Lehrer" };

interface PageProps {
  searchParams: Promise<{ classId?: string; edit?: string }>;
}

type SeatEntry = { row: number; col: number; studentId: string | null };

function parseLayout(raw: string): SeatEntry[] {
  try {
    return JSON.parse(raw) as SeatEntry[];
  } catch {
    return [];
  }
}

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0] ?? "")
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default async function SitzplanPage({ searchParams }: PageProps) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "teacher") redirect("/");

  const { classId: selectedClassId, edit: editParam } = await searchParams;

  // All classes this teacher teaches (deduplicated)
  const tscEntries = await prisma.teacherSubjectClass.findMany({
    where: { teacherId: session.userId },
    include: {
      class: {
        include: {
          students: { select: { id: true, name: true } },
          seatingPlans: { orderBy: { updatedAt: "desc" }, take: 1 },
        },
      },
    },
    distinct: ["classId"],
    orderBy: { class: { name: "asc" } },
  });

  const classes = tscEntries.map((t) => ({
    id: t.class.id,
    name: t.class.name,
    students: t.class.students,
    seatingPlan: t.class.seatingPlans[0] ?? null,
  }));

  const activeClass = selectedClassId
    ? classes.find((c) => c.id === selectedClassId) ?? classes[0]
    : classes[0];

  const isEditing = editParam === "1" || !activeClass?.seatingPlan;

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">
            Lehrer-Cockpit
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Sitzplan</h1>
          <p className="mt-1 text-sm text-muted-fg">
            {classes.length} Klassen · Sitzpläne verwalten
          </p>
        </div>
      </header>

      {classes.length === 0 ? (
        <Card>
          <CardBody>
            <p className="text-sm text-muted-fg">
              Du hast noch keine Klassen zugewiesen bekommen.
            </p>
          </CardBody>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          {/* Class list */}
          <aside className="space-y-2">
            <p className="px-1 text-[10px] font-semibold uppercase tracking-wider text-muted-fg">
              Meine Klassen
            </p>
            {classes.map((cls) => (
              <a
                key={cls.id}
                href={`/teach/sitzplan?classId=${cls.id}`}
                className={cn(
                  "flex items-center gap-3 border border-border px-4 py-3 text-sm font-medium transition-colors",
                  activeClass?.id === cls.id
                    ? "border-fg bg-fg text-bg"
                    : "bg-bg hover:bg-surface"
                )}
              >
                <Users className="size-4 shrink-0" strokeWidth={1.75} />
                <span className="flex-1">Klasse {cls.name}</span>
                {cls.seatingPlan ? (
                  <Badge variant="success">Aktiv</Badge>
                ) : (
                  <Badge variant="warning">Neu</Badge>
                )}
              </a>
            ))}
          </aside>

          {/* Main content */}
          <div className="space-y-6">
            {activeClass ? (
              <>
                {/* Show existing plan */}
                {activeClass.seatingPlan && !isEditing && (
                  <Card>
                    <CardHeader>
                      <div>
                        <CardTitle>
                          <Grid3X3 className="inline size-4 mr-2" strokeWidth={1.75} />
                          Klasse {activeClass.name} · Sitzplan
                        </CardTitle>
                        <p className="mt-1 text-sm text-muted-fg">
                          {activeClass.seatingPlan.rows} Reihen ×{" "}
                          {activeClass.seatingPlan.cols} Spalten
                        </p>
                      </div>
                      <a
                        href={`/teach/sitzplan?classId=${activeClass.id}&edit=1`}
                        className="inline-flex items-center gap-1.5 border border-border bg-bg px-3 py-1.5 text-xs font-semibold hover:bg-surface"
                      >
                        Bearbeiten
                      </a>
                    </CardHeader>
                    <CardBody>
                      <SeatingGrid
                        rows={activeClass.seatingPlan.rows}
                        cols={activeClass.seatingPlan.cols}
                        layout={parseLayout(activeClass.seatingPlan.layout)}
                        students={activeClass.students}
                        readonly
                      />
                    </CardBody>
                  </Card>
                )}

                {/* Edit / create form */}
                {isEditing && (
                  <Card>
                    <CardHeader>
                      <div>
                        <CardTitle>
                          {activeClass.seatingPlan ? "Sitzplan bearbeiten" : "Sitzplan erstellen"}
                          {" · "}Klasse {activeClass.name}
                        </CardTitle>
                        <p className="mt-1 text-sm text-muted-fg">
                          Weise jedem Platz einen Schüler zu.
                        </p>
                      </div>
                    </CardHeader>
                    <CardBody>
                      <SeatingForm
                        classId={activeClass.id}
                        students={activeClass.students}
                        existing={
                          activeClass.seatingPlan
                            ? {
                                rows: activeClass.seatingPlan.rows,
                                cols: activeClass.seatingPlan.cols,
                                layout: parseLayout(activeClass.seatingPlan.layout),
                              }
                            : undefined
                        }
                        saveAction={saveSeatingPlan}
                      />
                    </CardBody>
                  </Card>
                )}
              </>
            ) : (
              <Card>
                <CardBody>
                  <p className="text-sm text-muted-fg">Bitte wähle eine Klasse aus.</p>
                </CardBody>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Read-only seating grid display ────────────────────────────────────────────

function SeatingGrid({
  rows,
  cols,
  layout,
  students,
  readonly,
}: {
  rows: number;
  cols: number;
  layout: SeatEntry[];
  students: { id: string; name: string }[];
  readonly?: boolean;
}) {
  const studentMap = new Map(students.map((s) => [s.id, s]));

  return (
    <div className="overflow-x-auto">
      <div
        className="inline-grid gap-2"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(80px, 1fr))` }}
      >
        {Array.from({ length: rows }, (_, rowIdx) =>
          Array.from({ length: cols }, (_, colIdx) => {
            const seat = layout.find((s) => s.row === rowIdx && s.col === colIdx);
            const student = seat?.studentId ? studentMap.get(seat.studentId) : null;
            return (
              <div
                key={`${rowIdx}-${colIdx}`}
                className={cn(
                  "flex min-h-[64px] flex-col items-center justify-center border border-border p-1.5 text-center text-xs",
                  student ? "bg-brand/8" : "bg-surface"
                )}
              >
                {student ? (
                  <>
                    <div className="mb-1 grid size-7 shrink-0 place-items-center bg-fg font-mono text-[10px] font-bold text-bg">
                      {initials(student.name)}
                    </div>
                    <p className="truncate w-full font-medium leading-tight text-center text-[10px]">
                      {student.name.split(" ")[0]}
                    </p>
                  </>
                ) : (
                  <span className="text-muted-fg text-[10px]">—</span>
                )}
              </div>
            );
          })
        )}
      </div>
      <p className="mt-3 text-[10px] uppercase tracking-wider text-muted-fg text-center">
        ↑ Tafel
      </p>
    </div>
  );
}

// ── Edit form with row/col config and student dropdowns ──────────────────────

function SeatingForm({
  classId,
  students,
  existing,
  saveAction,
}: {
  classId: string;
  students: { id: string; name: string }[];
  existing?: { rows: number; cols: number; layout: SeatEntry[] };
  saveAction: (formData: FormData) => Promise<void>;
}) {
  const defaultRows = existing?.rows ?? 4;
  const defaultCols = existing?.cols ?? 5;

  return (
    <form action={saveAction} className="space-y-6">
      <input type="hidden" name="classId" value={classId} />

      {/* Grid config */}
      <div className="flex flex-wrap gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-fg">
            Reihen
          </label>
          <div className="relative">
            <select
              name="rows"
              defaultValue={String(defaultRows)}
              className="appearance-none border border-border bg-bg px-3 py-2 pr-8 text-sm font-medium"
            >
              {[2, 3, 4, 5, 6, 7, 8].map((n) => (
                <option key={n} value={String(n)}>
                  {n}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-fg" />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-fg">
            Spalten
          </label>
          <div className="relative">
            <select
              name="cols"
              defaultValue={String(defaultCols)}
              className="appearance-none border border-border bg-bg px-3 py-2 pr-8 text-sm font-medium"
            >
              {[2, 3, 4, 5, 6, 7, 8].map((n) => (
                <option key={n} value={String(n)}>
                  {n}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-fg" />
          </div>
        </div>
      </div>

      {/* Seat assignment grid */}
      <div>
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-fg">
          Sitzplatzzuweisung (Tafel oben)
        </p>
        <div
          className="inline-grid gap-2"
          style={{ gridTemplateColumns: `repeat(${defaultCols}, minmax(120px, 1fr))` }}
        >
          {Array.from({ length: defaultRows }, (_, rowIdx) =>
            Array.from({ length: defaultCols }, (_, colIdx) => {
              const seat = existing?.layout.find(
                (s) => s.row === rowIdx && s.col === colIdx
              );
              const fieldName = `seat_${rowIdx}_${colIdx}`;
              return (
                <div
                  key={`${rowIdx}-${colIdx}`}
                  className="flex flex-col gap-1 border border-border bg-surface p-2"
                >
                  <p className="font-mono text-[9px] uppercase tracking-wider text-muted-fg">
                    R{rowIdx + 1}/S{colIdx + 1}
                  </p>
                  <div className="relative">
                    <select
                      name={fieldName}
                      defaultValue={seat?.studentId ?? ""}
                      className="w-full appearance-none border border-border bg-bg px-2 py-1.5 pr-6 text-xs"
                    >
                      <option value="">— leer —</option>
                      {students.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 size-3 -translate-y-1/2 text-muted-fg" />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Hidden layout field — built from selects via native form submission */}
      {/* We use a hidden textarea that gets its value set by the form submit */}
      <LayoutSubmitHelper
        rows={defaultRows}
        cols={defaultCols}
        studentIds={students.map((s) => s.id)}
      />

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          className="inline-flex items-center gap-2 bg-fg px-5 py-2.5 text-sm font-semibold text-bg hover:opacity-90"
        >
          Sitzplan speichern
        </button>
        <button
          type="button"
          id="sitzplan-shuffle"
          className="inline-flex items-center gap-2 border border-border bg-bg px-5 py-2.5 text-sm font-semibold hover:bg-surface"
        >
          🎲 Zufällig verteilen
        </button>
        {existing && (
          <a
            href={`/teach/sitzplan?classId=${classId}`}
            className="text-sm font-medium text-muted-fg hover:text-fg"
          >
            Abbrechen
          </a>
        )}
      </div>
    </form>
  );
}

// Build the JSON layout from individual seat_R_C fields server-side via a
// hidden input generated by client JS; for SSR-only we encode via a script tag.
function LayoutSubmitHelper({
  rows,
  cols,
  studentIds,
}: {
  rows: number;
  cols: number;
  studentIds: string[];
}) {
  return (
    <>
      <input type="hidden" name="layout" id="sitzplan-layout" value="[]" />
      <script
        dangerouslySetInnerHTML={{
          __html: `
(function(){
  var form = document.querySelector('form[action]');
  if(!form) return;
  var studentIds = ${JSON.stringify(studentIds)};
  var shuffleBtn = document.getElementById('sitzplan-shuffle');
  if(shuffleBtn){
    shuffleBtn.addEventListener('click', function(){
      if(!confirm('Zufällig verteilen? Die aktuelle Sitzordnung wird überschrieben.')) return;
      var ids = studentIds.slice();
      for(var i=ids.length-1;i>0;i--){
        var j = Math.floor(Math.random()*(i+1));
        var t = ids[i]; ids[i] = ids[j]; ids[j] = t;
      }
      var k = 0;
      for(var r=0;r<${rows};r++){
        for(var c=0;c<${cols};c++){
          var sel = form.elements['seat_'+r+'_'+c];
          if(!sel) continue;
          sel.value = k < ids.length ? ids[k++] : '';
        }
      }
    });
  }
  form.addEventListener('submit', function(e){
    var seats = [];
    for(var r=0;r<${rows};r++){
      for(var c=0;c<${cols};c++){
        var sel = form.elements['seat_'+r+'_'+c];
        if(sel && sel.value){
          seats.push({row:r,col:c,studentId:sel.value});
        }
      }
    }
    var hidden = form.elements['layout'];
    if(hidden) hidden.value = JSON.stringify(seats);
  });
})();
          `.trim(),
        }}
      />
    </>
  );
}
