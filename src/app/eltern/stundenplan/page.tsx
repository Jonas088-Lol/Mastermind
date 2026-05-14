import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/db/client";
import { ROLE_HOME, effectiveRole, getSession } from "@/lib/session";

export const metadata: Metadata = { title: "Stundenplan · Eltern" };

const DAY_NAMES = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag"];

export default async function ElternStundenplanPage() {
  const todayDow = (() => { const d = new Date().getDay(); return d === 0 ? 7 : d; })();
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "parent") redirect(ROLE_HOME[effectiveRole(session)]);

  const links = await prisma.parentStudentLink.findMany({
    where: { parentId: session.userId },
    include: {
      student: {
        include: {
          timetableEntries: {
            include: {
              subject: { select: { name: true, color: true } },
              teacher: { select: { name: true } },
            },
            orderBy: [{ day: "asc" }, { period: "asc" }],
          },
        },
      },
    },
  });

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">Schuljahr 2025/26</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Stundenplan</h1>
      </header>

      {links.map(({ student }) => {
        const byDay = Array.from({ length: 5 }, (_, i) =>
          student.timetableEntries.filter((e) => e.day === i + 1)
        );
        return (
          <div key={student.id}>
            {links.length > 1 && <h2 className="mb-4 text-lg font-bold">{student.name}</h2>}
            <div className="grid gap-4 md:grid-cols-5">
              {byDay.map((entries, idx) => (
                <Card key={idx} className={idx + 1 === todayDow ? "border-brand/40" : ""}>
                  <CardHeader>
                    <CardTitle className="text-sm">{DAY_NAMES[idx]}</CardTitle>
                    {idx + 1 === todayDow && (
                      <span className="rounded-none bg-brand px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-brand-fg">
                        Heute
                      </span>
                    )}
                  </CardHeader>
                  <CardBody className="!px-0 !pb-0">
                    {entries.length === 0 ? (
                      <p className="border-t border-border px-4 py-3 text-xs text-muted-fg">Kein Unterricht</p>
                    ) : (
                      <ol className="divide-y divide-border border-t border-border">
                        {entries.map((e) => (
                          <li key={e.id} className="flex items-start gap-2 px-4 py-2.5 text-xs">
                            <span className="mt-0.5 w-4 shrink-0 font-mono text-muted-fg">{e.period}.</span>
                            <span className="mt-1 inline-block size-1.5 shrink-0" style={{ backgroundColor: e.subject.color }} />
                            <div className="min-w-0">
                              <p className="font-semibold">{e.subject.name}</p>
                              <p className="text-muted-fg">{e.teacher.name}</p>
                            </div>
                          </li>
                        ))}
                      </ol>
                    )}
                  </CardBody>
                </Card>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
