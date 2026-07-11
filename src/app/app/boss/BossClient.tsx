"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Swords, Coins, Crown, Droplets, Skull, Zap, Timer as TimerIcon, Heart } from "lucide-react";
import { BOSS_TIERS, type BossTier } from "@/lib/game";
import { attackBoss, type AttackResult } from "./actions";
import { BossDefeatedOverlay } from "./BossDefeatedOverlay";
import { BossDeathAnimation } from "./BossDeathAnimation";
import { cn } from "@/lib/utils";

const QUESTION_TIME = 10;
const LETTERS = ["A", "B", "C", "D"] as const;
const MAX_HEARTS = 3;
const KO_SECONDS = 8;
/** Antwort schneller als das → kritischer Treffer (muss zu CRIT_MS in actions.ts passen). */
const CRIT_MS = 3_500;
/** Ab dieser Streak gibt es +1 Bonusschaden (muss zu STREAK_BONUS_AT in actions.ts passen). */
const STREAK_BONUS_AT = 5;
/** Angriffsziele: Lebensdauer, Spawn-Intervall, max. gleichzeitig. */
const TARGET_TTL_MS = 2_800;
const TARGET_SPAWN_MS = 1_200;
const MAX_TARGETS = 3;

interface AttackTarget {
  key: number;
  /** Position in % der Arena. */
  x: number;
  y: number;
  bornAt: number;
}

function shuffleOptions<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

interface Question {
  id: string;
  question: string;
  subject: string;
  grade: number;
  options: { id: number; text: string }[];
}

interface BossClientProps {
  battleId: string;
  tier: string;
  bossName: string;
  bossIcon: string;
  initialHp: number;
  maxHp: number;
  myCorrectAnswers: number;
  endAtIso?: string;
  avatarUrl?: string | null;
  playerName: string;
}

type Phase = "idle" | "loading" | "question" | "result";
type BossAnim = "idle" | "hit" | "defeated";

function formatTimeLeft(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const days = Math.floor(totalSec / 86_400);
  const hours = Math.floor((totalSec % 86_400) / 3_600);
  const minutes = Math.floor((totalSec % 3_600) / 60);
  const seconds = totalSec % 60;
  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (days > 0 || hours > 0) parts.push(`${hours}h`);
  parts.push(`${minutes}m`, `${seconds}s`);
  return parts.join(" ");
}

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
}

export function BossClient({
  battleId, tier, bossName, bossIcon, initialHp, maxHp, myCorrectAnswers, endAtIso, avatarUrl, playerName,
}: BossClientProps) {
  const router = useRouter();
  const [hp, setHp] = useState(initialHp);
  const [battleMsLeft, setBattleMsLeft] = useState(() =>
    endAtIso ? Math.max(0, new Date(endAtIso).getTime() - Date.now()) : null
  );
  const [phase, setPhase] = useState<Phase>("idle");
  const [question, setQuestion] = useState<Question | null>(null);
  const [shuffledOptions, setShuffledOptions] = useState<Question["options"]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [result, setResult] = useState<AttackResult | null>(null);
  const [hits, setHits] = useState(myCorrectAnswers);
  const [combo, setCombo] = useState(0);
  const [isPending, startTransition] = useTransition();
  const [killData, setKillData] = useState<AttackResult["killData"] | null>(null);
  const [bossAnim, setBossAnim] = useState<BossAnim>("idle");
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME);
  const [showFloatingDmg, setShowFloatingDmg] = useState(false);
  const [showDeathAnim, setShowDeathAnim] = useState(false);
  // Spieler-Zustand (client-seitiges Gameplay: Herzen als Einsatz)
  const [hearts, setHearts] = useState(MAX_HEARTS);
  const [playerHurt, setPlayerHurt] = useState(false);
  const [ko, setKo] = useState(false);
  const [koLeft, setKoLeft] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Vollbild-Kampfmodus: Angriffsziele poppen über die Arena verteilt auf
  const [battleMode, setBattleMode] = useState(false);
  const [targets, setTargets] = useState<AttackTarget[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const questionShownAtRef = useRef(0);
  const targetKeyRef = useRef(0);

  const safeTier = (tier as BossTier) in BOSS_TIERS ? (tier as BossTier) : "common";
  const tierData = BOSS_TIERS[safeTier];
  const color = tierData.color;
  const hpPct = maxHp > 0 ? Math.round((hp / maxHp) * 100) : 0;
  const defeated = hp === 0;

  const hpBarColor = hpPct > 50 ? "#22c55e" : hpPct > 25 ? "#eab308" : "#ef4444";
  const timerColor = timeLeft > 10 ? "#22c55e" : timeLeft > 5 ? "#eab308" : "#ef4444";

  // Battle-Countdown
  useEffect(() => {
    if (!endAtIso) return;
    const id = setInterval(() => {
      const ms = Math.max(0, new Date(endAtIso).getTime() - Date.now());
      setBattleMsLeft(ms);
      if (ms === 0) clearInterval(id);
    }, 1_000);
    return () => clearInterval(id);
  }, [endAtIso]);

  // Frage-Timer
  useEffect(() => {
    if (phase !== "question") {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    setTimeLeft(QUESTION_TIME);
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          setPhase("idle");
          setQuestion(null);
          setSelected(null);
          setCombo(0);
          return QUESTION_TIME;
        }
        return t - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase]);

  // K.O.-Countdown → Herzen füllen sich wieder
  useEffect(() => {
    if (!ko) return;
    if (koLeft <= 0) { setKo(false); setHearts(MAX_HEARTS); return; }
    const id = setTimeout(() => setKoLeft((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [ko, koLeft]);

  // Angriffsziele spawnen, solange der Kampfmodus läuft und keine Frage offen ist
  useEffect(() => {
    if (!battleMode || phase !== "idle" || ko || defeated) {
      setTargets([]);
      return;
    }
    const spawn = () => {
      setTargets((ts) => {
        const now = Date.now();
        const alive = ts.filter((t) => now - t.bornAt < TARGET_TTL_MS);
        if (alive.length >= MAX_TARGETS) return alive;
        return [
          ...alive,
          {
            key: targetKeyRef.current++,
            x: 8 + Math.random() * 76,
            y: 14 + Math.random() * 62,
            bornAt: now,
          },
        ];
      });
    };
    spawn();
    const id = setInterval(spawn, TARGET_SPAWN_MS);
    return () => clearInterval(id);
  }, [battleMode, phase, ko, defeated]);

  // Vollbild verlassen (z. B. per ESC) beendet den Kampfmodus nicht —
  // die Arena bleibt als Overlay bestehen, bis der Spieler auf ✕ tippt.
  function startBattle() {
    if (defeated || ko) return;
    setBattleMode(true);
    document.documentElement.requestFullscreen?.().catch(() => null);
  }

  function stopBattle() {
    setBattleMode(false);
    setTargets([]);
    if (phase === "question" || phase === "loading") {
      setPhase("idle");
      setQuestion(null);
      setSelected(null);
    }
    if (document.fullscreenElement) document.exitFullscreen().catch(() => null);
  }

  async function handleAttack() {
    if (defeated || phase !== "idle" || ko) return;
    setTargets([]);
    setPhase("loading");
    setLoadError(null);
    try {
      const res = await fetch(`/api/boss/${battleId}/question`);
      if (!res.ok) {
        setLoadError(res.status === 404 ? "Dieser Boss ist nicht mehr aktiv." : "Frage konnte nicht geladen werden — versuch es nochmal.");
        setPhase("idle");
        return;
      }
      const q = (await res.json()) as Question;
      setQuestion(q);
      setShuffledOptions(shuffleOptions(q.options));
      setSelected(null);
      setResult(null);
      questionShownAtRef.current = Date.now();
      setPhase("question");
    } catch {
      setLoadError("Verbindungsfehler — versuch es nochmal.");
      setPhase("idle");
    }
  }

  function handleSelect(idx: number) {
    if (selected !== null || phase !== "question") return;
    if (timerRef.current) clearInterval(timerRef.current);
    setSelected(idx);
    const elapsedMs = Date.now() - questionShownAtRef.current;
    startTransition(async () => {
      const res = await attackBoss(battleId, question!.id, idx, { elapsedMs, streak: combo });
      if ("error" in res) { setPhase("idle"); return; }
      setResult(res);
      if (res.correct) {
        setHp(res.newHp);
        setHits((h) => h + 1);
        setCombo((c) => c + 1);
        setBossAnim("hit");
        setShowFloatingDmg(true);
        setTimeout(() => {
          setBossAnim(res.defeated ? "defeated" : "idle");
          setShowFloatingDmg(false);
        }, 700);
      } else {
        setCombo(0);
        // Spieler nimmt Schaden
        setPlayerHurt(true);
        setTimeout(() => setPlayerHurt(false), 600);
        setHearts((h) => {
          const next = Math.max(0, h - 1);
          if (next === 0) { setKo(true); setKoLeft(KO_SECONDS); }
          return next;
        });
      }
      if (res.defeated) {
        // Kampfmodus beenden, damit Todesanimation & Sieges-Overlay frei liegen
        setBattleMode(false);
        setTargets([]);
        if (document.fullscreenElement) document.exitFullscreen().catch(() => null);
        setShowDeathAnim(true);
        if (res.killData) setKillData(res.killData);
      }
      setPhase("result");
    });
  }

  function handleNext() {
    if (result?.defeated) return;
    setPhase("idle");
    setQuestion(null);
    setSelected(null);
    setResult(null);
  }

  const correctIdx = result?.correctIndex;

  return (
    <>
      <style>{`
        @keyframes boss-glow { 0%,100%{filter:drop-shadow(0 0 14px ${color}70) drop-shadow(0 0 4px ${color}40)} 50%{filter:drop-shadow(0 0 28px ${color}cc) drop-shadow(0 0 10px ${color}80)} }
        @keyframes boss-hit { 0%{transform:scale(1) rotate(0)} 12%{transform:scale(1.3) rotate(-10deg);filter:brightness(2.5) drop-shadow(0 0 50px ${color}ff)} 28%{transform:scale(.82) rotate(7deg)} 45%{transform:scale(1.14) rotate(-4deg);filter:brightness(1.6)} 62%{transform:scale(.93) rotate(2deg)} 78%{transform:scale(1.05) rotate(-1deg)} 100%{transform:scale(1) rotate(0);filter:none} }
        @keyframes boss-defeated { 0%{transform:scale(1);opacity:1} 8%{transform:scale(1.35) rotate(-12deg);filter:brightness(3) drop-shadow(0 0 80px ${color}ff)} 22%{transform:scale(.65) rotate(9deg)} 38%{transform:scale(1.1) rotate(-6deg) translateY(-12px)} 55%{transform:scale(.75) rotate(6deg) translateY(4px)} 75%{transform:scale(.4) rotate(-200deg);opacity:.25} 100%{transform:scale(0) rotate(-400deg);opacity:0} }
        @keyframes float-dmg { 0%{opacity:1;transform:translateY(0) scale(1.2)} 30%{opacity:1;transform:translateY(-26px) scale(1.6)} 100%{opacity:0;transform:translateY(-72px) scale(.8)} }
        @keyframes float-hurt { 0%{opacity:1;transform:translateY(0) scale(1)} 100%{opacity:0;transform:translateY(-40px) scale(1.4)} }
        @keyframes combo-in { 0%{transform:scale(.3) translateY(8px);opacity:0} 55%{transform:scale(1.25);opacity:1} 100%{transform:scale(1);opacity:1} }
        @keyframes q-pop { 0%{opacity:0;transform:translateY(14px) scale(.9)} 60%{transform:translateY(-2px) scale(1.02)} 100%{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes opt-in { from{opacity:0;transform:scale(.85)} to{opacity:1;transform:scale(1)} }
        @keyframes player-hit { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-8px) rotate(-4deg);filter:brightness(1.4) sepia(1) hue-rotate(-30deg)} 50%{transform:translateX(7px) rotate(3deg)} 75%{transform:translateX(-4px)} }
        @keyframes player-idle { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-5px)} }
        @keyframes timer-urgent { 0%,100%{opacity:1} 50%{opacity:.35} }
        @keyframes pulse-ring { 0%{transform:scale(.85);opacity:.6} 100%{transform:scale(1.6);opacity:0} }
        @keyframes heart-pop { 0%{transform:scale(1)} 40%{transform:scale(1.5)} 100%{transform:scale(1)} }
        @keyframes target-in { 0%{transform:scale(0) rotate(-90deg);opacity:0} 60%{transform:scale(1.25) rotate(8deg);opacity:1} 100%{transform:scale(1) rotate(0);opacity:1} }
        @keyframes target-pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.12)} }
        @keyframes crit-pop { 0%{transform:scale(.4) rotate(-8deg);opacity:0} 40%{transform:scale(1.5) rotate(4deg);opacity:1} 100%{transform:scale(1) rotate(0);opacity:1} }
      `}</style>

      {showDeathAnim && (
        <BossDeathAnimation
          bossIcon={bossIcon}
          tierColor={color}
          onComplete={() => { setShowDeathAnim(false); if (!killData) router.refresh(); }}
        />
      )}
      {!showDeathAnim && killData && (
        <BossDefeatedOverlay data={killData} onClose={() => { setKillData(null); router.refresh(); }} />
      )}

      <div className="flex flex-col gap-4">
        {/* ── Boss HP Bar (oben) ── */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span style={{ color }}>{bossName}</span>
            <span className="font-mono tabular-nums text-muted-fg">
              {hp.toLocaleString("de-DE")} / {maxHp.toLocaleString("de-DE")} HP
            </span>
          </div>
          <div className="relative h-4 w-full overflow-hidden rounded-full border border-border bg-surface-2">
            <div className="h-full rounded-full" style={{ width: `${hpPct}%`, backgroundColor: hpBarColor, boxShadow: `0 0 10px ${hpBarColor}80, inset 0 1px 0 rgba(255,255,255,.25)`, transition: "width .55s cubic-bezier(.25,.46,.45,.94)" }} />
          </div>
        </div>

        {/* ══ 2D-ARENA ══ */}
        <div
          className={cn(
            "relative w-full overflow-hidden",
            battleMode
              ? "fixed inset-0 z-40"
              : "rounded-2xl border border-border"
          )}
          style={{
            minHeight: battleMode ? undefined : 400,
            background: `radial-gradient(120% 80% at 70% 15%, ${color}22 0%, transparent 55%), linear-gradient(180deg, #0b1220 0%, #0d1117 60%, #131a26 100%)`,
          }}
        >
          {/* ── Kampfmodus-HUD: HP-Bar + Streak + Exit ── */}
          {battleMode && (
            <div className="absolute inset-x-0 top-0 z-30 flex items-center gap-3 px-4 py-3 sm:px-6" style={{ background: "linear-gradient(180deg, rgba(0,0,0,.55), transparent)" }}>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between text-[11px] font-semibold">
                  <span className="truncate" style={{ color }}>{bossIcon} {bossName}</span>
                  <span className="ml-2 shrink-0 font-mono tabular-nums text-white/70">
                    {hp.toLocaleString("de-DE")} / {maxHp.toLocaleString("de-DE")} HP
                  </span>
                </div>
                <div className="mt-1 h-2.5 w-full overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full" style={{ width: `${hpPct}%`, backgroundColor: hpBarColor, boxShadow: `0 0 8px ${hpBarColor}80`, transition: "width .55s cubic-bezier(.25,.46,.45,.94)" }} />
                </div>
              </div>
              {combo >= 2 && (
                <span className="shrink-0 rounded-full px-2.5 py-1 text-xs font-black uppercase tracking-wider" style={{ color, backgroundColor: `${color}22`, border: `1px solid ${color}55` }}>
                  🔥 {combo}×{combo >= STREAK_BONUS_AT ? " +DMG" : ""}
                </span>
              )}
              <button
                type="button"
                onClick={stopBattle}
                aria-label="Kampfmodus beenden"
                className="grid size-9 shrink-0 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
              >
                ✕
              </button>
            </div>
          )}

          {/* ── Aufpoppende Angriffsziele (Kampfmodus) ── */}
          {battleMode && phase === "idle" && !ko && !defeated && targets.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={handleAttack}
              aria-label="Angreifen"
              className="absolute z-20 -translate-x-1/2 -translate-y-1/2 select-none"
              style={{ left: `${t.x}%`, top: `${t.y}%`, animation: "target-in .3s cubic-bezier(.175,.885,.32,1.275) both" }}
            >
              <span className="absolute inset-0 rounded-full" style={{ backgroundColor: `${color}30`, animation: "pulse-ring 1.4s ease-out infinite" }} />
              <span className="relative grid size-14 place-items-center rounded-full text-3xl sm:size-16 sm:text-4xl" style={{ backgroundColor: `${color}25`, border: `2px solid ${color}88`, boxShadow: `0 0 18px ${color}66`, animation: "target-pulse 1s ease-in-out infinite" }}>
                ⚔️
              </span>
            </button>
          ))}
          {battleMode && phase === "idle" && !ko && !defeated && targets.length === 0 && !loadError && (
            <p className="pointer-events-none absolute inset-x-0 top-1/2 z-10 text-center text-sm font-bold uppercase tracking-widest text-white/40">
              Mach dich bereit…
            </p>
          )}
          {loadError && (
            <div className="absolute inset-x-0 bottom-16 z-30 mx-auto w-fit max-w-[90%] rounded-xl border border-red-400/40 bg-red-500/15 px-4 py-2 text-center text-sm font-semibold text-red-300 backdrop-blur">
              {loadError}
            </div>
          )}
          {/* Boden */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24" style={{ background: `linear-gradient(180deg, transparent, ${color}14)`, borderTop: `1px solid ${color}22` }} />

          {/* ── Boss (oben rechts) ── */}
          <div className="absolute right-5 top-6 flex flex-col items-center sm:right-10">
            {!defeated && phase === "idle" && !ko && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ width: 96, height: 96, backgroundColor: `${color}18`, animation: "pulse-ring 2.2s ease-out infinite" }} />
            )}
            <div
              className="relative select-none text-6xl leading-none sm:text-7xl"
              style={{
                animation:
                  bossAnim === "hit" ? "boss-hit .65s cubic-bezier(.36,.07,.19,.97)" :
                  bossAnim === "defeated" ? "boss-defeated 1.3s ease-in forwards" :
                  defeated ? undefined : "boss-glow 2.8s ease-in-out infinite",
              }}
            >
              {bossIcon}
              {showFloatingDmg && (
                <span
                  className={cn("pointer-events-none absolute -top-2 left-1/2 -translate-x-1/2 whitespace-nowrap font-black", result?.crit ? "text-xl" : "text-base")}
                  style={{
                    color: result?.crit ? "#facc15" : color,
                    textShadow: result?.crit ? "0 0 14px #facc15" : `0 0 10px ${color}`,
                    animation: "float-dmg .95s ease-out forwards",
                  }}
                >
                  {result?.crit && "💥 CRIT! "}−{result?.damage ?? 1} HP!
                </span>
              )}
            </div>
            {combo >= 2 && !defeated && (
              <p className="mt-1 text-xs font-black uppercase tracking-widest" style={{ color, textShadow: `0 0 12px ${color}80`, animation: "combo-in .4s cubic-bezier(.175,.885,.32,1.275)" }}>
                {combo}× Combo!
              </p>
            )}
          </div>

          {/* ── Spieler (unten links) ── */}
          <div className="absolute bottom-5 left-5 flex flex-col items-center gap-1.5 sm:left-8">
            {/* Herzen */}
            <div className="flex items-center gap-0.5">
              {Array.from({ length: MAX_HEARTS }).map((_, i) => (
                <Heart
                  key={i}
                  className={cn("size-4 transition-colors", i < hearts ? "fill-red-500 text-red-500" : "fill-transparent text-white/20")}
                  style={i === hearts ? { animation: "heart-pop .4s ease" } : undefined}
                />
              ))}
            </div>
            <div
              className="relative grid size-16 place-items-center overflow-hidden rounded-full ring-2 ring-cyan-400 sm:size-20"
              style={{
                boxShadow: "0 0 18px #22d3ee55",
                animation: playerHurt ? "player-hit .6s ease" : ko ? undefined : "player-idle 2.6s ease-in-out infinite",
                filter: ko ? "grayscale(1) brightness(.6)" : undefined,
              }}
            >
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt={playerName} className="size-full object-cover" />
              ) : (
                <div className="grid size-full place-items-center bg-brand/20 text-lg font-black text-brand">{initials(playerName)}</div>
              )}
              {playerHurt && (
                <span className="pointer-events-none absolute -top-4 left-1/2 -translate-x-1/2 text-sm font-black text-red-500" style={{ textShadow: "0 0 8px #ef4444", animation: "float-hurt .6s ease-out forwards" }}>−1 ♥</span>
              )}
            </div>
            <span className="max-w-28 truncate text-[11px] font-semibold text-white/80">{playerName}</span>
          </div>

          {/* ── K.O.-Overlay ── */}
          {ko && (
            <div className="absolute inset-0 z-20 grid place-items-center bg-black/60 backdrop-blur-sm">
              <div className="text-center">
                <p className="text-4xl font-black text-red-500" style={{ textShadow: "0 0 20px #ef4444" }}>K.O.!</p>
                <p className="mt-1 text-sm text-white/70">Du sammelst dich… <span className="font-mono font-bold">{koLeft}s</span></p>
              </div>
            </div>
          )}

          {/* ── Frage + Antworten (poppen im Bild auf) ── */}
          {(phase === "question" || phase === "result") && question && (
            <div className={cn(
              "absolute inset-x-0 z-10 mx-auto flex max-w-md flex-col gap-3 px-4",
              battleMode ? "top-1/2 max-h-[calc(100%-5rem)] -translate-y-1/2 overflow-y-auto sm:max-w-lg" : "top-4"
            )}>
              {/* Sprechblase mit Frage */}
              <div
                className="relative rounded-2xl border-2 bg-bg/95 p-4 shadow-xl backdrop-blur"
                style={{ borderColor: `${color}55`, animation: "q-pop .35s cubic-bezier(.175,.885,.32,1.275) both" }}
              >
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-fg">{question.subject} · Kl. {question.grade}</span>
                  {phase === "question" && (
                    <span className="flex items-center gap-1 text-xs font-black tabular-nums" style={{ color: timerColor, animation: timeLeft <= 5 ? "timer-urgent .5s ease-in-out infinite" : undefined }}>
                      <TimerIcon className="size-3" />{timeLeft}s
                    </span>
                  )}
                </div>
                <p className="text-sm font-semibold leading-snug">{question.question}</p>
                {phase === "question" && timeLeft > QUESTION_TIME - CRIT_MS / 1000 && (
                  <p className="mt-1.5 text-[10px] font-black uppercase tracking-widest text-yellow-500" style={{ animation: "timer-urgent .8s ease-in-out infinite" }}>
                    ⚡ Jetzt antworten = kritischer Treffer!
                  </p>
                )}
                {phase === "question" && (
                  <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-surface-2">
                    <div className="h-full rounded-full" style={{ width: `${(timeLeft / QUESTION_TIME) * 100}%`, backgroundColor: timerColor, transition: "width 1s linear" }} />
                  </div>
                )}
                {/* Blasen-Zipfel Richtung Spieler */}
                <div className="absolute -bottom-2 left-8 size-4 rotate-45 border-b-2 border-r-2 bg-bg/95" style={{ borderColor: `${color}55` }} />
              </div>

              {/* Antwort-Buttons als schwebende Kacheln */}
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {shuffledOptions.map((opt, i) => {
                  const isSelected = selected === opt.id;
                  const isTheCorrect = result != null && correctIdx === opt.id;
                  const showCorrect = result != null && isTheCorrect;
                  const showWrong = isSelected && result != null && !result.correct;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      disabled={selected !== null || isPending}
                      onClick={() => handleSelect(opt.id)}
                      className={cn(
                        "flex items-center gap-2.5 rounded-xl border-2 px-3 py-2.5 text-left text-sm font-medium shadow-lg transition-all duration-150",
                        selected === null && "border-border bg-bg/95 backdrop-blur hover:scale-[1.03]",
                        showCorrect && "border-green-500 bg-green-500/15",
                        showWrong && "border-red-500 bg-red-500/15",
                        selected !== null && !isSelected && !showCorrect && "opacity-40 border-border bg-bg/80",
                      )}
                      style={{ animation: selected === null && i < 4 ? `opt-in .25s ease ${i * 0.07}s both` : undefined }}
                    >
                      <span className={cn(
                        "grid size-7 shrink-0 place-items-center rounded-lg text-xs font-black",
                        selected === null && "bg-surface-2 text-muted-fg",
                        showCorrect && "bg-green-500 text-white",
                        showWrong && "bg-red-500 text-white",
                        selected !== null && !isSelected && !showCorrect && "bg-surface-2 text-muted-fg/40",
                      )}>{LETTERS[i]}</span>
                      <span className="leading-snug">{opt.text}</span>
                    </button>
                  );
                })}
              </div>

              {/* Erklärung bei falscher Antwort */}
              {phase === "result" && result && !result.correct && (
                <div className="rounded-xl border-2 border-red-500/40 bg-red-500/10 p-3 text-sm shadow-lg" style={{ animation: "q-pop .3s ease both" }}>
                  <p className="font-bold text-red-400">Falsch — du nimmst Schaden!</p>
                  {result.explanation
                    ? <p className="mt-1 text-xs leading-relaxed text-fg/80">{result.explanation}</p>
                    : correctIdx != null && <p className="mt-1 text-xs text-fg/70">Die richtige Antwort war grün markiert.</p>}
                </div>
              )}
            </div>
          )}

          {/* ── Kampfmodus: Lade-Anzeige ── */}
          {battleMode && phase === "loading" && (
            <div className="absolute inset-0 z-10 grid place-items-center">
              <div className="flex items-center gap-3">
                <div className="size-6 animate-spin rounded-full border-4 border-white/20" style={{ borderTopColor: color }} />
                <p className="text-[11px] font-bold uppercase tracking-widest text-white/60">Gegner rückt vor…</p>
              </div>
            </div>
          )}

          {/* ── Kampfmodus: Ergebnis-Leiste unten ── */}
          {battleMode && phase === "result" && result && !result.defeated && (
            <div className="absolute inset-x-0 bottom-0 z-20 flex flex-wrap items-center justify-center gap-1.5 px-4 py-4" style={{ background: "linear-gradient(0deg, rgba(0,0,0,.6), transparent)" }}>
              {result.correct && result.crit && (
                <span className="flex items-center gap-1 rounded-full border border-yellow-400/50 bg-yellow-500/15 px-2.5 py-1 text-xs font-black text-yellow-400" style={{ animation: "crit-pop .4s cubic-bezier(.175,.885,.32,1.275)" }}>💥 CRIT ×2</span>
              )}
              {result.correct && combo >= STREAK_BONUS_AT && (
                <span className="flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-bold" style={{ borderColor: `${color}60`, color, backgroundColor: `${color}15` }}>🔥 Streak +1 DMG</span>
              )}
              {result.correct && result.firstBlood && (
                <span className="flex items-center gap-1 rounded-full border border-red-400/40 bg-red-500/10 px-2.5 py-1 text-xs font-bold text-red-400"><Droplets className="size-3" /> First Blood +10</span>
              )}
              {result.correct && result.coinsEarned > 0 && (
                <span className="flex items-center gap-1 rounded-full border border-amber-400/40 bg-amber-500/10 px-2.5 py-1 text-xs font-bold text-amber-500"><Coins className="size-3" /> +{result.coinsEarned}</span>
              )}
              <button
                onClick={handleNext}
                className="ml-2 flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white transition-all active:scale-95"
                style={{ background: `linear-gradient(135deg, ${color} 0%, ${color}cc 100%)`, boxShadow: `0 0 14px ${color}40` }}
              >
                <Zap className="size-4" />{result.correct ? "Weiter!" : "Nochmal"}
              </button>
            </div>
          )}
        </div>

        {/* ── Status-Zeile unter der Arena ── */}
        <div className="flex items-center justify-between text-xs text-muted-fg">
          <span>{hpPct}% Boss-HP</span>
          <span className="font-semibold" style={{ color }}>{hits} Treffer 💥</span>
        </div>
        {battleMsLeft !== null && battleMsLeft > 0 && (
          <p className="-mt-2 text-center text-[10px] font-mono text-muted-fg">⏳ {formatTimeLeft(battleMsLeft)} verbleibend</p>
        )}

        {/* ── Aktions-Buttons ── */}
        {phase === "idle" && !defeated && !ko && !battleMode && (
          <button
            onClick={startBattle}
            className="group relative w-full overflow-hidden rounded-2xl py-4 text-base font-black uppercase tracking-widest text-white transition-all duration-150 hover:scale-[1.02] active:scale-95"
            style={{ background: `linear-gradient(135deg, ${color} 0%, ${color}bb 100%)`, boxShadow: `0 0 24px ${color}55, 0 4px 16px rgba(0,0,0,.35)` }}
          >
            <span className="relative z-10 flex items-center justify-center gap-2.5"><Swords className="size-5" />Angreifen!</span>
          </button>
        )}
        {phase === "loading" && !battleMode && (
          <div className="flex items-center justify-center gap-3 py-3">
            <div className="size-6 animate-spin rounded-full border-4 border-border" style={{ borderTopColor: color }} />
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-fg">Gegner rückt vor…</p>
          </div>
        )}
        {phase === "result" && result && !result.defeated && !battleMode && (
          <div className="flex flex-wrap items-center gap-1.5">
            {result.correct && result.crit && (
              <span className="flex items-center gap-1 rounded-full border border-yellow-400/50 bg-yellow-500/15 px-2.5 py-1 text-xs font-black text-yellow-500">💥 CRIT ×2</span>
            )}
            {result.correct && result.firstBlood && (
              <span className="flex items-center gap-1 rounded-full border border-red-400/40 bg-red-500/10 px-2.5 py-1 text-xs font-bold text-red-400"><Droplets className="size-3" /> First Blood +10</span>
            )}
            {result.correct && result.lastHit && result.defeated && (
              <span className="flex items-center gap-1 rounded-full border border-yellow-400/40 bg-yellow-500/10 px-2.5 py-1 text-xs font-bold text-yellow-500"><Skull className="size-3" /> Last Hit +15</span>
            )}
            {result.correct && result.coinsEarned > 0 && (
              <span className="flex items-center gap-1 rounded-full border border-amber-400/40 bg-amber-500/10 px-2.5 py-1 text-xs font-bold text-amber-500"><Coins className="size-3" /> +{result.coinsEarned}</span>
            )}
            {result.correct && result.isMvp && (
              <span className="flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-bold" style={{ borderColor: `${color}60`, color, backgroundColor: `${color}15` }}><Crown className="size-3" /> MVP!</span>
            )}
            <button
              onClick={handleNext}
              className="ml-auto flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white transition-all active:scale-95"
              style={{ background: `linear-gradient(135deg, ${color} 0%, ${color}cc 100%)`, boxShadow: `0 0 14px ${color}40` }}
            >
              <Zap className="size-4" />{result.correct ? "Weiter!" : "Nochmal"}
            </button>
          </div>
        )}
        {defeated && phase === "idle" && (
          <div className="rounded-2xl border border-yellow-400/25 bg-yellow-500/5 p-5 text-center">
            <p className="text-3xl font-black">💀</p>
            <p className="mt-1 font-bold">Boss besiegt!</p>
            <p className="mt-0.5 text-sm text-muted-fg">Du hast {hits} Treffer gelandet.</p>
          </div>
        )}
      </div>
    </>
  );
}
