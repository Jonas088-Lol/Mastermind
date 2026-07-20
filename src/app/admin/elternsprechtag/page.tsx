/* Copyright 2026 Elian Schock, Jonas Schwenk */
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CalendarDays, Check, Eye, EyeOff, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { canManageSchool, canAccessArea } from "@/lib/school-admin";
import { saveMeetingDay, toggleMeetingDayPublished, deleteMeetingDay } from "./actions";

export const metadata: Metadata = { title: "Elternsprechtag · Schulverwaltung" };

interface PageProps {
  searchParams: Promise<{ edit?: string }>;
}

/** "2026-07-19" für <input type="date"> */
function toDateInput(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export default async function AdminElternsprechtagPage({ searchParams }: PageProps) {
  const session = await getSession();
  if (!session || !canManageSchool(effectiveRole(session))) redirect("/admin");
  if (!canAccessArea(effectiveRole(session), "elternsprechtag")) redirect("/admin");

  const { edit } = await searchParams;

  const days = await prisma.parentMeetingDay.findMany({
    where: { schoolId: session.schoolId ?? "" },
    include: { _count: { select: { slots: true } } },
    orderBy: { date: "desc" },
  });

  const editing = edit ? days.find((d) => d.id === edit) ?? null : null;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">
          Schulverwaltung
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Elternsprechtag</h1>
        <p className="mt-1 text-sm text-muted-fg">
          Elternsprechtage werden ausschließlich hier angelegt. Lehrkräfte tragen ihre
          Gesprächstermine anschließend innerhalb des Zeitfensters ein — sobald der Tag
          veröffentlicht ist.
        </p>
      </header>

      {/* ── Vorhandene Sprechtage ────────────────────────────────────────── */}
      {days.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Angelegte Sprechtage · {days.length}</CardTitle>
          </CardHeader>
          <CardBody className="px-0! pb-0!">
            <ul className="divide-y divide-border border-t border-border">
              {days.map((d) => (
                <li key={d.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand/10 text-brand">
                    <CalendarDays className="size-5" strokeWidth={1.75} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-semibold">{d.title}</p>
                      {d.isPublished ? (
                        <Badge variant="success">Veröffentlicht</Badge>
                      ) : (
                        <Badge variant="neutral">Entwurf</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-fg">
                      {d.date.toLocaleDateString("de-DE", {
                        weekday: "short", day: "numeric", month: "long", year: "numeric",
                      })}{" "}
                      · {d.startTime}–{d.endTime} Uhr · {d.slotMinutes} Min./Termin
                      {d.location ? ` · ${d.location}` : ""}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-fg">
                      {d._count.slots} Termine von Lehrkräften eingetragen
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <a
                      href={`/admin/elternsprechtag?edit=${d.id}`}
                      className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold transition-colors hover:border-brand/40 hover:bg-surface"
                    >
                      Bearbeiten
                    </a>
                    <form action={toggleMeetingDayPublished}>
                      <input type="hidden" name="id" value={d.id} />
                      <button
                        type="submit"
                        title={d.isPublished ? "Zurückziehen" : "Veröffentlichen"}
                        className="grid size-8 place-items-center rounded-lg border border-border text-muted-fg transition-colors hover:border-brand/40 hover:text-brand"
                      >
                        {d.isPublished ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                      </button>
                    </form>
                    <form action={deleteMeetingDay}>
                      <input type="hidden" name="id" value={d.id} />
                      <button
                        type="submit"
                        title="Sprechtag löschen"
                        className="grid size-8 place-items-center rounded-lg border border-border text-muted-fg transition-colors hover:border-danger/40 hover:bg-danger/10 hover:text-danger"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      )}

      {/* ── Anlegen / Bearbeiten ─────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>
              {editing ? `„${editing.title}" bearbeiten` : "Neuen Elternsprechtag anlegen"}
            </CardTitle>
            <p className="mt-0.5 text-sm text-muted-fg">
              Datum, Zeitfenster und Taktung der Gesprächstermine.
            </p>
          </div>
          {editing && (
            <a href="/admin/elternsprechtag" className="text-xs text-muted-fg hover:text-fg">
              Abbrechen
            </a>
          )}
        </CardHeader>
        <CardBody>
          <form action={saveMeetingDay} className="flex flex-col gap-5">
            {editing && <input type="hidden" name="id" value={editing.id} />}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="title" className="text-sm font-semibold">Bezeichnung</label>
                <Input id="title" name="title" defaultValue={editing?.title ?? "Elternsprechtag"} required />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="date" className="text-sm font-semibold">Datum</label>
                <Input
                  id="date"
                  name="date"
                  type="date"
                  defaultValue={editing ? toDateInput(editing.date) : ""}
                  required
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="startTime" className="text-sm font-semibold">Beginn</label>
                <Input id="startTime" name="startTime" type="time" defaultValue={editing?.startTime ?? "16:00"} required />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="endTime" className="text-sm font-semibold">Ende</label>
                <Input id="endTime" name="endTime" type="time" defaultValue={editing?.endTime ?? "19:00"} required />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="slotMinutes" className="text-sm font-semibold">Minuten/Termin</label>
                <Input
                  id="slotMinutes"
                  name="slotMinutes"
                  type="number"
                  min={5}
                  max={60}
                  step={5}
                  defaultValue={editing?.slotMinutes ?? 15}
                  required
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="location" className="text-sm font-semibold">
                  Ort <span className="font-normal text-muted-fg">(optional)</span>
                </label>
                <Input id="location" name="location" defaultValue={editing?.location ?? ""} placeholder="z. B. Aula / Klassenzimmer" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="note" className="text-sm font-semibold">
                  Hinweis <span className="font-normal text-muted-fg">(optional)</span>
                </label>
                <Input id="note" name="note" defaultValue={editing?.note ?? ""} placeholder="z. B. Anmeldung bis 10.10." />
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="isPublished"
                defaultChecked={editing?.isPublished ?? false}
                className="size-4 accent-brand"
              />
              Veröffentlichen — Lehrkräfte und Eltern sehen den Sprechtag
            </label>

            <button
              type="submit"
              className="inline-flex items-center gap-2 self-start rounded-xl bg-fg px-5 py-2.5 text-sm font-semibold text-bg hover:bg-fg/90"
            >
              <Check className="size-4" />
              {editing ? "Änderungen speichern" : "Sprechtag anlegen"}
            </button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
