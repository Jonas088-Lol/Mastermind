"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { redirect } from "next/navigation";

export async function savePeriodConfig(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session || effectiveRole(session) !== "admin") redirect("/login");
  if (!session.schoolId) return;

  const ops = [];
  for (let p = 1; p <= 9; p++) {
    const start = (formData.get(`start_${p}`) as string | null)?.trim();
    const end = (formData.get(`end_${p}`) as string | null)?.trim();
    if (!start || !end) continue;
    ops.push(
      prisma.schoolPeriodConfig.upsert({
        where: { schoolId_period: { schoolId: session.schoolId, period: p } },
        update: { startTime: start, endTime: end },
        create: { schoolId: session.schoolId, period: p, startTime: start, endTime: end },
      })
    );
  }
  await prisma.$transaction(ops);
  revalidatePath("/admin/stundenplan");
  revalidatePath("/teach");
}

export async function saveTimetableEntry(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session || effectiveRole(session) !== "admin") redirect("/login");
  if (!session.schoolId) return;

  const classId = formData.get("classId") as string;
  const teacherId = formData.get("teacherId") as string;
  const subjectId = formData.get("subjectId") as string;
  const day = parseInt(formData.get("day") as string, 10);
  const period = parseInt(formData.get("period") as string, 10);
  const room = (formData.get("room") as string | null)?.trim() || null;

  if (!classId || !teacherId || !subjectId || !day || !period) return;

  await prisma.timetableEntry.upsert({
    where: { classId_day_period: { classId, day, period } },
    update: { teacherId, subjectId, room },
    create: { schoolId: session.schoolId, classId, teacherId, subjectId, day, period, room },
  });

  revalidatePath("/admin/stundenplan");
  revalidatePath("/teach");
}

export async function deleteTimetableEntry(entryId: string): Promise<void> {
  const session = await getSession();
  if (!session || effectiveRole(session) !== "admin") return;
  await prisma.timetableEntry.delete({ where: { id: entryId } });
  revalidatePath("/admin/stundenplan");
}

const DAY_MAP: Record<string, number> = {
  mo: 1, di: 2, mi: 3, do: 4, fr: 5,
  "1": 1, "2": 2, "3": 3, "4": 4, "5": 5,
  montag: 1, dienstag: 2, mittwoch: 3, donnerstag: 4, freitag: 5,
};

export type ImportResult = {
  imported: number;
  errors: { line: number; msg: string }[];
};

export async function importTimetableCsv(formData: FormData): Promise<ImportResult> {
  const session = await getSession();
  if (!session || effectiveRole(session) !== "admin") redirect("/login");
  if (!session.schoolId) return { imported: 0, errors: [] };

  const file = formData.get("csvFile") as File | null;
  if (!file || file.size === 0) return { imported: 0, errors: [{ line: 0, msg: "Keine Datei ausgewählt" }] };

  const text = await file.text();
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return { imported: 0, errors: [] };

  // Skip header row if first line looks like a header
  const dataLines = /klasse|class|lehrer|teacher/i.test(lines[0]) ? lines.slice(1) : lines;

  // Load lookups once
  const [classes, teachers, subjects] = await Promise.all([
    prisma.schoolClass.findMany({
      where: { schoolId: session.schoolId },
      select: { id: true, name: true },
    }),
    prisma.user.findMany({
      where: { schoolId: session.schoolId, role: "teacher" },
      select: { id: true, name: true },
    }),
    prisma.subject.findMany({
      where: { schoolId: session.schoolId },
      select: { id: true, name: true, shortName: true },
    }),
  ]);

  const classMap = new Map(classes.map((c) => [c.name.toLowerCase().trim(), c.id]));
  const teacherMap = new Map(teachers.map((t) => [t.name.toLowerCase().trim(), t.id]));
  const subjectMap = new Map([
    ...subjects.map((s) => [s.name.toLowerCase().trim(), s.id] as [string, string]),
    ...subjects.filter((s) => s.shortName).map((s) => [s.shortName!.toLowerCase().trim(), s.id] as [string, string]),
  ]);

  const errors: { line: number; msg: string }[] = [];
  let imported = 0;

  for (let i = 0; i < dataLines.length; i++) {
    const lineNum = i + (lines.length !== dataLines.length ? 2 : 1);
    const sep = dataLines[i].includes(";") ? ";" : ",";
    const cols = dataLines[i].split(sep).map((c) => c.trim());

    if (cols.length < 5) {
      errors.push({ line: lineNum, msg: "Zu wenige Spalten (erwartet: Klasse;Lehrer;Fach;Tag;Stunde[;Raum])" });
      continue;
    }

    const [className, teacherName, subjectName, dayRaw, periodRaw, roomRaw] = cols;
    const classId = classMap.get(className.toLowerCase());
    const teacherId = teacherMap.get(teacherName.toLowerCase());
    const subjectId = subjectMap.get(subjectName.toLowerCase());
    const day = DAY_MAP[dayRaw.toLowerCase().trim()];
    const period = parseInt(periodRaw, 10);
    const room = roomRaw?.trim() || null;

    if (!classId) { errors.push({ line: lineNum, msg: `Klasse "${className}" nicht gefunden` }); continue; }
    if (!teacherId) { errors.push({ line: lineNum, msg: `Lehrer "${teacherName}" nicht gefunden` }); continue; }
    if (!subjectId) { errors.push({ line: lineNum, msg: `Fach "${subjectName}" nicht gefunden` }); continue; }
    if (!day) { errors.push({ line: lineNum, msg: `Ungültiger Tag "${dayRaw}"` }); continue; }
    if (isNaN(period) || period < 1 || period > 9) { errors.push({ line: lineNum, msg: `Ungültige Stunde "${periodRaw}"` }); continue; }

    try {
      await prisma.timetableEntry.upsert({
        where: { classId_day_period: { classId, day, period } },
        update: { teacherId, subjectId, room, schoolId: session.schoolId! },
        create: { schoolId: session.schoolId!, classId, teacherId, subjectId, day, period, room },
      });
      imported++;
    } catch {
      errors.push({ line: lineNum, msg: "Datenbankfehler beim Speichern" });
    }
  }

  revalidatePath("/admin/stundenplan");
  return { imported, errors };
}
