import { redirect } from "next/navigation";
import { Sidebar, type NavItem } from "@/components/app/Sidebar";
import { BottomNav, type BottomNavItem } from "@/components/app/BottomNav";
import { AppHeader } from "@/components/app/AppHeader";
import { ImpersonationBar } from "@/components/ImpersonationBar";
import {
  ROLE_HOME,
  displayUser,
  effectiveRole,
  getSession,
  isImpersonating,
  isSuper,
} from "@/lib/session";
import { fetchNotifications } from "@/lib/notifications";
import { prisma } from "@/lib/db/client";

export default async function TeachLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const effective = effectiveRole(session);
  if (effective !== "teacher") redirect(ROLE_HOME[effective]);

  const [{ notifications, unreadCount }, pendingCorrections, unreadThreads] = await Promise.all([
    fetchNotifications(session.userId),
    prisma.submission.count({
      where: { assignment: { teacherId: session.userId }, status: "submitted" },
    }),
    prisma.messageParticipant.count({
      where: {
        userId: session.userId,
        thread: {
          messages: {
            some: {
              senderId: { not: session.userId },
              sentAt: { gt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
            },
          },
        },
        OR: [
          { lastReadAt: null },
          { thread: { updatedAt: { gt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } },
        ],
      },
    }),
  ]);

  const corrBadge = pendingCorrections > 0 ? String(pendingCorrections) : undefined;
  const msgBadge = unreadThreads > 0 ? String(unreadThreads) : undefined;

  const items: NavItem[] = [
    { href: "/teach", label: "Dashboard", icon: "home", exact: true },
    { href: "/teach/klassen", label: "Klassen", icon: "users" },
    { href: "/teach/aufgaben", label: "Aufgaben", icon: "checkSquare" },
    { href: "/teach/korrektur", label: "Korrektur", icon: "clipboardEdit", badge: corrBadge },
    { href: "/teach/noten", label: "Noten", icon: "lineChart" },
    { href: "/teach/plan", label: "Stundenplan", icon: "calendar" },
    { href: "/teach/arbeitsblatter", label: "Arbeitsblätter", icon: "fileText" },
    { href: "/teach/arbeitsblatter/templates", label: "Vorlagen", icon: "layers" },
    { href: "/teach/generator", label: "KI-Generator", icon: "sparkles" },
    { href: "/teach/kompetenzen", label: "Kompetenzen", icon: "lineChart" },
    { href: "/teach/lernpfade", label: "Lernpfade", icon: "layers" },
    { href: "/teach/klassenbuch", label: "Klassenbuch", icon: "bookMarked" },
    { href: "/teach/abwesenheit", label: "Abwesenheiten", icon: "calendar" },
    { href: "/teach/nachrichten", label: "Nachrichten", icon: "messageSquare", badge: msgBadge },
    { href: "/teach/broadcast", label: "Broadcast", icon: "users" },
    { href: "/teach/sitzplan", label: "Sitzplan", icon: "grid" },
    { href: "/teach/elterngespraeche", label: "Elterngespräche", icon: "userCheck" },
    { href: "/teach/statistiken", label: "Statistiken", icon: "barChart3" },
    { href: "/teach/kalender", label: "Kalender", icon: "calendarDays" },
  ];

  const bottomItems: NavItem[] = [
    { href: "/teach/profil", label: "Profil", icon: "userCircle" },
    { href: "/teach/einstellungen", label: "Einstellungen", icon: "settings" },
  ];

  const mobileNav: BottomNavItem[] = [
    { href: "/teach", label: "Start", icon: "home", exact: true },
    { href: "/teach/klassen", label: "Klassen", icon: "users" },
    { href: "/teach/korrektur", label: "Korrektur", icon: "clipboardEdit", badge: corrBadge },
    { href: "/teach/nachrichten", label: "Nachrichten", icon: "messageSquare", badge: msgBadge },
    { href: "/teach/generator", label: "KI", icon: "sparkles" },
  ];

  return (
    <div className="flex min-h-screen bg-surface">
      <Sidebar items={items} bottomItems={bottomItems} rootHref="/teach" />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="sticky top-0 z-30">
          {isSuper(session) && (
            <ImpersonationBar
              effective={effective}
              isImpersonating={isImpersonating(session)}
            />
          )}
          <AppHeader
            user={displayUser(session)}
            searchPlaceholder="Suchen — Schüler, Klassen, Aufgaben …"
            unreadCount={unreadCount}
            notifications={notifications}
          />
        </div>
        <main className="flex-1 px-6 py-8 pb-24 lg:px-10 lg:py-10 lg:pb-10">
          {children}
        </main>
        <BottomNav items={mobileNav} />
      </div>
    </div>
  );
}
