"use client";

import { useEffect, useState, useCallback } from "react";
import { Maximize2, Minimize2, RefreshCw, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

type ClassEntry = {
  period: number;
  subject: string;
  shortName: string;
  color: string;
  teacher: string;
  room: string | null;
};

type ClassData = {
  id: string;
  name: string;
  grade: number;
  entries: ClassEntry[];
};

type Substitution = {
  id: string;
  className: string;
  classId: string;
  period: number;
  type: string;
  subjectName: string | null;
  note: string | null;
  substituteTeacher: string | null;
  absentTeacher: string | null;
  room: string | null;
};

interface Props {
  classes: ClassData[];
  substitutions: Substitution[];
  periodTimes: string[];
  todayLabel: string;
}

export function AnzeigetafelClient({ classes, substitutions, periodTimes, todayLabel }: Props) {
  const [fullscreen, setFullscreen] = useState(false);
  const [time, setTime] = useState(new Date().toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }));
  const [countdown, setCountdown] = useState(60);

  useEffect(() => {
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
  const substMap = new Map<string, Substitution>();
  for (const s of substitutions) {
    substMap.set(`${s.classId}-${s.period}`, s);
  }

  return (
    <div className={cn("flex min-h-screen flex-col bg-bg", fullscreen && "fixed inset-0 z-50 overflow-auto")}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border bg-bg px-6 py-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-fg">Stundenplan · Anzeigetafel</p>
          <p className="mt-0.5 text-lg font-bold">{todayLabel}</p>
        </div>
        <div className="flex items-center gap-4">
          {substitutions.length > 0 && (
            <div className="flex items-center gap-1.5 rounded-xl border border-warning/30 bg-warning/8 px-3 py-1.5 text-sm font-medium text-warning">
              <AlertTriangle className="size-4" />
              {substitutions.length} Vertretung{substitutions.length !== 1 && "en"}
            </div>
          )}
          <div className="text-right">
            <p className="font-mono text-2xl font-bold">{time}</p>
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
        <div className="border-b border-warning/20 bg-warning/5 px-6 py-3">
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-warning">Heutige Vertretungen</p>
          <div className="flex flex-wrap gap-2">
            {substitutions.map((s) => (
              <div key={s.id} className="rounded-xl border border-warning/30 bg-bg px-3 py-1.5 text-xs">
                <span className="font-bold">{s.className}</span>
                <span className="mx-1 text-muted-fg">·</span>
                <span>{s.period}. Stunde</span>
                <span className="mx-1 text-muted-fg">·</span>
                <span className={s.type === "cancelled" ? "font-semibold text-danger" : "text-warning"}>
                  {s.type === "cancelled" ? "Ausfall" : s.subjectName ?? "Vertretung"}
                </span>
                {s.substituteTeacher && (
                  <span className="ml-1 text-muted-fg">→ {s.substituteTeacher}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Timetable grid */}
      {classes.length === 0 ? (
        <div className="flex flex-1 items-center justify-center text-muted-fg">
          Kein Stundenplan für heute eingetragen.
        </div>
      ) : (
        <div className="overflow-x-auto p-4">
          <table className="w-full border-collapse overflow-hidden rounded-2xl border border-border text-sm">
            <thead>
              <tr>
                <th className="border-b border-r border-border bg-surface px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-fg">
                  Stunde
                </th>
                {classes.map((c) => (
                  <th key={c.id} className="border-b border-l border-border bg-surface px-3 py-3 text-center text-xs font-bold">
                    {c.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: maxPeriod }, (_, periodIdx) => (
                <tr key={periodIdx} className="border-b border-border last:border-b-0">
                  <td className="border-r border-border bg-surface px-3 py-2 align-top">
                    <p className="font-mono text-xs font-semibold">{periodIdx + 1}.</p>
                    <p className="font-mono text-[10px] text-muted-fg">{periodTimes[periodIdx]}</p>
                  </td>
                  {classes.map((c) => {
                    const entry = c.entries.find((e) => e.period === periodIdx + 1);
                    const subst = substMap.get(`${c.id}-${periodIdx + 1}`);
                    return (
                      <td key={c.id} className="border-l border-border px-2 py-1.5">
                        {subst ? (
                          <div className={cn(
                            "rounded-xl border px-2 py-1.5",
                            subst.type === "cancelled"
                              ? "border-danger/30 bg-danger/5"
                              : "border-warning/40 bg-warning/8"
                          )}>
                            <p className={cn(
                              "text-xs font-bold",
                              subst.type === "cancelled" ? "text-danger" : "text-warning"
                            )}>
                              {subst.type === "cancelled" ? "Ausfall" : subst.subjectName ?? "Vertretung"}
                            </p>
                            {subst.substituteTeacher && (
                              <p className="text-[10px] text-muted-fg">{subst.substituteTeacher}</p>
                            )}
                          </div>
                        ) : entry ? (
                          <div
                            className="rounded-xl border border-border px-2 py-1.5"
                            style={{ backgroundColor: entry.color + "15" }}
                          >
                            <p className="text-xs font-bold" style={{ color: entry.color }}>
                              {entry.shortName}
                            </p>
                            <p className="text-[10px] text-muted-fg">{entry.room ?? "—"}</p>
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
