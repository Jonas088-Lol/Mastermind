"use client";

import { useEffect, useState, useCallback } from "react";
import { Maximize2, Minimize2, RefreshCw, AlertTriangle, CalendarDays, ChevronLeft, ChevronRight, Settings, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BoardClass, BoardEvent, BoardSubstitution, BoardTeam } from "@/lib/plan-board";

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
  events: BoardEvent[];
  teams: BoardTeam[];
}

/**
 * Kiosk-Konfiguration — pro Gerät (localStorage), damit jeder Bildschirm
 * selbst entscheidet, was er zeigt. Nichts davon ist Pflicht.
 */
interface BoardConfig {
  showPlan: boolean;
  showTermine: boolean;
  showTeams: boolean;
  /** Sekunden pro Folie. */
  seconds: number;
}

const CONFIG_KEY = "mm-board-config";
const DEFAULT_CONFIG: BoardConfig = { showPlan: true, showTermine: true, showTeams: true, seconds: 20 };

function loadConfig(): BoardConfig {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (!raw) return DEFAULT_CONFIG;
    const parsed = JSON.parse(raw) as Partial<BoardConfig>;
    return {
      showPlan: parsed.showPlan ?? true,
      showTermine: parsed.showTermine ?? true,
      showTeams: parsed.showTeams ?? true,
      seconds: Math.min(120, Math.max(5, Number(parsed.seconds) || 20)),
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}

const SPORT_ICONS: Record<string, string> = {
  fussball: "⚽", basketball: "🏀", volleyball: "🏐", handball: "🤾",
  leichtathletik: "🏃", schwimmen: "🏊", tennis: "🎾",
};

const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  holiday:  { label: "Ferien/Feiertag", color: "#22c55e" },
  exam:     { label: "Prüfung",         color: "#ef4444" },
  event:    { label: "Veranstaltung",   color: "#3b82f6" },
  deadline: { label: "Frist",           color: "#eab308" },
  meeting:  { label: "Termin",          color: "#8b5cf6" },
};

// Alte Einträge nutzen "cancelled", neue "cancellation" — beide abdecken.
function isCancelled(type: string) {
  return type === "cancelled" || type === "cancellation";
}

function substLabel(s: BoardSubstitution): string {
  if (isCancelled(s.type)) return "Ausfall";
  if (s.type === "room_change") return `Raumwechsel${s.room ? ` → ${s.room}` : ""}`;
  return s.subjectName ?? "Vertretung";
}

export function PlanBoardClient({ classes, substitutions, periodTimes, todayLabel, events, teams }: Props) {
  const [fullscreen, setFullscreen] = useState(false);
  const [time, setTime] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(90);

  // ── Konfiguration (pro Bildschirm, localStorage) ──
  const [config, setConfig] = useState<BoardConfig>(DEFAULT_CONFIG);
  const [showSettings, setShowSettings] = useState(false);
  useEffect(() => { setConfig(loadConfig()); }, []);

  function updateConfig(patch: Partial<BoardConfig>) {
    setConfig((prev) => {
      const next = { ...prev, ...patch };
      try { localStorage.setItem(CONFIG_KEY, JSON.stringify(next)); } catch { /* private mode */ }
      return next;
    });
  }

  // ── Kiosk-Folien: nur aktivierte UND befüllte Folien; Fallback auf Plan ──
  const slides: { key: "plan" | "termine" | "teams"; label: string }[] = [
    ...(config.showPlan ? [{ key: "plan" as const, label: "Stundenplan & Vertretungen" }] : []),
    ...(config.showTermine && events.length > 0 ? [{ key: "termine" as const, label: "Termine" }] : []),
    ...(config.showTeams && teams.length > 0 ? [{ key: "teams" as const, label: "Schulmannschaften" }] : []),
  ];
  if (slides.length === 0) slides.push({ key: "plan", label: "Stundenplan & Vertretungen" });
  const [slideIdx, setSlideIdx] = useState(0);
  const slide = slides[Math.min(slideIdx, slides.length - 1)];

  // Automatischer Folienwechsel (nur wenn es mehr als eine Folie gibt)
  useEffect(() => {
    if (slides.length <= 1) return;
    const id = setInterval(() => setSlideIdx((i) => (i + 1) % slides.length), config.seconds * 1000);
    return () => clearInterval(id);
  }, [slides.length, config.seconds]);

  useEffect(() => {
    setTime(new Date().toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }));
    const tick = setInterval(() => {
      setTime(new Date().toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }));
      setCountdown((c) => {
        if (c <= 1) {
          window.location.reload();
          return 90;
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
            {slide.label}
          </p>
          <p className={cn("mt-0.5 text-lg font-bold", fullscreen && "text-2xl")}>{todayLabel}</p>
        </div>
        {slides.length > 1 && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSlideIdx((i) => (i - 1 + slides.length) % slides.length)}
              className="rounded-xl border border-border p-1.5 hover:bg-surface" aria-label="Vorherige Ansicht"
            >
              <ChevronLeft className="size-4 text-muted-fg" />
            </button>
            <div className="flex items-center gap-1.5">
              {slides.map((s, i) => (
                <button
                  key={s.key}
                  onClick={() => setSlideIdx(i)}
                  aria-label={s.label}
                  className={cn(
                    "h-2 rounded-full transition-all",
                    i === slideIdx ? "w-6 bg-brand" : "w-2 bg-border hover:bg-border-strong"
                  )}
                />
              ))}
            </div>
            <button
              onClick={() => setSlideIdx((i) => (i + 1) % slides.length)}
              className="rounded-xl border border-border p-1.5 hover:bg-surface" aria-label="Nächste Ansicht"
            >
              <ChevronRight className="size-4 text-muted-fg" />
            </button>
          </div>
        )}
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
          <div className="relative">
            <button
              onClick={() => setShowSettings((v) => !v)}
              className={cn("rounded-xl border p-2 hover:bg-surface", showSettings ? "border-brand text-brand" : "border-border")}
              title="Anzeige konfigurieren"
            >
              <Settings className="size-4 text-muted-fg" />
            </button>
            {showSettings && (
              <div className="absolute right-0 top-full z-40 mt-2 w-64 rounded-2xl border border-border bg-bg p-4 shadow-xl">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-fg">Angezeigte Inhalte</p>
                <p className="mt-0.5 text-[10px] text-muted-fg">Gilt nur für diesen Bildschirm.</p>
                <div className="mt-3 space-y-2">
                  {([
                    { key: "showPlan" as const, label: "Stunden- & Vertretungsplan", count: null },
                    { key: "showTermine" as const, label: "Termine", count: events.length },
                    { key: "showTeams" as const, label: "Schulmannschaften", count: teams.length },
                  ]).map((o) => (
                    <label key={o.key} className="flex cursor-pointer items-center gap-2.5 text-sm">
                      <input
                        type="checkbox"
                        checked={config[o.key]}
                        onChange={(e) => updateConfig({ [o.key]: e.target.checked })}
                        className="size-4 accent-brand"
                      />
                      <span className="flex-1">{o.label}</span>
                      {o.count !== null && <span className="text-[10px] text-muted-fg">{o.count}</span>}
                    </label>
                  ))}
                </div>
                <p className="mt-4 text-xs font-bold uppercase tracking-wider text-muted-fg">Sekunden pro Folie</p>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="range" min={5} max={60} step={5}
                    value={config.seconds}
                    onChange={(e) => updateConfig({ seconds: Number(e.target.value) })}
                    className="flex-1 accent-brand"
                  />
                  <span className="w-8 text-right font-mono text-xs">{config.seconds}s</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Vertretungs-Banner */}
      {slide.key === "plan" && substitutions.length > 0 && (
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
      {slide.key === "plan" && (classes.length === 0 ? (
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
      ))}

      {/* ── Folie: Termine ── */}
      {slide.key === "termine" && (
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="mx-auto grid max-w-4xl gap-3">
            {events.map((e) => {
              const cat = CATEGORY_LABELS[e.category] ?? CATEGORY_LABELS.event;
              const d = new Date(e.startAt);
              return (
                <div key={e.id} className="flex items-center gap-4 rounded-2xl border border-border bg-surface p-4 sm:p-5">
                  <div className="grid size-14 shrink-0 place-items-center rounded-xl border border-border bg-bg text-center sm:size-16">
                    <div>
                      <p className={cn("font-mono text-lg font-black leading-none sm:text-xl")}>{d.getDate()}</p>
                      <p className="text-[10px] font-semibold uppercase text-muted-fg">
                        {d.toLocaleDateString("de-DE", { month: "short" })}
                      </p>
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={cn("truncate font-bold", fullscreen ? "text-xl" : "text-base")}>{e.title}</p>
                    {e.description && (
                      <p className={cn("mt-0.5 line-clamp-2 text-muted-fg", fullscreen ? "text-base" : "text-sm")}>{e.description}</p>
                    )}
                    {!e.allDay && (
                      <p className="mt-0.5 font-mono text-xs text-muted-fg">
                        {d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })} Uhr
                      </p>
                    )}
                  </div>
                  <span
                    className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold"
                    style={{ color: cat.color, backgroundColor: `${cat.color}18`, border: `1px solid ${cat.color}40` }}
                  >
                    {cat.label}
                  </span>
                </div>
              );
            })}
            {events.length === 0 && (
              <div className="flex items-center justify-center gap-2 py-16 text-muted-fg">
                <CalendarDays className="size-5" /> Keine anstehenden Termine.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Folie: Schulmannschaften ── */}
      {slide.key === "teams" && (
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="mx-auto grid max-w-6xl gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {teams.map((t) => (
              <div key={t.id} className="overflow-hidden rounded-2xl border border-border bg-surface">
                {t.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={t.imageUrl} alt={t.name} className="h-40 w-full object-cover sm:h-48" />
                ) : (
                  <div className="grid h-40 w-full place-items-center bg-surface-2 text-6xl sm:h-48">
                    {SPORT_ICONS[t.sport] ?? "🏅"}
                  </div>
                )}
                <div className="p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className={cn("truncate font-bold", fullscreen ? "text-xl" : "text-base")}>
                      {SPORT_ICONS[t.sport] ?? "🏅"} {t.name}
                    </p>
                    {t.season && <span className="shrink-0 font-mono text-xs text-muted-fg">{t.season}</span>}
                  </div>
                  {t.coach && <p className="mt-0.5 text-sm text-muted-fg">Trainer: {t.coach}</p>}
                  {t.results.length > 0 && (
                    <div className="mt-3 space-y-1.5">
                      {t.results.map((r, i) => {
                        const won = (r.scoreHome ?? 0) > (r.scoreAway ?? 0);
                        const draw = (r.scoreHome ?? 0) === (r.scoreAway ?? 0);
                        return (
                          <div key={i} className="flex items-center justify-between gap-2 rounded-lg bg-bg px-2.5 py-1.5 text-sm">
                            <span className="truncate text-muted-fg">vs. {r.opponent ?? "—"}</span>
                            <span className={cn(
                              "shrink-0 font-mono font-bold",
                              draw ? "text-muted-fg" : won ? "text-success" : "text-danger"
                            )}>
                              {r.scoreHome ?? "–"} : {r.scoreAway ?? "–"}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {teams.length === 0 && (
              <div className="col-span-full flex items-center justify-center gap-2 py-16 text-muted-fg">
                <Trophy className="size-5" /> Keine Mannschaften angelegt.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
