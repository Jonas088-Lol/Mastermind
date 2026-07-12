/* Copyright 2026 Elian Schock, Jonas Schwenk */
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CheckCircle2, XCircle, Clock } from "lucide-react";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { cn } from "@/lib/utils";
import { confirmAbsence, rejectAbsence } from "./actions";

export const metadata: Metadata = { title: "Fehlzeiten · Sekretariat" };

const STATUS: Record<string, { label: string; cls: string }> = {
  pending:   { label: "Ausstehend", cls: "text-warning" },
  confirmed: { label: "Bestätigt",  cls: "text-success" },
  rejected:  { label: "Abgelehnt",  cls: "text-danger"  },
};

export default async function FehlzeitenPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const role = effectiveRole(session);
  if (!["secretary", "rector", "vice_rector", "admin", "super"].includes(role)) redirect("/login");

  const [absences, pendingCount] = await Promise.all([
    prisma.absence.findMany({
      where: { student: { schoolId: session.schoolId ?? "" } },
      include: {
        student: { select: { name: true, klasse: true, schoolClass: { select: { name: true } } } },
        reporter: { select: { name: true } },
      },
      orderBy: [{ status: "asc" }, { fromDate: "desc" }],
      take: 100,
    }),
    prisma.absence.count({
      where: { student: { schoolId: session.schoolId ?? "" }, status: "pending" },
    }),
  ]);

  function formatRange(from: Date, to: Date) {
    const fmt = (d: Date) => d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
    return from.toDateString() === to.toDateString() ? fmt(from) : `${fmt(from)} – ${fmt(to)}`;
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">Sekretariat</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Fehlzeiten</h1>
        <p className="mt-1 text-sm text-muted-fg">
          {pendingCount > 0 ? (
            <span className="font-semibold text-warning">{pendingCount} ausstehend</span>
          ) : (
            "Alle bearbeitet"
          )}
          {" · "}letzte 100 Einträge
        </p>
      </header>

      {absences.length === 0 ? (
        <div className="grid place-items-center border border-dashed border-border py-16">
          <p className="text-sm text-muted-fg">Keine Fehlzeiten eingetragen.</p>
        </div>
      ) : (
        <div className="overflow-x-auto border border-border">
          <table className="w-full min-w-[700px] text-sm">
            <thead>
              <tr className="border-b border-border bg-surface text-xs font-semibold uppercase tracking-wider text-muted-fg">
                <th className="px-5 py-3 text-left">Zeitraum</th>
                <th className="px-5 py-3 text-left">Schüler</th>
                <th className="px-5 py-3 text-left">Klasse</th>
                <th className="px-5 py-3 text-left">Gemeldet von</th>
                <th className="px-5 py-3 text-left">Grund</th>
                <th className="px-5 py-3 text-left">Status</th>
                <th className="px-5 py-3 text-right">Aktion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {absences.map((a) => {
                const st = STATUS[a.status] ?? STATUS.pending;
                return (
                  <tr key={a.id} className={cn("hover:bg-surface", a.status === "pending" && "bg-warning/3")}>
                    <td className="px-5 py-3 font-mono text-xs">{formatRange(a.fromDate, a.toDate)}</td>
                    <td className="px-5 py-3 font-medium">{a.student.name}</td>
                    <td className="px-5 py-3 font-mono text-xs text-muted-fg">
                      {a.student.schoolClass?.name ?? a.student.klasse ?? "—"}
                    </td>
                    <td className="px-5 py-3 text-muted-fg text-xs">{a.reporter.name}</td>
                    <td className="max-w-[180px] truncate px-5 py-3 text-muted-fg">{a.reason ?? "—"}</td>
                    <td className="px-5 py-3">
                      <span className={cn("flex items-center gap-1.5 text-xs font-semibold", st.cls)}>
                        {a.status === "confirmed" && <CheckCircle2 className="size-3.5" />}
                        {a.status === "rejected"  && <XCircle className="size-3.5" />}
                        {a.status === "pending"   && <Clock className="size-3.5" />}
                        {st.label}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      {a.status === "pending" && (
                        <div className="flex items-center justify-end gap-2">
                          <form action={confirmAbsence.bind(null, a.id)}>
                            <button
                              type="submit"
                              className="flex items-center gap-1 bg-success/10 px-2.5 py-1 text-xs font-semibold text-success hover:bg-success/20"
                            >
                              <CheckCircle2 className="size-3.5" />
                              Bestätigen
                            </button>
                          </form>
                          <form action={rejectAbsence.bind(null, a.id)}>
                            <button
                              type="submit"
                              className="flex items-center gap-1 bg-danger/10 px-2.5 py-1 text-xs font-semibold text-danger hover:bg-danger/20"
                            >
                              <XCircle className="size-3.5" />
                              Ablehnen
                            </button>
                          </form>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
