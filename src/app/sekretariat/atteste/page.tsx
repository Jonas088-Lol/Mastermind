import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CheckCircle2, XCircle } from "lucide-react";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { confirmAttest, rejectAttest } from "./actions";

export const metadata: Metadata = { title: "Atteste · Sekretariat" };

function formatDateRange(from: Date, to: Date): string {
  const fmt = (d: Date) =>
    d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
  if (from.toDateString() === to.toDateString()) return fmt(from);
  return `${fmt(from)} – ${fmt(to)}`;
}

function dayDiff(from: Date, to: Date): number {
  const ms = to.getTime() - from.getTime();
  return Math.max(1, Math.round(ms / (1000 * 60 * 60 * 24)) + 1);
}

export default async function AttestePage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const role = effectiveRole(session);
  if (!["secretary", "rector", "vice_rector", "admin", "super"].includes(role)) redirect("/login");

  const schoolId = session.schoolId!;

  const [pending, confirmed] = await Promise.all([
    prisma.absence.findMany({
      where: { schoolId, status: "pending" },
      include: {
        student: { select: { name: true, klasse: true } },
        reporter: { select: { name: true } },
      },
      orderBy: { fromDate: "desc" },
    }),
    prisma.absence.findMany({
      where: { schoolId, status: "confirmed" },
      include: {
        student: { select: { name: true, klasse: true } },
        reporter: { select: { name: true } },
      },
      orderBy: { fromDate: "desc" },
      take: 50,
    }),
  ]);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">Sekretariat</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Atteste & Krankschreibungen</h1>
        <p className="mt-1 text-sm text-muted-fg">
          {pending.length > 0 ? (
            <span className="font-semibold text-warning">{pending.length} ausstehend</span>
          ) : (
            "Alle bestätigt"
          )}
        </p>
      </header>

      {/* Ausstehend */}
      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted-fg">
          Ausstehend ({pending.length})
        </h2>

        {pending.length === 0 ? (
          <div className="grid place-items-center border border-dashed border-border py-10">
            <p className="text-sm text-muted-fg">Keine ausstehenden Atteste.</p>
          </div>
        ) : (
          <div className="overflow-x-auto border border-border">
            <table className="w-full min-w-[680px] text-sm">
              <thead>
                <tr className="border-b border-border bg-surface text-xs font-semibold uppercase tracking-wider text-muted-fg">
                  <th className="px-5 py-3 text-left">Schüler</th>
                  <th className="px-5 py-3 text-left">Klasse</th>
                  <th className="px-5 py-3 text-left">Zeitraum</th>
                  <th className="px-5 py-3 text-left">Tage</th>
                  <th className="px-5 py-3 text-left">Grund</th>
                  <th className="px-5 py-3 text-left">Gemeldet von</th>
                  <th className="px-5 py-3 text-right">Aktion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {pending.map((a) => (
                  <tr key={a.id} className="bg-warning/3 hover:bg-surface">
                    <td className="px-5 py-3 font-medium">{a.student.name}</td>
                    <td className="px-5 py-3 font-mono text-xs text-muted-fg">
                      {a.student.klasse ?? "—"}
                    </td>
                    <td className="px-5 py-3 font-mono text-xs">
                      {formatDateRange(a.fromDate, a.toDate)}
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-muted-fg">
                      {dayDiff(a.fromDate, a.toDate)}
                    </td>
                    <td className="max-w-[160px] truncate px-5 py-3 text-muted-fg">
                      {a.reason ?? "—"}
                    </td>
                    <td className="px-5 py-3 text-xs text-muted-fg">{a.reporter.name}</td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <form action={confirmAttest.bind(null, a.id)}>
                          <button
                            type="submit"
                            className="flex items-center gap-1 bg-success/10 px-2.5 py-1 text-xs font-semibold text-success hover:bg-success/20"
                          >
                            <CheckCircle2 className="size-3.5" />
                            Bestätigen
                          </button>
                        </form>
                        <form action={rejectAttest.bind(null, a.id)}>
                          <button
                            type="submit"
                            className="flex items-center gap-1 bg-danger/10 px-2.5 py-1 text-xs font-semibold text-danger hover:bg-danger/20"
                          >
                            <XCircle className="size-3.5" />
                            Ablehnen
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Bestätigt */}
      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted-fg">
          Bestätigt (letzte 50)
        </h2>

        {confirmed.length === 0 ? (
          <div className="grid place-items-center border border-dashed border-border py-10">
            <p className="text-sm text-muted-fg">Noch keine bestätigten Atteste.</p>
          </div>
        ) : (
          <div className="overflow-x-auto border border-border">
            <table className="w-full min-w-[680px] text-sm">
              <thead>
                <tr className="border-b border-border bg-surface text-xs font-semibold uppercase tracking-wider text-muted-fg">
                  <th className="px-5 py-3 text-left">Schüler</th>
                  <th className="px-5 py-3 text-left">Klasse</th>
                  <th className="px-5 py-3 text-left">Zeitraum</th>
                  <th className="px-5 py-3 text-left">Tage</th>
                  <th className="px-5 py-3 text-left">Grund</th>
                  <th className="px-5 py-3 text-left">Gemeldet von</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {confirmed.map((a) => (
                  <tr key={a.id} className="hover:bg-surface">
                    <td className="px-5 py-3 font-medium">{a.student.name}</td>
                    <td className="px-5 py-3 font-mono text-xs text-muted-fg">
                      {a.student.klasse ?? "—"}
                    </td>
                    <td className="px-5 py-3 font-mono text-xs">
                      {formatDateRange(a.fromDate, a.toDate)}
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-muted-fg">
                      {dayDiff(a.fromDate, a.toDate)}
                    </td>
                    <td className="max-w-[160px] truncate px-5 py-3 text-muted-fg">
                      {a.reason ?? "—"}
                    </td>
                    <td className="px-5 py-3 text-xs text-muted-fg">{a.reporter.name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
