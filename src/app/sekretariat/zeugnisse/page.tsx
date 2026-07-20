/* Copyright 2026 Elian Schock, Jonas Schwenk */
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Zeugnisübersicht · Sekretariat" };

function gradeColor(avg: number): string {
  if (avg <= 2) return "text-success font-semibold";
  if (avg <= 4) return "text-warning font-semibold";
  return "text-danger font-semibold";
}

/** Erster String-Wert eines Suchparameters, leer = undefined. */
function param(
  sp: { [key: string]: string | string[] | undefined },
  key: string,
): string | undefined {
  const v = sp[key];
  const s = typeof v === "string" ? v.trim() : Array.isArray(v) ? v[0]?.trim() : undefined;
  return s ? s : undefined;
}

/** Notenwert 1,0–6,0 — akzeptiert auch Komma-Eingabe. */
function parseGrade(raw: string | undefined): number | undefined {
  if (!raw) return undefined;
  const n = Number(raw.replace(",", "."));
  return Number.isFinite(n) && n >= 1 && n <= 6 ? n : undefined;
}

export default async function ZeugnissePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  const role = effectiveRole(session);
  if (!["secretary", "rector", "vice_rector", "admin", "super"].includes(role)) redirect("/login");

  const sp = await searchParams;
  const classFilterStr = param(sp, "class");
  const query = param(sp, "q");
  const subjectFilter = param(sp, "subject");
  const minGrade = parseGrade(param(sp, "min"));
  const maxGrade = parseGrade(param(sp, "max"));

  const schoolId = session.schoolId!;

  const [classNames, allSubjects, students] = await Promise.all([
    // Klassenliste immer aus allen Schülern — sonst bliebe bei aktivem Filter
    // nur noch die eine gewählte Klasse in der Leiste stehen. Gelesen wird
    // dasselbe Feld, gegen das auch gefiltert wird (User.klasse).
    prisma.user.findMany({
      where: { schoolId, role: "student", klasse: { not: null } },
      select: { klasse: true },
      distinct: ["klasse"],
    }),
    // Alle Fächer der Schule — nicht nur die mit Noten, damit das Auswahlfeld
    // stabil bleibt, während man filtert.
    prisma.subject.findMany({
      where: { schoolId },
      orderBy: { name: "asc" },
      select: { id: true, name: true, shortName: true },
    }),
    prisma.user.findMany({
      where: {
        schoolId,
        role: "student",
        ...(classFilterStr ? { klasse: classFilterStr } : {}),
      },
      include: {
        studentGrades: {
          include: { subject: { select: { name: true, shortName: true } } },
        },
      },
      orderBy: [{ klasse: "asc" }, { name: "asc" }],
    }),
  ]);

  const klasseValues = (classNames.map((c) => c.klasse).filter(Boolean) as string[]).sort(
    (a, b) => a.localeCompare(b, "de", { numeric: true }),
  );

  // ── Spalten: alle Fächer mit Noten, bei Fachfilter nur das gewählte ────────
  const subjectMap = new Map<string, { name: string; shortName: string }>();
  for (const student of students) {
    for (const grade of student.studentGrades) {
      if (!subjectMap.has(grade.subjectId)) {
        subjectMap.set(grade.subjectId, {
          name: grade.subject.name,
          shortName: grade.subject.shortName,
        });
      }
    }
  }
  // Alle benoteten Fächer — Grundlage für die Pfeil-Navigation.
  const gradedSubjects = Array.from(subjectMap.entries())
    .map(([id, s]) => ({ id, ...s }))
    .sort((a, b) => a.name.localeCompare(b.name, "de"));

  // Angezeigte Spalten: bei Fachfilter nur das gewählte Fach.
  const subjects = subjectFilter
    ? gradedSubjects.filter((s) => s.id === subjectFilter)
    : gradedSubjects;

  // ── Durchschnitte je Schüler ──────────────────────────────────────────────
  type StudentRow = {
    id: string;
    name: string;
    klasse: string | null;
    subjectAverages: Map<string, number>;
    overallAverage: number | null;
    /** Wert, auf den der Notenfilter wirkt. */
    filterAverage: number | null;
  };

  let rows: StudentRow[] = students.map((student) => {
    const subjectAverages = new Map<string, number>();
    const gradesBySubject = new Map<string, number[]>();

    for (const grade of student.studentGrades) {
      const arr = gradesBySubject.get(grade.subjectId) ?? [];
      arr.push(grade.value);
      gradesBySubject.set(grade.subjectId, arr);
    }

    for (const [subjectId, values] of gradesBySubject.entries()) {
      subjectAverages.set(subjectId, values.reduce((sum, v) => sum + v, 0) / values.length);
    }

    const allValues = student.studentGrades.map((g: { value: number }) => g.value);
    const overallAverage =
      allValues.length > 0 ? allValues.reduce((sum, v) => sum + v, 0) / allValues.length : null;

    return {
      id: student.id,
      name: student.name,
      klasse: student.klasse,
      subjectAverages,
      overallAverage,
      // Ist ein Fach gewählt, filtert die Note innerhalb dieses Fachs.
      filterAverage: subjectFilter
        ? (subjectAverages.get(subjectFilter) ?? null)
        : overallAverage,
    };
  });

  // ── Filter (in JS: SQLite kennt kein `mode: "insensitive"`) ───────────────
  if (query) {
    const q = query.toLocaleLowerCase("de");
    rows = rows.filter(
      (r) =>
        r.name.toLocaleLowerCase("de").includes(q) ||
        (r.klasse ?? "").toLocaleLowerCase("de").includes(q),
    );
  }

  // Fachfilter: nur Schüler, die in diesem Fach überhaupt Noten haben.
  if (subjectFilter) {
    rows = rows.filter((r) => r.subjectAverages.has(subjectFilter));
  }

  if (minGrade != null) {
    rows = rows.filter((r) => r.filterAverage != null && r.filterAverage >= minGrade);
  }
  if (maxGrade != null) {
    rows = rows.filter((r) => r.filterAverage != null && r.filterAverage <= maxGrade);
  }

  // ── Seiten ────────────────────────────────────────────────────────────────
  const PER_PAGE_OPTIONS = [25, 50, 100, 250] as const;
  const perPageRaw = Number(param(sp, "perPage"));
  const perPage = PER_PAGE_OPTIONS.includes(perPageRaw as (typeof PER_PAGE_OPTIONS)[number])
    ? perPageRaw
    : 25;

  const totalRows = rows.length;
  const pageCount = Math.max(1, Math.ceil(totalRows / perPage));
  // Seite klemmen: sonst zeigt eine alte Seitenzahl nach dem Filtern ins Leere.
  const pageRaw = Number(param(sp, "page"));
  const page = Number.isInteger(pageRaw) && pageRaw >= 1 ? Math.min(pageRaw, pageCount) : 1;

  const firstIndex = (page - 1) * perPage;
  const pageRows = rows.slice(firstIndex, firstIndex + perPage);

  /**
   * Seitenzahlen mit Auslassungen: 1 … 4 5 [6] 7 8 … 20.
   * `null` steht für „…". Bei wenigen Seiten werden alle gezeigt.
   */
  const pageNumbers: (number | null)[] = (() => {
    if (pageCount <= 7) return Array.from({ length: pageCount }, (_, i) => i + 1);
    const out: (number | null)[] = [1];
    const from = Math.max(2, page - 1);
    const to = Math.min(pageCount - 1, page + 1);
    if (from > 2) out.push(null);
    for (let n = from; n <= to; n++) out.push(n);
    if (to < pageCount - 1) out.push(null);
    out.push(pageCount);
    return out;
  })();

  const hasFilters = Boolean(query || subjectFilter || minGrade != null || maxGrade != null);
  const activeSubject = subjectFilter
    ? allSubjects.find((s) => s.id === subjectFilter)
    : undefined;

  /** Link auf dieselbe Seite mit geänderten Parametern — Rest bleibt erhalten. */
  function hrefWith(overrides: Record<string, string | undefined>): string {
    const next = new URLSearchParams();
    const current: Record<string, string | undefined> = {
      class: classFilterStr,
      q: query,
      subject: subjectFilter,
      min: param(sp, "min"),
      max: param(sp, "max"),
      perPage: param(sp, "perPage"),
      page: param(sp, "page"),
      ...overrides,
    };
    for (const [k, v] of Object.entries(current)) if (v) next.set(k, v);
    const qs = next.toString();
    return qs ? `/sekretariat/zeugnisse?${qs}` : "/sekretariat/zeugnisse";
  }

  const inputClass =
    "w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-fg outline-none transition-colors placeholder:text-muted-fg focus:border-brand";

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">Sekretariat</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Zeugnisübersicht</h1>
        <p className="mt-1 text-sm text-muted-fg">
          {totalRows === 0 ? 0 : firstIndex + 1}–{firstIndex + pageRows.length} von {totalRows} Schüler
          {classFilterStr ? ` · Klasse ${classFilterStr}` : ""}
          {activeSubject ? ` · ${activeSubject.name}` : ""}
        </p>
      </header>

      {/* ── Suche & Filter ───────────────────────────────────────────────── */}
      <form method="get" className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4">
        {/* Klasse kommt aus den Tabs — beim Suchen nicht verlieren. */}
        {classFilterStr && <input type="hidden" name="class" value={classFilterStr} />}

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <label htmlFor="zs-q" className="mb-1.5 block text-xs font-medium text-muted-fg">
              Name oder Klasse
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-fg" />
              <input
                id="zs-q"
                name="q"
                type="search"
                defaultValue={query ?? ""}
                placeholder="z. B. Meier oder 9b"
                className={cn(inputClass, "pl-9")}
              />
            </div>
          </div>

          <div>
            <label htmlFor="zs-subject" className="mb-1.5 block text-xs font-medium text-muted-fg">
              Fach
            </label>
            <select id="zs-subject" name="subject" defaultValue={subjectFilter ?? ""} className={inputClass}>
              <option value="">Alle Fächer</option>
              {allSubjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="zs-perpage" className="mb-1.5 block text-xs font-medium text-muted-fg">
              Pro Seite
            </label>
            <select id="zs-perpage" name="perPage" defaultValue={String(perPage)} className={inputClass}>
              {PER_PAGE_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n} Schüler
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-fg">
              Note {activeSubject ? `in ${activeSubject.shortName}` : "(Gesamt-Ø)"}
            </label>
            <div className="flex items-center gap-2">
              <input
                name="min"
                type="number"
                step="0.1"
                min="1"
                max="6"
                defaultValue={param(sp, "min") ?? ""}
                placeholder="von"
                aria-label="Note von"
                className={inputClass}
              />
              <span className="text-xs text-muted-fg">bis</span>
              <input
                name="max"
                type="number"
                step="0.1"
                min="1"
                max="6"
                defaultValue={param(sp, "max") ?? ""}
                placeholder="bis"
                aria-label="Note bis"
                className={inputClass}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 rounded-lg bg-fg px-3 py-2 text-xs font-semibold text-bg transition-opacity hover:opacity-90"
          >
            <Search className="size-3.5" />
            Suchen
          </button>
          {hasFilters && (
            <Link
              href={classFilterStr ? `/sekretariat/zeugnisse?class=${encodeURIComponent(classFilterStr)}` : "/sekretariat/zeugnisse"}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold transition-colors hover:bg-bg"
            >
              <X className="size-3.5" />
              Filter zurücksetzen
            </Link>
          )}
          <p className="text-xs text-muted-fg">
            Der Notenbereich bezieht sich auf {activeSubject ? "das gewählte Fach" : "den Gesamtdurchschnitt"}.
          </p>
        </div>
      </form>

      {/* ── Klassen-Tabs ─────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2 border-b border-border pb-3">
        <Link
          href={hrefWith({ class: undefined, page: undefined })}
          className={cn(
            "px-3 py-1.5 text-sm font-medium transition-colors",
            !classFilterStr ? "border-b-2 border-fg text-fg" : "text-muted-fg hover:text-fg",
          )}
        >
          Alle
        </Link>
        {klasseValues.map((k) => (
          <Link
            key={k}
            href={hrefWith({ class: k, page: undefined })}
            className={cn(
              "px-3 py-1.5 text-sm font-medium transition-colors",
              classFilterStr === k ? "border-b-2 border-fg text-fg" : "text-muted-fg hover:text-fg",
            )}
          >
            {k}
          </Link>
        ))}
        {klasseValues.length === 0 && (
          <p className="self-center text-xs text-muted-fg">Noch keine Klassen zugeordnet.</p>
        )}
      </div>

      {totalRows === 0 ? (
        <div className="grid place-items-center border border-dashed border-border py-16 text-center">
          <p className="text-sm text-muted-fg">
            {hasFilters
              ? "Keine Schüler passen zu diesen Filtern."
              : `Keine Schüler${classFilterStr ? ` in Klasse ${classFilterStr}` : ""} gefunden.`}
          </p>
          {hasFilters && (
            <Link href="/sekretariat/zeugnisse" className="mt-3 text-xs font-semibold text-brand hover:underline">
              Alle Filter zurücksetzen
            </Link>
          )}
        </div>
      ) : subjects.length === 0 ? (
        <div className="grid place-items-center border border-dashed border-border py-16">
          <p className="text-sm text-muted-fg">Noch keine Noten eingetragen.</p>
        </div>
      ) : (
        <div className="overflow-x-auto border border-border">
          <table className="w-full min-w-[600px] text-sm">
            <thead>
              <tr className="border-b border-border bg-surface text-xs font-semibold uppercase tracking-wider text-muted-fg">
                <th className="sticky left-0 bg-surface px-5 py-3 text-left">Schüler</th>
                <th className="px-3 py-3 text-center text-muted-fg/60">Kl.</th>
                {subjects.map((s) => (
                  <th key={s.id} className="px-3 py-3 text-center" title={s.name}>
                    {s.shortName}
                  </th>
                ))}
                <th className="px-5 py-3 text-center">Gesamt-Ø</th>
                <th className="px-5 py-3 text-center">Zeugnis</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {pageRows.map((row) => (
                <tr key={row.id} className="hover:bg-surface">
                  <td className="sticky left-0 bg-bg px-5 py-3 font-medium">{row.name}</td>
                  <td className="px-3 py-3 text-center font-mono text-xs text-muted-fg">
                    {row.klasse ?? "—"}
                  </td>
                  {subjects.map((s) => {
                    const avg = row.subjectAverages.get(s.id);
                    return (
                      <td key={s.id} className="px-3 py-3 text-center font-mono text-xs">
                        {avg != null ? (
                          <span className={gradeColor(avg)}>{avg.toFixed(1)}</span>
                        ) : (
                          <span className="text-muted-fg/40">—</span>
                        )}
                      </td>
                    );
                  })}
                  <td className="px-5 py-3 text-center font-mono text-xs">
                    {row.overallAverage != null ? (
                      <span className={cn("font-bold", gradeColor(row.overallAverage))}>
                        {row.overallAverage.toFixed(1)}
                      </span>
                    ) : (
                      <span className="text-muted-fg/40">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-center">
                    <Link
                      href={`/sekretariat/zeugnisse/${row.id}`}
                      className="text-xs font-semibold text-brand hover:underline"
                    >
                      Öffnen
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Seiten ───────────────────────────────────────────────────────── */}
      {totalRows > 0 && pageCount > 1 && (
        <nav
          aria-label="Seiten"
          className="flex flex-col items-center justify-between gap-3 border-t border-border pt-4 sm:flex-row"
        >
          <p className="text-xs text-muted-fg">
            Seite {page} von {pageCount}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-1">
            {page > 1 ? (
              <Link
                href={hrefWith({ page: String(page - 1) })}
                className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold transition-colors hover:border-brand/40 hover:bg-surface"
              >
                <ChevronLeft className="size-3.5" />
                Zurück
              </Link>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-lg border border-border/50 px-2.5 py-1.5 text-xs font-semibold text-muted-fg/50">
                <ChevronLeft className="size-3.5" />
                Zurück
              </span>
            )}

            {pageNumbers.map((n, i) =>
              n === null ? (
                <span key={`gap-${i}`} className="px-1 text-xs text-muted-fg">
                  …
                </span>
              ) : (
                <Link
                  key={n}
                  href={hrefWith({ page: String(n) })}
                  aria-current={n === page ? "page" : undefined}
                  className={cn(
                    "min-w-8 rounded-lg border px-2 py-1.5 text-center text-xs font-semibold transition-colors",
                    n === page
                      ? "border-brand bg-brand/10 text-brand"
                      : "border-border text-muted-fg hover:border-brand/40 hover:bg-surface hover:text-fg",
                  )}
                >
                  {n}
                </Link>
              ),
            )}

            {page < pageCount ? (
              <Link
                href={hrefWith({ page: String(page + 1) })}
                className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold transition-colors hover:border-brand/40 hover:bg-surface"
              >
                Weiter
                <ChevronRight className="size-3.5" />
              </Link>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-lg border border-border/50 px-2.5 py-1.5 text-xs font-semibold text-muted-fg/50">
                Weiter
                <ChevronRight className="size-3.5" />
              </span>
            )}
          </div>
        </nav>
      )}

      {/* Legend */}
      {subjects.length > 0 && (
        <div className="flex flex-wrap gap-4 text-xs text-muted-fg">
          <span className="font-semibold text-success">≤ 2,0 sehr gut / gut</span>
          <span className="font-semibold text-warning">≤ 4,0 befriedigend / ausreichend</span>
          <span className="font-semibold text-danger">&gt; 4,0 mangelhaft / ungenügend</span>
        </div>
      )}
    </div>
  );
}
