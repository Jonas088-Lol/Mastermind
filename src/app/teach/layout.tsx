import { redirect } from "next/navigation";
import { Sidebar, type NavItem } from "@/components/app/Sidebar";
import { BottomNav, type BottomNavItem } from "@/components/app/BottomNav";
import { AppHeader } from "@/components/app/AppHeader";
import { ImpersonationBar } from "@/components/ImpersonationBar";
import { SchoolBrandingInjector } from "@/components/SchoolBrandingInjector";
import { MasterSpaceModal } from "@/components/masterspace/MasterSpaceModal";
import {
  ROLE_HOME,
  displayUser,
  effectiveRole,
  getSession,
  isImpersonating,
  isSuper,
} from "@/lib/session";
import { getSchoolBranding } from "@/lib/school-branding";
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

  const [{ notifications, unreadCount }, pendingCorrections, unreadThreads, branding] = await Promise.all([
    fetchNotifications(session.userId),
    prisma.submission.count({
      where: { assignment: { teacherId: session.userId }, status: "submitted" },
    }),
    prisma.messageParticipant.findMany({
      where: { userId: session.userId },
      select: {
        lastReadAt: true,
        thread: {
          select: {
            messages: {
              orderBy: { sentAt: "desc" },
              take: 1,
              select: { sentAt: true, senderId: true },
            },
          },
        },
      },
    }),
    getSchoolBranding(session),
  ]);

  // Identical logic to the list page: skip if last message is own, then compare lastReadAt
  const unreadThreadCount = unreadThreads.filter((p) => {
    const lastMsg = p.thread.messages[0];
    if (!lastMsg) return false;
    if (lastMsg.senderId === session.userId) return false;
    return !p.lastReadAt || p.lastReadAt < lastMsg.sentAt;
  }).length;

  const corrBadge = pendingCorrections > 0 ? String(pendingCorrections) : undefined;
  const msgBadge = unreadThreadCount > 0 ? String(unreadThreadCount) : undefined;

  const items: NavItem[] = [
    { href: "/teach", label: "Dashboard", icon: "home", exact: true },
    { href: "/teach/klassen", label: "Klassen", icon: "users" },
    { href: "/teach/aufgaben", label: "Aufgaben", icon: "checkSquare" },
    { href: "/teach/mastertask", label: "MasterTask", icon: "clipboardList" },
    { href: "/teach/hausaufgaben", label: "Hausaufgaben", icon: "bookOpen" },
    { href: "/teach/korrektur", label: "Korrektur", icon: "clipboardEdit", badge: corrBadge },
    { href: "/teach/noten", label: "Noten", icon: "lineChart" },
    { href: "/teach/plan", label: "Stundenplan", icon: "calendar" },
    { href: "/teach/arbeitsblatter", label: "Arbeitsblätter", icon: "fileText" },
    { href: "/teach/arbeitsblatter/templates", label: "Vorlagen", icon: "layers" },
    { href: "/teach/boss", label: "Boss-Kämpfe", icon: "swords" },
    { href: "/teach/generator", label: "KI-Generator", icon: "sparkles" },
    { href: "/teach/kompetenzen", label: "Kompetenzen", icon: "lineChart" },
    { href: "/teach/lernpfade", label: "Lernpfade", icon: "layers" },
    { href: "/teach/klassenbuch", label: "Klassenbuch", icon: "bookMarked" },
    { href: "/teach/abwesenheit", label: "Abwesenheiten", icon: "calendar" },
    { href: "/teach/nachrichten", label: "Nachrichten", icon: "messageSquare", badge: msgBadge },
    { href: "/teach/broadcast", label: "Broadcast", icon: "users" },
    { href: "/teach/sitzplan", label: "Sitzplan", icon: "grid" },
    { href: "/teach/elterngespraeche", label: "Elterngespräche", icon: "userCheck" },
    { href: "/teach/elternsprechtag", label: "Elternsprechtag", icon: "calendarDays" },
    { href: "/teach/statistiken", label: "Statistiken", icon: "barChart3" },
    { href: "/teach/kalender", label: "Kalender", icon: "calendarDays" },
    { href: "/teach/ressourcen", label: "Ressourcen", icon: "box" },
    { href: "/teach/notenschluessel", label: "Notenschlüssel", icon: "calculator" },
    { href: "/teach/masterspace", label: "MasterSpace", icon: "compass", modal: "masterspace" },
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

  const schoolDisplayName = branding?.brandName ?? branding?.name;

  return (
    <div className="flex h-screen overflow-hidden bg-surface">
      <SchoolBrandingInjector branding={branding} />
      <Sidebar items={items} bottomItems={bottomItems} rootHref="/teach" logoSrc={branding?.logoUrl} logoAlt={schoolDisplayName} />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="shrink-0 z-30">
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
        <main className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-6 lg:px-10 lg:py-10">
          {children}
        </main>
        <BottomNav items={mobileNav} moreItems={[...items, ...bottomItems]} user={displayUser(session)} />
        <MasterSpaceModal />
      </div>
    </div>
  );
}
