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

const items: NavItem[] = [
  { href: "/eltern", label: "Übersicht", icon: "home", exact: true },
  { href: "/eltern/nachrichten", label: "Nachrichten", icon: "messageSquare" },
  { href: "/eltern/noten", label: "Noten", icon: "award" },
  { href: "/eltern/stundenplan", label: "Stundenplan", icon: "calendar" },
  { href: "/eltern/aufgaben", label: "Aufgaben", icon: "checkSquare" },
  { href: "/eltern/hausaufgaben", label: "Hausaufgaben", icon: "bookOpen" },
  { href: "/eltern/abwesenheit", label: "Abwesenheit", icon: "clipboardEdit" },
  { href: "/eltern/fehlzeiten", label: "Fehlzeiten", icon: "calendarX" },
  { href: "/eltern/leistungsentwicklung", label: "Leistung", icon: "trendingUp" },
  { href: "/eltern/elternsprechtag", label: "Sprechtag", icon: "calendarDays" },
  { href: "/eltern/kalender", label: "Kalender", icon: "calendar" },
  { href: "/eltern/einwilligungen", label: "Einwilligungen", icon: "fileCheck" },
  { href: "/eltern/lernfortschritt", label: "Lernfortschritt", icon: "zap" },
];

const bottomItems: NavItem[] = [
  { href: "/eltern/einstellungen", label: "Einstellungen", icon: "settings" },
];

const mobileNav: BottomNavItem[] = [
  { href: "/eltern", label: "Start", icon: "home", exact: true },
  { href: "/eltern/nachrichten", label: "Nachrichten", icon: "messageSquare" },
  { href: "/eltern/noten", label: "Noten", icon: "award" },
  { href: "/eltern/stundenplan", label: "Stundenplan", icon: "calendar" },
  { href: "/eltern/aufgaben", label: "Aufgaben", icon: "checkSquare" },
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

  const { notifications, unreadCount } = await fetchNotifications(session.userId);

  return (
    <div className="flex min-h-screen bg-surface">
      <Sidebar items={items} bottomItems={bottomItems} rootHref="/eltern" />
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
            unreadCount={unreadCount}
            notifications={notifications}
            searchPlaceholder="Suchen — Nachrichten, Noten, Termine …"
          />
        </div>
        <main className="flex-1 px-4 py-6 pb-24 lg:px-10 lg:py-10 lg:pb-10">
          {children}
        </main>
        <BottomNav items={mobileNav} moreItems={[...items, ...bottomItems]} />
      </div>
    </div>
  );
}
