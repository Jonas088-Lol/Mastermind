import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  AlertTriangle,
  Bell,
  Check,
  CheckCircle2,
  ClipboardList,
  MessageSquare,
  Sparkles,
  Star,
  Trophy,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/db/client";
import { getSession } from "@/lib/session";
import { cn } from "@/lib/utils";
import { markAllNotificationsRead } from "./actions";

export const metadata: Metadata = { title: "Benachrichtigungen" };

const TYPE_META: Record<
  string,
  {
    Icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
    emoji: string;
    label: string;
    tone: string;
  }
> = {
  grade:       { Icon: Trophy,        emoji: "📝", label: "Neue Note",                 tone: "text-success" },
  assignment:  { Icon: ClipboardList, emoji: "📋", label: "Neue Aufgabe",              tone: "text-brand" },
  message:     { Icon: MessageSquare, emoji: "💬", label: "Neue Nachricht",            tone: "text-info" },
  achievement: { Icon: Star,          emoji: "🏆", label: "Achievement freigeschaltet",tone: "text-warning" },
  xp:          { Icon: Zap,           emoji: "⚡", label: "XP erhalten",              tone: "text-brand" },
  quest:       { Icon: Trophy,        emoji: "🎯", label: "Quest-Update",             tone: "text-warning" },
  coins:       { Icon: Sparkles,      emoji: "🪙", label: "Münzen erhalten",          tone: "text-warning" },
  ki:          { Icon: Sparkles,      emoji: "✨", label: "KI-Hinweis",               tone: "text-brand" },
  system:      { Icon: Bell,          emoji: "🔔", label: "System",                   tone: "text-muted-fg" },
  warning:     { Icon: AlertTriangle, emoji: "⚠️", label: "Warnung",                  tone: "text-warning" },
};

const DEFAULT_META = { Icon: Bell, emoji: "🔔", label: "Benachrichtigung", tone: "text-muted-fg" };

function getMeta(type: string) {
  return TYPE_META[type] ?? DEFAULT_META;
}

/** Group notifications by their `type` field */
function groupByType<T extends { type: string }>(items: T[]): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const existing = map.get(item.type);
    if (existing) {
      existing.push(item);
    } else {
      map.set(item.type, [item]);
    }
  }
  return map;
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

export default async function NotificationsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const notifications = await prisma.appNotification.findMany({
    where: { userId: session.userId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const unread = notifications.filter((n) => !n.readAt);
  const read   = notifications.filter((n) =>  n.readAt);

  const unreadByType = groupByType(unread);
  const readByType   = groupByType(read);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      {/* ── Header ── */}
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Benachrichtigungen</h1>
          <p className="mt-1 text-sm text-muted-fg">
            {unread.length > 0 ? (
              <>
                <span className="font-semibold text-fg">{unread.length}</span> ungelesen
              </>
            ) : (
              "Alles gelesen"
            )}
          </p>
        </div>
        {unread.length > 0 && (
          <form action={markAllNotificationsRead}>
            <button
              type="submit"
              className="flex items-center gap-1.5 text-xs font-semibold text-muted-fg hover:text-fg"
            >
              <Check className="size-3.5" />
              Alle als gelesen markieren
            </button>
          </form>
        )}
      </header>

      {notifications.length === 0 ? (
        <Card>
          <CardBody className="flex flex-col items-center gap-3 py-20 text-center">
            <Bell className="size-8 text-muted-fg" strokeWidth={1.5} />
            <p className="text-sm text-muted-fg">Noch keine Benachrichtigungen</p>
          </CardBody>
        </Card>
      ) : (
        <div className="flex flex-col gap-8">
          {/* ── Unread section, grouped by type ── */}
          {unread.length > 0 && (
            <section>
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-fg">
                Neu · {unread.length}
              </p>
              <div className="flex flex-col gap-4">
                {Array.from(unreadByType.entries()).map(([type, items]) => {
                  const meta = getMeta(type);
                  return (
                    <Card key={type}>
                      <CardHeader>
                        <div className="flex items-center gap-2">
                          <span className="text-base leading-none">{meta.emoji}</span>
                          <CardTitle>{meta.label}</CardTitle>
                        </div>
                        <Badge variant="brand">{items.length}</Badge>
                      </CardHeader>
                      <CardBody className="pt-0">
                        <ul className="divide-y divide-border border border-border">
                          {items.map((n) => {
                            const { Icon, tone } = meta;
                            const content = (
                              <li key={n.id} className="flex items-start gap-4 bg-brand/3 px-4 py-3.5">
                                <span className={cn("mt-0.5 shrink-0", tone)}>
                                  <Icon className="size-4" strokeWidth={1.75} />
                                </span>
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-semibold">{n.title}</p>
                                  <p className="mt-0.5 text-sm text-muted-fg">{n.body}</p>
                                  <p className="mt-1 text-[11px] text-muted-fg/60">{relativeTime(n.createdAt)}</p>
                                </div>
                                <span className="mt-2 size-2 shrink-0 rounded-full bg-brand" />
                              </li>
                            );
                            return n.linkUrl ? (
                              <a key={n.id} href={n.linkUrl}>{content}</a>
                            ) : content;
                          })}
                        </ul>
                      </CardBody>
                    </Card>
                  );
                })}
              </div>
            </section>
          )}

          {/* ── Read section, grouped by type ── */}
          {read.length > 0 && (
            <section>
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-fg">
                Gelesen · {read.length}
              </p>
              <div className="flex flex-col gap-4">
                {Array.from(readByType.entries()).map(([type, items]) => {
                  const meta = getMeta(type);
                  return (
                    <Card key={type} className="opacity-70">
                      <CardHeader>
                        <div className="flex items-center gap-2">
                          <span className="text-base leading-none">{meta.emoji}</span>
                          <CardTitle>{meta.label}</CardTitle>
                        </div>
                        <Badge variant="neutral">{items.length}</Badge>
                      </CardHeader>
                      <CardBody className="pt-0">
                        <ul className="divide-y divide-border border border-border">
                          {items.map((n) => {
                            const { Icon, tone } = meta;
                            const content = (
                              <li key={n.id} className="flex items-start gap-4 px-4 py-3.5">
                                <span className={cn("mt-0.5 shrink-0", tone)}>
                                  <Icon className="size-4" strokeWidth={1.75} />
                                </span>
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-medium">{n.title}</p>
                                  <p className="mt-0.5 text-sm text-muted-fg">{n.body}</p>
                                  <p className="mt-1 text-[11px] text-muted-fg/60">{relativeTime(n.createdAt)}</p>
                                </div>
                                <CheckCircle2 className="mt-1 size-4 shrink-0 text-muted-fg/40" />
                              </li>
                            );
                            return n.linkUrl ? (
                              <a key={n.id} href={n.linkUrl}>{content}</a>
                            ) : content;
                          })}
                        </ul>
                      </CardBody>
                    </Card>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
