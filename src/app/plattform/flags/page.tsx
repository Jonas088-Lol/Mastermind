import { ArrowLeft, Filter, Flag, Plus, Search } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession, isSuper } from "@/lib/session";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { prisma } from "@/lib/db/client";
import { cn } from "@/lib/utils";
import { ensureDefaultFlags, toggleFlag } from "./actions";

export const metadata: Metadata = { title: "Feature-Flags" };

type FlagState = "on" | "off" | "rollout" | "experiment";

interface PageProps {
  searchParams: Promise<{ state?: string; q?: string }>;
}

export default async function FlagsPage({ searchParams }: PageProps) {
  const session = await getSession();
  if (!session || !isSuper(session)) redirect("/login");

  await ensureDefaultFlags();

  const { state, q } = await searchParams;
  const query = (q ?? "").trim().toLowerCase();

  const flags = await prisma.featureFlag.findMany({
    where: {
      ...(state ? { state } : {}),
      ...(query ? {
        OR: [
          { name: { contains: query } },
          { description: { contains: query } },
        ],
      } : {}),
    },
    orderBy: { updatedAt: "desc" },
  });

  const allCounts = await prisma.featureFlag.groupBy({
    by: ["state"],
    _count: { id: true },
  });
  const countMap = Object.fromEntries(allCounts.map((r) => [r.state, r._count.id]));
  const totalCount = allCounts.reduce((s, r) => s + r._count.id, 0);

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
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Feature-Flags</h1>
            <p className="mt-1 text-sm text-muted-fg">
              {totalCount} Flags · {countMap["on"] ?? 0} aktiv · {countMap["experiment"] ?? 0} Experimente
            </p>
          </div>
          <Link href="/plattform/flags/neu" className="inline-flex items-center gap-1.5 bg-fg px-3 py-2 text-xs font-semibold text-bg transition-opacity hover:opacity-90">
            <Plus className="size-3.5" />
            Neuer Flag
          </Link>
        </div>
      </header>

      <section className="flex flex-col gap-3 border border-border bg-bg p-4 sm:flex-row sm:items-center sm:gap-6">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-fg">
          <Filter className="size-3.5" />
          Status
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Chip href="/plattform/flags" active={!state}>Alle ({totalCount})</Chip>
          <Chip href="/plattform/flags?state=on" active={state === "on"}>An ({countMap["on"] ?? 0})</Chip>
          <Chip href="/plattform/flags?state=rollout" active={state === "rollout"}>Rollout ({countMap["rollout"] ?? 0})</Chip>
          <Chip href="/plattform/flags?state=experiment" active={state === "experiment"}>Experiment ({countMap["experiment"] ?? 0})</Chip>
          <Chip href="/plattform/flags?state=off" active={state === "off"}>Aus ({countMap["off"] ?? 0})</Chip>
        </div>
        <form action="/plattform/flags" method="get" className="sm:ml-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-fg" />
            <Input name="q" defaultValue={q ?? ""} placeholder="Flag-Namen…" className="h-8 w-56 pl-9 text-xs" />
          </div>
        </form>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>{flags.length} Flags</CardTitle>
          <span className="font-mono text-xs text-muted-fg">sortiert nach Update</span>
        </CardHeader>
        <CardBody className="px-0! pb-0!">
          {flags.length === 0 ? (
            <p className="border-t border-border px-5 py-8 text-sm text-muted-fg">Keine Flags für diese Filterung.</p>
          ) : (
            <ul className="divide-y divide-border border-t border-border">
              {flags.map((f) => (
                <FlagRow key={f.name} flag={f} />
              ))}
            </ul>
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

function FlagRow({ flag }: {
  flag: {
    name: string; description: string; state: string; rollout: number;
    scope: string; owner: string; updatedAt: Date; metric?: string | null;
  };
}) {
  const state = flag.state as FlagState;
  const isOn  = state === "on" || state === "rollout";

  const stateBadge = {
    on:         <Badge variant="success">An</Badge>,
    off:        <Badge variant="outline">Aus</Badge>,
    rollout:    <Badge variant="brand">Rollout {flag.rollout}%</Badge>,
    experiment: <Badge variant="info">Experiment {flag.rollout}%</Badge>,
  }[state] ?? <Badge variant="outline">{state}</Badge>;

  const rel = (() => {
    const diff = Date.now() - flag.updatedAt.getTime();
    const min  = Math.floor(diff / 60_000);
    if (min < 60) return `vor ${min} Min.`;
    const h = Math.floor(min / 60);
    if (h < 24) return `vor ${h} Std.`;
    const d = Math.floor(h / 24);
    return d === 1 ? "gestern" : `vor ${d} Tagen`;
  })();

  return (
    <li className="grid grid-cols-1 gap-3 px-5 py-4 transition-colors hover:bg-surface lg:grid-cols-[1fr_140px_140px_auto_auto] lg:items-center lg:gap-6">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Flag className="size-3.5 shrink-0 text-muted-fg" strokeWidth={1.75} />
          <p className="font-mono text-xs font-bold">{flag.name}</p>
          {stateBadge}
        </div>
        <p className="mt-1 text-sm">{flag.description}</p>
        <p className="mt-0.5 text-xs text-muted-fg">
          {flag.scope} · {flag.owner} · {rel}
        </p>
      </div>

      <div className="hidden lg:block">
        {(state === "rollout" || state === "experiment") && (
          <>
            <Progress value={flag.rollout} tone={state === "experiment" ? "warning" : "brand"} />
            <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-muted-fg">
              {flag.rollout}% rollout
            </p>
          </>
        )}
      </div>

      {flag.metric ? (
        <p className="hidden font-mono text-[11px] text-success lg:block">{flag.metric}</p>
      ) : (
        <span className="hidden lg:block" />
      )}

      <form action={toggleFlag.bind(null, flag.name)}>
        <button
          type="submit"
          role="switch"
          aria-checked={isOn}
          aria-label={`${flag.name} umschalten`}
          className={`relative h-5 w-9 shrink-0 transition-colors ${isOn ? "bg-brand" : "bg-border-strong"}`}
        >
          <span className={`absolute top-0.5 size-4 bg-bg transition-[left] ${isOn ? "left-[18px]" : "left-0.5"}`} />
        </button>
      </form>

      <Link
        href={`/plattform/flags/${flag.name}`}
        className="inline-flex h-8 items-center px-3 text-xs font-semibold text-muted-fg transition-colors hover:bg-surface hover:text-fg"
      >
        Bearbeiten
      </Link>
    </li>
  );
}
