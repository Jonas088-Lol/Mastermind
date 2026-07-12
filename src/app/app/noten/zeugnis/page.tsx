/* Copyright 2026 Elian Schock, Jonas Schwenk */
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { PrintButton } from "./PrintButton";

export const metadata: Metadata = { title: "Zeugnis-Vorschau" };

function fmt(n: number) {
  return n.toFixed(1).replace(".", ",");
}

export default async function ZeugnisPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "student") redirect("/");

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      name: true,
      klasse: true,
      school: { select: { name: true } },
    },
  });

  if (!user) redirect("/login");

  const grades = await prisma.grade.findMany({
    where: { studentId: session.userId },
    include: {
      subject: { select: { id: true, name: true } },
    },
    orderBy: { date: "desc" },
  });

  // Group by subject
  const bySubject = new Map<
    string,
    { name: string; grades: (typeof grades)[number][] }
  >();
  for (const g of grades) {
    const key = g.subject.id;
    if (!bySubject.has(key)) {
      bySubject.set(key, { name: g.subject.name, grades: [] });
    }
    bySubject.get(key)!.grades.push(g);
  }

  function weightedAvg(gs: (typeof grades)[number][]) {
    const totalWeight = gs.reduce((s, g) => s + g.weight, 0);
    if (totalWeight === 0) return 0;
    return gs.reduce((s, g) => s + g.value * g.weight, 0) / totalWeight;
  }

  const subjects = Array.from(bySubject.values()).map((s) => ({
    name: s.name,
    avg: weightedAvg(s.grades),
    count: s.grades.length,
  }));

  const overallAvg =
    subjects.length
      ? subjects.reduce((s, x) => s + x.avg, 0) / subjects.length
      : 0;

  const currentYear = new Date().getFullYear();
  const schoolYear = `${currentYear - 1}/${String(currentYear).slice(2)}`;

  const today = new Date().toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          @page { size: A4; margin: 20mm 25mm; }
          body { background: white !important; }
          .zeugnis-doc { border: none !important; box-shadow: none !important; padding: 0 !important; }
        }
      `}</style>

      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="no-print mb-6 flex items-center justify-between">
          <Link
            href="/app/noten"
            className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-fg transition-colors hover:text-fg"
          >
            <ArrowLeft className="size-3.5" />
            Zurück zu Noten
          </Link>
          <PrintButton />
        </div>

        {/* Zeugnis document */}
        <div className="zeugnis-doc border border-border bg-white p-8 text-gray-900 shadow-sm">
          {/* Header */}
          <div className="mb-8 text-center">
            <p className="text-base font-semibold tracking-wide">
              {user.school?.name ?? "Schule"}
            </p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight">
              Halbjahreszeugnis
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Schuljahr {schoolYear}
            </p>
          </div>

          {/* Student info */}
          <div className="mb-8 border border-gray-200 p-4">
            <dl className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm sm:grid-cols-4">
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Name</dt>
                <dd className="mt-1 font-semibold">{user.name}</dd>
              </div>
              {user.klasse && (
                <div>
                  <dt className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Klasse</dt>
                  <dd className="mt-1 font-semibold">{user.klasse}</dd>
                </div>
              )}
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Schuljahr</dt>
                <dd className="mt-1 font-semibold">{schoolYear}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Halbjahr</dt>
                <dd className="mt-1 font-semibold">1. Halbjahr</dd>
              </div>
            </dl>
          </div>

          {/* Grades table */}
          {subjects.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">
              Noch keine Noten eingetragen.
            </p>
          ) : (
            <>
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b-2 border-gray-300">
                    <th className="pb-2 text-left text-[10px] font-bold uppercase tracking-wider text-gray-500">
                      Fach
                    </th>
                    <th className="pb-2 text-center text-[10px] font-bold uppercase tracking-wider text-gray-500">
                      Note (Ø)
                    </th>
                    <th className="pb-2 text-right text-[10px] font-bold uppercase tracking-wider text-gray-500">
                      Bewertungen
                    </th>
                    <th className="pb-2 text-right text-[10px] font-bold uppercase tracking-wider text-gray-500">
                      Tendenz
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {subjects.map((s) => {
                    const rounded = Math.round(s.avg);
                    const grade =
                      rounded <= 1 ? "sehr gut" :
                      rounded === 2 ? "gut" :
                      rounded === 3 ? "befriedigend" :
                      rounded === 4 ? "ausreichend" :
                      rounded === 5 ? "mangelhaft" : "ungenügend";
                    return (
                      <tr key={s.name} className="border-b border-gray-100">
                        <td className="py-2.5 font-medium">{s.name}</td>
                        <td className="py-2.5 text-center">
                          <span className="font-mono text-lg font-bold">{fmt(s.avg)}</span>
                          <span className="ml-2 text-xs text-gray-400">({grade})</span>
                        </td>
                        <td className="py-2.5 text-right font-mono text-xs text-gray-500">{s.count}</td>
                        <td className="py-2.5 text-right text-xs text-gray-400">—</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <div className="mt-4 border-t-2 border-gray-900 pt-3">
                <div className="flex items-baseline justify-between">
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-600">
                    Gesamtdurchschnitt
                  </p>
                  <p className="font-mono text-2xl font-bold">{fmt(overallAvg)}</p>
                </div>
                <p className="mt-0.5 text-xs text-gray-400">
                  {subjects.length} Fächer · {grades.length} Einzelbewertungen
                </p>
              </div>
            </>
          )}

          {/* Signature section */}
          <div className="mt-14 grid grid-cols-2 gap-10 text-sm">
            <div>
              <div className="border-b border-gray-400 pb-1" />
              <p className="mt-1.5 text-xs text-gray-500">Datum · Ort</p>
              <p className="mt-0.5 text-xs text-gray-400">{today}</p>
            </div>
            <div>
              <div className="border-b border-gray-400 pb-1" />
              <p className="mt-1.5 text-xs text-gray-500">Unterschrift Schulleitung</p>
            </div>
            <div>
              <div className="border-b border-gray-400 pb-1" />
              <p className="mt-1.5 text-xs text-gray-500">Unterschrift Klassenlehrkraft</p>
            </div>
            <div>
              <div className="border-b border-gray-400 pb-1" />
              <p className="mt-1.5 text-xs text-gray-500">Unterschrift Erziehungsberechtigte/r</p>
            </div>
          </div>

          <div className="mt-10 border-t border-gray-200 pt-4 text-[10px] text-gray-400">
            <p>
              Dieses Dokument ist eine vorläufige digitale Übersicht aus MasterMind und ersetzt kein amtlich ausgestelltes Schulzeugnis.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
