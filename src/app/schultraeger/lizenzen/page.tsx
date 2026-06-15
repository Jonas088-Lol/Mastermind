import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { updateSchoolPlan, toggleDlc } from "./actions";
import {
  DLC_FEATURES,
  DLC_CATEGORIES,
  getEnabledDlcs,
  enterpriseTotalPrice,
  PRO_MONTHLY_PRICE,
  BASIC_MONTHLY_PRICE,
} from "@/lib/features";
import { cn } from "@/lib/utils";
import { Check, Package, TrendingDown } from "lucide-react";

export const metadata: Metadata = { title: "Lizenzübersicht · Schulträger" };

function PlanBadge({ plan }: { plan: string }) {
  if (plan === "enterprise") return <Badge className="bg-warning/15 text-warning">Enterprise</Badge>;
  if (plan === "pro") return <Badge variant="info">Pro</Badge>;
  return <Badge variant="neutral">Basic</Badge>;
}

export default async function SchultraegerLizenzenPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "school_company" && effectiveRole(session) !== "super") redirect("/login");

  const schools = await prisma.school.findMany({
    include: { _count: { select: { users: true } } },
    orderBy: { name: "asc" },
  });

  const planCounts = { basic: 0, pro: 0, enterprise: 0 } as Record<string, number>;
  for (const school of schools) planCounts[school.plan] = (planCounts[school.plan] ?? 0) + 1;

  const allDlcPrice = DLC_FEATURES.reduce((s, f) => s + f.pricePerMonth, 0);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Lizenzübersicht</h1>
        <p className="mt-1 text-sm text-muted-fg">Pläne & Enterprise-Features aller Schulen verwalten.</p>
      </header>

      {/* Plan comparison */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { plan: "basic", label: "Basic", price: BASIC_MONTHLY_PRICE, features: ["Karteikarten", "Übungen", "Heft", "Nachrichten", "Vokabeln"], color: "border-border" },
          { plan: "pro",   label: "Pro",   price: PRO_MONTHLY_PRICE,   features: ["Alle Features außer SSO", "KI-Tutor & Korrekturen", "MasterSpace", "Gamification", "Eltern-Portal"], color: "border-brand/30" },
          { plan: "enterprise", label: "Enterprise", price: null, features: ["Individuelle Feature-Auswahl", "Bessere Kontrolle", "Nur benötigte Module", `Alle DLCs zusammen: ${allDlcPrice.toFixed(2)} €`], color: "border-warning/30" },
        ].map(({ plan, label, price, features, color }) => (
          <div key={plan} className={cn("rounded-2xl border p-5", color)}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-fg">{label}</p>
                {price ? (
                  <p className="mt-1 text-2xl font-bold">{price.toFixed(2)} <span className="text-sm font-normal text-muted-fg">€/Monat</span></p>
                ) : (
                  <p className="mt-1 text-sm font-medium text-warning">nach gewählten DLCs</p>
                )}
              </div>
              <span className="rounded-xl bg-surface px-2 py-1 text-[10px] font-mono font-bold text-muted-fg">
                {planCounts[plan] ?? 0} Schule{(planCounts[plan] ?? 0) !== 1 ? "n" : ""}
              </span>
            </div>
            <ul className="mt-4 space-y-1.5">
              {features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-xs text-muted-fg">
                  <Check className="mt-0.5 size-3 shrink-0 text-brand" />
                  {f}
                </li>
              ))}
            </ul>
            {plan === "pro" && (
              <div className="mt-4 flex items-center gap-1.5 rounded-xl bg-brand/5 px-3 py-2 text-xs text-brand">
                <TrendingDown className="size-3.5" />
                Günstiger als alle Enterprise-DLCs
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Per-school management */}
      <div className="flex flex-col gap-6">
        {schools.map((school) => {
          const enabledDlcs = getEnabledDlcs(school.featureSettings);
          const isEnterprise = school.plan === "enterprise";
          const totalPrice = isEnterprise ? enterpriseTotalPrice(enabledDlcs) : null;

          return (
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
                  <div className="text-right">
                    <p className="text-sm text-muted-fg">
                      <span className="font-mono font-semibold text-fg">{school._count.users}</span> Nutzer
                    </p>
                    {totalPrice !== null && (
                      <p className="mt-0.5 text-xs font-semibold text-warning">
                        {totalPrice.toFixed(2)} €/Monat
                      </p>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardBody className="space-y-5">
                {/* Plan selector */}
                <form action={updateSchoolPlan.bind(null, school.id)} className="flex flex-wrap items-center gap-3">
                  <label className="text-sm text-muted-fg">Plan:</label>
                  <select
                    name="plan"
                    defaultValue={school.plan}
                    className="rounded-xl border border-border bg-bg px-3 py-1.5 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15"
                  >
                    <option value="basic">Basic — {BASIC_MONTHLY_PRICE.toFixed(2)} €/Monat</option>
                    <option value="pro">Pro — {PRO_MONTHLY_PRICE.toFixed(2)} €/Monat</option>
                    <option value="enterprise">Enterprise — DLC-basiert</option>
                  </select>
                  <button
                    type="submit"
                    className="rounded-xl border border-border bg-surface px-3 py-1.5 text-sm font-semibold hover:bg-surface-2 focus:outline-none"
                  >
                    Speichern
                  </button>
                </form>

                {/* DLC toggles (only for Enterprise) */}
                {isEnterprise && (
                  <div>
                    <div className="mb-3 flex items-center gap-2">
                      <Package className="size-4 text-warning" />
                      <p className="text-sm font-semibold">Enterprise DLCs</p>
                      <span className="text-xs text-muted-fg">
                        {enabledDlcs.length} von {DLC_FEATURES.length} aktiviert
                      </span>
                    </div>
                    <div className="space-y-4">
                      {DLC_CATEGORIES.map((cat) => (
                        <div key={cat}>
                          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-fg">{cat}</p>
                          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                            {DLC_FEATURES.filter((f) => f.category === cat).map((feature) => {
                              const active = enabledDlcs.includes(feature.id);
                              return (
                                <form
                                  key={feature.id}
                                  action={toggleDlc.bind(null, school.id)}
                                  className={cn(
                                    "flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 transition-colors",
                                    active ? "border-brand/30 bg-brand/3" : "border-border bg-surface"
                                  )}
                                >
                                  <input type="hidden" name="featureId" value={feature.id} />
                                  <input type="hidden" name="enabled" value={String(!active)} />
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-xs font-semibold">{feature.name}</p>
                                    <p className="text-[10px] text-muted-fg">
                                      {feature.pricePerMonth.toFixed(2)} €/Monat
                                    </p>
                                  </div>
                                  <button
                                    type="submit"
                                    className={cn(
                                      "shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-bold transition-colors",
                                      active
                                        ? "bg-brand/15 text-brand hover:bg-brand/25"
                                        : "bg-surface-2 text-muted-fg hover:bg-border"
                                    )}
                                  >
                                    {active ? "Aktiv" : "Aus"}
                                  </button>
                                </form>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardBody>
            </Card>
          );
        })}
        {schools.length === 0 && (
          <p className="rounded-2xl border border-border bg-bg px-5 py-8 text-sm text-muted-fg">
            Keine Schulen vorhanden.
          </p>
        )}
      </div>
    </div>
  );
}
