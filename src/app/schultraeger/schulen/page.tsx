import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Building2, GraduationCap, Users, Layers, ArrowRight } from "lucide-react";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Schulen · Schulträger" };

const PLAN_LABEL: Record<string, string> = {
  basic: "Basic",
  pro: "Pro",
  enterprise: "Enterprise",
};

function PlanBadge({ plan }: { plan: string }) {
  if (plan === "enterprise") {
    return (
      <Badge className="bg-warning/15 text-warning">
        {PLAN_LABEL[plan] ?? plan}
      </Badge>
    );
  }
  if (plan === "pro") {
    return <Badge variant="info">{PLAN_LABEL[plan] ?? plan}</Badge>;
  }
  return <Badge variant="neutral">{PLAN_LABEL[plan] ?? plan}</Badge>;
}

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

  // Per-school student/teacher breakdown
  const schoolUserRoles = await prisma.user.groupBy({
    by: ["schoolId", "role"],
    _count: { id: true },
    where: { schoolId: { in: schools.map((s) => s.id) } },
  });

  type RoleCount = { students: number; teachers: number };
  const rolesBySchool = new Map<string, RoleCount>();
  for (const row of schoolUserRoles) {
    if (!row.schoolId) continue;
    const entry = rolesBySchool.get(row.schoolId) ?? { students: 0, teachers: 0 };
    if (row.role === "student") entry.students = row._count.id;
    if (row.role === "teacher") entry.teachers = row._count.id;
    rolesBySchool.set(row.schoolId, entry);
  }

  const totalUsers = schools.reduce((s, sc) => s + sc._count.users, 0);
  const activeSchools = schools.length; // No isActive field — all schools are considered active

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Schulen</h1>
        <p className="mt-1 text-sm text-muted-fg">{schools.length} Schule{schools.length !== 1 ? "n" : ""} im Träger</p>
      </header>

      {/* Summary strip */}
      <div className="grid grid-cols-1 gap-px border border-border bg-border sm:grid-cols-3">
        <div className="bg-bg p-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-fg">Schulen gesamt</p>
          <p className="mt-2 font-mono text-3xl font-bold">{schools.length}</p>
          <p className="mt-1 text-xs text-muted-fg">{activeSchools} aktiv</p>
        </div>
        <div className="bg-bg p-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-fg">Nutzer gesamt</p>
          <p className="mt-2 font-mono text-3xl font-bold">{totalUsers}</p>
          <p className="mt-1 text-xs text-muted-fg">über alle Schulen</p>
        </div>
        <div className="bg-bg p-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-fg">Kapazität</p>
          <p className="mt-2 font-mono text-3xl font-bold">
            {totalUsers}/{schools.reduce((s, sc) => s + sc.seats, 0)}
          </p>
          <p className="mt-1 text-xs text-muted-fg">Nutzer / Kontingent</p>
        </div>
      </div>

      <div className="divide-y divide-border border border-border">
        {schools.map((school) => {
          const roles = rolesBySchool.get(school.id) ?? { students: 0, teachers: 0 };
          return (
            <div key={school.id} className="bg-bg px-5 py-5">
              <div className="flex items-start gap-4">
                <div className="flex size-10 shrink-0 items-center justify-center bg-surface">
                  <Building2 className="size-5 text-muted-fg" strokeWidth={1.75} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-bold">{school.name}</p>
                    <PlanBadge plan={school.plan} />
                    <Badge variant="success">Aktiv</Badge>
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
                      <strong className="text-fg">{roles.students}</strong> Schüler
                    </span>
                    <span className="flex items-center gap-1.5 text-muted-fg">
                      <Users className="size-3.5" strokeWidth={1.75} />
                      <strong className="text-fg">{roles.teachers}</strong> Lehrkräfte
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
                <Link
                  href={`/admin/nutzer?school=${school.id}`}
                  className="flex shrink-0 items-center gap-1 text-xs font-semibold text-muted-fg hover:text-fg"
                >
                  Details <ArrowRight className="size-3.5" />
                </Link>
              </div>
            </div>
          );
        })}
        {schools.length === 0 && (
          <p className="bg-bg px-5 py-8 text-sm text-muted-fg">Keine Schulen vorhanden.</p>
        )}
      </div>
    </div>
  );
}
