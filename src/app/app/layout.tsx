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
  { href: "/app", label: "Dashboard", icon: "home", exact: true },
  { href: "/app/lernen", label: "Lernen", icon: "bookOpen" },
  { href: "/app/uebungen", label: "Übungen", icon: "brain" },
  { href: "/app/karteikarten", label: "Karteikarten", icon: "layers", badge: "12" },
  { href: "/app/aufgaben", label: "Aufgaben", icon: "checkSquare", badge: "3" },
  { href: "/app/plan", label: "Stundenplan", icon: "calendar" },
  { href: "/app/noten", label: "Noten", icon: "award" },
  { href: "/app/nachrichten", label: "Nachrichten", icon: "messageSquare" },
  { href: "/app/tutor", label: "KI-Tutor", icon: "sparkles" },
  { href: "/app/duelle", label: "Duelle", icon: "swords" },
  { href: "/app/community", label: "Community", icon: "users" },
  { href: "/app/mannschaften", label: "Mannschaften", icon: "shield" },
  { href: "/app/ranking", label: "Ranking", icon: "trophy" },
];

const bottomItems: NavItem[] = [
  { href: "/app/profil", label: "Profil", icon: "userCircle" },
  { href: "/app/einstellungen", label: "Einstellungen", icon: "settings" },
];

const mobileNav: BottomNavItem[] = [
  { href: "/app", label: "Start", icon: "home", exact: true },
  { href: "/app/uebungen", label: "Übungen", icon: "brain" },
  { href: "/app/aufgaben", label: "Aufgaben", icon: "checkSquare", badge: "3" },
  { href: "/app/karteikarten", label: "Karten", icon: "layers", badge: "12" },
  { href: "/app/tutor", label: "Tutor", icon: "sparkles" },
];

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const effective = effectiveRole(session);
  if (effective !== "student") redirect(ROLE_HOME[effective]);

  const { notifications, unreadCount } = await fetchNotifications(session.userId);

  return (
    <div className="flex min-h-screen bg-surface">
      <Sidebar items={items} bottomItems={bottomItems} rootHref="/app" />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="sticky top-0 z-30">
          {isSuper(session) && (
            <ImpersonationBar
              effective={effective}
              isImpersonating={isImpersonating(session)}
            />
          )}
          <AppHeader user={displayUser(session)} unreadCount={unreadCount} notifications={notifications} />
        </div>
        <main className="flex-1 px-6 py-8 pb-24 lg:px-10 lg:py-10 lg:pb-10">
          {children}
        </main>
        <BottomNav items={mobileNav} />
      </div>
    </div>
  );
}
