/* Copyright 2026 Elian Schock, Jonas Schwenk */
import {
  CalendarDays,
  ChevronDown,
  Clock,
  MapPin,
  Plus,
  Trash2,
  User,
  Users,
} from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { createSlot, deleteSlot } from "./actions";

export const metadata: Metadata = { title: "Elternsprechtag · Lehrer" };

export default async function ElternsprechtagPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "teacher") redirect("/");

  const slots = await prisma.parentTeacherSlot.findMany({
    where: {
      teacherId: session.userId,
      startsAt: { gte: new Date() },
    },
    include: {
      booking: {
        include: {
          parent: { select: { name: true } },
        },
      },
    },
    orderBy: { startsAt: "asc" },
  });

  // Collect unique student IDs from bookings to fetch names
  const studentIds = slots
    .map((s) => s.booking?.studentId)
    .filter((id): id is string => Boolean(id));

  const students =
    studentIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: studentIds } },
          select: { id: true, name: true },
        })
      : [];

  const studentMap = new Map(students.map((s) => [s.id, s.name]));

  const freeSlots = slots.filter((s) => !s.isBooked);
  const bookedSlots = slots.filter((s) => s.isBooked);

  function formatDateTime(date: Date) {
    return date.toLocaleString("de-DE", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      {/* Header */}
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">
          <Link href="/teach" className="hover:underline">
            Lehrer-Cockpit
          </Link>{" "}
          / Elternsprechtag
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">
          Elternsprechtag
        </h1>
        <p className="mt-1 text-sm text-muted-fg">
          {freeSlots.length} freie{" "}
          {freeSlots.length === 1 ? "Slot" : "Slots"} · {bookedSlots.length}{" "}
          {bookedSlots.length === 1 ? "gebucht" : "gebucht"}
        </p>
      </header>

      {/* Kommende Termine */}
      <section className="flex flex-col gap-4">
        <h2 className="text-base font-semibold">Kommende Termine</h2>

        {slots.length === 0 ? (
          <Card>
            <CardBody>
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <CalendarDays className="size-8 text-muted-fg" strokeWidth={1.5} />
                <p className="font-semibold">Noch keine Slots angelegt</p>
                <p className="text-sm text-muted-fg">
                  Erstelle deinen ersten Gesprächsslot über das Formular unten.
                </p>
              </div>
            </CardBody>
          </Card>
        ) : (
          <>
            {/* Free slots */}
            {freeSlots.length > 0 && (
              <Card>
                <CardHeader>
                  <div>
                    <CardTitle>Freie Slots</CardTitle>
                    <p className="mt-1 text-sm text-muted-fg">
                      Noch nicht gebucht
                    </p>
                  </div>
                  <Badge variant="outline">{freeSlots.length} frei</Badge>
                </CardHeader>
                <CardBody className="px-0! pb-0!">
                  <ul className="divide-y divide-border border-t border-border">
                    {freeSlots.map((slot) => (
                      <li
                        key={slot.id}
                        className="flex items-center gap-4 px-5 py-4"
                      >
                        <div className="grid size-10 shrink-0 place-items-center bg-surface">
                          <CalendarDays
                            className="size-4 text-muted-fg"
                            strokeWidth={1.75}
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold">
                            {formatDateTime(slot.startsAt)}
                          </p>
                          <div className="mt-0.5 flex flex-wrap items-center gap-3 text-xs text-muted-fg">
                            <span className="flex items-center gap-1">
                              <Clock className="size-3" />
                              {slot.duration} Min.
                            </span>
                            {slot.location && (
                              <span className="flex items-center gap-1">
                                <MapPin className="size-3" />
                                {slot.location}
                              </span>
                            )}
                          </div>
                        </div>
                        <form action={deleteSlot.bind(null, slot.id)}>
                          <button
                            type="submit"
                            title="Slot löschen"
                            className="grid size-8 place-items-center text-muted-fg transition-colors hover:text-danger"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </form>
                      </li>
                    ))}
                  </ul>
                </CardBody>
              </Card>
            )}

            {/* Booked slots */}
            {bookedSlots.length > 0 && (
              <Card>
                <CardHeader>
                  <div>
                    <CardTitle>Gebuchte Slots</CardTitle>
                    <p className="mt-1 text-sm text-muted-fg">
                      Von Eltern reserviert
                    </p>
                  </div>
                  <Badge variant="success">{bookedSlots.length} gebucht</Badge>
                </CardHeader>
                <CardBody className="px-0! pb-0!">
                  <ul className="divide-y divide-border border-t border-border">
                    {bookedSlots.map((slot) => {
                      const parentName = slot.booking?.parent.name ?? "—";
                      const studentName = slot.booking?.studentId
                        ? studentMap.get(slot.booking.studentId) ?? slot.booking.studentId
                        : "—";
                      return (
                        <li
                          key={slot.id}
                          className="flex items-start gap-4 px-5 py-4"
                        >
                          <div className="grid size-10 shrink-0 place-items-center bg-surface">
                            <Users
                              className="size-4 text-muted-fg"
                              strokeWidth={1.75}
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold">
                              {formatDateTime(slot.startsAt)}
                            </p>
                            <div className="mt-0.5 flex flex-wrap items-center gap-3 text-xs text-muted-fg">
                              <span className="flex items-center gap-1">
                                <Clock className="size-3" />
                                {slot.duration} Min.
                              </span>
                              {slot.location && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="size-3" />
                                  {slot.location}
                                </span>
                              )}
                            </div>
                            <div className="mt-2 flex flex-wrap items-center gap-4 text-xs">
                              <span className="flex items-center gap-1 text-muted-fg">
                                <User className="size-3" />
                                <span className="font-medium text-fg">
                                  {parentName}
                                </span>
                                {" (Elternteil)"}
                              </span>
                              <span className="text-muted-fg">
                                Schüler:{" "}
                                <span className="font-medium text-fg">
                                  {studentName}
                                </span>
                              </span>
                              {slot.booking?.note && (
                                <span className="text-muted-fg">
                                  Notiz: {slot.booking.note}
                                </span>
                              )}
                            </div>
                          </div>
                          <Badge variant="success" className="shrink-0">
                            Gebucht
                          </Badge>
                        </li>
                      );
                    })}
                  </ul>
                </CardBody>
              </Card>
            )}
          </>
        )}
      </section>

      {/* Neuen Termin erstellen */}
      <section>
        <Card>
          <CardHeader>
            <div>
              <CardTitle>
                <Plus className="inline size-4 mr-1.5" strokeWidth={1.75} />
                Neuen Termin erstellen
              </CardTitle>
              <p className="mt-1 text-sm text-muted-fg">
                Lege einen neuen Gesprächsslot für den Elternsprechtag an.
              </p>
            </div>
          </CardHeader>
          <CardBody>
            <form action={createSlot} className="space-y-5">
              <div className="flex flex-col gap-1">
                <label
                  htmlFor="startsAt"
                  className="text-[11px] font-semibold uppercase tracking-wider text-muted-fg"
                >
                  Datum &amp; Uhrzeit *
                </label>
                <input
                  id="startsAt"
                  type="datetime-local"
                  name="startsAt"
                  required
                  className="border border-border bg-bg px-3 py-2 text-sm"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label
                  htmlFor="duration"
                  className="text-[11px] font-semibold uppercase tracking-wider text-muted-fg"
                >
                  Dauer
                </label>
                <div className="relative">
                  <select
                    id="duration"
                    name="duration"
                    defaultValue="15"
                    className="w-full appearance-none border border-border bg-bg px-3 py-2 pr-8 text-sm"
                  >
                    <option value="10">10 Minuten</option>
                    <option value="15">15 Minuten</option>
                    <option value="20">20 Minuten</option>
                    <option value="30">30 Minuten</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-fg" />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label
                  htmlFor="location"
                  className="text-[11px] font-semibold uppercase tracking-wider text-muted-fg"
                >
                  Raum / Ort (optional)
                </label>
                <input
                  id="location"
                  type="text"
                  name="location"
                  placeholder="z.B. Raum 204"
                  className="border border-border bg-bg px-3 py-2 text-sm placeholder:text-muted-fg"
                />
              </div>

              <button
                type="submit"
                className="inline-flex w-full items-center justify-center gap-2 bg-fg px-4 py-2.5 text-sm font-semibold text-bg hover:opacity-90"
              >
                <Plus className="size-4" />
                Slot anlegen
              </button>
            </form>
          </CardBody>
        </Card>
      </section>
    </div>
  );
}
