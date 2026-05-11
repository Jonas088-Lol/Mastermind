import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";

export const metadata: Metadata = { title: "Mannschaften" };

const SPORT_EMOJI: Record<string, string> = {
  fussball: "⚽",
  basketball: "🏀",
  volleyball: "🏐",
  handball: "🤾",
  leichtathletik: "🏃",
  schwimmen: "🏊",
  tennis: "🎾",
};

const SPORT_LABEL: Record<string, string> = {
  fussball: "Fußball",
  basketball: "Basketball",
  volleyball: "Volleyball",
  handball: "Handball",
  leichtathletik: "Leichtathletik",
  schwimmen: "Schwimmen",
  tennis: "Tennis",
};

interface MatchResult {
  date: string;
  opponent: string;
  scoreHome: number;
  scoreAway: number;
}

export default async function MannschaftenPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (effectiveRole(session) !== "student") redirect("/");

  const teams = await prisma.schoolTeam.findMany({
    where: { schoolId: session.schoolId ?? "" },
    orderBy: [{ sport: "asc" }, { name: "asc" }],
  });

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

  const teamsWithStats = teams.map((t) => {
    const results = parseResults(t.results);
    const wins = results.filter((r) => outcomeOf(r) === "win").length;
    const draws = results.filter((r) => outcomeOf(r) === "draw").length;
    const losses = results.filter((r) => outcomeOf(r) === "loss").length;
    return { ...t, results, wins, draws, losses };
  });

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">Schulsport</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Mannschaften</h1>
        <p className="mt-1 text-sm text-muted-fg">{teams.length} Mannschaften · Saison 2025/26</p>
      </header>

      {teams.length === 0 ? (
        <div className="grid place-items-center border border-dashed border-border py-20">
          <p className="text-4xl">🏆</p>
          <p className="mt-4 text-base font-semibold">Noch keine Mannschaften</p>
          <p className="mt-1 text-sm text-muted-fg">Die Schulleitung hat noch keine Mannschaften eingetragen.</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {teamsWithStats.map((team) => (
            <div key={team.id} className="flex flex-col gap-0 border border-border">
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
                                ? "w-1.5 h-1.5 rounded-full bg-success shrink-0"
                                : outcome === "draw"
                                ? "w-1.5 h-1.5 rounded-full bg-muted-fg shrink-0"
                                : "w-1.5 h-1.5 rounded-full bg-danger shrink-0"
                            }
                          />
                          <span className="font-mono text-[10px] text-muted-fg">
                            {new Date(r.date).toLocaleDateString("de-DE", { day: "numeric", month: "short" })}
                          </span>
                          <span className="min-w-0 flex-1 truncate text-sm">{r.opponent}</span>
                          <span className={
                            "font-mono text-sm font-bold tabular-nums " +
                            (outcome === "win" ? "text-success" : outcome === "loss" ? "text-danger" : "text-muted-fg")
                          }>
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
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
