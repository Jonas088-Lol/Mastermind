/* Copyright 2026 Elian Schock, Jonas Schwenk */
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { createWorksheet } from "../actions";

export const metadata: Metadata = { title: "Neues Arbeitsblatt" };

export default async function NeuesArbeitsblattPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "teacher") redirect("/");

  const subjects = await prisma.subject.findMany({
    where: { schoolId: session.schoolId ?? "" },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8">
      <header className="flex items-center gap-4">
        <Link href="/teach/arbeitsblatter" className={buttonVariants({ variant: "ghost", size: "sm" })}>
          <ArrowLeft className="size-3.5" />
          Zurück
        </Link>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">Lehrerzentrum</p>
          <h1 className="mt-0.5 text-2xl font-bold tracking-tight">Neues Arbeitsblatt</h1>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Arbeitsblatt erstellen</CardTitle>
        </CardHeader>
        <CardBody>
          <form action={createWorksheet} className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="title">Titel *</Label>
              <Input
                id="title"
                name="title"
                required
                placeholder="z. B. Bruchrechnung Klasse 6"
                autoFocus
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="description">Beschreibung</Label>
              <textarea
                id="description"
                name="description"
                rows={3}
                placeholder="Kurze Beschreibung des Arbeitsblatts …"
                className="w-full border border-border bg-bg px-3 py-2 text-sm text-fg outline-none transition-colors placeholder:text-muted-fg focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/30"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="gradeLevel">Jahrgangsstufe</Label>
                <select
                  id="gradeLevel"
                  name="gradeLevel"
                  className="h-11 w-full border border-border bg-bg px-3 text-sm text-fg outline-none transition-colors focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/30"
                >
                  {Array.from({ length: 13 }, (_, i) => i + 1).map((g) => (
                    <option key={g} value={g}>
                      Klasse {g}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="difficulty">Schwierigkeitsgrad</Label>
                <select
                  id="difficulty"
                  name="difficulty"
                  defaultValue="mittel"
                  className="h-11 w-full border border-border bg-bg px-3 text-sm text-fg outline-none transition-colors focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/30"
                >
                  <option value="leicht">Leicht</option>
                  <option value="mittel">Mittel</option>
                  <option value="schwer">Schwer</option>
                </select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="estimatedMinutes">Bearbeitungszeit (Minuten)</Label>
                <Input
                  id="estimatedMinutes"
                  name="estimatedMinutes"
                  type="number"
                  min={1}
                  max={300}
                  defaultValue={15}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="subjectId">Fach (optional)</Label>
                <select
                  id="subjectId"
                  name="subjectId"
                  className="h-11 w-full border border-border bg-bg px-3 text-sm text-fg outline-none transition-colors focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/30"
                >
                  <option value="">— kein Fach —</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-border pt-4">
              <Link href="/teach/arbeitsblatter" className={buttonVariants({ variant: "outline", size: "sm" })}>
                Abbrechen
              </Link>
              <button
                type="submit"
                className={buttonVariants({ size: "sm" })}
              >
                Erstellen
              </button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
