import {
  Camera,
  Edit3,
  Flame,
  Lock,
  Mail,
  Settings,
  Sparkles,
  Trophy,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ACHIEVEMENTS } from "@/lib/achievements";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { levelFromXp } from "@/lib/xp";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Profil" };

const LEVEL_NAMES = [
  "Einsteiger",
  "Lernling",
  "Entdecker",
  "Aufsteiger",
  "Kämpfer",
  "Streber",
  "Profi",
  "Experte",
  "Meister",
  "Legende",
];

const RARITY_LABELS: Record<string, string> = {
  rare: "Selten",
  epic: "Episch",
};

export default async function ProfilPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "student") redirect("/");

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      name: true,
      email: true,
      klasse: true,
      classId: true,
      createdAt: true,
      xp: true,
      streak: true,
      school: { select: { name: true } },
      studentSubmissions: {
        select: {
          id: true,
          submittedAt: true,
          assignment: { select: { subject: { select: { name: true } } } },
        },
        orderBy: { submittedAt: "desc" },
        take: 5,
      },
    },
  });

  if (!user) redirect("/login");

  const [submissionCount, , earnedAchievements] = await Promise.all([
    prisma.submission.count({
      where: { studentId: session.userId, status: { in: ["submitted", "graded"] } },
    }),
    prisma.flashcardDeck.count({ where: { userId: session.userId } }),
    prisma.userAchievement.findMany({
      where: { userId: session.userId },
      orderBy: { unlockedAt: "desc" },
    }),
  ]);

  const earnedSlugs = new Set(earnedAchievements.map((a) => a.slug));
  const earnedCount = earnedSlugs.size;

  const level = levelFromXp(user.xp);
  const xpInLevel = user.xp % 100;
  const levelName = LEVEL_NAMES[(level - 1) % LEVEL_NAMES.length];
  const nextLevelName = LEVEL_NAMES[level % LEVEL_NAMES.length];

  const joinedDate = user.createdAt.toLocaleDateString("de-DE", { month: "long", year: "numeric" });

  const recentActivity = user.studentSubmissions.map((s) => ({
    date: s.submittedAt?.toLocaleDateString("de-DE", { day: "numeric", month: "short" }) ?? "—",
    text: `${s.assignment.subject.name} — Aufgabe abgegeben`,
  }));

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8">
      <header className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-end gap-5">
          <div className="relative">
            <Avatar name={user.name} size="lg" className="size-20 text-2xl" />
            <button
              type="button"
              aria-label="Avatar ändern"
              className="absolute -bottom-1 -right-1 grid size-7 place-items-center bg-fg text-bg transition-transform hover:scale-110"
            >
              <Camera className="size-3.5" />
            </button>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">
              {user.klasse ? `Klasse ${user.klasse} · ` : ""}{user.school?.name ?? "—"}
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">{user.name}</h1>
            <p className="mt-1 flex items-center gap-3 text-sm text-muted-fg">
              <span className="flex items-center gap-1.5">
                <Mail className="size-3.5" />
                {user.email}
              </span>
              <span>·</span>
              <span>seit {joinedDate}</span>
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href="/app/einstellungen" className={buttonVariants({ variant: "outline", size: "sm" })}>
            <Edit3 className="size-3.5" />
            Profil bearbeiten
          </Link>
          <Link href="/app/einstellungen" className={buttonVariants({ variant: "ghost", size: "sm" })}>
            <Settings className="size-3.5" />
            Einstellungen
          </Link>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-px border border-border bg-border lg:grid-cols-4">
        <Stat label="Level" value={String(level)} suffix={levelName} icon={Zap} tone="text-brand" />
        <Stat label="Streak" value={user.streak > 0 ? String(user.streak) : "0"} suffix="Tage" icon={Flame} tone="text-warning" />
        <Stat label="Abgaben" value={String(submissionCount)} suffix="abgegeben" icon={Trophy} tone="text-success" />
        <Stat label="Achievements" value={String(earnedCount)} suffix={`/ ${ACHIEVEMENTS.length}`} icon={Sparkles} tone="text-info" />
      </section>

      <section className="border border-brand/40 bg-gradient-to-r from-brand/[0.08] to-transparent p-5">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-brand" strokeWidth={1.75} />
          <p className="text-xs font-semibold uppercase tracking-wider text-brand">
            Level {level} → {level + 1}
          </p>
        </div>
        <div className="mt-4 flex items-baseline justify-between">
          <p className="text-base font-semibold">{levelName} → {nextLevelName}</p>
          <p className="font-mono text-sm">
            <span className="font-bold">{xpInLevel}</span>
            <span className="text-muted-fg"> / 100 XP</span>
          </p>
        </div>
        <Progress value={xpInLevel} tone="brand" className="mt-3" />
        <p className="mt-2 text-xs text-muted-fg">
          {100 - xpInLevel} XP bis Level {level + 1} · {user.xp.toLocaleString("de-DE")} XP gesamt
        </p>
      </section>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Achievements</CardTitle>
                <p className="mt-1 text-sm text-muted-fg">
                  {earnedCount} von {ACHIEVEMENTS.length} freigeschaltet
                </p>
              </div>
              {earnedCount > 0 && (
                <Badge variant="success">{earnedCount} verdient</Badge>
              )}
            </CardHeader>
            <CardBody className="!p-0">
              <div className="grid gap-px border-t border-border bg-border md:grid-cols-2">
                {ACHIEVEMENTS.map((a) => {
                  const earned = earnedSlugs.has(a.slug);
                  return (
                    <div
                      key={a.slug}
                      className={cn(
                        "flex gap-3 bg-bg p-4 transition-opacity",
                        !earned && "opacity-40",
                        earned && a.rarity === "epic" && "bg-gradient-to-br from-brand/[0.06] to-transparent",
                      )}
                    >
                      <div className={cn(
                        "grid size-10 shrink-0 place-items-center bg-surface text-xl",
                        !earned && "grayscale",
                      )}>
                        {earned ? a.icon : <Lock className="size-4 text-muted-fg" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold">{a.title}</p>
                          {earned && a.rarity !== "common" && (
                            <Badge variant={a.rarity === "epic" ? "brand" : "info"}>
                              {RARITY_LABELS[a.rarity]}
                            </Badge>
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-muted-fg">{a.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardBody>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Letzte Aktivität</CardTitle>
          </CardHeader>
          <CardBody className="!px-0 !pb-0">
            {recentActivity.length === 0 ? (
              <p className="px-5 py-4 text-sm text-muted-fg">Noch keine Aktivität.</p>
            ) : (
              <ol className="divide-y divide-border border-t border-border">
                {recentActivity.map((item, i) => (
                  <li key={i} className="px-5 py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-fg">{item.date}</p>
                    <p className="mt-1 text-sm">{item.text}</p>
                  </li>
                ))}
              </ol>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  suffix,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  suffix: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  tone: string;
}) {
  return (
    <div className="bg-bg p-5">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-fg">{label}</p>
        <Icon className={cn("size-4", tone)} strokeWidth={1.75} />
      </div>
      <p className="mt-3 font-mono text-3xl font-bold tracking-tight">{value}</p>
      <p className="mt-1 text-xs text-muted-fg">{suffix}</p>
    </div>
  );
}
