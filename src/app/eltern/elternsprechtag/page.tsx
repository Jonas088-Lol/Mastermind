import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CalendarDays, Clock, MapPin, User } from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/db/client";
import { ROLE_HOME, effectiveRole, getSession } from "@/lib/session";
import { bookSlot, cancelBooking } from "./actions";

export const metadata: Metadata = { title: "Elternsprechtag · Eltern" };

function formatSlotTime(startsAt: Date, duration: number) {
  const end = new Date(startsAt.getTime() + duration * 60 * 1000);
  const fmt = (d: Date) =>
    d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
  return `${fmt(startsAt)} – ${fmt(end)} Uhr`;
}

function formatSlotDate(startsAt: Date) {
  return startsAt.toLocaleDateString("de-DE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default async function ElternsprechtPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "parent") redirect(ROLE_HOME[effectiveRole(session)]);

  const now = new Date();

  // Existing bookings by this parent
  const bookings = await prisma.parentTeacherBooking.findMany({
    where: { parentId: session.userId },
    include: {
      slot: {
        include: {
          teacher: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { slot: { startsAt: "asc" } },
  });

  // Available open slots
  const availableSlots = await prisma.parentTeacherSlot.findMany({
    where: {
      isBooked: false,
      startsAt: { gte: now },
    },
    include: {
      teacher: { select: { id: true, name: true } },
    },
    orderBy: [{ teacher: { name: "asc" } }, { startsAt: "asc" }],
  });

  // Group slots by teacher
  const slotsByTeacher = new Map<string, { teacherName: string; slots: typeof availableSlots }>();
  for (const slot of availableSlots) {
    const key = slot.teacherId;
    if (!slotsByTeacher.has(key)) {
      slotsByTeacher.set(key, { teacherName: slot.teacher.name, slots: [] });
    }
    slotsByTeacher.get(key)!.slots.push(slot);
  }

  // Get children for slot booking
  const links = await prisma.parentStudentLink.findMany({
    where: { parentId: session.userId },
    include: { student: { select: { id: true, name: true } } },
    orderBy: { student: { name: "asc" } },
  });
  const firstChild = links[0]?.student;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-10">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">Schule</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Elternsprechtag</h1>
        <p className="mt-1 text-sm text-muted-fg">
          Termine bei Lehrkräften buchen und verwalten.
        </p>
      </header>

      {/* Existing bookings */}
      {bookings.length > 0 && (
        <section className="flex flex-col gap-4">
          <h2 className="text-base font-semibold">Meine Buchungen</h2>
          <div className="flex flex-col gap-3">
            {bookings.map((booking) => (
              <Card key={booking.id}>
                <CardHeader>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <User className="size-4 text-muted-fg" strokeWidth={1.75} />
                      <p className="font-semibold text-fg">{booking.slot.teacher.name}</p>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-fg">
                      <CalendarDays className="size-3.5" strokeWidth={1.75} />
                      <span>{formatSlotDate(booking.slot.startsAt)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-fg">
                      <Clock className="size-3.5" strokeWidth={1.75} />
                      <span>{formatSlotTime(booking.slot.startsAt, booking.slot.duration)}</span>
                    </div>
                    {booking.slot.location && (
                      <div className="flex items-center gap-2 text-sm text-muted-fg">
                        <MapPin className="size-3.5" strokeWidth={1.75} />
                        <span>{booking.slot.location}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge variant="success">Gebucht</Badge>
                    <form
                      action={async () => {
                        "use server";
                        await cancelBooking(booking.id);
                      }}
                    >
                      <button
                        type="submit"
                        className="text-xs font-medium text-danger underline-offset-2 hover:underline"
                      >
                        Stornieren
                      </button>
                    </form>
                  </div>
                </CardHeader>
                {booking.note && (
                  <CardBody>
                    <p className="text-sm text-muted-fg">Notiz: {booking.note}</p>
                  </CardBody>
                )}
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Available slots grouped by teacher */}
      <section className="flex flex-col gap-4">
        <h2 className="text-base font-semibold">Verfügbare Termine</h2>

        {links.length === 0 && (
          <p className="text-sm text-muted-fg">
            Kein Kind mit deinem Konto verknüpft. Termine können nur für verknüpfte Kinder gebucht werden.
          </p>
        )}

        {slotsByTeacher.size === 0 && (
          <p className="text-sm text-muted-fg">Zurzeit keine freien Gesprächstermine verfügbar.</p>
        )}

        {Array.from(slotsByTeacher.values()).map(({ teacherName, slots }) => (
          <Card key={teacherName}>
            <CardHeader>
              <div className="flex items-center gap-2">
                <User className="size-4 text-muted-fg" strokeWidth={1.75} />
                <CardTitle>{teacherName}</CardTitle>
              </div>
              <span className="text-xs text-muted-fg">{slots.length} freie Slots</span>
            </CardHeader>
            <CardBody className="px-0! pb-0!">
              <ul className="divide-y divide-border border-t border-border">
                {slots.map((slot) => (
                  <li key={slot.id} className="flex items-center gap-4 px-5 py-3.5 text-sm">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">
                        {formatSlotDate(slot.startsAt)}
                      </p>
                      <div className="mt-0.5 flex items-center gap-3 text-xs text-muted-fg">
                        <span className="flex items-center gap-1">
                          <Clock className="size-3" strokeWidth={2} />
                          {formatSlotTime(slot.startsAt, slot.duration)}
                        </span>
                        {slot.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="size-3" strokeWidth={2} />
                            {slot.location}
                          </span>
                        )}
                        <span>{slot.duration} Min.</span>
                      </div>
                    </div>
                    {firstChild ? (
                      <form
                        action={bookSlot.bind(null, slot.id, firstChild.id)}
                        className="flex flex-col items-end gap-2"
                      >
                        <textarea
                          name="note"
                          rows={2}
                          placeholder="Nachricht an Lehrkraft (optional)"
                          className="w-full resize-none rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs text-fg placeholder:text-muted-fg focus:border-brand focus:outline-none"
                        />
                        <button
                          type="submit"
                          className="shrink-0 bg-fg px-3 py-1.5 text-xs font-semibold text-bg transition-opacity hover:opacity-80"
                        >
                          Buchen
                        </button>
                      </form>
                    ) : (
                      <span className="text-xs text-muted-fg">Kein Kind verknüpft</span>
                    )}
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        ))}
      </section>
    </div>
  );
}
