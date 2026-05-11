import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/db/client";
import { ROLE_HOME, effectiveRole, getSession } from "@/lib/session";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Noten · Eltern" };

export default async function ElternNotenPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "parent") redirect(ROLE_HOME[effectiveRole(session)]);

  const links = await prisma.parentStudentLink.findMany({
    where: { parentId: session.userId },
    include: {
      student: {
        include: {
          studentGrades: {
            include: { subject: { select: { name: true, color: true } } },
            orderBy: { date: "desc" },
          },
        },
      },
    },
  });

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">Schuljahr 2025/26</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Noten</h1>
      </header>

      {links.map(({ student }) => {
        const grades = student.studentGrades;
        const bySubject = new Map<string, typeof grades>();
        for (const g of grades) {
          const list = bySubject.get(g.subject.name) ?? [];
          list.push(g);
          bySubject.set(g.subject.name, list);
        }
        const totalWeight = grades.reduce((s, g) => s + g.weight, 0);
        const avg = totalWeight > 0 ? grades.reduce((s, g) => s + g.value * g.weight, 0) / totalWeight : null;

        return (
          <div key={student.id}>
            {links.length > 1 && (
              <h2 className="mb-4 text-lg font-bold">{student.name}</h2>
            )}
            <div className="mb-4 grid grid-cols-2 gap-px border border-border bg-border sm:grid-cols-3">
              <div className="bg-bg p-5">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-fg">Ø-Note gesamt</p>
                <p className="mt-2 font-mono text-3xl font-bold">{avg ? avg.toFixed(1).replace(".", ",") : "—"}</p>
              </div>
              <div className="bg-bg p-5">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-fg">Einträge</p>
                <p className="mt-2 font-mono text-3xl font-bold">{grades.length}</p>
              </div>
              <div className="col-span-2 bg-bg p-5 sm:col-span-1">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-fg">Fächer</p>
                <p className="mt-2 font-mono text-3xl font-bold">{bySubject.size}</p>
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Alle Noten</CardTitle>
                <span className="font-mono text-xs text-muted-fg">{grades.length} Einträge</span>
              </CardHeader>
              <CardBody className="!px-0 !pb-0">
                {grades.length === 0 ? (
                  <div className="border-t border-border px-5 py-8 text-sm text-muted-fg">Noch keine Noten.</div>
                ) : (
                  <ul className="divide-y divide-border border-t border-border">
                    {grades.map((g) => (
                      <li key={g.id} className="flex items-center gap-4 px-5 py-3.5">
                        <span className="inline-block size-3 shrink-0 rounded-full" style={{ backgroundColor: g.subject.color }} />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold">{g.subject.name}</p>
                          <p className="text-xs text-muted-fg">
                            {g.date.toLocaleDateString("de-DE", { day: "numeric", month: "long", year: "numeric" })}
                            {g.type && ` · ${g.type}`}
                          </p>
                        </div>
                        <p className={cn("font-mono text-lg font-bold tabular-nums", g.value >= 4 && "text-danger", g.value >= 3 && g.value < 4 && "text-warning")}>
                          {g.value.toFixed(1).replace(".", ",")}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </CardBody>
            </Card>
          </div>
        );
      })}
    </div>
  );
}
