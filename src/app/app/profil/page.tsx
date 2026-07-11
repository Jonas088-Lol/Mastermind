import {
  CalendarDays,
  Edit3,
  Flame,
  Layers,
  Lock,
  Mail,
  Medal,
  Settings,
  Skull,
  Sparkles,
  Swords,
  Target,
  Trophy,
  Zap,
  Quote,
  BookOpen,
} from "lucide-react";
import { CoinIcon } from "@/components/ui/CoinIcon";
import { AvatarUploadButton } from "./AvatarUpload";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { Avatar } from "@/components/ui/avatar";
import { updateBio } from "./actions";
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
      bio: true,
      quote: true,
      favoriteSubject: true,
      school: { select: { name: true } },
      seasonRankingEntries: {
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { season: { select: { name: true, number: true, startAt: true, endAt: true } } },
      },
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

  const [submissionCount, , earnedAchievements, activeBoosters, gradesBySubject, exerciseProgress, vocabStats, xpLogs] = await Promise.all([
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
    // Grade averages per subject
    prisma.grade.findMany({
      where: { studentId: session.userId },
      select: { value: true, subject: { select: { name: true, color: true } } },
    }),
    // Exercise completion by subject
    prisma.exerciseProgress.findMany({
      where: { userId: session.userId, completedAt: { not: null } },
      include: { topic: { select: { subject: true, title: true } } },
    }),
    // Vocab stats
    prisma.vocabList.findMany({
      where: { userId: session.userId },
      include: { entries: { select: { repetitions: true } } },
    }),
    // XP logs last 30 days for activity heatmap
    prisma.xpLog.findMany({
      where: {
        userId: session.userId,
        createdAt: { gte: new Date(Date.now() - 30 * 86400_000) },
      },
      select: { createdAt: true, amount: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  // ── "Meine Statistik": server-aggregierte Kennzahlen ──
  const [
    classHigherCount,
    classTotalCount,
    subjectAnswers,
    totalAnswerCount,
    correctAnswerCount,
    flashcardSessionCount,
    duelsCompleted,
    duelsWon,
    bossDamageAgg,
  ] = await Promise.all([
    user.classId
      ? prisma.user.count({ where: { classId: user.classId, role: "student", xp: { gt: user.xp } } })
      : Promise.resolve(0),
    user.classId
      ? prisma.user.count({ where: { classId: user.classId, role: "student" } })
      : Promise.resolve(0),
    prisma.exerciseAnswer.findMany({
      where: { userId: session.userId },
      select: { question: { select: { topic: { select: { subject: true } } } } },
    }),
    prisma.exerciseAnswer.count({ where: { userId: session.userId } }),
    prisma.exerciseAnswer.count({ where: { userId: session.userId, correct: true } }),
    prisma.xpLog.count({ where: { userId: session.userId, reason: "karteikarte_session" } }),
    prisma.duel.count({
      where: {
        status: "completed",
        OR: [{ challengerId: session.userId }, { challengedId: session.userId }],
      },
    }),
    prisma.duel.count({ where: { status: "completed", winnerId: session.userId } }),
    prisma.bossParticipant.aggregate({
      where: { userId: session.userId },
      _sum: { damage: true },
    }),
  ]);

  const classRank = user.classId && classTotalCount > 0 ? classHigherCount + 1 : null;

  const subjectAnswerCounts: Record<string, number> = {};
  for (const a of subjectAnswers) {
    const subj = a.question.topic.subject;
    subjectAnswerCounts[subj] = (subjectAnswerCounts[subj] ?? 0) + 1;
  }
  const favoriteSubjectEntry = Object.entries(subjectAnswerCounts).sort(([, a], [, b]) => b - a)[0] ?? null;
  const favoriteSubjectLabel = favoriteSubjectEntry
    ? favoriteSubjectEntry[0].charAt(0).toUpperCase() + favoriteSubjectEntry[0].slice(1)
    : null;

  const answerQuote = totalAnswerCount > 0 ? Math.round((correctAnswerCount / totalAnswerCount) * 100) : null;
  const duelsLost = duelsCompleted - duelsWon;
  const totalBossDamage = bossDamageAgg._sum.damage ?? 0;

  const earnedSlugs = new Set(earnedAchievements.map((a) => a.slug));

  // Build subject grade map
  const subjectGradeMap: Record<string, { name: string; color: string; values: number[] }> = {};
  for (const g of gradesBySubject) {
    const key = g.subject.name;
    if (!subjectGradeMap[key]) subjectGradeMap[key] = { name: g.subject.name, color: g.subject.color, values: [] };
    subjectGradeMap[key].values.push(g.value);
  }
  const subjectStats = Object.values(subjectGradeMap).map((s) => ({
    ...s,
    avg: s.values.reduce((a, b) => a + b, 0) / s.values.length,
    count: s.values.length,
  })).sort((a, b) => a.avg - b.avg);

  // Exercise progress by subject
  const exerciseBySubject: Record<string, number> = {};
  for (const ep of exerciseProgress) {
    const subj = ep.topic.subject;
    exerciseBySubject[subj] = (exerciseBySubject[subj] ?? 0) + 1;
  }

  // Vocab stats
  const totalVocab = vocabStats.reduce((s, l) => s + l.entries.length, 0);
  const masteredVocab = vocabStats.reduce((s, l) => s + l.entries.filter(e => e.repetitions >= 3).length, 0);

  // Activity heatmap: XP per day last 30 days
  const activityMap: Record<string, number> = {};
  for (const log of xpLogs) {
    const day = log.createdAt.toISOString().slice(0, 10);
    activityMap[day] = (activityMap[day] ?? 0) + log.amount;
  }
  const last30Days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(Date.now() - (29 - i) * 86400_000);
    const key = d.toISOString().slice(0, 10);
    return { key, xp: activityMap[key] ?? 0, label: d.toLocaleDateString("de-DE", { day: "numeric", month: "short" }) };
  });
  const maxXpDay = Math.max(...last30Days.map(d => d.xp), 1);
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

      {/* Bio + Season Badges */}
      {(user.bio || user.quote || user.favoriteSubject || user.seasonRankingEntries.length > 0) && (
        <section className="rounded-2xl border border-border bg-surface p-5 space-y-4">
          {user.quote && (
            <div className="flex gap-3">
              <Quote className="mt-0.5 size-4 shrink-0 text-muted-fg" />
              <p className="text-sm italic text-muted-fg">"{user.quote}"</p>
            </div>
          )}
          {user.bio && <p className="text-sm leading-relaxed">{user.bio}</p>}
          {user.favoriteSubject && (
            <div className="flex items-center gap-2 text-sm text-muted-fg">
              <BookOpen className="size-4" />
              Lieblingsfach: <span className="font-semibold text-fg">{user.favoriteSubject}</span>
            </div>
          )}
          {user.seasonRankingEntries.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {user.seasonRankingEntries.map((e) => {
                const medal = e.rank === 1 ? "🥇" : e.rank === 2 ? "🥈" : e.rank === 3 ? "🥉" : null;
                if (!medal) return null;
                const cat = { xp: "XP", coins: "Münzen", boss: "Boss-DMG", mvp: "MVP", streak: "Streak", lernzeit: "Lernzeit" }[e.category] ?? e.category;
                return (
                  <span key={e.id} className="flex items-center gap-1.5 rounded-full border border-warning/30 bg-warning/8 px-2.5 py-1 text-xs font-semibold text-warning">
                    {medal} Platz {e.rank} · {cat} · {e.season.name}
                  </span>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* Bio Edit Form */}
      <details className="group rounded-2xl border border-border">
        <summary className="flex cursor-pointer items-center gap-2 px-5 py-3 text-sm font-semibold text-muted-fg hover:text-fg list-none">
          <Edit3 className="size-4" />
          Bio & Profil bearbeiten
        </summary>
        <form action={updateBio} className="border-t border-border px-5 py-4 space-y-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-fg">Über mich (max. 300 Zeichen)</label>
            <textarea name="bio" defaultValue={user.bio ?? ""} maxLength={300} rows={3}
              className="w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm resize-none outline-none focus:border-brand" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-fg">Lieblingsquote (max. 150 Zeichen)</label>
            <input name="quote" type="text" defaultValue={user.quote ?? ""} maxLength={150}
              className="w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-brand" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-fg">Lieblingsfach</label>
            <input name="favoriteSubject" type="text" defaultValue={user.favoriteSubject ?? ""} maxLength={50}
              placeholder="z.B. Mathematik"
              className="w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-brand" />
          </div>
          <button type="submit" className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand/90">
            Speichern
          </button>
        </form>
      </details>

      <section className="grid grid-cols-2 gap-px border border-border bg-border lg:grid-cols-4">
        <Stat label="Level" value={String(level)} suffix={rank.nameDE} icon={Zap} tone="text-brand" />
        <Stat label="Streak" value={user.streak > 0 ? String(user.streak) : "0"} suffix="Tage" icon={Flame} tone="text-warning" />
        <Stat label="Abgaben" value={String(submissionCount)} suffix="abgegeben" icon={Trophy} tone="text-success" />
        <Stat label="Achievements" value={String(earnedCount)} suffix={`/ ${ACHIEVEMENTS.length}`} icon={Sparkles} tone="text-info" />
      </section>

      <section className="rounded-2xl border bg-gradient-to-r from-brand/8 to-transparent p-5" style={{ borderColor: `${rank.color}40` }}>
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

      {/* ── Meine Statistik ─────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold tracking-tight">Meine Statistik</h2>
        <div className="grid grid-cols-2 gap-px border border-border bg-border lg:grid-cols-4">
          <Stat
            label="Mitglied seit"
            value={user.createdAt.toLocaleDateString("de-DE", { month: "short", year: "numeric" })}
            suffix={user.createdAt.toLocaleDateString("de-DE", { day: "numeric", month: "long", year: "numeric" })}
            icon={CalendarDays}
            tone="text-muted-fg"
          />
          <Stat
            label="Gesamt-XP"
            value={formatXp(user.xp)}
            suffix={`Level ${level}`}
            icon={Zap}
            tone="text-brand"
          />
          <Stat
            label="Klassen-Rang"
            value={classRank ? `#${classRank}` : "—"}
            suffix={classRank ? `von ${classTotalCount} in der Klasse` : "Keine Klasse zugeordnet"}
            icon={Medal}
            tone="text-warning"
          />
          <Stat
            label="Lieblingsfach"
            value={favoriteSubjectLabel ?? "—"}
            suffix={favoriteSubjectEntry ? `${favoriteSubjectEntry[1]} Antworten` : "Noch keine Übungen"}
            icon={BookOpen}
            tone="text-info"
          />
          <Stat
            label="Übungs-Quote"
            value={answerQuote !== null ? `${answerQuote}%` : "—"}
            suffix={totalAnswerCount > 0 ? `${correctAnswerCount} von ${totalAnswerCount} richtig` : "Noch keine Antworten"}
            icon={Target}
            tone="text-success"
          />
          <Stat
            label="Karteikarten"
            value={String(flashcardSessionCount)}
            suffix="Lern-Sessions"
            icon={Layers}
            tone="text-brand"
          />
          <Stat
            label="Duell-Bilanz"
            value={`${duelsWon} : ${duelsLost}`}
            suffix={duelsCompleted > 0 ? `${duelsCompleted} Duelle gespielt` : "Noch keine Duelle"}
            icon={Swords}
            tone="text-warning"
          />
          <Stat
            label="Boss-Treffer"
            value={totalBossDamage.toLocaleString("de-DE")}
            suffix="Schaden gesamt"
            icon={Skull}
            tone="text-danger"
          />
        </div>
      </section>

      {/* ── Lernstatistiken ─────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Notenübersicht nach Fach */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Noten nach Fach</CardTitle>
            <Link href="/app/noten" className="text-xs text-muted-fg hover:text-brand">Alle Noten →</Link>
          </CardHeader>
          <CardBody>
            {subjectStats.length === 0 ? (
              <p className="text-sm text-muted-fg">Noch keine Noten vorhanden.</p>
            ) : (
              <div className="space-y-3">
                {subjectStats.map((s) => {
                  const barPct = Math.max(0, Math.min(100, ((6 - s.avg) / 5) * 100));
                  const tone = s.avg <= 2 ? "#10b981" : s.avg <= 3.5 ? "#f59e0b" : "#ef4444";
                  return (
                    <div key={s.name} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium">{s.name}</span>
                        <span className="font-mono font-bold" style={{ color: tone }}>
                          Ø {s.avg.toFixed(1)} <span className="text-muted-fg font-normal">({s.count}×)</span>
                        </span>
                      </div>
                      <div className="h-2 w-full bg-border">
                        <div className="h-full transition-all" style={{ width: `${barPct}%`, backgroundColor: tone }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardBody>
        </Card>

        {/* Aktivitäts-Heatmap */}
        <Card>
          <CardHeader>
            <CardTitle>Aktivität (30 Tage)</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="flex flex-wrap gap-1">
              {last30Days.map((day) => {
                const intensity = day.xp === 0 ? 0 : Math.ceil((day.xp / maxXpDay) * 4);
                const bg = ["bg-border", "bg-brand/25", "bg-brand/50", "bg-brand/75", "bg-brand"][intensity];
                return (
                  <div
                    key={day.key}
                    title={`${day.label}: ${day.xp} XP`}
                    className={`size-4 ${bg} transition-colors`}
                  />
                );
              })}
            </div>
            <p className="mt-3 text-xs text-muted-fg">
              {last30Days.filter(d => d.xp > 0).length} aktive Tage · {last30Days.reduce((s, d) => s + d.xp, 0)} XP
            </p>
          </CardBody>
        </Card>
      </div>

      {/* Übungen + Vokabeln Stats */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {/* Exercise progress */}
        <Card>
          <CardHeader>
            <CardTitle>Übungsfortschritt</CardTitle>
            <Link href="/app/uebungen" className="text-xs text-muted-fg hover:text-brand">Üben →</Link>
          </CardHeader>
          <CardBody>
            {Object.keys(exerciseBySubject).length === 0 ? (
              <div className="space-y-2">
                <p className="text-sm text-muted-fg">Noch keine Übungen abgeschlossen.</p>
                <Link href="/app/uebungen" className="text-xs font-semibold text-brand hover:underline">
                  Jetzt starten →
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {Object.entries(exerciseBySubject)
                  .sort(([, a], [, b]) => b - a)
                  .slice(0, 6)
                  .map(([subj, count]) => (
                    <div key={subj} className="flex items-center justify-between text-sm">
                      <span className="capitalize">{subj}</span>
                      <span className="font-mono text-xs font-bold text-brand">{count} ✓</span>
                    </div>
                  ))}
                <p className="pt-1 text-xs text-muted-fg">
                  {exerciseProgress.length} Themen abgeschlossen
                </p>
              </div>
            )}
          </CardBody>
        </Card>

        {/* Vocab stats */}
        <Card>
          <CardHeader>
            <CardTitle>Vokabeln</CardTitle>
            <Link href="/app/vokabeln" className="text-xs text-muted-fg hover:text-brand">Trainer →</Link>
          </CardHeader>
          <CardBody>
            {vocabStats.length === 0 ? (
              <div className="space-y-2">
                <p className="text-sm text-muted-fg">Noch keine Vokabellisten.</p>
                <Link href="/app/vokabeln" className="text-xs font-semibold text-brand hover:underline">
                  Liste erstellen →
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="border border-border p-3">
                    <p className="font-mono text-2xl font-bold">{totalVocab}</p>
                    <p className="text-[10px] uppercase tracking-wider text-muted-fg">Vokabeln</p>
                  </div>
                  <div className="border border-success/30 bg-success/5 p-3">
                    <p className="font-mono text-2xl font-bold text-success">{masteredVocab}</p>
                    <p className="text-[10px] uppercase tracking-wider text-muted-fg">Gemeistert</p>
                  </div>
                </div>
                <div className="h-2 w-full bg-border">
                  <div
                    className="h-full bg-success transition-all"
                    style={{ width: totalVocab > 0 ? `${Math.round((masteredVocab / totalVocab) * 100)}%` : "0%" }}
                  />
                </div>
                <p className="text-xs text-muted-fg">
                  {vocabStats.length} Listen · {totalVocab > 0 ? Math.round((masteredVocab / totalVocab) * 100) : 0}% gemeistert
                </p>
              </div>
            )}
          </CardBody>
        </Card>

        {/* Quick links */}
        <Card>
          <CardHeader><CardTitle>Schnellzugriff</CardTitle></CardHeader>
          <CardBody className="px-0! pb-0!">
            <ul className="divide-y divide-border border-t border-border">
              {[
                { href: "/app/lernplan", label: "KI-Lernplan generieren", emoji: "🤖" },
                { href: "/app/karteikarten", label: "Karteikarten", emoji: "🃏" },
                { href: "/app/vokabeln", label: "Vokabeltrainer", emoji: "📝" },
                { href: "/app/heft", label: "Meine Hefte", emoji: "📓" },
                { href: "/app/quests", label: "Quests", emoji: "⚔️" },
                { href: "/app/streaks", label: "Streak-Kalender", emoji: "🔥" },
              ].map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="flex items-center gap-3 px-5 py-2.5 text-sm transition-colors hover:bg-surface">
                    <span>{item.emoji}</span>
                    <span>{item.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Münzen</CardTitle>
            <Link href="/app/coins" className={buttonVariants({ variant: "ghost", size: "sm" })}>
              Aufladen
            </Link>
          </CardHeader>
          <CardBody>
            <p className="flex items-center gap-2 font-mono text-4xl font-bold"><CoinIcon className="size-9 text-warning" />{user.coins.toLocaleString("de-DE")}</p>
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
          <CardBody className="px-0! pb-0!">
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
            <CardBody className="p-0!">
              <div className="grid gap-px border-t border-border bg-border md:grid-cols-2">
                {ACHIEVEMENTS.map((a) => {
                  const earned = earnedSlugs.has(a.slug);
                  return (
                    <div
                      key={a.slug}
                      className={cn(
                        "flex gap-3 bg-bg p-4 transition-opacity",
                        !earned && "opacity-40",
                        earned && a.rarity === "epic" && "bg-gradient-to-br from-brand/6 to-transparent",
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
          <CardBody className="px-0! pb-0!">
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
