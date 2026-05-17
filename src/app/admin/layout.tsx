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

const adminNavItems: NavItem[] = [
  { href: "/admin",               label: "Dashboard",    icon: "home",         exact: true },
  { href: "/admin/nutzer",        label: "Nutzer",       icon: "users" },
  { href: "/admin/klassen",       label: "Klassen",      icon: "building2" },
  { href: "/admin/faecher",       label: "Fächer",       icon: "bookOpen" },
  { href: "/admin/stundenplan",   label: "Stundenplan",  icon: "calendar" },
  { href: "/admin/notenspiegel",  label: "Noten",        icon: "barChart3" },
  { href: "/admin/abgaben",       label: "Abgaben",      icon: "clipboardEdit" },
  { href: "/admin/nachrichten",   label: "Nachrichten",  icon: "messageSquare" },
  { href: "/admin/fehlzeiten",    label: "Fehlzeiten",   icon: "calendarX" },
  { href: "/admin/gamification",  label: "Gamification", icon: "zap" },
  { href: "/admin/vertretungsplan", label: "Vertretungsplan", icon: "refreshCw" },
  { href: "/admin/schulkalender",   label: "Schulkalender",   icon: "calendar" },
  { href: "/admin/einwilligungen",  label: "Einwilligungen",  icon: "fileCheck" },
  { href: "/admin/berichte",        label: "Berichte",        icon: "barChart3" },
  { href: "/admin/branding",      label: "Branding",     icon: "sparkles" },
  { href: "/admin/sicherheit",    label: "Sicherheit",   icon: "shield" },
  { href: "/admin/lizenz",        label: "Lizenz",       icon: "award" },
  { href: "/admin/integrationen", label: "Integrationen",icon: "layers" },
  { href: "/admin/audit",         label: "Audit-Log",    icon: "lineChart" },
];

const adminBottomItems: BottomNavItem[] = [
  { href: "/admin",              label: "Start",   icon: "home",      exact: true },
  { href: "/admin/nutzer",       label: "Nutzer",  icon: "users" },
  { href: "/admin/klassen",      label: "Klassen", icon: "building2" },
  { href: "/admin/notenspiegel", label: "Noten",   icon: "barChart3" },
  { href: "/admin/sicherheit",   label: "Mehr",    icon: "settings" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const effective = effectiveRole(session);
  if (effective !== "admin") redirect(ROLE_HOME[effective]);

  const { notifications, unreadCount } = await fetchNotifications(session.userId);

  return (
    <div className="flex min-h-screen bg-surface">
      <Sidebar items={adminNavItems} rootHref="/admin" />
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
            searchPlaceholder="Suchen — Nutzer, Klassen, Lizenzen, Audit-Logs …"
            unreadCount={unreadCount}
            notifications={notifications}
          />
        </div>
        <main className="flex-1 px-6 py-8 pb-24 lg:px-10 lg:py-10 lg:pb-10">
          {children}
        </main>
        <BottomNav items={adminBottomItems} />
      </div>
    </div>
  );
}
