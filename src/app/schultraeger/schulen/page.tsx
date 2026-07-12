/* Copyright 2026 Elian Schock, Jonas Schwenk */
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
  if (plan === "enterprise") return <Badge className="bg-warning/15 text-warning">{PLAN_LABEL[plan] ?? plan}</Badge>;
  if (plan === "pro") return <Badge variant="info">{PLAN_LABEL[plan] ?? plan}</Badge>;
  return <Badge variant="neutral">{PLAN_LABEL[plan] ?? plan}</Badge>;
}

export default async function SchultraegerSchulenPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "school_company" && effectiveRole(session) !== "super") redirect("/login");

  const schools = await prisma.school.findMany({
    include: { _count: { select: { users: true, classes: true, subjects: true } } },
    orderBy: { name: "asc" },
  });

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

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Schulen</h1>
        <p className="mt-1 text-sm text-muted-fg">{schools.length} Schule{schools.length !== 1 ? "n" : ""} im Träger</p>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Schulen gesamt", value: schools.length, sub: `${schools.length} aktiv` },
          { label: "Nutzer gesamt", value: totalUsers, sub: "über alle Schulen" },
          { label: "Kontingent", value: `${totalUsers}/${schools.reduce((s, sc) => s + sc.seats, 0)}`, sub: "Nutzer / Plätze" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-border bg-bg p-5 shadow-sm" style={{ boxShadow: "var(--shadow-sm)" }}>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-fg">{s.label}</p>
            <p className="mt-2 font-mono text-2xl font-bold sm:text-3xl">{s.value}</p>
            <p className="mt-1 text-xs text-muted-fg">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* School list */}
      <div className="space-y-3">
        {schools.map((school) => {
          const roles = rolesBySchool.get(school.id) ?? { students: 0, teachers: 0 };
          return (
            <div key={school.id} className="rounded-2xl border border-border bg-bg p-5 shadow-sm transition-shadow hover:shadow-md" style={{ boxShadow: "var(--shadow-sm)" }}>
              <div className="flex items-start gap-4">
                <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand/8 text-brand">
                  <Building2 className="size-5" strokeWidth={1.75} />
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
                  <div className="mt-3 flex flex-wrap gap-4 text-sm">
                    {[
                      { icon: Users, label: "Nutzer", value: school._count.users },
                      { icon: GraduationCap, label: "Schüler", value: roles.students },
                      { icon: Users, label: "Lehrkräfte", value: roles.teachers },
                      { icon: Layers, label: "Fächer", value: school._count.subjects },
                    ].map((stat) => (
                      <span key={stat.label} className="flex items-center gap-1.5 text-muted-fg">
                        <stat.icon className="size-3.5" strokeWidth={1.75} />
                        <strong className="font-semibold text-fg">{stat.value}</strong>
                        {stat.label}
                      </span>
                    ))}
                    <span className="text-muted-fg">
                      Kontingent: <strong className="font-semibold text-fg">{school._count.users}/{school.seats}</strong>
                    </span>
                  </div>
                </div>
                <Link
                  href={`/admin/nutzer?school=${school.id}`}
                  className="flex shrink-0 items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold text-muted-fg transition-colors hover:bg-surface hover:text-fg"
                >
                  Details <ArrowRight className="size-3.5" />
                </Link>
              </div>
            </div>
          );
        })}
        {schools.length === 0 && (
          <div className="rounded-2xl border border-border bg-bg px-5 py-10 text-center text-sm text-muted-fg">
            Keine Schulen vorhanden.
          </div>
        )}
      </div>
    </div>
  );
}
