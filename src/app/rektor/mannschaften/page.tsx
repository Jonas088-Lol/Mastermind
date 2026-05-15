import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Plus, Trash2, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { prisma } from "@/lib/db/client";
import { effectiveRole, getSession } from "@/lib/session";
import { addResult, createTeam, deleteTeam } from "./actions";

export const metadata: Metadata = { title: "Mannschaften · Schulleitung" };

const SPORT_OPTIONS = [
  { value: "fussball",       label: "Fußball" },
  { value: "basketball",     label: "Basketball" },
  { value: "volleyball",     label: "Volleyball" },
  { value: "handball",       label: "Handball" },
  { value: "leichtathletik", label: "Leichtathletik" },
  { value: "schwimmen",      label: "Schwimmen" },
  { value: "tennis",         label: "Tennis" },
];

const SPORT_EMOJI: Record<string, string> = {
  fussball: "⚽",
  basketball: "🏀",
  volleyball: "🏐",
  handball: "🤾",
  leichtathletik: "🏃",
  schwimmen: "🏊",
  tennis: "🎾",
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
  const role = effectiveRole(session);
  if (!["rector", "vice_rector", "admin", "super"].includes(role)) redirect("/login");

  const teams = await prisma.schoolTeam.findMany({
    where: { schoolId: session.schoolId ?? "" },
    orderBy: [{ sport: "asc" }, { name: "asc" }],
  });

  const today = new Date().toISOString().slice(0, 10);

  function parseResults(raw: string | null): MatchResult[] {
    try { return JSON.parse(raw ?? "[]") as MatchResult[]; } catch { return []; }
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">Schulleitung</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Mannschaften</h1>
        <p className="mt-1 text-sm text-muted-fg">{teams.length} Mannschaft{teams.length !== 1 ? "en" : ""} · Schulsport</p>
      </header>

      {/* Create team */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Plus className="size-4 text-muted-fg" strokeWidth={1.75} />
            <CardTitle>Neue Mannschaft</CardTitle>
          </div>
        </CardHeader>
        <CardBody>
          <form action={createTeam} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" required placeholder="z. B. Fußball Herren A" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sport">Sportart</Label>
              <select
                id="sport"
                name="sport"
                required
                className="h-10 w-full border border-border bg-bg px-3 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
              >
                <option value="">Sportart wählen…</option>
                {SPORT_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="season">Saison <span className="font-normal text-muted-fg">(optional)</span></Label>
              <Input id="season" name="season" placeholder="z. B. 2025/26" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="coach">Trainer <span className="font-normal text-muted-fg">(optional)</span></Label>
              <Input id="coach" name="coach" placeholder="z. B. Herr Mayer" />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit">Mannschaft anlegen</Button>
            </div>
          </form>
        </CardBody>
      </Card>

      {/* Team list */}
      {teams.length === 0 ? (
        <div className="grid place-items-center border border-dashed border-border py-16">
          <Trophy className="size-8 text-muted-fg" strokeWidth={1} />
          <p className="mt-3 text-sm font-medium">Noch keine Mannschaften</p>
          <p className="text-xs text-muted-fg">Lege die erste Mannschaft mit dem Formular oben an.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {teams.map((team) => {
            const results = parseResults(team.results);
            return (
              <Card key={team.id}>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{SPORT_EMOJI[team.sport] ?? "🏆"}</span>
                    <div className="min-w-0 flex-1">
                      <CardTitle>{team.name}</CardTitle>
                      <p className="text-xs text-muted-fg">
                        {SPORT_OPTIONS.find((s) => s.value === team.sport)?.label ?? team.sport}
                        {team.season ? ` · ${team.season}` : ""}
                        {team.coach ? ` · Trainer: ${team.coach}` : ""}
                      </p>
                    </div>
                    <form action={deleteTeam.bind(null, team.id)}>
                      <button
                        type="submit"
                        title="Mannschaft löschen"
                        className="text-muted-fg hover:text-danger"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </form>
                  </div>
                </CardHeader>
                <CardBody className="space-y-5">
                  {/* Add result form */}
                  <details className="group">
                    <summary className="cursor-pointer list-none text-sm font-semibold text-brand hover:underline">
                      + Spielergebnis eintragen
                    </summary>
                    <form
                      action={addResult.bind(null, team.id)}
                      className="mt-3 grid gap-3 sm:grid-cols-4"
                    >
                      <div className="space-y-1 sm:col-span-1">
                        <Label className="text-xs">Datum</Label>
                        <Input type="date" name="date" defaultValue={today} required className="text-sm" />
                      </div>
                      <div className="space-y-1 sm:col-span-1">
                        <Label className="text-xs">Gegner</Label>
                        <Input name="opponent" required placeholder="z. B. SG Musterbach" className="text-sm" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Tore (Heim)</Label>
                        <Input type="number" name="scoreHome" min="0" defaultValue="0" required className="text-sm" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Tore (Gast)</Label>
                        <Input type="number" name="scoreAway" min="0" defaultValue="0" required className="text-sm" />
                      </div>
                      <div className="sm:col-span-4">
                        <Button type="submit" variant="secondary" size="sm">Eintragen</Button>
                      </div>
                    </form>
                  </details>

                  {/* Results list */}
                  {results.length > 0 && (
                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-fg">
                        Ergebnisse ({results.length})
                      </p>
                      <ul className="divide-y divide-border border border-border">
                        {results.map((r, i) => {
                          const win = r.scoreHome > r.scoreAway;
                          const loss = r.scoreHome < r.scoreAway;
                          return (
                            <li key={i} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                              <span
                                className={
                                  "size-2 shrink-0 rounded-full " +
                                  (win ? "bg-success" : loss ? "bg-danger" : "bg-muted-fg")
                                }
                              />
                              <span className="font-mono text-xs text-muted-fg">
                                {new Date(r.date).toLocaleDateString("de-DE", {
                                  day: "numeric", month: "short", year: "2-digit",
                                })}
                              </span>
                              <span className="min-w-0 flex-1 truncate">{r.opponent}</span>
                              <span className={
                                "font-mono font-bold tabular-nums " +
                                (win ? "text-success" : loss ? "text-danger" : "text-muted-fg")
                              }>
                                {r.scoreHome}:{r.scoreAway}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}

                  {results.length === 0 && (
                    <p className="text-sm text-muted-fg">Noch keine Ergebnisse eingetragen.</p>
                  )}
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
