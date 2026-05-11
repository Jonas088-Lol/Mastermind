import { prisma } from "@/lib/db/client";
import type { NotificationItem, NotificationKind } from "@/components/app/NotificationCenter";

const TYPE_TO_KIND: Record<string, NotificationKind> = {
  assignment: "task",
  grade: "achievement",
  message: "message",
  system: "system",
};

const NOW = new Date("2026-05-06");

function relativeTime(date: Date): string {
  const diffMs = NOW.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "gerade eben";
  if (diffMin < 60) return `vor ${diffMin} Min.`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `vor ${diffH} Std.`;
  const diffD = Math.floor(diffH / 24);
  if (diffD === 1) return "gestern";
  if (diffD < 7) return `vor ${diffD} Tagen`;
  return date.toLocaleDateString("de-DE", { day: "numeric", month: "short" });
}

export async function fetchNotifications(userId: string): Promise<{
  notifications: NotificationItem[];
  unreadCount: number;
}> {
  const rows = await prisma.appNotification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  const notifications: NotificationItem[] = rows.map((r) => ({
    id: r.id,
    kind: TYPE_TO_KIND[r.type] ?? "system",
    title: r.title,
    body: r.body,
    time: relativeTime(r.createdAt),
    href: r.linkUrl ?? undefined,
    unread: r.readAt === null,
  }));

  const unreadCount = notifications.filter((n) => n.unread).length;
  return { notifications, unreadCount };
}
