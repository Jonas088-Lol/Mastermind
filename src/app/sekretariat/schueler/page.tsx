import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";

export const metadata: Metadata = { title: "Schüler · Sekretariat" };

export default async function SchuelerPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const role = effectiveRole(session);
  if (role !== "secretary" && role !== "rector" && role !== "vice_rector" && role !== "admin" && role !== "super") {
    redirect("/login");
  }

  const students = await prisma.user.findMany({
    where: { schoolId: session.schoolId ?? "", role: "student" },
    include: {
      schoolClass: { select: { name: true, grade: true } },
      studentAbsences: {
        where: {
          fromDate: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
        select: { id: true, status: true },
      },
    },
    orderBy: [{ klasse: "asc" }, { name: "asc" }],
  });

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">Sekretariat</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Schüler</h1>
        <p className="mt-1 text-sm text-muted-fg">{students.length} Schüler gesamt</p>
      </header>

      <div className="border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface text-xs font-semibold uppercase tracking-wider text-muted-fg">
              <th className="px-5 py-3 text-left">Name</th>
              <th className="px-5 py-3 text-left">Klasse</th>
              <th className="px-5 py-3 text-left">E-Mail</th>
              <th className="px-5 py-3 text-right">Fehlzeiten (Monat)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {students.map((s) => {
              const absCount = s.studentAbsences.length;
              const confirmedCount = s.studentAbsences.filter((a) => a.status === "confirmed").length;
              const pendingCount = absCount - confirmedCount;
              return (
                <tr key={s.id} className="hover:bg-surface">
                  <td className="px-5 py-3 font-medium">{s.name}</td>
                  <td className="px-5 py-3 font-mono text-xs text-muted-fg">
                    {s.schoolClass?.name ?? s.klasse ?? "—"}
                  </td>
                  <td className="px-5 py-3 text-muted-fg">{s.email}</td>
                  <td className="px-5 py-3 text-right">
                    {absCount > 0 ? (
                      <span className="font-mono text-xs">
                        <span className={pendingCount > 2 ? "text-warning font-bold" : ""}>
                          {pendingCount} ausstehend
                        </span>
                        {confirmedCount > 0 && (
                          <span className="ml-2 text-muted-fg">{confirmedCount} bestätigt</span>
                        )}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-fg">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
