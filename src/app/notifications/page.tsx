import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AlertTriangle, Bell, Check, CheckCircle2, ClipboardList, MessageSquare, Sparkles, Trophy } from "lucide-react";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession, ROLE_HOME } from "@/lib/session";
import { cn } from "@/lib/utils";
import { markNotificationsAsRead } from "./actions";

export const metadata: Metadata = { title: "Benachrichtigungen" };

const TYPE_ICON: Record<string, React.ComponentType<{ className?: string; strokeWidth?: number }>> = {
  assignment: ClipboardList,
  grade:      Trophy,
  message:    MessageSquare,
  ki:         Sparkles,
  system:     Bell,
  warning:    AlertTriangle,
};

const TYPE_TONE: Record<string, string> = {
  assignment: "text-brand",
  grade:      "text-success",
  message:    "text-info",
  ki:         "text-brand",
  system:     "text-muted-fg",
  warning:    "text-warning",
};

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

  const role = effectiveRole(session);
  const home = ROLE_HOME[role];

  const notifications = await prisma.appNotification.findMany({
    where: { userId: session.userId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const unread = notifications.filter((n) => !n.readAt);
  const read = notifications.filter((n) => n.readAt);

  async function markAllRead() {
    "use server";
    const ids = notifications.filter((n) => !n.readAt).map((n) => n.id);
    if (ids.length === 0) return;
    await markNotificationsAsRead(ids);
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Benachrichtigungen</h1>
          <p className="mt-1 text-sm text-muted-fg">
            {unread.length > 0 ? `${unread.length} ungelesen` : "Alles gelesen"}
          </p>
        </div>
        {unread.length > 0 && (
          <form action={markAllRead}>
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
        <div className="flex flex-col items-center gap-3 border border-dashed border-border py-20">
          <Bell className="size-8 text-muted-fg" strokeWidth={1.5} />
          <p className="text-sm text-muted-fg">Noch keine Benachrichtigungen</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {unread.length > 0 && (
            <section>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-fg">
                Neu · {unread.length}
              </p>
              <ul className="divide-y divide-border border border-border">
                {unread.map((n) => {
                  const Icon = TYPE_ICON[n.type] ?? Bell;
                  const tone = TYPE_TONE[n.type] ?? "text-muted-fg";
                  const content = (
                    <li key={n.id} className="flex items-start gap-4 bg-brand/[0.03] px-5 py-4">
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
            </section>
          )}

          {read.length > 0 && (
            <section>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-fg">
                Gelesen · {read.length}
              </p>
              <ul className="divide-y divide-border border border-border">
                {read.map((n) => {
                  const Icon = TYPE_ICON[n.type] ?? Bell;
                  const tone = TYPE_TONE[n.type] ?? "text-muted-fg";
                  const content = (
                    <li key={n.id} className="flex items-start gap-4 px-5 py-4 opacity-60">
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
            </section>
          )}
        </div>
      )}
    </div>
  );
}
