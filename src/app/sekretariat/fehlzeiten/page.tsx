import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";

export const metadata: Metadata = { title: "Fehlzeiten · Sekretariat" };

const STATUS_LABEL: Record<string, string> = {
  pending: "Ausstehend",
  confirmed: "Bestätigt",
  rejected: "Abgelehnt",
};

export default async function FehlzeitenPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const role = effectiveRole(session);
  if (role !== "secretary" && role !== "rector" && role !== "vice_rector" && role !== "admin" && role !== "super") {
    redirect("/login");
  }

  const absences = await prisma.absence.findMany({
    where: { student: { schoolId: session.schoolId ?? "" } },
    include: {
      student: {
        select: { name: true, klasse: true, schoolClass: { select: { name: true } } },
      },
    },
    orderBy: { fromDate: "desc" },
    take: 100,
  });

  function formatRange(from: Date, to: Date) {
    const fmt = (d: Date) => d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
    return from.toDateString() === to.toDateString() ? fmt(from) : `${fmt(from)} – ${fmt(to)}`;
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">Sekretariat</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Fehlzeiten</h1>
        <p className="mt-1 text-sm text-muted-fg">Letzte 100 Einträge</p>
      </header>

      {absences.length === 0 ? (
        <div className="grid place-items-center border border-dashed border-border py-16">
          <p className="text-sm text-muted-fg">Keine Fehlzeiten eingetragen.</p>
        </div>
      ) : (
        <div className="border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface text-xs font-semibold uppercase tracking-wider text-muted-fg">
                <th className="px-5 py-3 text-left">Zeitraum</th>
                <th className="px-5 py-3 text-left">Schüler</th>
                <th className="px-5 py-3 text-left">Klasse</th>
                <th className="px-5 py-3 text-left">Status</th>
                <th className="px-5 py-3 text-left">Grund</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {absences.map((a) => (
                <tr key={a.id} className="hover:bg-surface">
                  <td className="px-5 py-2.5 font-mono text-xs">
                    {formatRange(a.fromDate, a.toDate)}
                  </td>
                  <td className="px-5 py-2.5 font-medium">{a.student.name}</td>
                  <td className="px-5 py-2.5 font-mono text-xs text-muted-fg">
                    {a.student.schoolClass?.name ?? a.student.klasse ?? "—"}
                  </td>
                  <td className="px-5 py-2.5">
                    <span className={
                      a.status === "confirmed"
                        ? "text-success font-semibold"
                        : a.status === "rejected"
                        ? "text-danger font-semibold"
                        : "text-warning"
                    }>
                      {STATUS_LABEL[a.status] ?? a.status}
                    </span>
                  </td>
                  <td className="px-5 py-2.5 text-muted-fg">{a.reason ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
