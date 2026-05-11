import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ClipboardEdit,
  Clock,
  Filter,
  FileText,
  Flame,
  Sparkles,
  Timer,
} from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  KORREKTUR_KLASSEN,
  KORREKTUR_STATS,
  STATUS_FILTERS,
  listSubmissions,
  type Submission,
  type SubmissionStatus,
} from "@/lib/korrektur-data";
import { AcceptButton } from "./AcceptButton";

export const metadata: Metadata = { title: "Korrektur" };

interface PageProps {
  searchParams: Promise<{ klasse?: string; status?: string }>;
}

export default async function KorrekturPage({ searchParams }: PageProps) {
  const { klasse, status } = await searchParams;
  const all = listSubmissions();
  const subs = all.filter((s) => {
    if (klasse && s.klasse !== klasse) return false;
    if (status && status !== "all" && s.status !== status) return false;
    return true;
  });

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">
            Korrektur-Stapel
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">
            {KORREKTUR_STATS.totalOpen} Abgaben warten
          </h1>
          <p className="mt-1 text-sm text-muted-fg">
            <span className="font-semibold text-fg">
              {KORREKTUR_STATS.autoReady} davon KI-bereit
            </span>{" "}
            · ein Klick zum Annehmen · Endkontrolle bleibt bei dir
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm">
            Export CSV
          </Button>
          <Button size="sm" className="glow-on-hover">
            <Sparkles className="size-3.5" />
            Auto-Vorbewertung starten
          </Button>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-px border border-border bg-border lg:grid-cols-4">
        <Stat
          label="Heute geprüft"
          value={String(KORREKTUR_STATS.todayGraded)}
          suffix="Ø 4 Min/Stück"
          icon={CheckCircle2}
          tone="text-success"
        />
        <Stat
          label="Stapel offen"
          value={String(KORREKTUR_STATS.totalOpen)}
          suffix={subs.length !== all.length ? `${subs.length} nach Filter` : "Klassen-übergreifend"}
          icon={ClipboardEdit}
          tone="text-warning"
        />
        <Stat
          label="Ø-Confidence"
          value={`${KORREKTUR_STATS.avgConfidence}%`}
          suffix="Modell v3 · stabil"
          icon={Sparkles}
          tone="text-brand"
        />
        <Stat
          label="Gespart · Monat"
          value={`${KORREKTUR_STATS.timeSavedHours.toString().replace(".", ",")} h`}
          suffix="≈ 1,4 Schultage"
          icon={Timer}
          tone="text-info"
        />
      </section>

      {KORREKTUR_STATS.autoReady > 0 && (
        <section className="border border-brand/40 bg-gradient-to-r from-brand/[0.08] to-transparent">
          <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="grid size-10 shrink-0 place-items-center bg-brand text-brand-fg">
                <Sparkles className="size-4" strokeWidth={1.75} />
              </div>
              <div>
                <p className="text-sm font-semibold leading-snug">
                  {KORREKTUR_STATS.autoReady} Abgaben sind KI-vorbewertet — geschätzte Ersparnis{" "}
                  <span className="text-brand">2 h 40 min</span>.
                </p>
                <p className="mt-1 text-xs text-muted-fg">
                  Du kannst alle annehmen, einzelne korrigieren oder nur Stichproben prüfen.
                </p>
              </div>
            </div>
            <div className="flex gap-2 sm:shrink-0">
              {/* TODO: wire Stichproben to randomly sample N submissions for review */}
              <Button variant="outline" size="sm">
                Stichproben (3)
              </Button>
              {/* TODO: wire Alle annehmen to bulk-accept all AI-ready submissions */}
              <Button size="sm" className="glow-on-hover">
                Alle {KORREKTUR_STATS.autoReady} annehmen
                <ArrowRight className="size-3.5" />
              </Button>
            </div>
          </div>
        </section>
      )}

      <section className="flex flex-col gap-3 border border-border bg-bg p-4 sm:flex-row sm:items-center sm:gap-6">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-fg">
          <Filter className="size-3.5" />
          Filter
        </div>

        <FilterRow label="Klasse" param="klasse" current={klasse} options={[...KORREKTUR_KLASSEN]} />
        <FilterRow
          label="Status"
          param="status"
          current={status}
          options={STATUS_FILTERS.filter((s) => s.value !== "all").map((s) => ({ value: s.value, label: s.label }))}
        />

        {(klasse || status) && (
          <Link
            href="/teach/korrektur"
            className="ml-auto text-xs font-medium text-muted-fg transition-colors hover:text-fg"
          >
            Filter zurücksetzen
          </Link>
        )}
      </section>

      {subs.length === 0 ? (
        <EmptyState />
      ) : (
        <section className="border border-border bg-bg">
          <div className="hidden grid-cols-[auto_1fr_auto_auto_auto_auto] items-center gap-4 border-b border-border bg-surface px-5 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-fg lg:grid">
            <span className="w-7" />
            <span>Schüler · Aufgabe</span>
            <span className="w-32">KI-Bewertung</span>
            <span className="w-24">Rubrik</span>
            <span className="w-24">Status</span>
            <span className="w-44 text-right">Aktion</span>
          </div>
          <ul className="divide-y divide-border">
            {subs.map((s) => (
              <SubmissionRow key={s.id} sub={s} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

/* ────────────────────────────────────────────── */

function Stat({
  label,
  value,
  suffix,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  suffix: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  tone: string;
}) {
  return (
    <div className="bg-bg p-5">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-fg">
          {label}
        </p>
        <Icon className={cn("size-4", tone)} strokeWidth={1.75} />
      </div>
      <p className="mt-3 font-mono text-3xl font-bold tracking-tight">{value}</p>
      <p className="mt-1 text-xs text-muted-fg">{suffix}</p>
    </div>
  );
}

/* ────────────────────────────────────────────── */

type FilterOption = string | { value: string; label: string };

function FilterRow({
  label,
  param,
  current,
  options,
}: {
  label: string;
  param: "klasse" | "status";
  current?: string;
  options: FilterOption[];
}) {
  const normalized = options.map((o) =>
    typeof o === "string" ? { value: o, label: o } : o
  );
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-fg">
        {label}
      </span>
      <FilterChip href={hrefWith(param, undefined)} active={!current}>
        Alle
      </FilterChip>
      {normalized.map((o) => (
        <FilterChip
          key={o.value}
          href={hrefWith(param, o.value)}
          active={current === o.value}
        >
          {o.label}
        </FilterChip>
      ))}
    </div>
  );
}

function hrefWith(param: string, value: string | undefined) {
  if (!value) return "/teach/korrektur";
  const sp = new URLSearchParams();
  sp.set(param, value);
  return `/teach/korrektur?${sp.toString()}`;
}

function FilterChip({
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

/* ────────────────────────────────────────────── */

function SubmissionRow({ sub }: { sub: Submission }) {
  const isReady = sub.status === "ready";
  const confidenceTone =
    sub.aiConfidence >= 80
      ? "success"
      : sub.aiConfidence >= 60
        ? "warning"
        : "danger";

  return (
    <li className="grid grid-cols-1 gap-4 px-5 py-4 transition-colors hover:bg-surface lg:grid-cols-[auto_1fr_auto_auto_auto_auto] lg:items-center">
      <Avatar name={sub.student} size="md" className="hidden lg:grid" />

      <div className="flex items-start gap-3 lg:gap-0">
        <Avatar name={sub.student} size="sm" className="lg:hidden" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-semibold">{sub.student}</p>
            <Badge variant="outline">{sub.klasse} · {sub.subject}</Badge>
            {sub.flagged && (
              <Badge variant="danger">
                <AlertTriangle className="size-3" />
                Prüfen
              </Badge>
            )}
          </div>
          <p className="mt-1 truncate text-sm text-fg">{sub.assignment}</p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-fg">
            <span className="flex items-center gap-1">
              <Clock className="size-3" />
              {sub.submittedAt}
            </span>
            <span className="flex items-center gap-1">
              <FileText className="size-3" />
              {sub.pages} {sub.pages === 1 ? "Seite" : "Seiten"}
            </span>
          </p>
        </div>
      </div>

      <AiCell sub={sub} tone={confidenceTone} />

      <div className="hidden w-24 lg:block">
        <p className="font-mono text-xs font-semibold tabular-nums">
          {sub.rubricHits}/{sub.rubricTotal}
        </p>
        <p className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-fg">
          Kriterien
        </p>
      </div>

      <StatusCell status={sub.status} />

      <div className="flex w-full gap-2 lg:w-44 lg:justify-end">
        {isReady ? (
          <>
            <Link
              href={`/teach/korrektur/${sub.id}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors hover:bg-surface"
            >
              <ClipboardEdit className="size-3.5" />
              Öffnen
            </Link>
            {/* AcceptButton calls acceptSubmission server action with the AI-suggested grade */}
            <AcceptButton submissionId={sub.id} grade={sub.aiGradeNum} />
          </>
        ) : (
          <Link
            href={`/teach/korrektur/${sub.id}`}
            className="inline-flex flex-1 items-center justify-center gap-1.5 border border-border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-surface lg:flex-none"
          >
            Öffnen
            <ArrowRight className="size-3.5" />
          </Link>
        )}
      </div>
    </li>
  );
}

function AiCell({
  sub,
  tone,
}: {
  sub: Submission;
  tone: "success" | "warning" | "danger";
}) {
  return (
    <div className="lg:w-32">
      <div className="flex items-baseline gap-2">
        <p
          className={cn(
            "font-mono text-lg font-bold tabular-nums",
            sub.aiGradeNum >= 4 && "text-danger",
            sub.aiGradeNum >= 3 && sub.aiGradeNum < 4 && "text-warning",
            sub.aiGradeNum < 3 && "text-fg"
          )}
        >
          {sub.aiGrade}
        </p>
        <p
          className={cn(
            "font-mono text-[11px] font-semibold tabular-nums",
            tone === "success" && "text-success",
            tone === "warning" && "text-warning",
            tone === "danger" && "text-danger"
          )}
        >
          {sub.aiConfidence}%
        </p>
      </div>
      <Progress value={sub.aiConfidence} tone={tone} className="mt-1.5 h-1" />
      <p className="mt-1 text-[10px] uppercase tracking-wider text-muted-fg">
        KI-Vorschlag
      </p>
    </div>
  );
}

function StatusCell({ status }: { status: SubmissionStatus }) {
  if (status === "ready")
    return (
      <Badge variant="brand">
        <Sparkles className="size-3" />
        KI-bereit
      </Badge>
    );
  if (status === "in-review")
    return (
      <Badge variant="warning">
        <Flame className="size-3" />
        In Prüfung
      </Badge>
    );
  return <Badge variant="outline">Neu</Badge>;
}

/* ────────────────────────────────────────────── */

function EmptyState() {
  return (
    <div className="grid place-items-center border border-dashed border-border bg-bg p-12 text-center">
      <CheckCircle2 className="size-8 text-success" strokeWidth={1.5} />
      <p className="mt-4 text-base font-semibold">Stapel leer in dieser Sicht</p>
      <p className="mt-1 max-w-sm text-sm text-muted-fg">
        Mit dem aktuellen Filter sind keine Abgaben offen. Setze den Filter
        zurück, um den ganzen Stapel zu sehen.
      </p>
      <Link
        href="/teach/korrektur"
        className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-brand hover:underline"
      >
        Filter zurücksetzen
      </Link>
    </div>
  );
}
