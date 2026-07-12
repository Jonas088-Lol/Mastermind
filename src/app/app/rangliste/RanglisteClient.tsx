/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use client";

import { useState } from "react";
import type { LeaderboardResult } from "@/lib/leaderboard";
import { updateLeaderboardOptIn } from "./actions";

interface MeInfo {
  id:               string;
  name:             string;
  xp:               number;
  leaderboardOptIn: boolean;
  anonymousMode:    boolean;
  bundeslandCode:   string | null;
  landkreisId:      string | null;
  landkreisName:    string | null;
}

interface FallbackData {
  national:   LeaderboardResult | null;
  bundesland: LeaderboardResult | null;
  landkreis:  LeaderboardResult | null;
}

interface Props {
  me:         MeInfo;
  national:   LeaderboardResult | null;
  bundesland: LeaderboardResult | null;
  landkreis:  LeaderboardResult | null;
  fallback:   FallbackData | null;
}

type ScopeKey = "national" | "bundesland" | "landkreis";

const SCOPE_LABELS: Record<ScopeKey, string> = {
  national:   "🌍 Deutschland",
  bundesland: "🗺️ Bundesland",
  landkreis:  "📍 Landkreis",
};

export function RanglisteClient({ me, national, bundesland, landkreis, fallback }: Props) {
  const [activeScope, setActiveScope] = useState<ScopeKey>("national");
  const [optingIn,    setOptingIn]    = useState(false);
  const [optedIn,     setOptedIn]     = useState(me.leaderboardOptIn);

  // Resolve data: prefer Redis, fall back to Postgres
  const resolveData = (scope: ScopeKey): LeaderboardResult | null => {
    const redis = scope === "national" ? national : scope === "bundesland" ? bundesland : landkreis;
    if (redis) return redis;
    if (!fallback) return null;
    return fallback[scope] ?? null;
  };

  const data = resolveData(activeScope);

  async function handleOptIn() {
    setOptingIn(true);
    await updateLeaderboardOptIn(true);
    setOptedIn(true);
    setOptingIn(false);
  }

  const scopes: ScopeKey[] = ["national", "bundesland", "landkreis"];
  const availableScopes = scopes.filter((s) => {
    if (s === "bundesland" && !me.bundeslandCode) return false;
    if (s === "landkreis"  && !me.landkreisId)    return false;
    return true;
  });

  return (
    <div className="mx-auto max-w-2xl flex flex-col gap-6">
      {/* Header */}
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-fg">Gamification</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Rangliste</h1>
        <p className="mt-1 text-sm text-muted-fg">
          Top-Spieler nach XP — nur Opt-in, pseudonym, k-anonym.
        </p>
      </header>

      {/* Opt-in banner */}
      {!optedIn && (
        <div className="rounded-xl border border-brand/30 bg-brand/5 p-4">
          <p className="font-semibold text-sm mb-1">Du bist noch nicht auf der Rangliste</p>
          <p className="text-xs text-muted-fg mb-3">
            Melde dich freiwillig an — du erscheinst nur mit deinem Pseudonym, nie mit deiner E-Mail.
            Ranglisten mit weniger als 20 Spielern werden komplett ausgeblendet (k-Anonymität).
          </p>
          <button
            onClick={handleOptIn}
            disabled={optingIn}
            className="rounded-lg bg-brand px-4 py-1.5 text-sm font-bold text-white disabled:opacity-50">
            {optingIn ? "Wird eingetragen…" : "Jetzt auf Rangliste erscheinen"}
          </button>
        </div>
      )}

      {/* GDPR notice */}
      <div className="rounded-lg border border-border bg-surface-2 px-4 py-3 text-xs text-muted-fg flex gap-2">
        <span>🔒</span>
        <span>
          Ranglisten zeigen nur <strong>Pseudonyme</strong>. Scopes mit weniger als 20 Spielern
          werden nicht angezeigt (k-Anonymität). Du kannst jederzeit in den Einstellungen opt-out.
        </span>
      </div>

      {/* Scope tabs */}
      <div className="flex rounded-xl border border-border overflow-hidden">
        {availableScopes.map((s) => (
          <button key={s} onClick={() => setActiveScope(s)}
            className="flex-1 py-2 text-sm font-semibold transition-colors"
            style={{
              background: activeScope === s ? "var(--color-brand)" : "transparent",
              color:      activeScope === s ? "white" : "var(--color-muted-fg)",
            }}>
            {SCOPE_LABELS[s]}
            {s === "landkreis" && me.landkreisName && (
              <span className="block text-[10px] opacity-70">{me.landkreisName}</span>
            )}
          </button>
        ))}
      </div>

      {/* Board */}
      {!data ? (
        <div className="py-12 text-center text-muted-fg">
          <p className="text-4xl mb-3">📊</p>
          <p className="font-semibold">Keine Daten verfügbar</p>
          <p className="text-sm mt-1">
            {activeScope === "landkreis"
              ? "Kein Landkreis eingetragen — im Skill-Tree Setup hinzufügen."
              : "Noch keine Spieler in diesem Bereich opt-in."}
          </p>
        </div>
      ) : data.kAnonymous ? (
        <div className="rounded-xl border border-border p-8 text-center">
          <p className="text-5xl mb-3">🔒</p>
          <p className="font-bold">Zu wenige Spieler</p>
          <p className="text-sm text-muted-fg mt-2">
            Dieser Bereich hat nur <strong>{data.total}</strong> Spieler — mindestens 20 sind nötig
            (k-Anonymität). Sobald mehr Spieler mitmachen, wird die Rangliste sichtbar.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          {/* User stats */}
          {optedIn && data.userRank && (
            <div className="mb-3 flex flex-wrap gap-4 rounded-xl border border-brand/20 bg-brand/5 p-4">
              <Stat label="Dein Rang"        value={`#${data.userRank}`} />
              <Stat label="Gesamt"           value={data.total.toString()} />
              <Stat label="Besser als"       value={`${data.userPercentile ?? 0}%`} />
              <Stat label="Deine XP"         value={me.xp.toLocaleString("de")} />
            </div>
          )}

          {/* Top 10 */}
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-fg mb-2">
            Top 10
          </p>
          {data.topEntries.map((entry) => (
            <EntryRow key={entry.userId} entry={entry} />
          ))}

          {/* Neighbourhood */}
          {data.neighbourhood.length > 0 && data.userRank && data.userRank > 10 && (
            <>
              <div className="my-3 flex items-center gap-2 text-xs text-muted-fg">
                <div className="flex-1 border-t border-border" />
                <span>· · ·</span>
                <div className="flex-1 border-t border-border" />
              </div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-fg mb-2">
                Deine Nachbarschaft
              </p>
              {data.neighbourhood.map((entry) => (
                <EntryRow key={entry.userId} entry={entry} />
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function EntryRow({ entry }: { entry: { rank: number; displayName: string; xp: number; isCurrentUser: boolean } }) {
  const medal = entry.rank === 1 ? "🥇" : entry.rank === 2 ? "🥈" : entry.rank === 3 ? "🥉" : null;
  return (
    <div className={`flex items-center gap-3 rounded-xl px-4 py-3 transition-colors ${
      entry.isCurrentUser ? "border border-brand/40 bg-brand/8" : "border border-transparent hover:bg-surface-2"
    }`}>
      <span className="w-8 text-center font-mono text-sm font-bold text-muted-fg">
        {medal ?? `#${entry.rank}`}
      </span>
      <span className="flex-1 font-semibold text-sm truncate">
        {entry.displayName}
        {entry.isCurrentUser && <span className="ml-2 text-brand text-xs">(du)</span>}
      </span>
      <span className="font-mono text-sm font-bold text-warning">
        {entry.xp.toLocaleString("de")} XP
      </span>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="font-bold text-lg">{value}</span>
      <span className="text-xs text-muted-fg">{label}</span>
    </div>
  );
}
