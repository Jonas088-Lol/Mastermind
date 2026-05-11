import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Users } from "lucide-react";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";

export const metadata: Metadata = { title: "Klassenlisten · Sekretariat" };

export default async function KlassenlistenPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const role = effectiveRole(session);
  if (role !== "secretary" && role !== "rector" && role !== "vice_rector" && role !== "admin" && role !== "super") {
    redirect("/login");
  }

  const classes = await prisma.schoolClass.findMany({
    where: { schoolId: session.schoolId ?? "" },
    include: {
      students: {
        where: { role: "student" },
        select: { id: true, name: true, email: true },
        orderBy: { name: "asc" },
      },
    },
    orderBy: [{ grade: "asc" }, { name: "asc" }],
  });

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">Sekretariat</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Klassenlisten</h1>
        <p className="mt-1 text-sm text-muted-fg">{classes.length} Klassen</p>
      </header>

      {classes.length === 0 ? (
        <div className="grid place-items-center border border-dashed border-border py-16">
          <p className="text-sm text-muted-fg">Noch keine Klassen angelegt.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {classes.map((cls) => (
            <section key={cls.id} className="border border-border">
              <div className="flex items-center justify-between border-b border-border bg-surface px-5 py-3">
                <div className="flex items-center gap-3">
                  <Users className="size-4 text-muted-fg" strokeWidth={1.75} />
                  <h2 className="font-semibold">Klasse {cls.name}</h2>
                  <span className="font-mono text-xs text-muted-fg">{cls.students.length} Schüler</span>
                </div>
                <span className="text-xs text-muted-fg">Jahrgang {cls.grade}</span>
              </div>
              {cls.students.length === 0 ? (
                <p className="px-5 py-4 text-sm text-muted-fg">Noch keine Schüler zugewiesen.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-xs font-semibold uppercase tracking-wider text-muted-fg">
                      <th className="px-5 py-2 text-left">#</th>
                      <th className="px-5 py-2 text-left">Name</th>
                      <th className="px-5 py-2 text-left">E-Mail</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {cls.students.map((s, idx) => (
                      <tr key={s.id} className="hover:bg-surface">
                        <td className="px-5 py-2.5 font-mono text-xs text-muted-fg">{idx + 1}</td>
                        <td className="px-5 py-2.5 font-medium">{s.name}</td>
                        <td className="px-5 py-2.5 text-muted-fg">{s.email}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
