/* Copyright 2026 Elian Schock, Jonas Schwenk */
import { redirect } from "next/navigation";
import { Sidebar, type NavItem } from "@/components/app/Sidebar";
import { BottomNav, type BottomNavItem } from "@/components/app/BottomNav";
import { PlatformUpdateGate } from "@/components/PlatformUpdateGate";
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

const navItems: NavItem[] = [
  { href: "/sekretariat",             label: "Dashboard",     icon: "home", exact: true },
  { href: "/sekretariat/klassen",     label: "Klassenlisten", icon: "bookOpen" },
  { href: "/sekretariat/schueler",    label: "Schüler",       icon: "users" },
  { href: "/sekretariat/fehlzeiten",  label: "Fehlzeiten",    icon: "clipboardList" },
  { href: "/sekretariat/neuanmeldung",label: "Neuanmeldung",  icon: "userCircle" },
  { href: "/sekretariat/zeugnisse",   label: "Zeugnisse",     icon: "fileCheck" },
  { href: "/sekretariat/atteste",     label: "Atteste",       icon: "shield" },
  { href: "/sekretariat/anzeigetafel",label: "Anzeigetafel",  icon: "monitor" },
];

const bottomNav: BottomNavItem[] = [
  { href: "/sekretariat",            label: "Start",      icon: "home", exact: true },
  { href: "/sekretariat/klassen",    label: "Klassen",    icon: "bookOpen" },
  { href: "/sekretariat/schueler",   label: "Schüler",    icon: "users" },
  { href: "/sekretariat/fehlzeiten", label: "Fehlzeiten", icon: "clipboardList" },
];

export default async function SekretariatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  const effective = effectiveRole(session);
  if (
    effective !== "secretary" &&
    effective !== "rector" &&
    effective !== "vice_rector" &&
    effective !== "admin" &&
    effective !== "super"
  ) {
    redirect("/login");
  }

  const [{ notifications, unreadCount }, branding] = await Promise.all([
    fetchNotifications(session.userId),
    getSchoolBranding(session),
  ]);
  const schoolDisplayName = branding?.brandName ?? branding?.name;

  // Gemeinsame Navigation (eigene Seiten + Verwaltungsbereiche der Rolle)
  const navAll = navForRole("secretary");
  const navOverride = await getNavOverride(session.userId, "secretary");
  const navLayout = mergeNavLayout("secretary", navAll, navOverride);

  return (
    <div className="flex h-screen overflow-hidden bg-surface">
      <SchoolBrandingInjector branding={branding} />
      <Sidebar items={navAll} rootHref="/sekretariat" logoSrc={branding?.logoUrl} logoAlt={schoolDisplayName} categories={navLayout.categories} pinnedItems={navLayout.pinned} />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="shrink-0 z-30">
          {isSuper(session) && (
            <ImpersonationBar effective={effective} isImpersonating={isImpersonating(session)} />
          )}
          <AppHeader
            user={displayUser(session)}
            searchPlaceholder="Suchen — Schüler, Klassen, Fehlzeiten …"
            unreadCount={unreadCount}
            notifications={notifications}
          />
        </div>
        <main className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-6 pb-28 lg:px-10 lg:py-10 lg:pb-10">
          {children}
        </main>
        <BottomNav items={bottomNav} moreItems={navAll} categories={navLayout.categories} pinnedItems={navLayout.pinned} user={displayUser(session)} />
        <PlatformUpdateGate />
      </div>
    </div>
  );
}
