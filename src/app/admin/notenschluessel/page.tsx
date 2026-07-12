/* Copyright 2026 Elian Schock, Jonas Schwenk */
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { saveGradeScale } from "./actions";

export const metadata: Metadata = { title: "Notenschlüssel · Admin" };

const DEFAULT_ENTRIES = [
  { grade: 1, label: "Sehr gut",       minPercent: 87 },
  { grade: 2, label: "Gut",            minPercent: 73 },
  { grade: 3, label: "Befriedigend",   minPercent: 59 },
  { grade: 4, label: "Ausreichend",    minPercent: 45 },
  { grade: 5, label: "Mangelhaft",     minPercent: 18 },
  { grade: 6, label: "Ungenügend",     minPercent: 0  },
];

export default async function AdminNotenschluesselPage() {
  const session = await getSession();
  if (!session || effectiveRole(session) !== "admin") redirect("/admin");

  const existing = await prisma.gradeScale.findUnique({
    where: { schoolId: session.schoolId ?? "" },
    include: { entries: { orderBy: { grade: "asc" } } },
  });

  const entries = existing?.entries.length
    ? existing.entries
    : DEFAULT_ENTRIES;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">Schul-Admin</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Notenschlüssel</h1>
        <p className="mt-1 text-sm text-muted-fg">
          Legt fest, ab wie viel Prozent welche Note vergeben wird. Lehrer können diesen Schlüssel als Rechner nutzen.
        </p>
      </header>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Schlüssel konfigurieren</CardTitle>
            <p className="mt-0.5 text-sm text-muted-fg">Jede Note erhält einen Mindestwert in Prozent.</p>
          </div>
        </CardHeader>
        <CardBody>
          <form action={saveGradeScale} className="flex flex-col gap-5">
            {/* Scale name */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="name" className="text-sm font-semibold">Name des Schlüssels</label>
              <Input
                id="name"
                name="name"
                defaultValue={existing?.name ?? "Notenschlüssel"}
                placeholder="z. B. IHK-Notenschlüssel"
              />
            </div>

            {/* Grade entries */}
            <div className="flex flex-col gap-3">
              <p className="text-sm font-semibold">Noten &amp; Mindestwerte</p>
              <div className="rounded-xl border border-border overflow-hidden">
                <div className="grid grid-cols-[40px_1fr_130px] border-b border-border bg-surface px-4 py-2 text-xs font-semibold text-muted-fg">
                  <span>Note</span>
                  <span>Bezeichnung</span>
                  <span>Ab % (≥)</span>
                </div>
                {entries.map((e) => (
                  <div
                    key={e.grade}
                    className="grid grid-cols-[40px_1fr_130px] items-center gap-3 border-b border-border last:border-b-0 px-4 py-2.5"
                  >
                    <span className="text-lg font-bold">{e.grade}</span>
                    <Input
                      name={`label_${e.grade}`}
                      defaultValue={e.label}
                      required
                      className="h-8 text-sm"
                    />
                    <Input
                      name={`minPercent_${e.grade}`}
                      type="number"
                      min={0}
                      max={100}
                      step={0.5}
                      defaultValue={e.minPercent}
                      required
                      className="h-8 text-sm"
                    />
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-fg">
                Note 6 sollte immer bei 0 % beginnen. Sicherstellen, dass die Werte von oben nach unten abnehmen.
              </p>
            </div>

            <button
              type="submit"
              className="self-start rounded-xl bg-fg px-5 py-2.5 text-sm font-semibold text-bg hover:bg-fg/90"
            >
              Notenschlüssel speichern
            </button>
          </form>
        </CardBody>
      </Card>

      {existing && (
        <p className="text-xs text-muted-fg">
          Zuletzt aktualisiert: {existing.updatedAt.toLocaleDateString("de-DE", { day: "numeric", month: "long", year: "numeric" })}
        </p>
      )}
    </div>
  );
}
