import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (!session || !session.classId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const entries = await prisma.timetableEntry.findMany({
    where: { classId: session.classId },
    include: {
      subject: { select: { name: true } },
      teacher: { select: { name: true } },
    },
  });

  // Build iCal format (VCALENDAR)
  // For a weekly repeating timetable, generate VEVENT for each entry for the next 52 weeks
  // Use DTSTART:YYYYMMDDTHHMMSSZ format
  // RRULE:FREQ=WEEKLY;COUNT=52

  const PERIOD_START_TIMES = ["080000", "085000", "095000", "104000", "113500", "122500", "132500", "141500", "150000"];
  const PERIOD_END_TIMES   = ["084500", "093500", "103500", "112500", "122000", "131000", "141000", "150000", "154500"];

  // Find Monday of current week
  const now = new Date();
  const dow = now.getDay() === 0 ? 7 : now.getDay();
  const monday = new Date(now.getTime() - (dow - 1) * 86400000);

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//MasterMind//Stundenplan//DE",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Stundenplan",
  ];

  for (const e of entries) {
    const dayOffset = e.day - 1; // 0=Mon
    const periodIdx = e.period - 1;
    const startTime = PERIOD_START_TIMES[periodIdx] ?? "080000";
    const endTime = PERIOD_END_TIMES[periodIdx] ?? "084500";

    // DTSTART is the Monday + dayOffset
    const eventDate = new Date(monday.getTime() + dayOffset * 86400000);
    const dateStr = eventDate.toISOString().slice(0, 10).replace(/-/g, "");

    const uid = `${e.id}@mastermind`;
    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${uid}`);
    lines.push(`DTSTART;TZID=Europe/Berlin:${dateStr}T${startTime}`);
    lines.push(`DTEND;TZID=Europe/Berlin:${dateStr}T${endTime}`);
    lines.push("RRULE:FREQ=WEEKLY;COUNT=52");
    lines.push(`SUMMARY:${e.subject.name}${e.room ? " · " + e.room : ""}`);
    lines.push(`DESCRIPTION:${e.teacher.name}`);
    if (e.room) lines.push(`LOCATION:${e.room}`);
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");

  return new NextResponse(lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="stundenplan.ics"',
    },
  });
}
