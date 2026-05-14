import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";

export const metadata: Metadata = { title: "Statistiken · Schulträger" };

export default async function SchultraegerStatistikenPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "school_company" && effectiveRole(session) !== "super") redirect("/login");

  const [schools, userCountByRole] = await Promise.all([
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
  ]);

  const roleMap = Object.fromEntries(userCountByRole.map((r) => [r.role, r._count.id]));

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-10">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Statistiken</h1>
        <p className="mt-1 text-sm text-muted-fg">Kennzahlen aller Schulen im Träger.</p>
      </header>

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-fg">Nutzer nach Rolle</h2>
        <div className="grid grid-cols-2 gap-px border border-border bg-border sm:grid-cols-4">
          {(["student", "teacher", "parent", "secretary"] as const).map((role) => (
            <div key={role} className="bg-bg p-5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-fg">{role}</p>
              <p className="mt-2 font-mono text-3xl font-bold">{roleMap[role] ?? 0}</p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-fg">Pro Schule</h2>
        <table className="w-full border border-border text-sm">
          <thead className="border-b border-border bg-surface text-left text-xs font-semibold uppercase tracking-wider text-muted-fg">
            <tr>
              <th className="px-4 py-3">Schule</th>
              <th className="px-4 py-3 text-right">Nutzer</th>
              <th className="px-4 py-3 text-right">Klassen</th>
              <th className="px-4 py-3 text-right">Abwesenheiten</th>
              <th className="px-4 py-3 text-right">Plan</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {schools.map((sc) => (
              <tr key={sc.id} className="bg-bg hover:bg-surface">
                <td className="px-4 py-3 font-medium">{sc.name}</td>
                <td className="px-4 py-3 text-right font-mono">{sc._count.users}</td>
                <td className="px-4 py-3 text-right font-mono">{sc._count.classes}</td>
                <td className="px-4 py-3 text-right font-mono">{sc._count.absences}</td>
                <td className="px-4 py-3 text-right">
                  <span className="bg-surface px-2 py-0.5 font-mono text-[10px] font-semibold uppercase">{sc.plan}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
