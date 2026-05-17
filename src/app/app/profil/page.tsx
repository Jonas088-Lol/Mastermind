import {
  Edit3,
  Flame,
  Lock,
  Mail,
  Settings,
  Sparkles,
  Trophy,
  Zap,
} from "lucide-react";
import { AvatarUploadButton } from "./AvatarUpload";
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
import { levelFromXp, getRankForXp, xpProgressInLevel, xpToNextLevel, formatXp, getTitleBySlug } from "@/lib/game";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Profil" };

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
      prestige: true,
      equippedTitle: true,
      totalDailyLogins: true,
      avatarUrl: true,
      coins: true,
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

  const [submissionCount, , earnedAchievements, activeBoosters] = await Promise.all([
    prisma.submission.count({
      where: { studentId: session.userId, status: { in: ["submitted", "graded"] } },
    }),
    prisma.flashcardDeck.count({ where: { userId: session.userId } }),
    prisma.userAchievement.findMany({
      where: { userId: session.userId },
      orderBy: { unlockedAt: "desc" },
    }),
    prisma.userBooster.findMany({
      where: { userId: session.userId, expiresAt: { gt: new Date() } },
      orderBy: { expiresAt: "asc" },
    }),
  ]);

  const earnedSlugs = new Set(earnedAchievements.map((a) => a.slug));
  const earnedCount = earnedSlugs.size;

  const level = levelFromXp(user.xp);
  const rank = getRankForXp(user.xp);
  const xpPct = xpProgressInLevel(user.xp);
  const xpNeeded = xpToNextLevel(user.xp);
  const equippedTitleDef = user.equippedTitle ? getTitleBySlug(user.equippedTitle) : null;

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
            <Avatar name={user.name} size="lg" src={user.avatarUrl ?? undefined} className="size-20 text-2xl" />
            <AvatarUploadButton />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">
              {user.klasse ? `Klasse ${user.klasse} · ` : ""}{user.school?.name ?? "—"}
            </p>
            <div className="mt-1 flex flex-wrap items-baseline gap-3">
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{user.name}</h1>
              {equippedTitleDef && (
                <span className="text-base font-bold" style={{ color: equippedTitleDef.color }}>
                  [{equippedTitleDef.name}]
                </span>
              )}
            </div>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-fg">
              <span className="flex items-center gap-1">
                <span>{rank.icon}</span>
                <span className="font-semibold" style={{ color: rank.color }}>{rank.nameDE}</span>
              </span>
              <span>·</span>
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
        <Stat label="Level" value={String(level)} suffix={rank.nameDE} icon={Zap} tone="text-brand" />
        <Stat label="Streak" value={user.streak > 0 ? String(user.streak) : "0"} suffix="Tage" icon={Flame} tone="text-warning" />
        <Stat label="Abgaben" value={String(submissionCount)} suffix="abgegeben" icon={Trophy} tone="text-success" />
        <Stat label="Achievements" value={String(earnedCount)} suffix={`/ ${ACHIEVEMENTS.length}`} icon={Sparkles} tone="text-info" />
      </section>

      <section className="border bg-gradient-to-r from-brand/[0.08] to-transparent p-5" style={{ borderColor: `${rank.color}40` }}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xl">{rank.icon}</span>
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: rank.color }}>
              {rank.nameDE} · Level {level}
            </p>
          </div>
          <p className="font-mono text-sm text-muted-fg">
            {formatXp(user.xp)} XP gesamt
          </p>
        </div>
        <div className="mt-4 flex items-baseline justify-between">
          <p className="text-base font-semibold">Level {level} → {level + 1}</p>
          <p className="font-mono text-sm">
            <span className="font-bold">{xpPct}%</span>
            <span className="text-muted-fg"> · {formatXp(xpNeeded)} XP fehlen</span>
          </p>
        </div>
        <Progress value={xpPct} tone="brand" className="mt-3" />
        <p className="mt-2 flex items-center gap-3 text-xs text-muted-fg">
          <Link href="/app/profil/xp" className="text-brand hover:underline">XP-Verlauf</Link>
          <span>·</span>
          <Link href="/app/ranking" className="text-brand hover:underline">Ranking</Link>
          <span>·</span>
          <Link href="/app/titel" className="text-brand hover:underline">
            {equippedTitleDef ? `Titel: ${equippedTitleDef.name}` : "Titel ausrüsten"}
          </Link>
        </p>
      </section>

      <div className="grid gap-6 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Münzen</CardTitle>
            <Link href="/app/coins" className={buttonVariants({ variant: "ghost", size: "sm" })}>
              Aufladen
            </Link>
          </CardHeader>
          <CardBody>
            <p className="font-mono text-4xl font-bold">🪙 {user.coins}</p>
            <div className="mt-3 flex gap-2">
              <Link href="/app/shop" className={buttonVariants({ variant: "outline", size: "sm" })}>Shop</Link>
              <Link href="/app/inventar" className={buttonVariants({ variant: "outline", size: "sm" })}>Inventar</Link>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Aktive Booster</CardTitle>
          </CardHeader>
          <CardBody className="!px-0 !pb-0">
            {activeBoosters.length === 0 ? (
              <div className="px-5 py-4">
                <p className="text-sm text-muted-fg">Kein aktiver Booster.</p>
                <Link href="/app/shop" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-3")}>
                  Im Shop stöbern
                </Link>
              </div>
            ) : (
              <ul className="divide-y divide-border border-t border-border">
                {activeBoosters.map((b) => (
                  <li key={b.id} className="px-5 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold capitalize">
                        {b.boosterSlug.replace(/_/g, " ")}
                      </p>
                      <span className="font-mono text-xs font-bold text-brand">×{b.multiplier}</span>
                    </div>
                    <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-fg">
                      bis {b.expiresAt.toLocaleDateString("de-DE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>

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
