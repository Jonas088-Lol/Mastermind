import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { cn } from "@/lib/utils";
import { joinTeam, leaveTeam } from "./actions";

export const metadata: Metadata = { title: "Mannschaften" };

const SPORT_EMOJI: Record<string, string> = {
  fussball:       "⚽",
  basketball:     "🏀",
  volleyball:     "🏐",
  handball:       "🤾",
  leichtathletik: "🏃",
  schwimmen:      "🏊",
  tennis:         "🎾",
};

const SPORT_LABEL: Record<string, string> = {
  fussball:       "Fußball",
  basketball:     "Basketball",
  volleyball:     "Volleyball",
  handball:       "Handball",
  leichtathletik: "Leichtathletik",
  schwimmen:      "Schwimmen",
  tennis:         "Tennis",
};

interface MatchResult {
  date: string;
  opponent: string;
  scoreHome: number;
  scoreAway: number;
}

function parseResults(raw: string | null): MatchResult[] {
  if (!raw) return [];
  try {
    return JSON.parse(raw) as MatchResult[];
  } catch {
    return [];
  }
}

function outcomeOf(result: MatchResult): "win" | "draw" | "loss" {
  if (result.scoreHome > result.scoreAway) return "win";
  if (result.scoreHome === result.scoreAway) return "draw";
  return "loss";
}

/** Simple win-rate score for ranking teams relative to each other (3 pts/win, 1 pt/draw). */
function teamScore(wins: number, draws: number, _losses: number): number {
  return wins * 3 + draws;
}

export default async function MannschaftenPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "student") redirect("/");

  const teams = await prisma.schoolTeam.findMany({
    where: { schoolId: session.schoolId ?? "" },
    orderBy: [{ sport: "asc" }, { name: "asc" }],
  });

  // Students in the same school — used for member listings
  const schoolStudents = await prisma.user.findMany({
    where: { schoolId: session.schoolId ?? "", role: "student" },
    select: { id: true, name: true, klasse: true, xp: true },
    orderBy: { xp: "desc" },
  });

  const teamsWithStats = teams.map((t) => {
    const results = parseResults(t.results);
    const wins   = results.filter((r) => outcomeOf(r) === "win").length;
    const draws  = results.filter((r) => outcomeOf(r) === "draw").length;
    const losses = results.filter((r) => outcomeOf(r) === "loss").length;
    const score  = teamScore(wins, draws, losses);
    return { ...t, results, wins, draws, losses, score };
  });

  // Sort by score descending to determine ranking position
  const ranked = [...teamsWithStats].sort((a, b) => b.score - a.score);
  const rankMap = new Map(ranked.map((t, i) => [t.id, i + 1]));

  // Group school students by sport/team name — heuristic: check klasse/name match
  // Since SchoolTeam has no members relation, we show all school students as potential members
  // and highlight the "top contributor" by XP.
  const topStudentByXp = schoolStudents[0] ?? null;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">Schulsport</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Mannschaften</h1>
        <p className="mt-1 text-sm text-muted-fg">
          {teams.length} Mannschaft{teams.length !== 1 ? "en" : ""} · Saison 2025/26
        </p>
      </header>

      {teams.length === 0 ? (
        <Card>
          <CardBody className="flex flex-col items-center gap-3 py-20 text-center">
            <p className="text-4xl">🏆</p>
            <p className="text-base font-semibold">Noch keine Mannschaften</p>
            <p className="text-sm text-muted-fg">Die Schulleitung hat noch keine Mannschaften eingetragen.</p>
          </CardBody>
        </Card>
      ) : (
        <>
          {/* ── Ranking strip ── */}
          <Card>
            <CardHeader>
              <CardTitle>Rangliste</CardTitle>
            </CardHeader>
            <CardBody className="pt-0">
              <ol className="divide-y divide-border border border-border">
                {ranked.map((team, i) => (
                  <li key={team.id} className="flex items-center gap-4 px-4 py-3">
                    <span
                      className={cn(
                        "w-6 text-center font-mono text-sm font-black",
                        i === 0 && "text-warning",
                        i === 1 && "text-muted-fg",
                        i === 2 && "text-warning/70",
                      )}
                    >
                      {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                    </span>
                    <span className="text-lg">{SPORT_EMOJI[team.sport] ?? "🏆"}</span>
                    <span className="flex-1 text-sm font-semibold">{team.name}</span>
                    <span className="font-mono text-xs text-muted-fg">
                      {team.wins}S · {team.draws}U · {team.losses}N
                    </span>
                    <Badge variant={i === 0 ? "warning" : "neutral"} className="tabular-nums">
                      {team.score} Pkt.
                    </Badge>
                  </li>
                ))}
              </ol>
            </CardBody>
          </Card>

          {/* ── Team cards ── */}
          <div className="grid gap-6 md:grid-cols-2">
            {teamsWithStats.map((team) => {
              const rank = rankMap.get(team.id) ?? "-";
              return (
                <div key={team.id} className="flex flex-col gap-0 border border-border">
                  {/* Team header */}
                  <div className="flex items-start gap-4 p-5">
                    <div className="grid size-12 shrink-0 place-items-center bg-surface text-2xl">
                      {SPORT_EMOJI[team.sport] ?? "🏆"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-fg">
                        {SPORT_LABEL[team.sport] ?? team.sport}
                        {team.season ? ` · ${team.season}` : ""}
                      </p>
                      <h2 className="mt-0.5 text-lg font-bold tracking-tight">{team.name}</h2>
                      {team.coach && (
                        <p className="text-sm text-muted-fg">Trainer: {team.coach}</p>
                      )}
                    </div>
                    {team.results.length > 0 && (
                      <div className="flex gap-2 text-center">
                        <div className="min-w-[2rem]">
                          <p className="font-mono text-lg font-bold text-success">{team.wins}</p>
                          <p className="text-[9px] font-semibold uppercase text-muted-fg">S</p>
                        </div>
                        <div className="min-w-[2rem]">
                          <p className="font-mono text-lg font-bold text-muted-fg">{team.draws}</p>
                          <p className="text-[9px] font-semibold uppercase text-muted-fg">U</p>
                        </div>
                        <div className="min-w-[2rem]">
                          <p className="font-mono text-lg font-bold text-danger">{team.losses}</p>
                          <p className="text-[9px] font-semibold uppercase text-muted-fg">N</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Rank + top XP contributor */}
                  <div className="flex items-center gap-3 border-t border-border bg-surface px-5 py-2.5">
                    <div className="flex-1 text-xs text-muted-fg">
                      Rang <span className="font-bold text-fg">#{rank}</span> von {teams.length} Mannschaften
                    </div>
                    {topStudentByXp && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-fg">
                        <span>🏅</span>
                        <span>Top-XP: <span className="font-semibold text-fg">{topStudentByXp.name}</span></span>
                        <Badge variant="outline">{topStudentByXp.xp} XP</Badge>
                      </div>
                    )}
                  </div>

                  {/* Match results */}
                  {team.results.length > 0 && (
                    <div className="border-t border-border">
                      <p className="border-b border-border bg-surface px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-fg">
                        Letzte Ergebnisse
                      </p>
                      <ul className="divide-y divide-border">
                        {team.results.slice(0, 3).map((r, i) => {
                          const outcome = outcomeOf(r);
                          return (
                            <li key={i} className="flex items-center gap-3 px-4 py-2.5">
                              <span
                                className={
                                  outcome === "win"
                                    ? "h-1.5 w-1.5 rounded-full bg-success shrink-0"
                                    : outcome === "draw"
                                    ? "h-1.5 w-1.5 rounded-full bg-muted-fg shrink-0"
                                    : "h-1.5 w-1.5 rounded-full bg-danger shrink-0"
                                }
                              />
                              <span className="font-mono text-[10px] text-muted-fg">
                                {new Date(r.date).toLocaleDateString("de-DE", { day: "numeric", month: "short" })}
                              </span>
                              <span className="min-w-0 flex-1 truncate text-sm">{r.opponent}</span>
                              <span
                                className={
                                  "font-mono text-sm font-bold tabular-nums " +
                                  (outcome === "win"
                                    ? "text-success"
                                    : outcome === "loss"
                                    ? "text-danger"
                                    : "text-muted-fg")
                                }
                              >
                                {r.scoreHome}:{r.scoreAway}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}

                  {team.results.length === 0 && (
                    <div className="border-t border-border px-4 py-3 text-sm text-muted-fg">
                      Noch keine Spielergebnisse eingetragen.
                    </div>
                  )}

                  {/* School members preview */}
                  {schoolStudents.length > 0 && (
                    <details className="group border-t border-border">
                      <summary className="flex cursor-pointer select-none items-center justify-between bg-surface px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-fg hover:text-fg">
                        <span>Schüler der Schule ({schoolStudents.length})</span>
                        <span className="text-muted-fg transition-transform group-open:rotate-90">›</span>
                      </summary>
                      <ul className="max-h-48 divide-y divide-border overflow-y-auto">
                        {schoolStudents.slice(0, 10).map((s) => (
                          <li key={s.id} className="flex items-center gap-3 px-4 py-2">
                            <div className="grid size-7 shrink-0 place-items-center rounded-full bg-surface text-xs font-bold text-muted-fg">
                              {s.name.charAt(0)}
                            </div>
                            <span className="min-w-0 flex-1 truncate text-sm">{s.name}</span>
                            {s.klasse && (
                              <span className="text-xs text-muted-fg">{s.klasse}</span>
                            )}
                            <Badge variant="outline" className="tabular-nums">{s.xp} XP</Badge>
                          </li>
                        ))}
                        {schoolStudents.length > 10 && (
                          <li className="px-4 py-2 text-xs text-muted-fg">
                            … und {schoolStudents.length - 10} weitere
                          </li>
                        )}
                      </ul>
                    </details>
                  )}

                  {/* Join / Leave actions */}
                  <div className="flex gap-2 border-t border-border p-4">
                    <form
                      action={joinTeam.bind(null, team.id)}
                      className="flex-1"
                    >
                      <button
                        type="submit"
                        className={cn(
                          buttonVariants({ variant: "primary", size: "sm" }),
                          "w-full",
                        )}
                      >
                        Beitreten
                      </button>
                    </form>
                    <form
                      action={leaveTeam.bind(null, team.id)}
                      className="flex-1"
                    >
                      <button
                        type="submit"
                        className={cn(
                          buttonVariants({ variant: "outline", size: "sm" }),
                          "w-full",
                        )}
                      >
                        Verlassen
                      </button>
                    </form>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
