import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Swords, Trophy, Clock, CheckCircle2, XCircle, RotateCcw, Medal } from "lucide-react";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { COIN_REWARDS } from "@/lib/coins";
import { acceptDuel, declineDuel, rematchDuel, sendChallenge } from "./actions";
import { AutoRefresh } from "@/components/app/AutoRefresh";

export const metadata: Metadata = { title: "Duelle" };

const SUBJECT_LABEL: Record<string, string> = {
  deutsch: "Deutsch", mathematik: "Mathe", englisch: "Englisch",
  physik: "Physik", chemie: "Chemie", biologie: "Biologie",
  geschichte: "Geschichte", informatik: "Informatik",
};

export default async function DuellePage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "student") redirect("/");
  const userId = session.userId;

  const now = new Date();

  const [myDuels, classmates, topics, allCompleted, schoolStudents] = await Promise.all([
    prisma.duel.findMany({
      where: {
        OR: [{ challengerId: userId }, { challengedId: userId }],
        NOT: { status: "expired" },
      },
      include: {
        challenger: { select: { id: true, name: true } },
        challenged: { select: { id: true, name: true } },
        topic: { select: { id: true, title: true, subject: true, grade: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.user.findMany({
      where: {
        schoolId: session!.schoolId ?? "",
        role: "student",
        id: { not: userId },
        classId: session!.classId ?? undefined,
      },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
      take: 30,
    }),
    prisma.exerciseTopic.findMany({
      select: { id: true, title: true, subject: true, grade: true },
      orderBy: [{ subject: "asc" }, { grade: "asc" }],
      take: 50,
    }),
    // Alle abgeschlossenen Duelle für Bilanz, Streak & Kopf-an-Kopf
    prisma.duel.findMany({
      where: {
        OR: [{ challengerId: userId }, { challengedId: userId }],
        status: "completed",
      },
      select: { id: true, challengerId: true, challengedId: true, winnerId: true, completedAt: true, createdAt: true },
      orderBy: [{ completedAt: "desc" }, { createdAt: "desc" }],
      take: 500,
    }),
    // Schüler der Schule für die Sieger-Rangliste
    prisma.user.findMany({
      where: { schoolId: session!.schoolId ?? "", role: "student" },
      select: { id: true, name: true },
      take: 500,
    }),
  ]);

  // Eigene Bilanz
  const wins = allCompleted.filter((d) => d.winnerId === userId).length;
  const draws = allCompleted.filter((d) => d.winnerId === null).length;
  const losses = allCompleted.length - wins - draws;
  const winrate = allCompleted.length > 0 ? Math.round((wins / allCompleted.length) * 100) : 0;
  let streak = 0;
  for (const d of allCompleted) {
    if (d.winnerId === userId) streak += 1;
    else break;
  }

  // Kopf-an-Kopf-Bilanz je Gegner (Siege–Niederlagen)
  const headToHead = new Map<string, { wins: number; losses: number }>();
  for (const d of allCompleted) {
    const oppId = d.challengerId === userId ? d.challengedId : d.challengerId;
    const h = headToHead.get(oppId) ?? { wins: 0, losses: 0 };
    if (d.winnerId === userId) h.wins += 1;
    else if (d.winnerId !== null) h.losses += 1;
    headToHead.set(oppId, h);
  }

  // Sieger-Rangliste der Schule (Top 10 nach Siegen)
  const schoolStudentIds = schoolStudents.map((s) => s.id);
  const nameById = new Map(schoolStudents.map((s) => [s.id, s.name]));
  const winCounts =
    schoolStudentIds.length > 0
      ? await prisma.duel.groupBy({
          by: ["winnerId"],
          where: { status: "completed", winnerId: { in: schoolStudentIds } },
          _count: { winnerId: true },
        })
      : [];
  const leaderboard = winCounts
    .filter((w) => w.winnerId !== null)
    .map((w) => ({ userId: w.winnerId as string, wins: w._count.winnerId }))
    .sort((a, b) => b.wins - a.wins)
    .slice(0, 10);

  const pending = myDuels.filter((d) => d.status === "pending" && d.challengedId === userId);
  const active = myDuels.filter((d) => d.status === "accepted");
  const completed = myDuels.filter((d) => d.status === "completed");

  function duelLabel(duel: (typeof myDuels)[number]) {
    const isChallenger = duel.challengerId === userId;
    const opponent = isChallenger ? duel.challenged : duel.challenger;
    return { opponent, isChallenger };
  }

  function outcomeLabel(duel: (typeof myDuels)[number]) {
    if (duel.winnerId === userId) return { text: "Gewonnen", cls: "text-success" };
    if (duel.winnerId === null) return { text: "Unentschieden", cls: "text-muted-fg" };
    return { text: "Verloren", cls: "text-danger" };
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8">
      {/* Live: eingehende/angenommene Duelle erscheinen ohne manuelles Neuladen */}
      <AutoRefresh seconds={5} />
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">Gamification</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Duelle</h1>
        <p className="mt-1 text-sm text-muted-fg">Fordere Mitschüler zu Quiz-Duellen heraus.</p>
      </header>

      <div className="grid gap-px border border-brand/20 bg-brand/5 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { icon: "⚔️", title: "Was sind Duelle?", text: "Fordere einen Mitschüler zu einem Wissens-Quiz heraus. Ihr beantwortet beide dieselben Fragen — wer mehr richtig hat, gewinnt." },
          { icon: "🏆", title: "Belohnungen", text: `Gewinner: +${COIN_REWARDS.duel_win} Münzen & XP. Teilnahme: +${COIN_REWARDS.duel_participate} Münzen. Top-Duelle verbessern dein Ranking.` },
          { icon: "⏰", title: "Ablauf", text: "Herausforderung senden → Gegner nimmt an → Beide spielen das Quiz getrennt → Ergebnis wird verglichen." },
        ].map((info) => (
          <div key={info.title} className="bg-bg p-5">
            <div className="mb-2 text-2xl">{info.icon}</div>
            <p className="text-sm font-bold">{info.title}</p>
            <p className="mt-1 text-xs text-muted-fg leading-relaxed">{info.text}</p>
          </div>
        ))}
      </div>

      {/* Statistik-Kopf: eigene Bilanz */}
      <section className="grid grid-cols-2 gap-px border border-border bg-border sm:grid-cols-3 lg:grid-cols-6">
        {[
          { label: "Offen", value: `${pending.length + active.length}`, icon: Clock, tone: "text-warning" },
          { label: "Siege", value: `${wins}`, icon: Trophy, tone: "text-success" },
          { label: "Niederlagen", value: `${losses}`, icon: XCircle, tone: "text-danger" },
          { label: "Unentschieden", value: `${draws}`, icon: Swords, tone: "text-muted-fg" },
          { label: "Winrate", value: `${winrate}%`, icon: CheckCircle2, tone: "text-brand" },
          { label: "Sieges-Streak", value: `${streak}`, icon: Trophy, tone: "text-warning" },
        ].map((s) => (
          <div key={s.label} className="bg-bg p-4">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-fg">{s.label}</p>
              <s.icon className={cn("size-4", s.tone)} strokeWidth={1.75} />
            </div>
            <p className="mt-2 font-mono text-2xl font-bold">{s.value}</p>
          </div>
        ))}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Neue Herausforderung */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Herausforderung senden</CardTitle>
              <p className="mt-1 text-sm text-muted-fg">Wähle Gegner und Thema</p>
            </div>
          </CardHeader>
          <CardBody>
            <form action={sendChallenge} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-fg">Gegner</label>
                <select
                  name="challengedId"
                  required
                  className="h-10 rounded-xl border border-border bg-bg px-3 text-sm focus:border-brand focus:outline-none"
                >
                  <option value="">Mitschüler wählen…</option>
                  {classmates.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-fg">Thema</label>
                <select
                  name="topicId"
                  required
                  className="h-10 rounded-xl border border-border bg-bg px-3 text-sm focus:border-brand focus:outline-none"
                >
                  <option value="">Thema wählen…</option>
                  {topics.map((t) => (
                    <option key={t.id} value={t.id}>
                      {SUBJECT_LABEL[t.subject] ?? t.subject} Kl.{t.grade} — {t.title}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-fg">Nachricht (optional)</label>
                <input
                  name="message"
                  type="text"
                  placeholder="z. B. Mal sehen wer besser ist!"
                  className="h-10 rounded-xl border border-border bg-bg px-3 text-sm focus:border-brand focus:outline-none"
                />
              </div>
              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 bg-fg px-5 py-2.5 text-sm font-semibold text-bg hover:bg-fg/90"
              >
                <Swords className="size-4" />
                Herausfordern
              </button>
            </form>
          </CardBody>
        </Card>

        {/* Eingehende Challenges */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Eingehend</CardTitle>
              <p className="mt-1 text-sm text-muted-fg">{pending.length} warten auf dich</p>
            </div>
            {pending.length > 0 && <Badge variant="warning">{pending.length}</Badge>}
          </CardHeader>
          <CardBody className="px-0! pb-0!">
            {pending.length === 0 ? (
              <p className="border-t border-border px-5 py-6 text-sm text-muted-fg">
                Keine offenen Herausforderungen.
              </p>
            ) : (
              <ul className="divide-y divide-border border-t border-border">
                {pending.map((d) => {
                  const hoursLeft = Math.max(0, Math.floor((d.expiresAt.getTime() - now.getTime()) / 3_600_000));
                  return (
                    <li key={d.id} className="flex items-start gap-3 px-5 py-4">
                      <Avatar name={d.challenger.name} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold">{d.challenger.name}</p>
                        <p className="text-xs text-muted-fg">{d.topic.title}</p>
                        {d.message && <p className="mt-1 text-xs italic text-muted-fg">"{d.message}"</p>}
                        <p className="mt-1 text-[10px] text-muted-fg">Läuft ab in {hoursLeft}h</p>
                      </div>
                      <div className="flex shrink-0 flex-col gap-1.5">
                        <form action={acceptDuel.bind(null, d.id)}>
                          <button type="submit" className="flex items-center gap-1 bg-fg px-3 py-1.5 text-xs font-semibold text-bg hover:bg-fg/90">
                            <CheckCircle2 className="size-3" /> Annehmen
                          </button>
                        </form>
                        <form action={declineDuel.bind(null, d.id)}>
                          <button type="submit" className="flex items-center gap-1 rounded-xl border border-border px-3 py-1.5 text-xs font-semibold text-muted-fg hover:text-fg">
                            <XCircle className="size-3" /> Ablehnen
                          </button>
                        </form>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Aktive Duelle */}
      {active.length > 0 && (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Laufende Duelle</CardTitle>
              <p className="mt-1 text-sm text-muted-fg">Quiz noch nicht abgeschlossen</p>
            </div>
            <Badge variant="brand">{active.length}</Badge>
          </CardHeader>
          <CardBody className="px-0! pb-0!">
            <ul className="divide-y divide-border border-t border-border">
              {active.map((d) => {
                const { opponent, isChallenger } = duelLabel(d);
                const myScore = isChallenger ? d.challengerScore : d.challengedScore;
                return (
                  <li key={d.id} className="flex items-center gap-4 px-5 py-3.5">
                    <Avatar name={opponent.name} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">{opponent.name}</p>
                      <p className="text-xs text-muted-fg">{d.topic.title}</p>
                    </div>
                    {myScore === null ? (
                      <Link
                        href={`/app/duelle/${d.id}`}
                        className={buttonVariants({ size: "sm" })}
                      >
                        Quiz starten
                        <ArrowRight className="size-3.5" />
                      </Link>
                    ) : (
                      <Badge variant="success">Dein Score: {myScore}</Badge>
                    )}
                  </li>
                );
              })}
            </ul>
          </CardBody>
        </Card>
      )}

      {/* Verlauf */}
      {completed.length > 0 && (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Verlauf</CardTitle>
              <p className="mt-1 text-sm text-muted-fg">{completed.length} Duelle gespielt</p>
            </div>
          </CardHeader>
          <CardBody className="px-0! pb-0!">
            <ul className="divide-y divide-border border-t border-border">
              {completed.map((d) => {
                const { opponent, isChallenger } = duelLabel(d);
                const { text, cls } = outcomeLabel(d);
                const myScore = isChallenger ? d.challengerScore : d.challengedScore;
                const oppScore = isChallenger ? d.challengedScore : d.challengerScore;
                const h2h = headToHead.get(opponent.id);
                return (
                  <li key={d.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                    <Avatar name={opponent.name} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{opponent.name}</p>
                      <p className="text-xs text-muted-fg">{d.topic.title}</p>
                      {h2h && (
                        <p className="mt-0.5 text-[10px] text-muted-fg">
                          Bilanz gegen {opponent.name}: {h2h.wins}–{h2h.losses}
                        </p>
                      )}
                    </div>
                    <span className="font-mono text-sm font-bold">
                      {myScore ?? "—"}:{oppScore ?? "—"}
                    </span>
                    <span className={cn("text-xs font-semibold", cls)}>{text}</span>
                    <form action={rematchDuel.bind(null, d.id)}>
                      <button
                        type="submit"
                        className="flex items-center gap-1 rounded-xl border border-border px-3 py-1.5 text-xs font-semibold text-muted-fg transition-colors hover:border-brand hover:text-brand"
                      >
                        <RotateCcw className="size-3" /> Revanche
                      </button>
                    </form>
                  </li>
                );
              })}
            </ul>
          </CardBody>
        </Card>
      )}

      {/* Sieger-Rangliste der Schule */}
      {leaderboard.length > 0 && (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Duell-Rangliste der Schule</CardTitle>
              <p className="mt-1 text-sm text-muted-fg">Top 10 nach Siegen</p>
            </div>
            <Medal className="size-5 text-warning" strokeWidth={1.75} />
          </CardHeader>
          <CardBody className="px-0! pb-0!">
            <ul className="divide-y divide-border border-t border-border">
              {leaderboard.map((entry, i) => {
                const name = nameById.get(entry.userId) ?? "Unbekannt";
                const isMe = entry.userId === userId;
                return (
                  <li key={entry.userId} className={cn("flex items-center gap-3 px-5 py-3", isMe && "bg-brand/5")}>
                    <span className="w-6 shrink-0 font-mono text-sm font-bold text-muted-fg">
                      {i + 1}.
                    </span>
                    <Avatar name={name} size="sm" />
                    <p className="min-w-0 flex-1 truncate text-sm font-medium">
                      {name}
                      {isMe && <span className="ml-1.5 text-xs text-brand">(du)</span>}
                    </p>
                    <span className="flex items-center gap-1.5 font-mono text-sm font-bold">
                      <Trophy className="size-3.5 text-success" strokeWidth={1.75} />
                      {entry.wins}
                    </span>
                  </li>
                );
              })}
            </ul>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
