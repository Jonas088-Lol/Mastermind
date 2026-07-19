/* Copyright 2026 Elian Schock, Jonas Schwenk */
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
import { mergeNavLayout } from "@/lib/nav-categories";
import { getNavOverride } from "@/lib/nav-prefs";
import { fetchNotifications } from "@/lib/notifications";
import { prisma } from "@/lib/db/client";

const bottomItems: NavItem[] = [
  { href: "/eltern/einstellungen", label: "Einstellungen", icon: "settings" },
];

export default async function ElternLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const effective = effectiveRole(session);
  if (effective !== "parent") redirect(ROLE_HOME[effective]);

  const [{ notifications, unreadCount }, unreadMessages] = await Promise.all([
    fetchNotifications(session.userId),
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
    }).then((ps) =>
      ps.filter((p) => {
        const last = p.thread.messages[0];
        return last && last.senderId !== session.userId && (!p.lastReadAt || p.lastReadAt < last.sentAt);
      }).length
    ).catch(() => 0),
  ]);

  const mobileNav: BottomNavItem[] = [
    { href: "/eltern", label: "Start", icon: "home", exact: true },
    { href: "/eltern/nachrichten", label: "Nachrichten", icon: "messageSquare", badge: unreadMessages > 0 ? String(unreadMessages) : undefined },
    { href: "/eltern/noten", label: "Noten", icon: "award" },
    { href: "/eltern/stundenplan", label: "Stundenplan", icon: "calendar" },
    { href: "/eltern/aufgaben", label: "Aufgaben", icon: "checkSquare" },
  ];

  const items: NavItem[] = [
    { href: "/eltern", label: "Dashboard", icon: "home", exact: true },
    { href: "/eltern/nachrichten", label: "Nachrichten", icon: "messageSquare", badge: unreadMessages > 0 ? String(unreadMessages) : undefined },
    { href: "/eltern/noten", label: "Noten", icon: "award" },
    { href: "/eltern/stundenplan", label: "Stundenplan", icon: "calendar" },
    { href: "/eltern/aufgaben", label: "Aufgaben", icon: "checkSquare" },
    { href: "/eltern/uebungen", label: "Übungen", icon: "brain" },
    { href: "/eltern/hausaufgaben", label: "Hausaufgaben", icon: "bookOpen" },
    { href: "/eltern/abwesenheit", label: "Abwesenheit", icon: "clipboardEdit" },
    { href: "/eltern/fehlzeiten", label: "Fehlzeiten", icon: "calendarX" },
    { href: "/eltern/leistungsentwicklung", label: "Leistung", icon: "trendingUp" },
    { href: "/eltern/bericht", label: "Wochenbericht", icon: "barChart3" },
    { href: "/eltern/elternsprechtag", label: "Sprechtag", icon: "calendarDays" },
    { href: "/eltern/kalender", label: "Kalender", icon: "calendar" },
    { href: "/eltern/einwilligungen", label: "Einwilligungen", icon: "fileCheck" },
    { href: "/eltern/lernfortschritt", label: "Lernfortschritt", icon: "zap" },
    { href: "/eltern/arbeitsblatter", label: "Arbeitsblätter", icon: "fileText" },
    { href: "/eltern/belohnungen", label: "Belohnungen", icon: "gift" },
  ];

  // Suche steht immer ganz unten, ohne Kategorie
  const navAll = [...items, { href: "/search", label: "Suche", icon: "search" as const }];
  const navOverride = await getNavOverride(session.userId, "parent");
  const navLayout = mergeNavLayout("parent", navAll, navOverride);

  return (
    <div className="flex h-screen overflow-hidden bg-surface">
      <Sidebar items={navAll} bottomItems={bottomItems} rootHref="/eltern" categories={navLayout.categories} pinnedItems={navLayout.pinned} />
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
            unreadCount={unreadCount}
            notifications={notifications}
            searchPlaceholder="Suchen — Nachrichten, Noten, Termine …"
          />
        </div>
        <main className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-6 pb-28 lg:px-10 lg:py-10 lg:pb-10">
          {children}
        </main>
        <BottomNav items={mobileNav} moreItems={[...navAll, ...bottomItems]} categories={navLayout.categories} pinnedItems={navLayout.pinned} user={displayUser(session)} />
      </div>
    </div>
  );
}
