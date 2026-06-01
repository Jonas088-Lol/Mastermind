import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { updateSchoolPlan } from "./actions";

export const metadata: Metadata = { title: "Lizenzübersicht · Schulträger" };

function PlanBadge({ plan }: { plan: string }) {
  if (plan === "enterprise") {
    return (
      <Badge className="bg-warning/15 text-warning">Enterprise</Badge>
    );
  }
  if (plan === "pro") {
    return <Badge variant="info">Pro</Badge>;
  }
  return <Badge variant="neutral">Basic</Badge>;
}

export default async function SchultraegerLizenzenPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "school_company" && effectiveRole(session) !== "super") redirect("/login");

  const schools = await prisma.school.findMany({
    include: {
      _count: { select: { users: true } },
    },
    orderBy: { name: "asc" },
  });

  const planCounts = { basic: 0, pro: 0, enterprise: 0 } as Record<string, number>;
  for (const school of schools) {
    planCounts[school.plan] = (planCounts[school.plan] ?? 0) + 1;
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Lizenzübersicht</h1>
        <p className="mt-1 text-sm text-muted-fg">Lizenzen und Pläne aller Schulen im Träger verwalten.</p>
      </header>

      {/* Summary */}
      <div className="grid grid-cols-1 gap-px border border-border bg-border sm:grid-cols-3">
        <div className="bg-bg p-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-fg">Basic</p>
          <p className="mt-2 font-mono text-3xl font-bold">{planCounts.basic ?? 0}</p>
          <p className="mt-1 text-xs text-muted-fg">Schule{(planCounts.basic ?? 0) !== 1 ? "n" : ""}</p>
        </div>
        <div className="bg-bg p-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-fg">Pro</p>
          <p className="mt-2 font-mono text-3xl font-bold">{planCounts.pro ?? 0}</p>
          <p className="mt-1 text-xs text-muted-fg">Schule{(planCounts.pro ?? 0) !== 1 ? "n" : ""}</p>
        </div>
        <div className="bg-bg p-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-fg">Enterprise</p>
          <p className="mt-2 font-mono text-3xl font-bold">{planCounts.enterprise ?? 0}</p>
          <p className="mt-1 text-xs text-muted-fg">Schule{(planCounts.enterprise ?? 0) !== 1 ? "n" : ""}</p>
        </div>
      </div>

      {/* Per-school plan management */}
      <div className="flex flex-col gap-4">
        {schools.map((school) => (
          <Card key={school.id}>
            <CardHeader>
              <div className="flex flex-1 items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle className="text-base font-bold normal-case tracking-normal text-fg">
                      {school.name}
                    </CardTitle>
                    <PlanBadge plan={school.plan} />
                  </div>
                  {(school.city || school.state) && (
                    <p className="mt-0.5 text-xs text-muted-fg">
                      {[school.city, school.state].filter(Boolean).join(", ")}
                    </p>
                  )}
                </div>
                <p className="shrink-0 text-sm text-muted-fg">
                  <span className="font-mono font-semibold text-fg">{school._count.users}</span> Nutzer
                </p>
              </div>
            </CardHeader>
            <CardBody>
              <form action={updateSchoolPlan.bind(null, school.id)} className="flex flex-wrap items-center gap-3">
                <input type="hidden" name="schoolId" value={school.id} />
                <label htmlFor={`plan-${school.id}`} className="text-sm text-muted-fg">
                  Plan ändern:
                </label>
                <select
                  id={`plan-${school.id}`}
                  name="plan"
                  defaultValue={school.plan}
                  className="border border-border bg-bg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                >
                  <option value="basic">Basic</option>
                  <option value="pro">Pro</option>
                  <option value="enterprise">Enterprise</option>
                </select>
                <button
                  type="submit"
                  className="border border-border bg-surface px-3 py-1.5 text-sm font-semibold hover:bg-surface-2 focus:outline-none focus:ring-2 focus:ring-brand"
                >
                  Speichern
                </button>
              </form>
            </CardBody>
          </Card>
        ))}
        {schools.length === 0 && (
          <p className="border border-border bg-bg px-5 py-8 text-sm text-muted-fg">
            Keine Schulen vorhanden.
          </p>
        )}
      </div>
    </div>
  );
}
