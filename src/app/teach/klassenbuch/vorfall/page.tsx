/* Copyright 2026 Elian Schock, Jonas Schwenk */
import { ArrowLeft, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { createIncident } from "../actions";
import { StudentSelector } from "./StudentSelector";

export const metadata: Metadata = { title: "Vorfall erfassen" };

const INCIDENT_TYPES = ["Verweis", "Lob", "Hinweis"] as const;

export default async function VorfallPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "teacher") redirect("/");

  // Load teacher's classes with their students
  const tscEntries = await prisma.teacherSubjectClass.findMany({
    where: { teacherId: session.userId },
    include: {
      class: {
        include: {
          students: { select: { id: true, name: true }, orderBy: { name: "asc" } },
        },
      },
    },
  });

  // Deduplicate classes
  const classMap = new Map<
    string,
    {
      id: string;
      name: string;
      students: { id: string; name: string }[];
    }
  >();
  for (const t of tscEntries) {
    if (!classMap.has(t.class.id)) {
      classMap.set(t.class.id, {
        id: t.class.id,
        name: t.class.name,
        students: t.class.students,
      });
    }
  }
  const classes = Array.from(classMap.values()).sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <header className="flex flex-col gap-5">
        <Link
          href="/teach/klassenbuch"
          className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-muted-fg transition-colors hover:text-fg"
        >
          <ArrowLeft className="size-3.5" />
          Zurück zum Klassenbuch
        </Link>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">
            Klassenbuch
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">
            Vorfall erfassen
          </h1>
          <p className="mt-1 text-sm text-muted-fg">
            Verweis, Lob oder Hinweis dokumentieren
          </p>
        </div>
      </header>

      <form action={createIncident}>
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertTriangle
                  className="size-4 text-muted-fg"
                  strokeWidth={1.75}
                />
                <CardTitle>Vorfall-Details</CardTitle>
              </div>
            </CardHeader>
            <CardBody className="space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="type">Art des Eintrags</Label>
                  <select
                    id="type"
                    name="type"
                    required
                    className="h-10 w-full border border-border bg-bg px-3 text-sm focus:border-fg/30 focus:outline-none"
                  >
                    <option value="">Art wählen…</option>
                    {INCIDENT_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Dynamic student selector — client component */}
                <StudentSelector classes={classes} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="text">Beschreibung</Label>
                <textarea
                  id="text"
                  name="text"
                  required
                  rows={4}
                  placeholder="Beschreibe den Vorfall kurz und sachlich…"
                  className="w-full resize-y border border-border bg-bg px-3 py-2 text-sm focus:border-fg/30 focus:outline-none"
                />
              </div>
            </CardBody>
          </Card>

          <div className="flex items-center justify-between border-t border-border pt-4">
            <Link
              href="/teach/klassenbuch"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Abbrechen
            </Link>
            <button type="submit" className={buttonVariants({ size: "sm" })}>
              Vorfall speichern
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
