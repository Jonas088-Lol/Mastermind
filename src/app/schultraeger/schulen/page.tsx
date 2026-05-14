import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Building2, GraduationCap, Users, Layers } from "lucide-react";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";

export const metadata: Metadata = { title: "Schulen · Schulträger" };

const PLAN_LABEL: Record<string, string> = {
  basic: "Basic",
  pro: "Pro",
  enterprise: "Enterprise",
};

export default async function SchultraegerSchulenPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "school_company" && effectiveRole(session) !== "super") redirect("/login");

  const schools = await prisma.school.findMany({
    include: {
      _count: {
        select: {
          users: true,
          classes: true,
          subjects: true,
        },
      },
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Schulen</h1>
        <p className="mt-1 text-sm text-muted-fg">{schools.length} Schule{schools.length !== 1 ? "n" : ""} im Träger</p>
      </header>

      <div className="divide-y divide-border border border-border">
        {schools.map((school) => (
          <div key={school.id} className="bg-bg px-5 py-5">
            <div className="flex items-start gap-4">
              <div className="flex size-10 shrink-0 items-center justify-center bg-surface">
                <Building2 className="size-5 text-muted-fg" strokeWidth={1.75} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-bold">{school.name}</p>
                  <span className="bg-surface px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-fg">
                    {PLAN_LABEL[school.plan] ?? school.plan}
                  </span>
                </div>
                {(school.city || school.state) && (
                  <p className="mt-0.5 text-xs text-muted-fg">
                    {[school.city, school.state].filter(Boolean).join(", ")}
                  </p>
                )}
                <div className="mt-3 flex flex-wrap gap-5 text-sm">
                  <span className="flex items-center gap-1.5 text-muted-fg">
                    <Users className="size-4" strokeWidth={1.75} />
                    <strong className="text-fg">{school._count.users}</strong> Nutzer
                  </span>
                  <span className="flex items-center gap-1.5 text-muted-fg">
                    <GraduationCap className="size-4" strokeWidth={1.75} />
                    <strong className="text-fg">{school._count.classes}</strong> Klassen
                  </span>
                  <span className="flex items-center gap-1.5 text-muted-fg">
                    <Layers className="size-4" strokeWidth={1.75} />
                    <strong className="text-fg">{school._count.subjects}</strong> Fächer
                  </span>
                  <span className="flex items-center gap-1.5 text-muted-fg">
                    Kontingent: <strong className="text-fg">{school._count.users}/{school.seats}</strong>
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
        {schools.length === 0 && (
          <p className="bg-bg px-5 py-8 text-sm text-muted-fg">Keine Schulen vorhanden.</p>
        )}
      </div>
    </div>
  );
}
