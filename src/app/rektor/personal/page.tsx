import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession, ROLE_LABEL } from "@/lib/session";

export const metadata: Metadata = { title: "Personal · Schulleitung" };

export default async function PersonalPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const role = effectiveRole(session);
  if (role !== "rector" && role !== "vice_rector" && role !== "admin" && role !== "super") {
    redirect("/login");
  }

  const staff = await prisma.user.findMany({
    where: {
      schoolId: session.schoolId ?? "",
      role: { in: ["teacher", "admin", "secretary", "rector", "vice_rector"] },
    },
    include: {
      teacherSubjectClasses: {
        include: {
          subject: { select: { shortName: true, color: true } },
          class: { select: { name: true } },
        },
        take: 3,
      },
    },
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">Schulleitung</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Personal</h1>
        <p className="mt-1 text-sm text-muted-fg">{staff.length} Mitarbeiter</p>
      </header>

      <div className="border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface text-xs font-semibold uppercase tracking-wider text-muted-fg">
              <th className="px-5 py-3 text-left">Name</th>
              <th className="px-5 py-3 text-left">Rolle</th>
              <th className="px-5 py-3 text-left">E-Mail</th>
              <th className="px-5 py-3 text-left">Fächer / Klassen</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {staff.map((s) => (
              <tr key={s.id} className="hover:bg-surface">
                <td className="px-5 py-3 font-medium">{s.name}</td>
                <td className="px-5 py-3 text-muted-fg">
                  {ROLE_LABEL[s.role as keyof typeof ROLE_LABEL] ?? s.role}
                </td>
                <td className="px-5 py-3 text-muted-fg">{s.email}</td>
                <td className="px-5 py-3">
                  <div className="flex flex-wrap gap-1">
                    {s.teacherSubjectClasses.map((tsc, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 border border-border px-1.5 py-0.5 text-[10px] font-medium"
                      >
                        <span
                          className="size-2 rounded-full"
                          style={{ backgroundColor: tsc.subject.color }}
                        />
                        {tsc.subject.shortName} {tsc.class.name}
                      </span>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
