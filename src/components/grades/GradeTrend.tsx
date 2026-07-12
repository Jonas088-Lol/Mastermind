/* Copyright 2026 Elian Schock, Jonas Schwenk */
"use client";

import { useTransition } from "react";
import { Star } from "lucide-react";
import { toggleFavoriteSubject } from "@/lib/actions/grade-prefs";

export type GradePoint = { date: string; value: number }; // date = ISO

export type SubjectAvg = {
  subjectId: string;
  name: string;
  color: string;
  average: number;
  count: number;
  firstDate: string; // ISO — Datum der ersten Note im Fach
  points: GradePoint[];
};

// Running average over time — each grade adds a point with the cumulative avg
export function runningAverage(points: GradePoint[]): GradePoint[] {
  const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date));
  let sum = 0;
  return sorted.map((p, i) => {
    sum += p.value;
    return { date: p.date, value: sum / (i + 1) };
  });
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

export function GradeLineChart({ points, color = "hsl(var(--brand))", height = 220 }: {
  points: GradePoint[];
  color?: string;
  height?: number;
}) {
  const W = 640;
  const H = height;
  const PAD = { l: 30, r: 12, t: 12, b: 26 };

  if (points.length === 0) {
    return (
      <div className="grid h-40 place-items-center text-sm text-muted-fg">
        Noch keine Noten eingetragen
      </div>
    );
  }

  const t0 = new Date(points[0].date).getTime();
  const t1 = new Date(points[points.length - 1].date).getTime();
  const span = Math.max(1, t1 - t0);
  const x = (iso: string) =>
    PAD.l + ((new Date(iso).getTime() - t0) / span) * (W - PAD.l - PAD.r);
  // Y: Note 1 (oben) bis 6 (unten)
  const y = (v: number) => PAD.t + ((v - 1) / 5) * (H - PAD.t - PAD.b);

  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${x(p.date).toFixed(1)},${y(p.value).toFixed(1)}`)
    .join(" ");

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Notenverlauf">
      {/* Gitterlinien + Y-Achse (Noten 1–6) */}
      {[1, 2, 3, 4, 5, 6].map((v) => (
        <g key={v}>
          <line x1={PAD.l} x2={W - PAD.r} y1={y(v)} y2={y(v)} stroke="hsl(var(--border))" strokeWidth="1" strokeDasharray={v === 1 || v === 6 ? "0" : "3 4"} />
          <text x={PAD.l - 8} y={y(v) + 3.5} textAnchor="end" fontSize="10" fill="hsl(var(--muted-fg))" fontFamily="monospace">{v}</text>
        </g>
      ))}
      {/* X-Achse: erstes + letztes Datum */}
      <text x={PAD.l} y={H - 8} fontSize="10" fill="hsl(var(--muted-fg))" fontFamily="monospace">{fmtDate(points[0].date)}</text>
      {points.length > 1 && (
        <text x={W - PAD.r} y={H - 8} textAnchor="end" fontSize="10" fill="hsl(var(--muted-fg))" fontFamily="monospace">{fmtDate(points[points.length - 1].date)}</text>
      )}
      {/* Linie */}
      <path d={path} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* Punkte */}
      {points.map((p, i) => (
        <circle key={i} cx={x(p.date)} cy={y(p.value)} r="3" fill={color} />
      ))}
    </svg>
  );
}

export function SubjectAverageCard({ subject, isFavorite, canFavorite = true }: {
  subject: SubjectAvg;
  isFavorite: boolean;
  canFavorite?: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="rounded-2xl border border-border bg-bg p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="inline-block size-2.5 shrink-0 rounded-full" style={{ backgroundColor: subject.color }} />
          <p className="truncate font-semibold">{subject.name}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="font-mono text-xl font-bold tabular-nums">
            {subject.average.toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
          </span>
          {canFavorite && (
            <button
              type="button"
              disabled={pending}
              onClick={() => startTransition(() => toggleFavoriteSubject(subject.subjectId))}
              title={isFavorite ? "Favorit entfernen" : "Favorisieren"}
              className="rounded-lg p-1.5 text-muted-fg transition-colors hover:bg-surface disabled:opacity-50"
            >
              <Star className={`size-4 ${isFavorite ? "fill-amber-400 text-amber-400" : ""}`} />
            </button>
          )}
        </div>
      </div>
      <p className="mt-1 text-xs text-muted-fg">
        {subject.count} Note{subject.count !== 1 ? "n" : ""} · erste Note am {fmtDate(subject.firstDate)}
      </p>
      <div className="mt-2">
        <GradeLineChart points={runningAverage(subject.points)} color={subject.color} height={110} />
      </div>
    </div>
  );
}

export function GradeTrendView({ allPoints, subjects, favorites, canFavorite = true }: {
  allPoints: GradePoint[];
  subjects: SubjectAvg[];
  favorites: string[];
  canFavorite?: boolean;
}) {
  const favSet = new Set(favorites);
  const favSubjects = subjects.filter((s) => favSet.has(s.subjectId));
  const otherSubjects = subjects.filter((s) => !favSet.has(s.subjectId));
  const overall = runningAverage(allPoints);
  const overallAvg = allPoints.length
    ? allPoints.reduce((s, p) => s + p.value, 0) / allPoints.length
    : null;

  return (
    <div className="flex flex-col gap-6">
      {/* Gesamtdurchschnitt oben */}
      <section className="rounded-2xl border border-border bg-bg p-4 sm:p-5">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-semibold">Durchschnitt aller Noten</h2>
          {overallAvg !== null && (
            <span className="font-mono text-2xl font-bold tabular-nums">
              {overallAvg.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          )}
        </div>
        <div className="mt-3">
          <GradeLineChart points={overall} />
        </div>
      </section>

      {/* Favoriten direkt unter dem Gesamtdurchschnitt */}
      {favSubjects.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-muted-fg">
            <Star className="size-3.5 fill-amber-400 text-amber-400" /> Favoriten
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {favSubjects.map((s) => (
              <SubjectAverageCard key={s.subjectId} subject={s} isFavorite canFavorite={canFavorite} />
            ))}
          </div>
        </section>
      )}

      {/* Alle Fächer mit mindestens einer Note */}
      {otherSubjects.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-fg">Fächer</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {otherSubjects.map((s) => (
              <SubjectAverageCard key={s.subjectId} subject={s} isFavorite={false} canFavorite={canFavorite} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
