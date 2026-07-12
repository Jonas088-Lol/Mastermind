/* Copyright 2026 Elian Schock, Jonas Schwenk */
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  AlertTriangle,
  Bell,
  Check,
  CheckCircle2,
  ClipboardList,
  Megaphone,
  MessageSquare,
  Sparkles,
  Star,
  Swords,
  Trophy,
  Zap,
} from "lucide-react";
import { Card, CardBody } from "@/components/ui/card";
import { prisma } from "@/lib/db/client";
import { getSession } from "@/lib/session";
import { cn } from "@/lib/utils";
import { markAllNotificationsRead } from "./actions";

export const metadata: Metadata = { title: "Benachrichtigungen" };

const TYPE_META: Record<
  string,
  {
    Icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
    label: string;
    tone: string;
  }
> = {
  grade:          { Icon: Trophy,        label: "Neue Note",        tone: "text-success" },
  assignment:     { Icon: ClipboardList, label: "Neue Aufgabe",     tone: "text-brand" },
  message:        { Icon: MessageSquare, label: "Nachricht",        tone: "text-info" },
  broadcast:      { Icon: Megaphone,     label: "Broadcast",        tone: "text-brand" },
  duel_result:    { Icon: Swords,        label: "Duell-Ergebnis",   tone: "text-warning" },
  duel_challenge: { Icon: Swords,        label: "Herausforderung",  tone: "text-warning" },
  achievement:    { Icon: Star,          label: "Achievement",      tone: "text-warning" },
  xp:             { Icon: Zap,           label: "XP erhalten",      tone: "text-brand" },
  reward_promise: { Icon: Sparkles,      label: "Belohnung",        tone: "text-warning" },
  info:           { Icon: Bell,          label: "Info",             tone: "text-muted-fg" },
  system:         { Icon: Bell,          label: "System",           tone: "text-muted-fg" },
  warning:        { Icon: AlertTriangle, label: "Warnung",          tone: "text-warning" },
};

const DEFAULT_META = { Icon: Bell, label: "Benachrichtigung", tone: "text-muted-fg" };

function getMeta(type: string) {
  return TYPE_META[type] ?? DEFAULT_META;
}

/**
 * Filter-Pills — abgeleitet aus den tatsächlich verwendeten `type`-Werten
 * der appNotification.create-Aufrufe im Code (häufigste zuerst):
 * system, duel_result, broadcast, message, info, grade, duel_challenge, …
 */
const FILTERS: { key: string; label: string; types: string[] | null }[] = [
  { key: "alle",       label: "Alle",           types: null },
  { key: "broadcasts", label: "📣 Broadcasts",  types: ["broadcast"] },
  { key: "duelle",     label: "⚔️ Duelle",      types: ["duel_result", "duel_challenge"] },
  { key: "nachrichten",label: "💬 Nachrichten", types: ["message"] },
  { key: "noten",      label: "📝 Noten",       types: ["grade"] },
  { key: "info",       label: "ℹ️ Info",        types: ["info", "system"] },
  { key: "sonstige",   label: "Sonstige",       types: [] }, // alles außerhalb der obigen Typen
];

const KNOWN_TYPES = new Set(
  FILTERS.flatMap((f) => f.types ?? []),
);

type DayBucket = "Heute" | "Gestern" | "Diese Woche" | "Älter";
const BUCKET_ORDER: DayBucket[] = ["Heute", "Gestern", "Diese Woche", "Älter"];

function dayBucket(date: Date): DayBucket {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000);
  const startOfWeek = new Date(startOfToday.getTime() - 6 * 24 * 60 * 60 * 1000);
  if (date >= startOfToday) return "Heute";
  if (date >= startOfYesterday) return "Gestern";
  if (date >= startOfWeek) return "Diese Woche";
  return "Älter";
}

function relativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "gerade eben";
  if (diffMin < 60) return `vor ${diffMin} Min.`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `vor ${diffH} Std.`;
  const diffD = Math.floor(diffH / 24);
  if (diffD === 1) return "gestern";
  if (diffD < 7) return `vor ${diffD} Tagen`;
  return date.toLocaleDateString("de-DE", { day: "numeric", month: "short", year: "numeric" });
}

interface PageProps {
  searchParams: Promise<{ filter?: string }>;
}

export default async function NotificationsPage({ searchParams }: PageProps) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { filter: filterParam } = await searchParams;
  const activeFilter =
    FILTERS.find((f) => f.key === filterParam) ?? FILTERS[0];

  const notifications = await prisma.appNotification.findMany({
    where: { userId: session.userId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const filtered = notifications.filter((n) => {
    if (activeFilter.types === null) return true;
    if (activeFilter.key === "sonstige") return !KNOWN_TYPES.has(n.type);
    return activeFilter.types.includes(n.type);
  });

  const unreadCount = notifications.filter((n) => !n.readAt).length;

  // Gruppierung nach Tag
  const buckets = new Map<DayBucket, typeof filtered>();
  for (const n of filtered) {
    const b = dayBucket(n.createdAt);
    const arr = buckets.get(b);
    if (arr) arr.push(n);
    else buckets.set(b, [n]);
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      {/* ── Header ── */}
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Benachrichtigungen</h1>
          <p className="mt-1 text-sm text-muted-fg">
            {unreadCount > 0 ? (
              <>
                <span className="font-semibold text-fg">{unreadCount}</span> ungelesen
              </>
            ) : (
              "Alles gelesen"
            )}
          </p>
        </div>
        {unreadCount > 0 && (
          <form action={markAllNotificationsRead}>
            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-muted-fg hover:text-fg"
            >
              <Check className="size-3.5" />
              Alle als gelesen markieren
            </button>
          </form>
        )}
      </header>

      {/* ── Typ-Filter-Pills ── */}
      <nav className="flex flex-wrap gap-2" aria-label="Filter">
        {FILTERS.map((f) => {
          const active = f.key === activeFilter.key;
          return (
            <Link
              key={f.key}
              href={f.key === "alle" ? "/notifications" : `/notifications?filter=${f.key}`}
              className={cn(
                "rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors",
                active
                  ? "border-brand bg-brand text-brand-fg"
                  : "border-border bg-surface text-muted-fg hover:text-fg",
              )}
            >
              {f.label}
            </Link>
          );
        })}
      </nav>

      {filtered.length === 0 ? (
        <Card>
          <CardBody className="flex flex-col items-center gap-3 py-20 text-center">
            <Bell className="size-8 text-muted-fg" strokeWidth={1.5} />
            <p className="text-sm text-muted-fg">
              {notifications.length === 0
                ? "Noch keine Benachrichtigungen"
                : "Keine Benachrichtigungen in dieser Kategorie"}
            </p>
          </CardBody>
        </Card>
      ) : (
        <div className="flex flex-col gap-8">
          {BUCKET_ORDER.filter((b) => buckets.has(b)).map((bucket) => {
            const items = buckets.get(bucket)!;
            return (
              <section key={bucket}>
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-fg">
                  {bucket} · {items.length}
                </p>
                <Card className="overflow-hidden">
                  <ul className="divide-y divide-border">
                    {items.map((n) => {
                      const { Icon, label, tone } = getMeta(n.type);
                      const isUnread = !n.readAt;
                      const row = (
                        <div
                          className={cn(
                            "flex items-start gap-4 px-4 py-3.5",
                            isUnread && "bg-brand/5",
                            n.linkUrl && "hover:bg-brand/10",
                          )}
                        >
                          <span className={cn("mt-0.5 shrink-0", tone)}>
                            <Icon className="size-4" strokeWidth={1.75} />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className={cn("text-sm", isUnread ? "font-bold" : "font-medium")}>
                              {n.title}
                            </p>
                            <p className="mt-0.5 text-sm text-muted-fg">{n.body}</p>
                            <p className="mt-1 text-[11px] text-muted-fg/60">
                              {label} · {relativeTime(n.createdAt)}
                            </p>
                          </div>
                          {isUnread ? (
                            <span className="mt-2 size-2 shrink-0 rounded-full bg-brand" />
                          ) : (
                            <CheckCircle2 className="mt-1 size-4 shrink-0 text-muted-fg/40" />
                          )}
                        </div>
                      );
                      return (
                        <li key={n.id}>
                          {n.linkUrl ? <Link href={n.linkUrl}>{row}</Link> : row}
                        </li>
                      );
                    })}
                  </ul>
                </Card>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
