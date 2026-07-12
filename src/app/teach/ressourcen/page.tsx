/* Copyright 2026 Elian Schock, Jonas Schwenk */
import { Box, Calendar, Clock, Plus, Trash2 } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { bookResource, deleteBooking } from "./actions";

export const metadata: Metadata = { title: "Ressourcen · Lehrer" };

function fmt(d: Date) {
  return d.toLocaleString("de-DE", {
    weekday: "short", day: "numeric", month: "short",
    hour: "2-digit", minute: "2-digit",
  });
}

function toDatetimeLocal(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default async function TeachRessourcenPage() {
  const session = await getSession();
  if (!session || effectiveRole(session) !== "teacher") redirect("/teach");

  const [resources, upcomingBookings, myBookings] = await Promise.all([
    prisma.resource.findMany({
      where: { schoolId: session.schoolId ?? "" },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    }),
    prisma.resourceBooking.findMany({
      where: {
        resource: { schoolId: session.schoolId ?? "" },
        endsAt: { gte: new Date() },
      },
      include: { user: { select: { name: true } }, resource: { select: { name: true, color: true } } },
      orderBy: { startsAt: "asc" },
      take: 30,
    }),
    prisma.resourceBooking.findMany({
      where: { userId: session.userId, endsAt: { gte: new Date() } },
      include: { resource: { select: { name: true, color: true } } },
      orderBy: { startsAt: "asc" },
    }),
  ]);

  const now = new Date();
  const defaultStart = toDatetimeLocal(new Date(now.getTime() + 60 * 60 * 1000));
  const defaultEnd = toDatetimeLocal(new Date(now.getTime() + 2 * 60 * 60 * 1000));

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">Lehrerbereich</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Ressourcen</h1>
        <p className="mt-1 text-sm text-muted-fg">Räume, iPad-Koffer und andere Ressourcen reservieren.</p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        {/* ── Booking form ── */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Neue Reservierung</CardTitle>
              <p className="mt-0.5 text-sm text-muted-fg">Ressource für einen Zeitraum buchen</p>
            </div>
            <Plus className="size-4 text-muted-fg" strokeWidth={1.75} />
          </CardHeader>
          <CardBody>
            {resources.length === 0 ? (
              <p className="text-sm text-muted-fg">
                Noch keine Ressourcen angelegt. Die Schulverwaltung muss diese zuerst einrichten.
              </p>
            ) : (
              <form action={bookResource} className="flex flex-col gap-4">
                {/* Ressource auswählen */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="resourceId" className="text-sm font-semibold">Ressource *</label>
                  <select
                    id="resourceId"
                    name="resourceId"
                    required
                    className="rounded-xl border border-border bg-bg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40"
                  >
                    {resources.map((r) => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </div>

                {/* Titel */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="title" className="text-sm font-semibold">Anlass *</label>
                  <Input id="title" name="title" required placeholder="z. B. Klasse 8a – Referate" />
                </div>

                {/* Zeitraum */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="startsAt" className="text-sm font-semibold">Von *</label>
                    <Input id="startsAt" name="startsAt" type="datetime-local" required defaultValue={defaultStart} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="endsAt" className="text-sm font-semibold">Bis *</label>
                    <Input id="endsAt" name="endsAt" type="datetime-local" required defaultValue={defaultEnd} />
                  </div>
                </div>

                {/* Notiz */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="note" className="text-sm font-semibold">Notiz</label>
                  <Input id="note" name="note" placeholder="Optional" />
                </div>

                <button
                  type="submit"
                  className="self-start rounded-xl bg-fg px-5 py-2.5 text-sm font-semibold text-bg hover:bg-fg/90"
                >
                  Reservieren
                </button>
              </form>
            )}
          </CardBody>
        </Card>

        {/* ── My bookings ── */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Meine Reservierungen</CardTitle>
            </div>
            <Calendar className="size-4 text-muted-fg" strokeWidth={1.75} />
          </CardHeader>
          <CardBody className="px-0! pb-0!">
            {myBookings.length === 0 ? (
              <p className="px-5 pb-4 text-sm text-muted-fg">Keine aktiven Reservierungen.</p>
            ) : (
              <ul className="divide-y divide-border border-t border-border">
                {myBookings.map((b) => (
                  <li key={b.id} className="flex items-start gap-3 px-4 py-3">
                    <span
                      className="mt-1 size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: b.resource.color }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">{b.title}</p>
                      <p className="text-xs text-muted-fg">{b.resource.name}</p>
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-fg">
                        <Clock className="size-3" />
                        {fmt(b.startsAt)} – {fmt(b.endsAt)}
                      </p>
                    </div>
                    <form action={deleteBooking.bind(null, b.id)}>
                      <button type="submit" className="mt-0.5 text-muted-fg hover:text-danger">
                        <Trash2 className="size-3.5" />
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>

      {/* ── All upcoming bookings ── */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Belegte Zeiten</CardTitle>
            <p className="mt-0.5 text-sm text-muted-fg">Alle anstehenden Reservierungen der Schule</p>
          </div>
          <Box className="size-4 text-muted-fg" strokeWidth={1.75} />
        </CardHeader>
        <CardBody className="px-0! pb-0!">
          {upcomingBookings.length === 0 ? (
            <p className="border-t border-border px-5 py-4 text-sm text-muted-fg">Keine anstehenden Buchungen.</p>
          ) : (
            <ul className="divide-y divide-border border-t border-border">
              {upcomingBookings.map((b) => (
                <li key={b.id} className="flex items-start gap-4 px-5 py-3">
                  <span
                    className="mt-1.5 size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: b.resource.color }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{b.resource.name}</p>
                    <p className="text-xs text-muted-fg">{b.title} · {b.user.name}</p>
                  </div>
                  <p className="shrink-0 text-xs text-muted-fg">
                    {fmt(b.startsAt)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
