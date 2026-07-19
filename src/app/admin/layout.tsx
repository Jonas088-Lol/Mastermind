/* Copyright 2026 Elian Schock, Jonas Schwenk */
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/app/Sidebar";
import { BottomNav, type BottomNavItem } from "@/components/app/BottomNav";
import { AppHeader } from "@/components/app/AppHeader";
import { ImpersonationBar } from "@/components/ImpersonationBar";
import { SchoolBrandingInjector } from "@/components/SchoolBrandingInjector";
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
import { enforceStaff2FA } from "@/lib/auth/require-2fa";
import { canManageSchool } from "@/lib/school-admin";
import { navForRole } from "@/lib/nav-school";
import { mergeNavLayout } from "@/lib/nav-categories";
import { getNavOverride } from "@/lib/nav-prefs";
import { prisma } from "@/lib/db/client";

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
  // Der frühere "Schul-Admin" ist aufgelöst: Schulverwaltung machen jetzt
  // Schulleitung und Sekretariat — jeweils mit ihren eigenen Bereichen.
  if (!canManageSchool(effective)) redirect(ROLE_HOME[effective]);

  await enforceStaff2FA();

  const [{ notifications, unreadCount }, branding, unreadMessages] = await Promise.all([
    fetchNotifications(session.userId),
    getSchoolBranding(session),
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


  // Gleiche Leiste wie in /rektor bzw. /sekretariat — der Wechsel in die
  // Verwaltung soll sich nicht wie eine andere App anfühlen.
  const navAll = navForRole(effective).map((i) =>
    i.href === "/admin/nachrichten" && unreadMessages > 0
      ? { ...i, badge: String(unreadMessages) }
      : i,
  );
  const navOverride = await getNavOverride(session.userId, effective);
  const navLayout = mergeNavLayout(effective, navAll, navOverride);

  const schoolDisplayName = branding?.brandName ?? branding?.name;

  return (
    <div className="flex h-screen overflow-hidden bg-surface">
      <SchoolBrandingInjector branding={branding} />
      <Sidebar items={navAll} categories={navLayout.categories} pinnedItems={navLayout.pinned} rootHref="/admin" logoSrc={branding?.logoUrl} logoAlt={schoolDisplayName} />
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
            searchPlaceholder="Suchen — Nutzer, Klassen, Lizenzen, Audit-Logs …"
            unreadCount={unreadCount}
            notifications={notifications}
          />
        </div>
        <main className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-6 pb-28 lg:px-10 lg:py-10 lg:pb-10">
          {children}
        </main>
        <BottomNav items={adminBottomItems} moreItems={navAll} categories={navLayout.categories} pinnedItems={navLayout.pinned} user={displayUser(session)} />
      </div>
    </div>
  );
}
