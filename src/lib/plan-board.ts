import { prisma } from "@/lib/db/client";

/**
 * Gemeinsamer Datenlader für die Plan-Vollbildanzeige (Anzeigetafel).
 * Wird von /sekretariat/anzeigetafel und /admin/anzeigetafel genutzt,
 * damit beide Rollen dieselbe Tafel mit identischen Daten sehen.
 */

export type BoardClassEntry = {
  period: number;
  subject: string;
  shortName: string;
  color: string;
  teacher: string;
  room: string | null;
};

export type BoardClass = {
  id: string;
  name: string;
  grade: number;
  entries: BoardClassEntry[];
};

export type BoardSubstitution = {
  id: string;
  className: string;
  classId: string;
  period: number;
  type: string;
  subjectName: string | null;
  note: string | null;
  substituteTeacher: string | null;
  absentTeacher: string | null;
  room: string | null;
};

export type PlanBoardData = {
  classes: BoardClass[];
  substitutions: BoardSubstitution[];
  periodTimes: string[];
  todayLabel: string;
};

const DEFAULT_TIMES = [
  "08:00", "08:50", "09:50", "10:40", "11:35", "12:25", "13:25", "14:15", "15:00",
];

export async function loadPlanBoardData(schoolId: string): Promise<PlanBoardData> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayEnd = new Date(today.getTime() + 86_399_999);
  const todayDow = today.getDay() === 0 ? 7 : today.getDay(); // 1=Mon…5=Fri

  const [classes, substitutions, periodConfigs] = await Promise.all([
    prisma.schoolClass.findMany({
      where: { schoolId },
      orderBy: [{ grade: "asc" }, { name: "asc" }],
      include: {
        timetableEntries: {
          where: { day: todayDow },
          include: {
            subject: { select: { name: true, shortName: true, color: true } },
            teacher: { select: { name: true } },
          },
          orderBy: { period: "asc" },
        },
      },
    }),
    prisma.substitutionEntry.findMany({
      where: {
        schoolId,
        date: { gte: today, lte: todayEnd },
      },
      include: {
        class: { select: { name: true } },
        substituteTeacher: { select: { name: true } },
        absentTeacher: { select: { name: true } },
      },
      orderBy: [{ period: "asc" }],
    }),
    prisma.schoolPeriodConfig.findMany({
      where: { schoolId },
      orderBy: { period: "asc" },
    }),
  ]);

  const periodTimes = Array.from({ length: 9 }, (_, i) => {
    const cfg = periodConfigs.find((p) => p.period === i + 1);
    return cfg?.startTime ?? DEFAULT_TIMES[i];
  });

  return {
    classes: classes
      .filter((c) => c.timetableEntries.length > 0)
      .map((c) => ({
        id: c.id,
        name: c.name,
        grade: c.grade,
        entries: c.timetableEntries.map((e) => ({
          period: e.period,
          subject: e.subject.name,
          shortName: e.subject.shortName,
          color: e.subject.color,
          teacher: e.teacher.name,
          room: e.room,
        })),
      })),
    substitutions: substitutions.map((s) => ({
      id: s.id,
      className: s.class.name,
      classId: s.classId,
      period: s.period,
      type: s.type,
      subjectName: s.subjectName,
      note: s.note,
      substituteTeacher: s.substituteTeacher?.name ?? null,
      absentTeacher: s.absentTeacher?.name ?? null,
      room: s.room,
    })),
    periodTimes,
    todayLabel: today.toLocaleDateString("de-DE", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }),
  };
}
