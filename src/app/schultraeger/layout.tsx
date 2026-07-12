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
import { getSchoolBranding } from "@/lib/school-branding";
import { fetchNotifications } from "@/lib/notifications";

const navItems: NavItem[] = [
  { href: "/schultraeger",             label: "Übersicht",   icon: "home", exact: true },
  { href: "/schultraeger/schulen",     label: "Schulen",     icon: "building2" },
  { href: "/schultraeger/statistiken", label: "Statistiken", icon: "barChart3" },
  { href: "/schultraeger/lizenzen",    label: "Lizenzen",    icon: "fileText" },
  { href: "/schultraeger/abrechnung",  label: "Abrechnung",  icon: "coins" },
];

const bottomNav: BottomNavItem[] = [
  { href: "/schultraeger",             label: "Start",       icon: "home", exact: true },
  { href: "/schultraeger/schulen",     label: "Schulen",     icon: "building2" },
  { href: "/schultraeger/statistiken", label: "Statistiken", icon: "barChart3" },
  { href: "/schultraeger/lizenzen",    label: "Lizenzen",    icon: "fileText" },
];

export default async function SchultraegerLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");
  const effective = effectiveRole(session);
  if (effective !== "school_company" && effective !== "super") redirect("/login");

  const [{ notifications, unreadCount }, branding] = await Promise.all([
    fetchNotifications(session.userId),
    getSchoolBranding(session),
  ]);
  const schoolDisplayName = branding?.brandName ?? branding?.name;

  return (
    <div className="flex h-screen overflow-hidden bg-surface">
      <SchoolBrandingInjector branding={branding} />
      <Sidebar items={navItems} rootHref="/schultraeger" logoSrc={branding?.logoUrl} logoAlt={schoolDisplayName} />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="shrink-0 z-30">
          {isSuper(session) && (
            <ImpersonationBar effective={effective} isImpersonating={isImpersonating(session)} />
          )}
          <AppHeader
            user={displayUser(session)}
            searchPlaceholder="Suchen — Schulen, Lizenzen, Statistiken …"
            unreadCount={unreadCount}
            notifications={notifications}
          />
        </div>
        <main className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-6 lg:px-10 lg:py-10">
          {children}
        </main>
        <BottomNav items={bottomNav} moreItems={navItems} user={displayUser(session)} />
      </div>
    </div>
  );
}
