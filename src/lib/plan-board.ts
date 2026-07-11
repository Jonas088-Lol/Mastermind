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

export type BoardEvent = {
  id: string;
  title: string;
  description: string | null;
  startAt: string; // ISO
  allDay: boolean;
  category: string;
};

export type BoardTeamResult = { date?: string; opponent?: string; scoreHome?: number; scoreAway?: number };

export type BoardTeam = {
  id: string;
  name: string;
  sport: string;
  season: string | null;
  coach: string | null;
  imageUrl: string | null;
  results: BoardTeamResult[];
};

export type BoardAnnouncement = {
  id: string;
  title: string;
  body: string | null;
  emoji: string | null;
  color: string | null;
};

export type PlanBoardData = {
  classes: BoardClass[];
  substitutions: BoardSubstitution[];
  periodTimes: string[];
  todayLabel: string;
  events: BoardEvent[];
  teams: BoardTeam[];
  announcements: BoardAnnouncement[];
};

const DEFAULT_TIMES = [
  "08:00", "08:50", "09:50", "10:40", "11:35", "12:25", "13:25", "14:15", "15:00",
];

export async function loadPlanBoardData(schoolId: string): Promise<PlanBoardData> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayEnd = new Date(today.getTime() + 86_399_999);
  const todayDow = today.getDay() === 0 ? 7 : today.getDay(); // 1=Mon…5=Fri

  const in14Days = new Date(today.getTime() + 14 * 86_400_000);

  const [classes, substitutions, periodConfigs, events, teams, announcements] = await Promise.all([
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
    prisma.schoolEvent.findMany({
      where: { schoolId, startAt: { gte: today, lte: in14Days } },
      orderBy: { startAt: "asc" },
      take: 12,
    }),
    prisma.schoolTeam.findMany({
      where: { schoolId },
      orderBy: { name: "asc" },
      take: 12,
    }),
    prisma.boardAnnouncement.findMany({
      where: { schoolId, active: true },
      orderBy: { order: "asc" },
      take: 10,
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
    events: events.map((e) => ({
      id: e.id,
      title: e.title,
      description: e.description,
      startAt: e.startAt.toISOString(),
      allDay: e.allDay,
      category: e.category,
    })),
    teams: teams.map((t) => {
      let results: BoardTeamResult[] = [];
      try {
        const parsed = t.results ? JSON.parse(t.results) : [];
        if (Array.isArray(parsed)) results = parsed as BoardTeamResult[];
      } catch { /* defektes JSON → keine Ergebnisse */ }
      return {
        id: t.id,
        name: t.name,
        sport: t.sport,
        season: t.season,
        coach: t.coach,
        imageUrl: (t as { imageUrl?: string | null }).imageUrl ?? null,
        results: results.slice(-5).reverse(), // die letzten 5, neueste zuerst
      };
    }),
    announcements: announcements.map((a) => ({
      id: a.id,
      title: a.title,
      body: a.body,
      emoji: a.emoji,
      color: a.color,
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
