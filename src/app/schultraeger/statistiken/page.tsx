import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";

export const metadata: Metadata = { title: "Statistiken · Schulträger" };

const ROLE_LABEL: Record<string, string> = {
  student: "Schüler",
  teacher: "Lehrkräfte",
  parent: "Eltern",
  secretary: "Sekretariat",
};

export default async function SchultraegerStatistikenPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "school_company" && effectiveRole(session) !== "super") redirect("/login");

  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400_000);

  const [
    schools,
    userCountByRole,
    monthlyAssignments,
    monthlyGrades,
    totalXp,
    coinCirculation,
    activeStreaks,
    aiQuotaTotal,
  ] = await Promise.all([
    prisma.school.findMany({
      include: {
        _count: { select: { users: true, classes: true, absences: true } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.user.groupBy({
      by: ["role"],
      _count: { id: true },
    }),
    prisma.assignment.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
    prisma.grade.count({ where: { date: { gte: thirtyDaysAgo } } }),
    prisma.user.aggregate({ _sum: { xp: true } }),
    prisma.user.aggregate({ _sum: { coins: true } }),
    prisma.user.count({ where: { streak: { gte: 3 } } }),
    prisma.aiQuotaEntry.aggregate({ _sum: { used: true } }),
  ]);

  // Per-school monthly assignments and grades — resolved via class→school
  const schoolAssignmentCounts = await prisma.assignment.groupBy({
    by: ["classId"],
    _count: { id: true },
    where: { createdAt: { gte: thirtyDaysAgo } },
  });
  const classSchoolMap = await prisma.schoolClass.findMany({
    where: { schoolId: { in: schools.map((s) => s.id) } },
    select: { id: true, schoolId: true },
  });
  const classToSchool = new Map(classSchoolMap.map((c) => [c.id, c.schoolId]));
  const assignmentsBySchool = new Map<string, number>();
  for (const row of schoolAssignmentCounts) {
    const schoolId = classToSchool.get(row.classId);
    if (!schoolId) continue;
    assignmentsBySchool.set(schoolId, (assignmentsBySchool.get(schoolId) ?? 0) + row._count.id);
  }

  // Per-school student/teacher breakdown
  const schoolUserRoles = await prisma.user.groupBy({
    by: ["schoolId", "role"],
    _count: { id: true },
    where: {
      schoolId: { in: schools.map((s) => s.id) },
      role: { in: ["student", "teacher"] },
    },
  });
  type RoleCount = { students: number; teachers: number };
  const rolesBySchool = new Map<string, RoleCount>();
  for (const row of schoolUserRoles) {
    if (!row.schoolId) continue;
    const entry = rolesBySchool.get(row.schoolId) ?? { students: 0, teachers: 0 };
    if (row.role === "student") entry.students = row._count.id;
    if (row.role === "teacher") entry.teachers = row._count.id;
    rolesBySchool.set(row.schoolId, entry);
  }

  // Per-school AI quota usage
  const schoolAiUsage = await prisma.aiQuotaEntry.findMany({
    where: { user: { schoolId: { in: schools.map((s) => s.id) } } },
    select: { used: true, user: { select: { schoolId: true } } },
  });
  const aiBySchool = new Map<string, number>();
  for (const entry of schoolAiUsage) {
    const sid = entry.user.schoolId;
    if (!sid) continue;
    aiBySchool.set(sid, (aiBySchool.get(sid) ?? 0) + entry.used);
  }

  const roleMap = Object.fromEntries(userCountByRole.map((r) => [r.role, r._count.id]));

  // Growth placeholder — count schools added in last 30 days
  const newSchoolsThisMonth = await prisma.school.count({
    where: { createdAt: { gte: thirtyDaysAgo } },
  });

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-10">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Statistiken</h1>
        <p className="mt-1 text-sm text-muted-fg">Kennzahlen aller Schulen im Träger.</p>
      </header>

      {/* Nutzer nach Rolle */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-fg">Nutzer nach Rolle</h2>
        <div className="grid grid-cols-2 gap-px border border-border bg-border sm:grid-cols-4">
          {(["student", "teacher", "parent", "secretary"] as const).map((role) => (
            <div key={role} className="bg-bg p-5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-fg">
                {ROLE_LABEL[role]}
              </p>
              <p className="mt-2 font-mono text-3xl font-bold">{roleMap[role] ?? 0}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Plattform-Gesamtzahlen */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-fg">
          Plattform-Kennzahlen (gesamt)
        </h2>
        <div className="grid grid-cols-2 gap-px border border-border bg-border sm:grid-cols-3 lg:grid-cols-5">
          <div className="bg-bg p-5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-fg">Aufgaben (30 T.)</p>
            <p className="mt-2 font-mono text-3xl font-bold">{monthlyAssignments}</p>
          </div>
          <div className="bg-bg p-5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-fg">Noten (30 T.)</p>
            <p className="mt-2 font-mono text-3xl font-bold">{monthlyGrades}</p>
          </div>
          <div className="bg-bg p-5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-fg">XP vergeben</p>
            <p className="mt-2 font-mono text-3xl font-bold">{(totalXp._sum.xp ?? 0).toLocaleString("de-DE")}</p>
          </div>
          <div className="bg-bg p-5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-fg">Coins im Umlauf</p>
            <p className="mt-2 font-mono text-3xl font-bold">{(coinCirculation._sum.coins ?? 0).toLocaleString("de-DE")}</p>
          </div>
          <div className="bg-bg p-5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-fg">Aktive Streaks</p>
            <p className="mt-2 font-mono text-3xl font-bold">{activeStreaks}</p>
            <p className="mt-1 text-[10px] text-muted-fg">≥ 3 Tage</p>
          </div>
        </div>
      </div>

      {/* Wachstums-Indikator */}
      <div className="border border-border bg-bg px-5 py-4 text-sm text-muted-fg">
        <span className="font-semibold text-fg">Wachstum:</span>{" "}
        Aktive Schulen: {schools.length}
        {newSchoolsThisMonth > 0 && (
          <span className="ml-1 text-success font-semibold">(↑{newSchoolsThisMonth} diesen Monat)</span>
        )}
        {newSchoolsThisMonth === 0 && (
          <span className="ml-1 text-muted-fg">(±0 diesen Monat)</span>
        )}
        {" · "}
        KI-Anfragen gesamt: <span className="font-semibold text-fg">{(aiQuotaTotal._sum.used ?? 0).toLocaleString("de-DE")}</span>
      </div>

      {/* Pro-Schule-Aufschlüsselung */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-fg">Aufschlüsselung pro Schule</h2>
        <div className="overflow-x-auto">
          <table className="w-full border border-border text-sm">
            <thead className="border-b border-border bg-surface text-left text-xs font-semibold uppercase tracking-wider text-muted-fg">
              <tr>
                <th className="px-4 py-3">Schule</th>
                <th className="px-4 py-3 text-right">Schüler</th>
                <th className="px-4 py-3 text-right">Lehrkräfte</th>
                <th className="px-4 py-3 text-right">Aufgaben (30 T.)</th>
                <th className="px-4 py-3 text-right">Noten (30 T.)</th>
                <th className="px-4 py-3 text-right">KI-Nutzung</th>
                <th className="px-4 py-3 text-right">Plan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {schools.map((sc) => {
                const roles = rolesBySchool.get(sc.id) ?? { students: 0, teachers: 0 };
                return (
                  <tr key={sc.id} className="bg-bg hover:bg-surface">
                    <td className="px-4 py-3 font-medium">{sc.name}</td>
                    <td className="px-4 py-3 text-right font-mono">{roles.students}</td>
                    <td className="px-4 py-3 text-right font-mono">{roles.teachers}</td>
                    <td className="px-4 py-3 text-right font-mono">{assignmentsBySchool.get(sc.id) ?? 0}</td>
                    <td className="px-4 py-3 text-right font-mono">—</td>
                    <td className="px-4 py-3 text-right font-mono">{(aiBySchool.get(sc.id) ?? 0).toLocaleString("de-DE")}</td>
                    <td className="px-4 py-3 text-right">
                      <span className="bg-surface px-2 py-0.5 font-mono text-[10px] font-semibold uppercase">
                        {sc.plan}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[11px] text-muted-fg">
          * Noten pro Schule erfordern eine Join-Abfrage über Schüler → wird in einer späteren Version ergänzt.
        </p>
      </div>
    </div>
  );
}
