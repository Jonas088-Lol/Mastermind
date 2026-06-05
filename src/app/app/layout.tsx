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
import { prisma } from "@/lib/db/client";
import { InstallPrompt } from "@/components/app/InstallPrompt";
import { AppShell } from "@/components/app/AppShell";

const bottomItems: NavItem[] = [
  { href: "/app/profil", label: "Profil", icon: "userCircle" },
  { href: "/app/einstellungen", label: "Einstellungen", icon: "settings" },
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

  const [{ notifications, unreadCount }, dueFlashcards, pendingAssignments, userData, unreadThreads] = await Promise.all([
    fetchNotifications(session.userId),
    prisma.flashcard.count({
      where: { deck: { userId: session.userId }, nextReviewAt: { lte: new Date() } },
    }),
    prisma.submission.count({
      where: {
        studentId: session.userId,
        status: "open",
        assignment: { dueAt: { gte: new Date() } },
      },
    }),
    prisma.user.findUnique({ where: { id: session.userId }, select: { coins: true } }),
    prisma.messageParticipant.count({
      where: {
        userId: session.userId,
        thread: {
          messages: {
            some: {
              senderId: { not: session.userId },
              sentAt: { gt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
            },
          },
        },
        OR: [
          { lastReadAt: null },
          { thread: { updatedAt: { gt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } },
        ],
      },
    }).catch(() => 0),
  ]);

  const navItems: NavItem[] = [
    // ── Lernen (Kern) ──────────────────────────────────
    { href: "/app",                label: "Dashboard",     icon: "home",         exact: true },
    { href: "/app/heft",           label: "Hefte",         icon: "pencilLine"    },
    { href: "/app/vokabeln",       label: "Vokabeln",      icon: "languages"     },
    { href: "/app/uebungen",       label: "Übungen",       icon: "brain"         },
    { href: "/app/karteikarten",   label: "Karteikarten",  icon: "layers",       badge: dueFlashcards > 0 ? String(dueFlashcards) : undefined },
    { href: "/app/lernen",         label: "Lernpfade",     icon: "bookOpen"      },
    { href: "/app/tutor",          label: "KI-Tutor",      icon: "sparkles"      },
    // ── Schule ────────────────────────────────────────
    { href: "/app/aufgaben",       label: "Aufgaben",      icon: "checkSquare",  badge: pendingAssignments > 0 ? String(pendingAssignments) : undefined },
    { href: "/app/arbeitsblatter", label: "Arbeitsblätter",icon: "fileText"      },
    { href: "/app/noten",          label: "Noten",         icon: "award"         },
    { href: "/app/plan",           label: "Stundenplan",   icon: "calendar"      },
    { href: "/app/fehlzeiten",     label: "Fehlzeiten",    icon: "calendarX"     },
    { href: "/app/nachrichten",    label: "Nachrichten",   icon: "messageSquare", badge: unreadThreads > 0 ? String(unreadThreads) : undefined },
    // ── Gamification ─────────────────────────────────
    { href: "/app/ranking",        label: "Ranking",       icon: "trophy"        },
    { href: "/app/quests",         label: "Quests",        icon: "zap"           },
    { href: "/app/duelle",         label: "Duelle",        icon: "swords"        },
    { href: "/app/boss",           label: "Boss-Battle",   icon: "swords"        },
    { href: "/app/streaks",        label: "Streaks",       icon: "flame"         },
    { href: "/app/erfolge",        label: "Erfolge",       icon: "star"          },
    { href: "/app/saison",         label: "Saison",        icon: "gift"          },
    { href: "/app/skills",         label: "Skill-Bäume",   icon: "target"        },
    // ── Community & Social ────────────────────────────
    { href: "/app/community",      label: "Community",     icon: "users"         },
    { href: "/app/mannschaften",   label: "Mannschaften",  icon: "shield"        },
    // ── Shop ─────────────────────────────────────────
    { href: "/app/shop",           label: "Shop",          icon: "shoppingBag"   },
    { href: "/app/inventar",       label: "Inventar",      icon: "package"       },
    { href: "/app/coins",          label: "Münzen",        icon: "coins"         },
    { href: "/app/tagesbelohnung", label: "Tagesbonus",    icon: "sun"           },
    { href: "/app/titel",          label: "Titel",         icon: "tag"           },
    // ── Sonstiges ────────────────────────────────────
    { href: "/search",             label: "Suche",         icon: "search"        },
  ];

  const mobileNavItems: BottomNavItem[] = [
    { href: "/app", label: "Start", icon: "home", exact: true },
    { href: "/app/uebungen", label: "Übungen", icon: "brain" },
    { href: "/app/aufgaben", label: "Aufgaben", icon: "checkSquare", badge: pendingAssignments > 0 ? String(pendingAssignments) : undefined },
    { href: "/app/karteikarten", label: "Karten", icon: "layers", badge: dueFlashcards > 0 ? String(dueFlashcards) : undefined },
    { href: "/app/tutor", label: "Tutor", icon: "sparkles" },
  ];

  return (
    <div className="flex min-h-screen bg-surface">
      <Sidebar items={navItems} bottomItems={bottomItems} rootHref="/app" />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="sticky top-0 z-30">
          {isSuper(session) && (
            <ImpersonationBar
              effective={effective}
              isImpersonating={isImpersonating(session)}
            />
          )}
          <AppHeader user={displayUser(session)} unreadCount={unreadCount} notifications={notifications} coinBalance={userData?.coins ?? 0} />
        </div>
        <main className="flex-1 px-6 py-8 pb-24 lg:px-10 lg:py-10 lg:pb-10">
          {children}
        </main>
        <BottomNav items={mobileNavItems} />
        <InstallPrompt />
        <AppShell />
      </div>
    </div>
  );
}
