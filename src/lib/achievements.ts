import { prisma } from "@/lib/db/client";
import { levelFromXp } from "@/lib/xp";

export interface Achievement {
  slug: string;
  title: string;
  description: string;
  icon: string;
  rarity: "common" | "rare" | "epic";
}

export const ACHIEVEMENTS: Achievement[] = [
  { slug: "first_xp",       title: "Erster Schritt",     description: "Erstes XP verdient",               icon: "⭐", rarity: "common" },
  { slug: "streak_3",       title: "3 Tage am Stück",    description: "3 Tage Streak erreicht",           icon: "🔥", rarity: "common" },
  { slug: "streak_7",       title: "Wochenheld",          description: "7 Tage Streak erreicht",           icon: "🔥", rarity: "rare"   },
  { slug: "streak_30",      title: "Monatschampion",      description: "30 Tage Streak erreicht",          icon: "🔥", rarity: "epic"   },
  { slug: "level_5",        title: "Level 5",             description: "Level 5 erreicht",                 icon: "🎯", rarity: "common" },
  { slug: "level_10",       title: "Level 10",            description: "Level 10 erreicht",                icon: "🎯", rarity: "rare"   },
  { slug: "level_25",       title: "Level 25",            description: "Level 25 erreicht",                icon: "🎯", rarity: "epic"   },
  { slug: "assignments_5",  title: "Fleißig",             description: "5 Aufgaben abgegeben",             icon: "📚", rarity: "common" },
  { slug: "assignments_25", title: "Streber",             description: "25 Aufgaben abgegeben",            icon: "📚", rarity: "rare"   },
  { slug: "notes_5",        title: "Wissensteiler",       description: "5 Notizen geteilt",                icon: "📝", rarity: "common" },
  { slug: "flashcards_50",  title: "Karteikarten-Profi",  description: "50 Karteikarten bewertet",         icon: "🃏", rarity: "rare"   },
  { slug: "xp_500",         title: "XP-Sammler",          description: "500 XP gesammelt",                 icon: "⚡", rarity: "common" },
  { slug: "xp_2500",        title: "XP-Veteran",          description: "2500 XP gesammelt",                icon: "⚡", rarity: "rare"   },
];

export async function checkAndAwardAchievements(userId: string): Promise<string[]> {
  const [user, existing, xpLogs] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { xp: true, streak: true },
    }),
    prisma.userAchievement.findMany({
      where: { userId },
      select: { slug: true },
    }),
    prisma.xpLog.groupBy({
      by: ["reason"],
      where: { userId },
      _count: { id: true },
    }),
  ]);

  if (!user) return [];

  const earned = new Set(existing.map((a) => a.slug));
  const newSlugs: string[] = [];

  const reasonCounts = Object.fromEntries(xpLogs.map((l) => [l.reason, l._count.id]));
  const assignmentCount = reasonCounts["aufgabe_abgabe"] ?? 0;
  const noteCount = reasonCounts["note_geteilt"] ?? 0;
  const flashcardCount = reasonCounts["karteikarte_session"] ?? 0;
  const level = levelFromXp(user.xp);

  const checks: { slug: string; condition: boolean }[] = [
    { slug: "first_xp",       condition: user.xp > 0 },
    { slug: "streak_3",       condition: user.streak >= 3 },
    { slug: "streak_7",       condition: user.streak >= 7 },
    { slug: "streak_30",      condition: user.streak >= 30 },
    { slug: "level_5",        condition: level >= 5 },
    { slug: "level_10",       condition: level >= 10 },
    { slug: "level_25",       condition: level >= 25 },
    { slug: "assignments_5",  condition: assignmentCount >= 5 },
    { slug: "assignments_25", condition: assignmentCount >= 25 },
    { slug: "notes_5",        condition: noteCount >= 5 },
    { slug: "flashcards_50",  condition: flashcardCount >= 50 },
    { slug: "xp_500",         condition: user.xp >= 500 },
    { slug: "xp_2500",        condition: user.xp >= 2500 },
  ];

  for (const { slug, condition } of checks) {
    if (condition && !earned.has(slug)) {
      newSlugs.push(slug);
    }
  }

  if (newSlugs.length > 0) {
    await Promise.all(
      newSlugs.map((slug) =>
        prisma.userAchievement.upsert({
          where: { userId_slug: { userId, slug } },
          create: { userId, slug },
          update: {},
        })
      )
    );
  }

  return newSlugs;
}
