/* Copyright 2026 Elian Schock, Jonas Schwenk */
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { NotenschluesselRechner } from "./NotenschluesselRechner";

export const metadata: Metadata = { title: "Notenschlüssel · Lehrer" };

interface PageProps {
  searchParams: Promise<{ scale?: string }>;
}

export default async function TeachNotenschluesselPage({ searchParams }: PageProps) {
  const session = await getSession();
  if (!session || effectiveRole(session) !== "teacher") redirect("/teach");

  const { scale: scaleParam } = await searchParams;

  // Die Schule kann mehrere Schlüssel haben (z. B. R- und M-Zweig).
  const scales = await prisma.gradeScale.findMany({
    where: { schoolId: session.schoolId ?? "" },
    include: { entries: { orderBy: { grade: "asc" } } },
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
  });

  const scale = scales.find((s) => s.id === scaleParam) ?? scales[0] ?? null;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">Lehrerbereich</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Notenschlüssel</h1>
        <p className="mt-1 text-sm text-muted-fg">
          Punkte eingeben — die passende Note wird automatisch ermittelt.
        </p>
      </header>

      {/* Auswahl, sobald es mehr als einen Schlüssel gibt */}
      {scales.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {scales.map((s) => {
            const active = s.id === scale?.id;
            return (
              <a
                key={s.id}
                href={`/teach/notenschluessel?scale=${s.id}`}
                className={
                  active
                    ? "flex items-center gap-2 rounded-xl border border-brand bg-brand/10 px-3 py-2 text-sm font-semibold text-brand"
                    : "flex items-center gap-2 rounded-xl border border-border bg-bg px-3 py-2 text-sm font-medium text-muted-fg transition-colors hover:border-brand/40 hover:text-fg"
                }
              >
                {s.name}
                {s.isDefault && <Badge variant="brand">Standard</Badge>}
              </a>
            );
          })}
        </div>
      )}

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

          {/* Tabellen-Übersicht */}
          <Card>
            <CardHeader>
              <div>
                <CardTitle>{scale.name}</CardTitle>
                <p className="mt-0.5 text-sm text-muted-fg">
                  {scale.description ?? "Vollständige Tabelle"}
                </p>
              </div>
            </CardHeader>
            <CardBody className="px-0! pb-0!">
              <div className="grid grid-cols-[40px_1fr_110px] border-b border-border bg-surface px-5 py-2 text-xs font-semibold text-muted-fg sm:grid-cols-[40px_1fr_130px]">
                <span>Note</span>
                <span>Bezeichnung</span>
                <span>Ab %</span>
              </div>
              {scale.entries.map((e) => (
                <div
                  key={e.grade}
                  className="grid grid-cols-[40px_1fr_110px] items-center gap-2 border-b border-border px-5 py-3 last:border-b-0 sm:grid-cols-[40px_1fr_130px]"
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
