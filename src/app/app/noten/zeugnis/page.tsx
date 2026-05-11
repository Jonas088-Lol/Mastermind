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

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white; }
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
        <div className="border border-border bg-white p-8 text-gray-900 shadow-sm">
          <div className="mb-8 text-center">
            <p className="text-lg font-bold">
              {user.school?.name ?? "Schule"}
            </p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight">
              Halbjahreszeugnis
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Schuljahr {schoolYear}
            </p>
          </div>

          <div className="mb-8 border-t border-gray-200 pt-6">
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Name
                </dt>
                <dd className="mt-1 font-semibold">{user.name}</dd>
              </div>
              {user.klasse && (
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Klasse
                  </dt>
                  <dd className="mt-1 font-semibold">{user.klasse}</dd>
                </div>
              )}
            </dl>
          </div>

          {subjects.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">
              Noch keine Noten eingetragen.
            </p>
          ) : (
            <>
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
                      Fach
                    </th>
                    <th className="py-2 text-right text-xs font-semibold uppercase tracking-wider text-gray-400">
                      Ø Note
                    </th>
                    <th className="py-2 text-right text-xs font-semibold uppercase tracking-wider text-gray-400">
                      Bewertungen
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {subjects.map((s) => (
                    <tr key={s.name} className="border-b border-gray-100">
                      <td className="py-3 font-medium">{s.name}</td>
                      <td className="py-3 text-right font-mono font-bold">
                        {fmt(s.avg)}
                      </td>
                      <td className="py-3 text-right font-mono text-gray-500">
                        {s.count}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="mt-6 border-t-2 border-gray-900 pt-4">
                <div className="flex items-baseline justify-between">
                  <p className="text-sm font-bold uppercase tracking-wider">
                    Gesamtdurchschnitt
                  </p>
                  <p className="font-mono text-2xl font-bold">
                    {fmt(overallAvg)}
                  </p>
                </div>
                <p className="mt-1 text-xs text-gray-400">
                  Berechnet aus {subjects.length} Fächern ·{" "}
                  {grades.length} Bewertungen gesamt
                </p>
              </div>
            </>
          )}

          <div className="mt-12 border-t border-gray-200 pt-6 text-xs text-gray-400">
            <p>
              Dieses Dokument ist eine vorläufige Übersicht und kein offizielles
              Zeugnis.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
