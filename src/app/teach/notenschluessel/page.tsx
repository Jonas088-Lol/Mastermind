import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { NotenschluesselRechner } from "./NotenschluesselRechner";

export const metadata: Metadata = { title: "Notenschlüssel · Lehrer" };

export default async function TeachNotenschluesselPage() {
  const session = await getSession();
  if (!session || effectiveRole(session) !== "teacher") redirect("/teach");

  const scale = await prisma.gradeScale.findUnique({
    where: { schoolId: session.schoolId ?? "" },
    include: { entries: { orderBy: { grade: "asc" } } },
  });

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">Lehrerbereich</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Notenschlüssel</h1>
        <p className="mt-1 text-sm text-muted-fg">
          Punkte eingeben — die passende Note wird automatisch ermittelt.
        </p>
      </header>

      {!scale || scale.entries.length === 0 ? (
        <Card>
          <CardBody>
            <p className="text-sm text-muted-fg">
              Die Schulverwaltung hat noch keinen Notenschlüssel konfiguriert.
            </p>
          </CardBody>
        </Card>
      ) : (
        <>
          <NotenschluesselRechner entries={scale.entries} scaleName={scale.name} />

          {/* Table overview */}
          <Card>
            <CardHeader>
              <div>
                <CardTitle>{scale.name}</CardTitle>
                <p className="mt-0.5 text-sm text-muted-fg">Vollständige Tabelle</p>
              </div>
            </CardHeader>
            <CardBody className="px-0! pb-0!">
              <div className="grid grid-cols-[40px_1fr_130px] border-b border-border bg-surface px-5 py-2 text-xs font-semibold text-muted-fg">
                <span>Note</span>
                <span>Bezeichnung</span>
                <span>Ab %</span>
              </div>
              {scale.entries.map((e) => (
                <div
                  key={e.grade}
                  className="grid grid-cols-[40px_1fr_130px] items-center gap-2 border-b border-border last:border-b-0 px-5 py-3"
                >
                  <span className="text-xl font-bold">{e.grade}</span>
                  <span className="text-sm">{e.label}</span>
                  <span className="text-sm text-muted-fg">≥ {e.minPercent} %</span>
                </div>
              ))}
            </CardBody>
          </Card>
        </>
      )}
    </div>
  );
}
