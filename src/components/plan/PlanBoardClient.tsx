"use client";

import { useEffect, useState, useCallback } from "react";
import { Maximize2, Minimize2, RefreshCw, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BoardClass, BoardSubstitution } from "@/lib/plan-board";

/**
 * Plan-Vollbildanzeige („Anzeigetafel") — für Bildschirme/Fernseher im
 * Schulgebäude. Zeigt den heutigen Stundenplan aller Klassen inkl.
 * Vertretungen, mit Uhr, Auto-Refresh (60 s) und echtem Browser-Vollbild.
 * Im Vollbild skaliert die Typografie hoch, damit sie aus Distanz lesbar ist.
 */

interface Props {
  classes: BoardClass[];
  substitutions: BoardSubstitution[];
  periodTimes: string[];
  todayLabel: string;
}

// Alte Einträge nutzen "cancelled", neue "cancellation" — beide abdecken.
function isCancelled(type: string) {
  return type === "cancelled" || type === "cancellation";
}

function substLabel(s: BoardSubstitution): string {
  if (isCancelled(s.type)) return "Ausfall";
  if (s.type === "room_change") return `Raumwechsel${s.room ? ` → ${s.room}` : ""}`;
  return s.subjectName ?? "Vertretung";
}

export function PlanBoardClient({ classes, substitutions, periodTimes, todayLabel }: Props) {
  const [fullscreen, setFullscreen] = useState(false);
  const [time, setTime] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(60);

  useEffect(() => {
    setTime(new Date().toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }));
    const tick = setInterval(() => {
      setTime(new Date().toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }));
      setCountdown((c) => {
        if (c <= 1) {
          window.location.reload();
          return 60;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(tick);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => null);
      setFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => null);
      setFullscreen(false);
    }
  }, []);

  useEffect(() => {
    const handler = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  const maxPeriod = Math.max(1, ...classes.flatMap((c) => c.entries.map((e) => e.period)));

  // Substitution lookup: classId + period → substitution
  const substMap = new Map<string, BoardSubstitution>();
  for (const s of substitutions) {
    substMap.set(`${s.classId}-${s.period}`, s);
  }

  return (
    <div className={cn("flex min-h-screen flex-col bg-bg", fullscreen && "fixed inset-0 z-50 overflow-auto")}>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-bg px-4 py-4 sm:px-6">
        <div>
          <p className={cn("text-xs font-semibold uppercase tracking-widest text-muted-fg", fullscreen && "text-sm")}>
            Stunden- & Vertretungsplan
          </p>
          <p className={cn("mt-0.5 text-lg font-bold", fullscreen && "text-2xl")}>{todayLabel}</p>
        </div>
        <div className="flex items-center gap-3 sm:gap-4">
          {substitutions.length > 0 && (
            <div className={cn(
              "flex items-center gap-1.5 rounded-xl border border-warning/30 bg-warning/8 px-3 py-1.5 text-sm font-medium text-warning",
              fullscreen && "text-base"
            )}>
              <AlertTriangle className={cn("size-4", fullscreen && "size-5")} />
              {substitutions.length} Vertretung{substitutions.length !== 1 && "en"}
            </div>
          )}
          <div className="text-right">
            <p className={cn("font-mono text-2xl font-bold tabular-nums", fullscreen && "text-4xl")}>
              {time ?? "—:—"}
            </p>
            <p className="text-[10px] text-muted-fg">Aktualisiert in {countdown}s</p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="rounded-xl border border-border p-2 hover:bg-surface"
            title="Jetzt aktualisieren"
          >
            <RefreshCw className="size-4 text-muted-fg" />
          </button>
          <button
            onClick={toggleFullscreen}
            className="rounded-xl border border-border p-2 hover:bg-surface"
            title={fullscreen ? "Vollbild beenden" : "Vollbild"}
          >
            {fullscreen ? <Minimize2 className="size-4 text-muted-fg" /> : <Maximize2 className="size-4 text-muted-fg" />}
          </button>
        </div>
      </div>

      {/* Vertretungs-Banner */}
      {substitutions.length > 0 && (
        <div className="border-b border-warning/20 bg-warning/5 px-4 py-3 sm:px-6">
          <p className={cn("mb-2 text-xs font-bold uppercase tracking-wider text-warning", fullscreen && "text-sm")}>
            Heutige Vertretungen
          </p>
          <div className="flex flex-wrap gap-2">
            {substitutions.map((s) => (
              <div key={s.id} className={cn("rounded-xl border border-warning/30 bg-bg px-3 py-1.5 text-xs", fullscreen && "px-4 py-2 text-base")}>
                <span className="font-bold">{s.className}</span>
                <span className="mx-1 text-muted-fg">·</span>
                <span>{s.period}. Stunde</span>
                <span className="mx-1 text-muted-fg">·</span>
                <span className={isCancelled(s.type) ? "font-semibold text-danger" : "text-warning"}>
                  {substLabel(s)}
                </span>
                {s.substituteTeacher && (
                  <span className="ml-1 text-muted-fg">→ {s.substituteTeacher}</span>
                )}
                {s.note && <span className="ml-1 text-muted-fg">({s.note})</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Timetable grid */}
      {classes.length === 0 ? (
        <div className="flex flex-1 items-center justify-center p-8 text-center text-muted-fg">
          Kein Stundenplan für heute eingetragen.
        </div>
      ) : (
        <div className="overflow-x-auto p-3 sm:p-4">
          <table className="w-full border-collapse overflow-hidden rounded-2xl border border-border text-sm">
            <thead>
              <tr>
                <th className={cn(
                  "border-b border-r border-border bg-surface px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-fg",
                  fullscreen && "text-xs"
                )}>
                  Stunde
                </th>
                {classes.map((c) => (
                  <th key={c.id} className={cn(
                    "border-b border-l border-border bg-surface px-3 py-3 text-center text-xs font-bold",
                    fullscreen && "text-base"
                  )}>
                    {c.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: maxPeriod }, (_, periodIdx) => (
                <tr key={periodIdx} className="border-b border-border last:border-b-0">
                  <td className="border-r border-border bg-surface px-3 py-2 align-top">
                    <p className={cn("font-mono text-xs font-semibold", fullscreen && "text-base")}>{periodIdx + 1}.</p>
                    <p className={cn("font-mono text-[10px] text-muted-fg", fullscreen && "text-xs")}>{periodTimes[periodIdx]}</p>
                  </td>
                  {classes.map((c) => {
                    const entry = c.entries.find((e) => e.period === periodIdx + 1);
                    const subst = substMap.get(`${c.id}-${periodIdx + 1}`);
                    return (
                      <td key={c.id} className="border-l border-border px-2 py-1.5">
                        {subst ? (
                          <div className={cn(
                            "rounded-xl border px-2 py-1.5",
                            isCancelled(subst.type)
                              ? "border-danger/30 bg-danger/5"
                              : "border-warning/40 bg-warning/8"
                          )}>
                            <p className={cn(
                              "text-xs font-bold",
                              fullscreen && "text-base",
                              isCancelled(subst.type) ? "text-danger" : "text-warning"
                            )}>
                              {substLabel(subst)}
                            </p>
                            {subst.substituteTeacher && (
                              <p className={cn("text-[10px] text-muted-fg", fullscreen && "text-sm")}>{subst.substituteTeacher}</p>
                            )}
                          </div>
                        ) : entry ? (
                          <div
                            className="rounded-xl border border-border px-2 py-1.5"
                            style={{ backgroundColor: entry.color + "15" }}
                          >
                            <p className={cn("text-xs font-bold", fullscreen && "text-base")} style={{ color: entry.color }}>
                              {entry.shortName}
                            </p>
                            <p className={cn("text-[10px] text-muted-fg", fullscreen && "text-sm")}>{entry.room ?? "—"}</p>
                          </div>
                        ) : (
                          <div className="h-full min-h-8" />
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
