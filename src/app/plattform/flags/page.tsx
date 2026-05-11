import { ArrowLeft, Filter, Flag, Plus, Search } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Feature-Flags" };

type FlagState = "on" | "off" | "rollout" | "experiment";

interface Flag {
  name: string;
  description: string;
  state: FlagState;
  rollout: number;
  scope: string;
  owner: string;
  updated: string;
  metric?: string;
}

const FLAGS: Flag[] = [
  { name: "ki.korrektur.v3", description: "KI-Modell v3 für Korrekturvorschläge", state: "on", rollout: 100, scope: "alle Pro · Enterprise", owner: "Tom V.", updated: "vor 4 Tagen", metric: "Confidence ↑ 7 %" },
  { name: "ki.tutor.audio", description: "Sprach-Chat mit dem KI-Tutor", state: "experiment", rollout: 12, scope: "4 Beta-Schulen", owner: "Lia K.", updated: "vor 2 Tagen", metric: "Engagement ↑ 23 %" },
  { name: "community.peer-review", description: "Peer-Bewertungen für geteilte Notizen", state: "on", rollout: 100, scope: "alle", owner: "Tom V.", updated: "vor 3 Wochen" },
  { name: "experiment.dashboard.v2", description: "Neues Schüler-Dashboard mit Streak-Karte oben", state: "experiment", rollout: 8, scope: "intern · 2 Schulen", owner: "Lia K.", updated: "gestern", metric: "Time-to-task ↓ 18 %" },
  { name: "billing.stripe-tax", description: "Automatische USt-Berechnung via Stripe Tax", state: "rollout", rollout: 60, scope: "DACH-Schulen", owner: "Plattform", updated: "vor 1 Tag" },
  { name: "auth.passkeys", description: "WebAuthn-Passkeys statt Passwort", state: "rollout", rollout: 40, scope: "Lehrer + Admin · opt-in", owner: "Tom V.", updated: "vor 3 Tagen", metric: "Login-Time ↓ 62 %" },
  { name: "perf.cache-components", description: "Next.js cache-components für Listen", state: "on", rollout: 100, scope: "alle", owner: "Plattform", updated: "vor 1 Woche", metric: "p95 ↓ 31 %" },
  { name: "ki.bias-detector", description: "Bias-Warnung bei KI-Antworten", state: "experiment", rollout: 4, scope: "intern", owner: "Lia K.", updated: "vor 5 Tagen" },
  { name: "mobile.bottom-nav", description: "Mobile Bottom-Navigation für Schüler/Lehrer", state: "on", rollout: 100, scope: "alle", owner: "Plattform", updated: "heute", metric: "Mobile DAU ↑ 14 %" },
  { name: "experiment.swipe-gestures", description: "Swipe in Karteikarten · Up = gewusst", state: "off", rollout: 0, scope: "deaktiviert · UX zu uneindeutig", owner: "Lia K.", updated: "vor 2 Wochen" },
  { name: "comms.email-digest", description: "Wöchentlicher KPI-Digest an Schul-Admin", state: "on", rollout: 100, scope: "alle Pro · Enterprise", owner: "Tom V.", updated: "vor 1 Woche" },
  { name: "kill.legacy-untis-import", description: "Alte Untis-Import-Pipeline endgültig aus", state: "rollout", rollout: 80, scope: "alle außer 12 Schulen", owner: "Plattform", updated: "vor 2 Tagen" },
];

interface PageProps {
  searchParams: Promise<{ state?: string }>;
}

export default async function FlagsPage({ searchParams }: PageProps) {
  const { state } = await searchParams;
  const filtered = FLAGS.filter((f) => !state || f.state === state);

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
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Feature-Flags
            </h1>
            <p className="mt-1 text-sm text-muted-fg">
              {FLAGS.length} Flags · {FLAGS.filter((f) => f.state === "on").length} aktiv ·{" "}
              {FLAGS.filter((f) => f.state === "experiment").length} Experimente
            </p>
          </div>
          <Button size="sm" className="glow-on-hover">
            <Plus className="size-3.5" />
            Neuer Flag
          </Button>
        </div>
      </header>

      <section className="flex flex-col gap-3 border border-border bg-bg p-4 sm:flex-row sm:items-center sm:gap-6">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-fg">
          <Filter className="size-3.5" />
          Status
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Chip href="/plattform/flags" active={!state}>Alle ({FLAGS.length})</Chip>
          <Chip href="/plattform/flags?state=on" active={state === "on"}>An ({FLAGS.filter((f) => f.state === "on").length})</Chip>
          <Chip href="/plattform/flags?state=rollout" active={state === "rollout"}>Rollout ({FLAGS.filter((f) => f.state === "rollout").length})</Chip>
          <Chip href="/plattform/flags?state=experiment" active={state === "experiment"}>Experiment ({FLAGS.filter((f) => f.state === "experiment").length})</Chip>
          <Chip href="/plattform/flags?state=off" active={state === "off"}>Aus ({FLAGS.filter((f) => f.state === "off").length})</Chip>
        </div>
        <form action="/plattform/flags" method="get" className="sm:ml-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-fg" />
            <Input name="q" placeholder="Flag-Namen…" className="h-8 w-56 pl-9 text-xs" />
          </div>
        </form>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>{filtered.length} Flags</CardTitle>
          <span className="font-mono text-xs text-muted-fg">
            sortiert nach Update
          </span>
        </CardHeader>
        <CardBody className="!px-0 !pb-0">
          <ul className="divide-y divide-border border-t border-border">
            {filtered.map((f) => (
              <FlagRow key={f.name} flag={f} />
            ))}
          </ul>
        </CardBody>
      </Card>
    </div>
  );
}

function Chip({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-pressed={active}
      className={cn(
        "px-2.5 py-1 text-xs font-medium transition-colors",
        active
          ? "bg-fg text-bg"
          : "border border-border bg-bg text-muted-fg hover:border-fg/30 hover:text-fg"
      )}
    >
      {children}
    </Link>
  );
}

function FlagRow({ flag }: { flag: Flag }) {
  const stateBadge = {
    on: <Badge variant="success">An</Badge>,
    off: <Badge variant="outline">Aus</Badge>,
    rollout: <Badge variant="brand">Rollout {flag.rollout}%</Badge>,
    experiment: <Badge variant="info">Experiment {flag.rollout}%</Badge>,
  }[flag.state];

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
          {flag.scope} · {flag.owner} · {flag.updated}
        </p>
      </div>

      <div className="hidden lg:block">
        {(flag.state === "rollout" || flag.state === "experiment") && (
          <>
            <Progress
              value={flag.rollout}
              tone={flag.state === "experiment" ? "warning" : "brand"}
            />
            <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-muted-fg">
              {flag.rollout}% rollout
            </p>
          </>
        )}
      </div>

      {flag.metric && (
        <p className="hidden font-mono text-[11px] text-success lg:block">
          {flag.metric}
        </p>
      )}
      {!flag.metric && <span className="hidden lg:block" />}

      <FakeSwitch on={flag.state === "on" || flag.state === "rollout"} />

      <Button size="sm" variant="ghost">
        Bearbeiten
      </Button>
    </li>
  );
}

function FakeSwitch({ on }: { on: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label="Flag umschalten"
      className={`relative h-5 w-9 shrink-0 transition-colors ${
        on ? "bg-brand" : "bg-border-strong"
      }`}
    >
      <span
        className={`absolute top-0.5 size-4 bg-bg transition-[left] ${
          on ? "left-[18px]" : "left-0.5"
        }`}
      />
    </button>
  );
}
