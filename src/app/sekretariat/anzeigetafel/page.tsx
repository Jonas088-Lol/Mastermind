import { redirect } from "next/navigation";
import { effectiveRole, getSession } from "@/lib/session";
import { prisma } from "@/lib/db/client";
import { AnzeigetafelClient } from "./AnzeigetafelClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Anzeigetafel · Stundenplan" };

export default async function AnzeigetafelPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const role = effectiveRole(session);
  if (!["secretary", "rector", "vice_rector", "admin", "super"].includes(role)) {
    redirect("/login");
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayEnd = new Date(today.getTime() + 86_399_999);
  const todayDow = today.getDay() === 0 ? 7 : today.getDay(); // 1=Mon…5=Fri

  const [classes, substitutions, periodConfigs] = await Promise.all([
    prisma.schoolClass.findMany({
      where: { schoolId: session.schoolId ?? "" },
      orderBy: [{ grade: "asc" }, { name: "asc" }],
      include: {
        students: { select: { id: true }, take: 1 },
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
        schoolId: session.schoolId ?? "",
        date: { gte: today, lte: todayEnd },
      },
      include: {
        class: { select: { name: true } },
        substituteTeacher: { select: { name: true } },
        absentTeacher: { select: { name: true } },
      },
      orderBy: [{ period: "asc" }],
    }),
    session.schoolId
      ? prisma.schoolPeriodConfig.findMany({
          where: { schoolId: session.schoolId },
          orderBy: { period: "asc" },
        })
      : [],
  ]);

  const DEFAULT_TIMES = [
    "08:00", "08:50", "09:50", "10:40", "11:35", "12:25", "13:25", "14:15", "15:00",
  ];

  const periodTimes = Array.from({ length: 9 }, (_, i) => {
    const cfg = (periodConfigs as Array<{ period: number; startTime: string }>).find((p) => p.period === i + 1);
    return cfg?.startTime ?? DEFAULT_TIMES[i];
  });

  const classData = classes
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
    }));

  const substData = substitutions.map((s) => ({
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
  }));

  return (
    <AnzeigetafelClient
      classes={classData}
      substitutions={substData}
      periodTimes={periodTimes}
      todayLabel={today.toLocaleDateString("de-DE", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      })}
    />
  );
}
