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

const plattformNavItems: NavItem[] = [
  { href: "/plattform",                label: "Übersicht",    icon: "home",         exact: true },
  { href: "/schultraeger/schulen",     label: "Schulen",      icon: "building2" },
  { href: "/plattform/statistiken",    label: "Statistiken",  icon: "barChart3" },
  { href: "/plattform/gamification",   label: "Gamification", icon: "swords" },
  { href: "/plattform/support",        label: "Support",      icon: "messageSquare" },
  { href: "/plattform/demo-zugriff",   label: "Demo-Zugriff", icon: "sparkles" },
  { href: "/plattform/aktive-demos",   label: "Aktive Demos", icon: "monitor" },
  { href: "/plattform/flags",          label: "Flags",        icon: "shield" },
  { href: "/plattform/audit",          label: "Audit-Log",    icon: "lineChart" },
  { href: "/plattform/kb",             label: "Wissensbasis", icon: "bookOpen" },
];

const plattformBottomItems: BottomNavItem[] = [
  { href: "/plattform",                label: "Start",   icon: "home",         exact: true },
  { href: "/schultraeger/schulen",     label: "Schulen", icon: "building2" },
  { href: "/plattform/statistiken",    label: "Stats",   icon: "barChart3" },
  { href: "/plattform/gamification",   label: "Spiel",   icon: "swords" },
  { href: "/plattform/support",        label: "Support", icon: "messageSquare" },
];

export default async function PlattformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const effective = effectiveRole(session);
  if (effective !== "super") redirect(ROLE_HOME[effective]);

  return (
    <div className="flex min-h-screen bg-surface">
      <Sidebar items={plattformNavItems} rootHref="/plattform" />
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
            searchPlaceholder="Suchen — Schulen, Tickets, Audit-Logs, Flags …"
            unreadCount={3}
          />
        </div>
        <main className="flex-1 px-4 py-6 pb-24 lg:px-10 lg:py-10 lg:pb-10">
          {children}
        </main>
        <BottomNav items={plattformBottomItems} moreItems={plattformNavItems} />
      </div>
    </div>
  );
}
