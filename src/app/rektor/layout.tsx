/* Copyright 2026 Elian Schock, Jonas Schwenk */
import { redirect } from "next/navigation";
import { Sidebar, type NavItem } from "@/components/app/Sidebar";
import { BottomNav, type BottomNavItem } from "@/components/app/BottomNav";
import { AppHeader } from "@/components/app/AppHeader";
import { ImpersonationBar } from "@/components/ImpersonationBar";
import { SchoolBrandingInjector } from "@/components/SchoolBrandingInjector";
import {
  displayUser,
  effectiveRole,
  getSession,
  isImpersonating,
  isSuper,
} from "@/lib/session";
import { mergeNavLayout } from "@/lib/nav-categories";
import { getNavOverride } from "@/lib/nav-prefs";
import { navForRole } from "@/lib/nav-school";
import { getSchoolBranding } from "@/lib/school-branding";
import { fetchNotifications } from "@/lib/notifications";
import { enforceStaff2FA } from "@/lib/auth/require-2fa";

const navItems: NavItem[] = [
  { href: "/rektor",             label: "Dashboard",          icon: "home", exact: true },
  { href: "/rektor/statistiken", label: "Statistiken",        icon: "barChart3" },
  { href: "/rektor/personal",    label: "Personal",           icon: "users" },
  { href: "/rektor/mannschaften",label: "Mannschaften",       icon: "shield" },
  { href: "/rektor/schuljahr",   label: "Schuljahresplanung", icon: "calendarDays" },
  { href: "/rektor/evaluation",  label: "Evaluation",         icon: "lineChart" },
  { href: "/rektor/broadcast",   label: "Broadcast",          icon: "megaphone" },
];

const bottomNav: BottomNavItem[] = [
  { href: "/rektor",             label: "Start",       icon: "home", exact: true },
  { href: "/rektor/statistiken", label: "Statistiken", icon: "barChart3" },
  { href: "/rektor/personal",    label: "Personal",    icon: "users" },
  { href: "/rektor/broadcast",   label: "Broadcast",   icon: "megaphone" },
];

export default async function RektorLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");
  const effective = effectiveRole(session);
  if (
    effective !== "rector" &&
    effective !== "vice_rector" &&
    effective !== "admin" &&
    effective !== "super"
  ) {
    redirect("/login");
  }

  await enforceStaff2FA();

  const [{ notifications, unreadCount }, branding] = await Promise.all([
    fetchNotifications(session.userId),
    getSchoolBranding(session),
  ]);
  const schoolDisplayName = branding?.brandName ?? branding?.name;

  // Gemeinsame Navigation (eigene Seiten + Verwaltungsbereiche der Rolle)
  const navAll = navForRole("rector");
  const navOverride = await getNavOverride(session.userId, "rector");
  const navLayout = mergeNavLayout("rector", navAll, navOverride);

  return (
    <div className="flex h-screen overflow-hidden bg-surface">
      <SchoolBrandingInjector branding={branding} />
      <Sidebar items={navAll} rootHref="/rektor" logoSrc={branding?.logoUrl} logoAlt={schoolDisplayName} categories={navLayout.categories} pinnedItems={navLayout.pinned} />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="shrink-0 z-30">
          {isSuper(session) && (
            <ImpersonationBar effective={effective} isImpersonating={isImpersonating(session)} />
          )}
          <AppHeader
            user={displayUser(session)}
            searchPlaceholder="Suchen — Personal, Klassen, Statistiken …"
            unreadCount={unreadCount}
            notifications={notifications}
          />
        </div>
        <main className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-6 pb-28 lg:px-10 lg:py-10 lg:pb-10">
          {children}
        </main>
        <BottomNav items={bottomNav} moreItems={navAll} categories={navLayout.categories} pinnedItems={navLayout.pinned} user={displayUser(session)} />
      </div>
    </div>
  );
}
