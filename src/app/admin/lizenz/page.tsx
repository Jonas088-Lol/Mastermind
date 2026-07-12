/* Copyright 2026 Elian Schock, Jonas Schwenk */
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  CircleDollarSign,
  KeyRound,
  Package,
  Users,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { prisma } from "@/lib/db/client";
import { ROLE_HOME, effectiveRole, getSession } from "@/lib/session";
import { DLC_FEATURES, DLC_CATEGORIES, getEnabledDlcs, enterpriseTotalPrice, PRO_MONTHLY_PRICE, BASIC_MONTHLY_PRICE } from "@/lib/features";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Lizenz · Admin" };

const PLAN_FEATURES: Record<string, string[]> = {
  basic: [
    "Bis zu 100 Nutzer",
    "Aufgaben & Korrekturen",
    "Schüler-App",
    "Karteikarten & Lernpfade",
  ],
  pro: [
    "Bis zu 1.000 Nutzer",
    "KI-Korrekturunterstützung",
    "KI-Aufgabengenerator",
    "Nachrichten & Community",
    "Eltern-Portal",
    "Stundenplan-Integration",
    "Erweiterte Statistiken",
  ],
  enterprise: [
    "Unbegrenzte Nutzer",
    "Alle Pro-Features",
    "SSO / Entra ID",
    "SCIM-Provisioning",
    "Dedizierter Support",
    "SLA-Garantie",
    "Custom Branding",
  ],
};

const PLAN_LABEL: Record<string, string> = {
  basic: "Basic",
  pro: "Pro",
  enterprise: "Enterprise",
};

export default async function LizenzPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "admin") redirect(ROLE_HOME[effectiveRole(session)]);

  const schoolId = session.schoolId;
  if (!schoolId) redirect("/admin");

  const [school, userCount] = await Promise.all([
    prisma.school.findUnique({
      where: { id: schoolId },
      select: { name: true, plan: true, seats: true, createdAt: true, featureSettings: true },
    }),
    prisma.user.count({ where: { schoolId } }),
  ]);

  if (!school) redirect("/admin");

  const pct = school.seats > 0 ? Math.round((userCount / school.seats) * 100) : 0;
  const planLabel = PLAN_LABEL[school.plan] ?? school.plan;
  const features = PLAN_FEATURES[school.plan] ?? PLAN_FEATURES.basic;

  const nextPlan = school.plan === "basic" ? "pro" : school.plan === "pro" ? "enterprise" : null;
  const nextPlanLabel = nextPlan ? PLAN_LABEL[nextPlan] : null;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <header className="flex flex-col gap-3">
        <Link
          href="/admin"
          className="inline-flex w-fit items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-muted-fg transition-colors hover:text-fg"
        >
          <ArrowLeft className="size-3.5" />
          Schul-Admin
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Lizenz</h1>
          <p className="mt-1 text-sm text-muted-fg">
            {school.name} · Plan: {planLabel} · Mitglied seit{" "}
            {school.createdAt.toLocaleDateString("de-DE", { month: "long", year: "numeric" })}
          </p>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-px border border-border bg-border">
        <div className="bg-bg p-5">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-fg">Aktueller Plan</p>
            <KeyRound className="size-4 text-brand" strokeWidth={1.75} />
          </div>
          <p className="mt-3 font-mono text-3xl font-bold">{planLabel}</p>
          <p className="mt-1 text-xs text-muted-fg">Aktiver Vertrag</p>
        </div>
        <div className="bg-bg p-5">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-fg">Auslastung</p>
            <Users className="size-4 text-info" strokeWidth={1.75} />
          </div>
          <p className="mt-3 font-mono text-3xl font-bold">{pct} %</p>
          <p className="mt-1 text-xs text-muted-fg">
            {userCount} / {school.seats} Sitze
          </p>
        </div>
      </section>

      <Card className="border-brand/40 bg-linear-to-br from-brand/6 to-transparent">
        <CardHeader>
          <div className="flex items-center gap-2">
            <KeyRound className="size-4 text-brand" strokeWidth={1.75} />
            <CardTitle>{planLabel}-Plan · inkludierte Features</CardTitle>
          </div>
          <Badge variant={school.plan === "enterprise" ? "success" : school.plan === "pro" ? "brand" : "outline"}>
            {planLabel}
          </Badge>
        </CardHeader>
        <CardBody>
          <Progress
            value={pct}
            tone={pct >= 90 ? "warning" : "brand"}
            className="mb-5"
          />
          <p className="mb-4 text-sm text-muted-fg">
            {userCount} von {school.seats} Sitzen belegt ({pct} %)
            {pct >= 90 && (
              <span className="ml-2 font-semibold text-warning">· Kapazität nahezu ausgeschöpft</span>
            )}
          </p>
          <ul className="grid gap-2 sm:grid-cols-2">
            {features.map((f) => (
              <li key={f} className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="size-4 shrink-0 text-success" strokeWidth={2} />
                {f}
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sitz-Kontingent anpassen</CardTitle>
        </CardHeader>
        <CardBody>
          <div className="border border-dashed border-border bg-surface p-5 text-center">
            <CircleDollarSign className="mx-auto size-8 text-muted-fg" strokeWidth={1.5} />
            <p className="mt-3 font-semibold">Lizenz über die Plattform verwaltet</p>
            <p className="mt-1 text-sm text-muted-fg">
              Sitzanzahl, Laufzeit und Rechnungen werden vom Plattform-Admin verwaltet.
              Bei Änderungswünschen wende dich an den Support.
            </p>
          </div>
        </CardBody>
      </Card>

      {/* Enterprise DLC overview */}
      {school.plan === "enterprise" && (() => {
        const enabled = getEnabledDlcs(school.featureSettings);
        const total = enterpriseTotalPrice(enabled);
        return (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Package className="size-4 text-warning" />
                <CardTitle>Enterprise DLCs</CardTitle>
              </div>
              <span className="text-sm font-semibold text-warning">{total.toFixed(2)} €/Monat</span>
            </CardHeader>
            <CardBody className="space-y-4">
              {DLC_CATEGORIES.map((cat) => {
                const catFeatures = DLC_FEATURES.filter((f) => f.category === cat);
                return (
                  <div key={cat}>
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-fg">{cat}</p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {catFeatures.map((f) => {
                        const active = enabled.includes(f.id);
                        return (
                          <div key={f.id} className={cn(
                            "flex items-center gap-2 rounded-xl border px-3 py-2 text-xs",
                            active ? "border-brand/25 bg-brand/3" : "border-border bg-surface opacity-50"
                          )}>
                            <Check className={cn("size-3.5 shrink-0", active ? "text-brand" : "text-muted-fg")} />
                            <span className={cn("font-medium", !active && "text-muted-fg")}>{f.name}</span>
                            <span className="ml-auto text-muted-fg">{f.pricePerMonth.toFixed(2)} €</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              <p className="text-xs text-muted-fg">
                DLCs werden vom Schulträger verwaltet. Wende dich an den Träger, um Features zu ändern.
              </p>
            </CardBody>
          </Card>
        );
      })()}

      {nextPlan && school.plan !== "enterprise" && (
        <Card>
          <CardHeader>
            <CardTitle>Upgrade auf {nextPlanLabel}</CardTitle>
          </CardHeader>
          <CardBody>
            <ul className="mb-5 grid gap-2 sm:grid-cols-2">
              {(PLAN_FEATURES[nextPlan] ?? [])
                .filter((f) => !features.includes(f))
                .map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm">
                    <XCircle className="size-4 shrink-0 text-muted-fg" strokeWidth={1.75} />
                    <span className="text-muted-fg">{f} (nur {nextPlanLabel})</span>
                  </li>
                ))}
            </ul>
            <div className="rounded-2xl border border-border bg-surface p-4 text-sm">
              <p className="font-semibold">Pro-Plan: {PRO_MONTHLY_PRICE.toFixed(2)} €/Monat</p>
              <p className="mt-1 text-muted-fg">
                Enthält alle Features außer SSO. Günstiger als alle Enterprise-DLCs einzeln.
              </p>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
