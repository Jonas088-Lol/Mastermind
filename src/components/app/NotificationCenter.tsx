"use client";

import {
  AlertTriangle,
  Bell,
  Check,
  ClipboardList,
  MessageSquare,
  Sparkles,
  Trophy,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { markNotificationsAsRead } from "@/app/notifications/actions";
import { cn } from "@/lib/utils";

export type NotificationKind =
  | "task"
  | "message"
  | "ki"
  | "achievement"
  | "system"
  | "warning";

export interface NotificationItem {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  time: string;
  href?: string;
  unread: boolean;
}

const KIND_ICON: Record<NotificationKind, React.ComponentType<{ className?: string; strokeWidth?: number }>> = {
  task: ClipboardList,
  message: MessageSquare,
  ki: Sparkles,
  achievement: Trophy,
  system: Bell,
  warning: AlertTriangle,
};

const KIND_TONE: Record<NotificationKind, string> = {
  task: "text-brand",
  message: "text-info",
  ki: "text-brand",
  achievement: "text-success",
  system: "text-muted-fg",
  warning: "text-warning",
};

export interface NotificationCenterProps {
  unreadCount: number;
  notifications?: NotificationItem[];
}

export function NotificationCenter({ unreadCount, notifications = [] }: NotificationCenterProps) {
  const [open, setOpen] = useState(false);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [, startTransition] = useTransition();
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  const list = notifications.map((n) => ({
    ...n,
    unread: n.unread && !readIds.has(n.id),
  }));
  const liveUnread = list.filter((n) => n.unread).length;
  const badgeCount = readIds.size > 0 ? liveUnread : unreadCount;

  function markRead(ids: string[]) {
    if (ids.length === 0) return;
    setReadIds((curr) => {
      const next = new Set(curr);
      for (const id of ids) next.add(id);
      return next;
    });
    startTransition(() => {
      void markNotificationsAsRead(ids);
    });
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    closeBtnRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        aria-label={`Benachrichtigungen ${badgeCount > 0 ? `(${badgeCount} ungelesen)` : ""}`}
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="relative grid size-10 place-items-center text-muted-fg transition-colors hover:bg-surface hover:text-fg"
      >
        <Bell className="size-4" />
        {badgeCount > 0 && (
          <span className="absolute right-2 top-2 size-1.5 bg-brand" aria-hidden />
        )}
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-50 bg-fg/40 animate-fade-in"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Benachrichtigungen"
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-border bg-bg shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">
                  Benachrichtigungen
                </p>
                <h2 className="mt-1 text-lg font-bold tracking-tight">
                  {liveUnread > 0
                    ? `${liveUnread} ungelesen`
                    : "Alles gelesen"}
                </h2>
              </div>
              <button
                ref={closeBtnRef}
                type="button"
                aria-label="Schließen"
                onClick={() => setOpen(false)}
                className="grid size-9 place-items-center text-muted-fg transition-colors hover:bg-surface hover:text-fg"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="flex items-center justify-between border-b border-border bg-surface px-5 py-2">
              <button
                type="button"
                disabled={liveUnread === 0}
                onClick={() =>
                  markRead(list.filter((n) => n.unread).map((n) => n.id))
                }
                className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-fg transition-colors hover:text-fg disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Check className="size-3.5" />
                Alle als gelesen markieren
              </button>
              <Link
                href="/app/einstellungen#benachrichtigungen"
                onClick={() => setOpen(false)}
                className="text-xs font-semibold uppercase tracking-wider text-muted-fg transition-colors hover:text-fg"
              >
                Einstellungen
              </Link>
            </div>

            {list.length === 0 ? (
              <div className="flex flex-1 items-center justify-center p-8 text-center text-sm text-muted-fg">
                Keine Benachrichtigungen.
              </div>
            ) : (
              <ul className="flex-1 divide-y divide-border overflow-y-auto">
                {list.map((n) => (
                  <NotificationRow
                    key={n.id}
                    n={n}
                    onNavigate={() => {
                      if (n.unread) markRead([n.id]);
                      setOpen(false);
                    }}
                  />
                ))}
              </ul>
            )}
          </aside>
        </>
      )}
    </>
  );
}

function NotificationRow({
  n,
  onNavigate,
}: {
  n: NotificationItem;
  onNavigate: () => void;
}) {
  const Icon = KIND_ICON[n.kind];
  const wrapClass = cn(
    "flex items-start gap-3 px-5 py-4 transition-colors hover:bg-surface",
    n.unread && "bg-brand/[0.04]"
  );

  const inner = (
    <>
      <span
        className={cn(
          "mt-0.5 grid size-9 shrink-0 place-items-center bg-surface",
          KIND_TONE[n.kind]
        )}
      >
        <Icon className="size-4" strokeWidth={1.75} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <p
            className={cn(
              "truncate text-sm",
              n.unread ? "font-bold" : "font-semibold"
            )}
          >
            {n.title}
          </p>
          {n.unread && (
            <span
              className="size-1.5 shrink-0 bg-brand"
              aria-label="ungelesen"
            />
          )}
          <span className="ml-auto shrink-0 font-mono text-[10px] uppercase tracking-wider text-muted-fg">
            {n.time}
          </span>
        </div>
        <p
          className={cn(
            "mt-0.5 line-clamp-2 text-xs",
            n.unread ? "text-fg" : "text-muted-fg"
          )}
        >
          {n.body}
        </p>
      </div>
    </>
  );

  return (
    <li>
      {n.href ? (
        <Link href={n.href} onClick={onNavigate} className={wrapClass}>
          {inner}
        </Link>
      ) : (
        <div className={wrapClass}>{inner}</div>
      )}
    </li>
  );
}
