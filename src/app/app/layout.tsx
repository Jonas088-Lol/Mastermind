import { redirect } from "next/navigation";
import { Sidebar, type NavItem } from "@/components/app/Sidebar";
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
import { getStudentFeatures } from "@/lib/student-features";
import { fetchNotifications } from "@/lib/notifications";
import { prisma } from "@/lib/db/client";
import { InstallPrompt } from "@/components/app/InstallPrompt";
import { AppShell } from "@/components/app/AppShell";
import { MasterSpaceModal } from "@/components/masterspace/MasterSpaceModal";
import { ConsentBanner } from "@/components/app/ConsentBanner";
import { ActivityTracker } from "@/components/app/ActivityTracker";
import { BossBar } from "@/components/app/BossBar";
import { getActiveEvents } from "@/lib/settings";

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

  const isPrivate = !session.schoolId;

  const [{ notifications, unreadCount }, dueFlashcards, pendingAssignments, userData, unreadThreads, branding, userConsent, events] = await Promise.all([
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
    prisma.user.findUnique({ where: { id: session.userId }, select: { coins: true, premiumCoins: true, avatarUrl: true } }),
    prisma.messageParticipant.findMany({
      where: { userId: session.userId },
      select: { lastReadAt: true, thread: { select: { messages: { orderBy: { sentAt: "desc" }, take: 1, select: { sentAt: true, senderId: true } } } } },
    }).then((ps) => ps.filter((p) => {
      const last = p.thread.messages[0];
      return last && last.senderId !== session.userId && (!p.lastReadAt || p.lastReadAt < last.sentAt);
    }).length).catch(() => 0),
    getSchoolBranding(session),
    prisma.userConsent.findUnique({ where: { userId: session.userId }, select: { activityTracking: true } }),
    getActiveEvents(),
  ]);

  const navItems: NavItem[] = isPrivate ? [
    { href: "/app",               label: "Dashboard",    icon: "home",         exact: true },
    { href: "/app/heft",          label: "Hefte",        icon: "pencilLine"    },
    { href: "/app/dokumente",     label: "Dokumente",    icon: "fileText"      },
    { href: "/app/tabellen",      label: "Tabellen",     icon: "grid"          },
    { href: "/app/praesentationen", label: "Präsentationen", icon: "monitor"   },
    { href: "/app/vokabeln",      label: "Vokabeln",     icon: "languages"     },
    { href: "/app/uebungen",      label: "Übungen",      icon: "brain"         },
    { href: "/app/karteikarten",  label: "Karteikarten", icon: "layers",       badge: dueFlashcards > 0 ? String(dueFlashcards) : undefined },
    { href: "/app/lernen",        label: "Lernpfade",    icon: "bookOpen"      },
    { href: "/app/tutor",         label: "KI-Tutor",     icon: "sparkles"      },
    { href: "/app/noten",         label: "Meine Noten",  icon: "award"         },
    { href: "/app/community",     label: "Community",    icon: "users"         },
    { href: "/app/rangliste",      label: "Rangliste",    icon: "trendingUp"    },
    { href: "/app/ranking",       label: "Schul-Ranking",icon: "trophy"        },
    { href: "/app/duelle",        label: "Duelle",       icon: "swords"        },
    { href: "/app/boss",          label: "Boss-Battle",  icon: "swords", exact: true },
    { href: "/app/boss/kompendium",label: "Kompendium",  icon: "bookMarked"    },
    { href: "/app/streaks",       label: "Streaks",      icon: "flame"         },
    { href: "/app/erfolge",       label: "Erfolge",      icon: "star"          },
    { href: "/app/quests",        label: "Quests",       icon: "zap"           },
    { href: "/app/shop",          label: "Shop",         icon: "shoppingBag"   },
    { href: "/app/inventar",      label: "Inventar",     icon: "package"       },
    { href: "/app/coins",         label: "Münzen",       icon: "coins"         },
    { href: "/search",            label: "Suche",        icon: "search"        },
  ] : [
    // ── Lernen (Kern) ──────────────────────────────────
    { href: "/app",                label: "Dashboard",     icon: "home",         exact: true },
    { href: "/app/heft",           label: "Hefte",         icon: "pencilLine"    },
    { href: "/app/dokumente",      label: "Dokumente",     icon: "fileText"      },
    { href: "/app/tabellen",       label: "Tabellen",      icon: "grid"          },
    { href: "/app/praesentationen", label: "Präsentationen", icon: "monitor"    },
    { href: "/app/vokabeln",       label: "Vokabeln",      icon: "languages"     },
    { href: "/app/uebungen",       label: "Übungen",       icon: "brain"         },
    { href: "/app/karteikarten",   label: "Karteikarten",  icon: "layers",       badge: dueFlashcards > 0 ? String(dueFlashcards) : undefined },
    { href: "/app/lernen",         label: "Lernpfade",     icon: "bookOpen"      },
    { href: "/app/tutor",          label: "KI-Tutor",      icon: "sparkles"      },
    // ── Schule ────────────────────────────────────────
    { href: "/app/aufgaben",       label: "Aufgaben",      icon: "checkSquare",  badge: pendingAssignments > 0 ? String(pendingAssignments) : undefined },
    { href: "/app/mastertask",     label: "MasterTask",    icon: "clipboardList" },
    { href: "/app/hausaufgaben",   label: "Hausaufgaben",  icon: "bookOpen"      },
    { href: "/app/arbeitsblatter", label: "Arbeitsblätter",icon: "fileText"      },
    { href: "/app/noten",          label: "Noten",         icon: "award"         },
    { href: "/app/plan",           label: "Stundenplan",   icon: "calendar"      },
    { href: "/app/fehlzeiten",     label: "Fehlzeiten",    icon: "calendarX"     },
    { href: "/app/nachrichten",    label: "Nachrichten",   icon: "messageSquare", badge: unreadThreads > 0 ? String(unreadThreads) : undefined },
    { href: "/app/drive",          label: "Drive",          icon: "hardDrive"     },
    { href: "/app/lernzettel",     label: "Lernzettel",     icon: "bookOpen"      },
    { href: "/app/masterspace",    label: "MasterSpace",   icon: "compass",  modal: "masterspace" },
    // ── Gamification ─────────────────────────────────
    { href: "/app/rangliste",        label: "Rangliste",      icon: "trendingUp"    },
    { href: "/app/ranking",         label: "Schul-Ranking",  icon: "trophy"        },
    { href: "/app/quests",          label: "Quests",         icon: "zap"           },
    { href: "/app/duelle",          label: "Duelle",         icon: "swords"        },
    { href: "/app/boss",            label: "Boss-Battle",    icon: "swords", exact: true },
    { href: "/app/boss/kompendium", label: "Boss-Kompendium",icon: "bookMarked"    },
    { href: "/app/boss/bestiary",   label: "Bestiary",       icon: "barChart3"     },
    { href: "/app/hall-of-fame",    label: "Hall of Fame",   icon: "trophy"        },
    { href: "/app/streaks",        label: "Streaks",       icon: "flame"         },
    { href: "/app/erfolge",        label: "Erfolge",       icon: "star"          },
    { href: "/app/saison",         label: "Saison",        icon: "gift"          },
    { href: "/app/skills",         label: "Skill-Tree",    icon: "target"        },
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

  // Schülerzeitung ist für alle lesbar; Sprecher-Bereich nur mit Zusatzrolle
  const studentFeatures = await getStudentFeatures(session.userId);
  navItems.push({ href: "/app/zeitung", label: "Schülerzeitung", icon: "fileText" });
  if (studentFeatures.includes("klassensprecher") || studentFeatures.includes("schuelersprecher")) {
    navItems.push({ href: "/app/sprecher", label: "Sprecher", icon: "messageSquare" });
  }

  const mobileNavItems: BottomNavItem[] = [
    { href: "/app", label: "Start", icon: "home", exact: true },
    { href: "/app/uebungen", label: "Übungen", icon: "brain" },
    { href: "/app/masterspace", label: "Space", icon: "compass", modal: "masterspace" },
    { href: "/app/aufgaben", label: "Aufgaben", icon: "checkSquare", badge: pendingAssignments > 0 ? String(pendingAssignments) : undefined },
    { href: "/app/tutor", label: "Tutor", icon: "sparkles" },
  ];

  const appName = isPrivate ? "MasterMind" : undefined;
  const schoolDisplayName = branding?.brandName ?? branding?.name;

  return (
    <div className="flex h-screen overflow-hidden bg-surface">
      <SchoolBrandingInjector branding={branding} />
      <Sidebar items={navItems} bottomItems={bottomItems} rootHref="/app" logoSrc={branding?.logoUrl} logoAlt={schoolDisplayName} />
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header — always visible, never scrolls away */}
        <div className="shrink-0 z-30">
          {isSuper(session) && (
            <ImpersonationBar
              effective={effective}
              isImpersonating={isImpersonating(session)}
            />
          )}
          <AppHeader
            user={{ ...displayUser(session), avatarUrl: userData?.avatarUrl }}
            unreadCount={unreadCount}
            notifications={notifications}
            coinBalance={userData?.coins ?? 0}
            premiumCoinBalance={userData?.premiumCoins ?? 0}
            appName={appName}
            doubleXp={events.doubleXp}
            doubleCoins={events.doubleCoins}
            eventBanner={events.banner}
          />
        </div>
        {/* Boss bar — shows when a boss is active */}
        <BossBar />
        {/* Only this area scrolls */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden min-w-0 px-4 py-6 lg:px-10 lg:py-10">
          {children}
        </main>
        {/* BottomNav — always visible, never scrolls away */}
        <BottomNav items={mobileNavItems} moreItems={[...navItems, ...bottomItems]} user={{ ...displayUser(session), avatarUrl: userData?.avatarUrl }} />
        <InstallPrompt />
        <AppShell />
        <MasterSpaceModal />
        <ConsentBanner />
        <ActivityTracker hasConsent={userConsent?.activityTracking ?? false} />
      </div>
    </div>
  );
}
