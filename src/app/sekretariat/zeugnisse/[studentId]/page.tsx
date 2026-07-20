/* Copyright 2026 Elian Schock, Jonas Schwenk */
// Bayrische Zeugnisvorlage — Jahres-/Zwischenzeugnis nach dem Muster der
// bayerischen Schulordnungen (Kopf, Notenstufen in Worten, Bemerkungen,
// Unterschriften von Schulleitung und Klassenleitung). Druck über den
// Browser (@media print), wie bei allen Print-Ausgaben der App.
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { canManageSchool } from "@/lib/school-admin";
import { PrintButton } from "./PrintButton";

export const metadata: Metadata = { title: "Zeugnis · Sekretariat" };

const NOTE_WORT: Record<number, string> = {
  1: "sehr gut",
  2: "gut",
  3: "befriedigend",
  4: "ausreichend",
  5: "mangelhaft",
  6: "ungenügend",
};

const SCHULART_LABEL: Record<string, string> = {
  GRUNDSCHULE: "Grundschule",
  MITTELSCHULE: "Mittelschule",
  REALSCHULE: "Realschule",
  GYMNASIUM: "Gymnasium",
  WIRTSCHAFTSSCHULE: "Wirtschaftsschule",
  FOS: "Fachoberschule",
  BOS: "Berufsoberschule",
  FOERDERSCHULE: "Förderschule",
  GESAMTSCHULE: "Gesamtschule",
};

export default async function BayerischesZeugnisPage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canManageSchool(effectiveRole(session))) redirect("/login");

  const { studentId } = await params;

  const student = await prisma.user.findUnique({
    where: { id: studentId },
    select: {
      id: true,
      name: true,
      klasse: true,
      birthDate: true,
      schoolId: true,
      role: true,
      schulart: true,
      jahrgangsstufe: true,
      school: { select: { name: true, city: true } },
      schoolClass: { select: { name: true } },
    },
  });

  // Nur Schüler der eigenen Schule.
  if (!student || student.role !== "student" || student.schoolId !== session.schoolId) {
    notFound();
  }

  const grades = await prisma.grade.findMany({
    where: { studentId: student.id },
    include: { subject: { select: { id: true, name: true } } },
  });

  // Gewichteter Schnitt je Fach → gerundete Zeugnisnote.
  const bySubject = new Map<string, { name: string; sum: number; weight: number }>();
  for (const g of grades) {
    const e = bySubject.get(g.subject.id) ?? { name: g.subject.name, sum: 0, weight: 0 };
    e.sum += g.value * g.weight;
    e.weight += g.weight;
    bySubject.set(g.subject.id, e);
  }
  const faecher = Array.from(bySubject.values())
    .filter((e) => e.weight > 0)
    .map((e) => {
      const avg = e.sum / e.weight;
      const note = Math.min(6, Math.max(1, Math.round(avg)));
      return { name: e.name, avg, note, wort: NOTE_WORT[note] };
    })
    .sort((a, b) => a.name.localeCompare(b.name, "de"));

  const gesamt =
    faecher.length > 0 ? faecher.reduce((s, f) => s + f.avg, 0) / faecher.length : null;

  const now = new Date();
  const month = now.getMonth() + 1;
  const schoolYearStart = month >= 8 ? now.getFullYear() : now.getFullYear() - 1;
  const schuljahr = `${schoolYearStart}/${schoolYearStart + 1}`;
  // Zwischenzeugnis im Februar/März, sonst Jahreszeugnis.
  const zeugnisArt = month >= 2 && month <= 3 ? "Zwischenzeugnis" : "Jahreszeugnis";

  const klasse = student.schoolClass?.name ?? student.klasse ?? "—";
  const ort = student.school?.city ?? "";
  const heute = now.toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" });
  const geburtsdatum = student.birthDate
    ? student.birthDate.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" })
    : null;

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          @page { size: A4; margin: 20mm 22mm; }
          body { background: white !important; }
          .zeugnis-doc { border: none !important; box-shadow: none !important; padding: 0 !important; }
        }
      `}</style>

      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="no-print mb-6 flex items-center justify-between">
          <Link
            href="/sekretariat/zeugnisse"
            className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-fg transition-colors hover:text-fg"
          >
            <ArrowLeft className="size-3.5" />
            Zurück zur Zeugnisübersicht
          </Link>
          <PrintButton />
        </div>

        {/* Zeugnisdokument nach bayerischem Muster */}
        <div className="zeugnis-doc border border-border bg-white p-10 text-gray-900 shadow-sm">
          {/* Kopf */}
          <div className="text-center">
            <p className="text-xs uppercase tracking-[0.25em] text-gray-500">Freistaat Bayern</p>
            <p className="mt-2 text-base font-semibold">{student.school?.name ?? "Schule"}</p>
            {student.schulart && (
              <p className="text-sm text-gray-500">
                {SCHULART_LABEL[student.schulart] ?? student.schulart}
              </p>
            )}
            <h1 className="mt-6 text-3xl font-bold tracking-tight">{zeugnisArt}</h1>
            <p className="mt-1 text-sm text-gray-600">Schuljahr {schuljahr}</p>
          </div>

          {/* Schülerdaten */}
          <div className="mt-8 text-center text-sm leading-7">
            <p className="text-gray-600">für</p>
            <p className="text-xl font-bold">{student.name}</p>
            <p className="text-gray-600">
              {geburtsdatum && <>geboren am {geburtsdatum} · </>}
              Klasse {klasse}
              {student.jahrgangsstufe != null && <> · Jahrgangsstufe {student.jahrgangsstufe}</>}
            </p>
          </div>

          {/* Leistungen */}
          <div className="mt-10">
            <h2 className="border-b-2 border-gray-800 pb-1 text-sm font-bold uppercase tracking-wider">
              Leistungen in den einzelnen Fächern
            </h2>
            {faecher.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-400">Noch keine Noten eingetragen.</p>
            ) : (
              <table className="mt-2 w-full border-collapse text-sm">
                <tbody>
                  {faecher.map((f) => (
                    <tr key={f.name} className="border-b border-gray-200">
                      <td className="py-2 font-medium">{f.name}</td>
                      <td className="py-2 text-right">
                        <span className="mr-3 text-xs text-gray-400">({f.note})</span>
                        <span className="font-semibold">{f.wort}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {gesamt != null && (
              <p className="mt-3 text-right text-xs text-gray-500">
                Gesamtdurchschnitt: {gesamt.toFixed(2).replace(".", ",")}
              </p>
            )}
          </div>

          {/* Bemerkungen */}
          <div className="mt-10">
            <h2 className="border-b-2 border-gray-800 pb-1 text-sm font-bold uppercase tracking-wider">
              Bemerkungen
            </h2>
            <div className="mt-2 h-20 border-b border-dotted border-gray-300" />
          </div>

          {/* Ort, Datum, Unterschriften */}
          <p className="mt-12 text-sm">
            {ort ? `${ort}, ` : ""}den {heute}
          </p>
          <div className="mt-14 grid grid-cols-2 gap-12 text-sm">
            <div>
              <div className="border-b border-gray-500" />
              <p className="mt-1.5 text-xs text-gray-500">Schulleiter/in</p>
            </div>
            <div>
              <div className="border-b border-gray-500" />
              <p className="mt-1.5 text-xs text-gray-500">Klassenleiter/in</p>
            </div>
            <div className="col-span-2">
              <div className="mt-6 border-b border-gray-500" />
              <p className="mt-1.5 text-xs text-gray-500">
                Kenntnis genommen (Erziehungsberechtigte/r)
              </p>
            </div>
          </div>

          <div className="mt-10 border-t border-gray-200 pt-4 text-[10px] text-gray-400">
            <p>
              Notenstufen: sehr gut (1), gut (2), befriedigend (3), ausreichend (4), mangelhaft (5),
              ungenügend (6). Dieses Dokument ist eine digitale Vorlage aus MasterMind nach
              bayerischem Zeugnismuster und ersetzt kein amtlich ausgestelltes Schulzeugnis.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
