import {
  ArrowLeft,
  ArrowUpRight,
  Building2,
  Filter,
  Plus,
  Search,
} from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { prisma } from "@/lib/db/client";
import { getSession, isSuper } from "@/lib/session";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Schulen · Plattform" };

const PLAN_LABEL: Record<string, string> = { enterprise: "Enterprise", pro: "Pro", basic: "Basic" };
const PLAN_TONE: Record<string, "success" | "brand" | "outline"> = { enterprise: "success", pro: "brand", basic: "outline" };

interface PageProps {
  searchParams: Promise<{ plan?: string; q?: string }>;
}

export default async function SchulenPage({ searchParams }: PageProps) {
  const session = await getSession();
  if (!session || !isSuper(session)) redirect("/login");

  const { plan, q } = await searchParams;

  const schools = await prisma.school.findMany({
    where: {
      ...(plan ? { plan } : {}),
      ...(q ? { name: { contains: q } } : {}),
    },
    select: {
      id: true,
      name: true,
      city: true,
      state: true,
      plan: true,
      seats: true,
      createdAt: true,
      _count: { select: { users: true } },
    },
    orderBy: [{ plan: "asc" }, { name: "asc" }],
  });

  const allSchools = await prisma.school.findMany({
    select: { plan: true, seats: true, _count: { select: { users: true } } },
  });

  const totalSchools = allSchools.length;
  const totalUsers = allSchools.reduce((s, x) => s + x._count.users, 0);
  const totalSeats = allSchools.reduce((s, x) => s + x.seats, 0);

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8">
      <header className="flex flex-col gap-3">
        <Link
          href="/plattform"
          className="inline-flex w-fit items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-muted-fg transition-colors hover:text-fg"
        >
          <ArrowLeft className="size-3.5" />
          Plattform
        </Link>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Schulen</h1>
            <p className="mt-1 text-sm text-muted-fg">
              {totalSchools} {totalSchools === 1 ? "Schule" : "Schulen"} · {totalUsers.toLocaleString("de-DE")} Nutzer
            </p>
          </div>
          <Link href="/plattform/schulen/neu" className={buttonVariants({ size: "sm" })}>
            <Plus className="size-3.5" />
            Schule onboarden
          </Link>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-px border border-border bg-border lg:grid-cols-3">
        <div className="bg-bg p-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-fg">Schulen</p>
          <p className="mt-3 font-mono text-3xl font-bold tracking-tight">{totalSchools}</p>
        </div>
        <div className="bg-bg p-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-fg">Nutzer</p>
          <p className="mt-3 font-mono text-3xl font-bold tracking-tight">{totalUsers.toLocaleString("de-DE")}</p>
          <p className="mt-1 text-xs text-muted-fg">von {totalSeats.toLocaleString("de-DE")} Sitzen</p>
        </div>
        <div className="col-span-2 bg-bg p-5 lg:col-span-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-fg">MRR</p>
          <p className="mt-3 font-mono text-3xl font-bold text-muted-fg">—</p>
          <p className="mt-1 text-xs text-muted-fg">Stripe nicht angebunden</p>
        </div>
      </section>

      <section className="flex flex-col gap-3 border border-border bg-bg p-4 sm:flex-row sm:items-center sm:gap-6">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-fg">
          <Filter className="size-3.5" />
          Filter
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Chip href="/plattform/schulen" active={!plan && !q}>Alle</Chip>
          <Chip href="/plattform/schulen?plan=basic" active={plan === "basic"}>Basic</Chip>
          <Chip href="/plattform/schulen?plan=pro" active={plan === "pro"}>Pro</Chip>
          <Chip href="/plattform/schulen?plan=enterprise" active={plan === "enterprise"}>Enterprise</Chip>
        </div>
        <form action="/plattform/schulen" method="get" className="sm:ml-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-fg" />
            <Input name="q" defaultValue={q} placeholder="Schule suchen…" className="h-8 w-48 pl-9 text-xs" />
          </div>
        </form>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>{schools.length} Schulen</CardTitle>
          <span className="font-mono text-xs text-muted-fg">sortiert nach Plan · alphabetisch</span>
        </CardHeader>
        <CardBody className="px-0! pb-0!">
          {schools.length === 0 ? (
            <p className="border-t border-border px-5 py-8 text-sm text-muted-fg">
              {q || plan ? "Keine Schulen gefunden." : "Noch keine Schulen registriert."}
            </p>
          ) : (
            <>
              <div className="hidden grid-cols-[2fr_1fr_1fr_120px_auto] items-center gap-4 border-b border-border bg-surface px-5 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-fg lg:grid">
                <span>Schule</span>
                <span>Plan</span>
                <span>Auslastung</span>
                <span>Seit</span>
                <span className="w-7" />
              </div>
              <ul className="divide-y divide-border">
                {schools.map((s) => {
                  const pct = s.seats > 0 ? Math.round((s._count.users / s.seats) * 100) : 0;
                  const planTone = PLAN_TONE[s.plan] ?? "outline";
                  const planLabel = PLAN_LABEL[s.plan] ?? s.plan;
                  return (
                    <li key={s.id} className="grid grid-cols-1 gap-3 px-5 py-4 transition-colors hover:bg-surface lg:grid-cols-[2fr_1fr_1fr_120px_auto] lg:items-center lg:gap-4">
                      <Link href={`/plattform/schulen/${s.id}`} className="flex items-center gap-3">
                        <div className="grid size-10 shrink-0 place-items-center bg-fg text-bg">
                          <Building2 className="size-4" strokeWidth={1.75} />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">{s.name}</p>
                          <p className="text-xs text-muted-fg">
                            {[s.city, s.state].filter(Boolean).join(" · ")}
                          </p>
                        </div>
                      </Link>
                      <Badge variant={planTone}>{planLabel}</Badge>
                      <div>
                        <p className="font-mono text-xs font-semibold tabular-nums">
                          <span className="font-bold">{s._count.users}</span>
                          <span className="text-muted-fg"> / {s.seats}</span>
                          <span className="ml-2 text-muted-fg">{pct} %</span>
                        </p>
                        <Progress
                          value={pct}
                          tone={pct >= 90 ? "warning" : pct >= 70 ? "brand" : "success"}
                          className="mt-1 h-1"
                        />
                      </div>
                      <span className="font-mono text-xs text-muted-fg">
                        {s.createdAt.toLocaleDateString("de-DE", { month: "short", year: "numeric" })}
                      </span>
                      <ArrowUpRight className="hidden size-3.5 text-muted-fg lg:inline" />
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

function Chip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-pressed={active}
      className={cn(
        "px-2.5 py-1 text-xs font-medium transition-colors",
        active ? "bg-fg text-bg" : "border border-border bg-bg text-muted-fg hover:border-fg/30 hover:text-fg"
      )}
    >
      {children}
    </Link>
  );
}
