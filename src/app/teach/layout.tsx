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
  { href: "/teach", label: "Dashboard", icon: "home", exact: true },
  { href: "/teach/klassen", label: "Klassen", icon: "users", badge: "4" },
  { href: "/teach/aufgaben", label: "Aufgaben", icon: "checkSquare" },
  { href: "/teach/korrektur", label: "Korrektur", icon: "clipboardEdit", badge: "23" },
  { href: "/teach/generator", label: "KI-Generator", icon: "sparkles" },
  { href: "/teach/kompetenzen", label: "Kompetenzen", icon: "lineChart" },
  { href: "/teach/lernpfade", label: "Lernpfade", icon: "layers" },
  { href: "/teach/klassenbuch", label: "Klassenbuch", icon: "bookMarked" },
  { href: "/teach/abwesenheit", label: "Abwesenheiten", icon: "calendar" },
  { href: "/teach/nachrichten", label: "Nachrichten", icon: "messageSquare", badge: "5" },
];

const bottomItems: NavItem[] = [
  { href: "/teach/profil", label: "Profil", icon: "userCircle" },
  { href: "/teach/einstellungen", label: "Einstellungen", icon: "settings" },
];

const mobileNav: BottomNavItem[] = [
  { href: "/teach", label: "Start", icon: "home", exact: true },
  { href: "/teach/klassen", label: "Klassen", icon: "users", badge: "4" },
  { href: "/teach/korrektur", label: "Korrektur", icon: "clipboardEdit", badge: "23" },
  { href: "/teach/nachrichten", label: "Nachrichten", icon: "messageSquare", badge: "5" },
  { href: "/teach/generator", label: "KI", icon: "sparkles" },
];

export default async function TeachLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const effective = effectiveRole(session);
  if (effective !== "teacher") redirect(ROLE_HOME[effective]);

  const { notifications, unreadCount } = await fetchNotifications(session.userId);

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
