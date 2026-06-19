"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { Swords, Coins, Crown, Droplets, Skull, Zap, Timer as TimerIcon } from "lucide-react";
import { BOSS_TIERS, type BossTier } from "@/lib/game";
import { attackBoss, type AttackResult } from "./actions";
import { BossDefeatedOverlay } from "./BossDefeatedOverlay";
import { cn } from "@/lib/utils";

const QUESTION_TIME = 20;
const LETTERS = ["A", "B", "C", "D"] as const;

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
}

type Phase = "idle" | "loading" | "question" | "result";
type BossAnim = "idle" | "hit" | "defeated";

export function BossClient({ battleId, tier, bossName, bossIcon, initialHp, maxHp, myCorrectAnswers }: BossClientProps) {
  const [hp, setHp] = useState(initialHp);
  const [phase, setPhase] = useState<Phase>("idle");
  const [question, setQuestion] = useState<Question | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [result, setResult] = useState<AttackResult | null>(null);
  const [hits, setHits] = useState(myCorrectAnswers);
  const [combo, setCombo] = useState(0);
  const [isPending, startTransition] = useTransition();
  const [killData, setKillData] = useState<AttackResult["killData"] | null>(null);
  const [bossAnim, setBossAnim] = useState<BossAnim>("idle");
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME);
  const [showFloatingDmg, setShowFloatingDmg] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const safeTier = (tier as BossTier) in BOSS_TIERS ? (tier as BossTier) : "common";
  const tierData = BOSS_TIERS[safeTier];
  const color = tierData.color;
  const hpPct = maxHp > 0 ? Math.round((hp / maxHp) * 100) : 0;
  const defeated = hp === 0;

  const hpBarColor = hpPct > 50 ? "#22c55e" : hpPct > 25 ? "#eab308" : "#ef4444";
  const timerColor = timeLeft > 10 ? "#22c55e" : timeLeft > 5 ? "#eab308" : "#ef4444";

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

  async function handleAttack() {
    if (defeated || phase !== "idle") return;
    setPhase("loading");
    try {
      const res = await fetch(`/api/boss/${battleId}/question`);
      if (!res.ok) { setPhase("idle"); return; }
      const q = (await res.json()) as Question;
      setQuestion(q);
      setSelected(null);
      setPhase("question");
    } catch {
      setPhase("idle");
    }
  }

  function handleSelect(idx: number) {
    if (selected !== null || phase !== "question") return;
    if (timerRef.current) clearInterval(timerRef.current);
    setSelected(idx);
    startTransition(async () => {
      const res = await attackBoss(battleId, question!.id, idx);
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
      }
      if (res.defeated && res.killData) setKillData(res.killData);
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

  return (
    <>
      <style>{`
        @keyframes boss-glow {
          0%,100% { filter: drop-shadow(0 0 14px ${color}70) drop-shadow(0 0 4px ${color}40); }
          50%      { filter: drop-shadow(0 0 28px ${color}cc) drop-shadow(0 0 10px ${color}80); }
        }
        @keyframes boss-hit {
          0%   { transform: scale(1) rotate(0deg); }
          12%  { transform: scale(1.3) rotate(-10deg); filter: brightness(2.5) drop-shadow(0 0 50px ${color}ff); }
          28%  { transform: scale(0.82) rotate(7deg); }
          45%  { transform: scale(1.14) rotate(-4deg); filter: brightness(1.6); }
          62%  { transform: scale(0.93) rotate(2deg); }
          78%  { transform: scale(1.05) rotate(-1deg); }
          100% { transform: scale(1) rotate(0deg); filter: none; }
        }
        @keyframes boss-defeated {
          0%  { transform: scale(1); opacity: 1; filter: brightness(1); }
          8%  { transform: scale(1.35) rotate(-12deg); filter: brightness(3) drop-shadow(0 0 80px ${color}ff); }
          22% { transform: scale(0.65) rotate(9deg); }
          38% { transform: scale(1.1) rotate(-6deg) translateY(-12px); }
          55% { transform: scale(0.75) rotate(6deg) translateY(4px); }
          75% { transform: scale(0.4) rotate(-200deg); opacity: 0.25; }
          100%{ transform: scale(0) rotate(-400deg); opacity: 0; }
        }
        @keyframes float-dmg {
          0%   { opacity: 1; transform: translateY(0) scale(1.2); }
          30%  { opacity: 1; transform: translateY(-22px) scale(1.5); }
          100% { opacity: 0; transform: translateY(-65px) scale(0.8); }
        }
        @keyframes combo-in {
          0%   { transform: scale(0.3) translateY(8px); opacity: 0; }
          55%  { transform: scale(1.25); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes opt-in {
          from { opacity: 0; transform: translateX(-14px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes result-in {
          from { opacity: 0; transform: translateY(10px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes timer-urgent {
          0%,100% { opacity: 1; }
          50%     { opacity: 0.35; }
        }
        @keyframes hp-pulse {
          0%,100% { box-shadow: 0 0 8px ${hpBarColor}60; }
          50%     { box-shadow: 0 0 18px ${hpBarColor}aa; }
        }
        @keyframes pulse-ring {
          0%   { transform: scale(0.85); opacity: 0.7; }
          100% { transform: scale(1.7);  opacity: 0; }
        }
        @keyframes wrong-shake {
          0%,100% { transform: translateX(0); }
          18%  { transform: translateX(-7px); }
          36%  { transform: translateX(7px); }
          54%  { transform: translateX(-5px); }
          72%  { transform: translateX(5px); }
          90%  { transform: translateX(-2px); }
        }
      `}</style>

      {killData && <BossDefeatedOverlay data={killData} onClose={() => setKillData(null)} />}

      <div className="flex flex-col gap-5">

        {/* ── Boss Arena ── */}
        <div className="relative flex flex-col items-center py-2">
          {!defeated && phase === "idle" && (
            <div
              className="absolute rounded-full pointer-events-none"
              style={{ width: 100, height: 100, backgroundColor: `${color}18`, animation: "pulse-ring 2.2s ease-out infinite" }}
            />
          )}
          {!defeated && phase === "idle" && (
            <div
              className="absolute rounded-full pointer-events-none"
              style={{ width: 100, height: 100, backgroundColor: `${color}10`, animation: "pulse-ring 2.2s ease-out 0.7s infinite" }}
            />
          )}

          <div
            className="relative text-6xl sm:text-7xl leading-none select-none"
            style={{
              animation:
                bossAnim === "hit"     ? "boss-hit 0.65s cubic-bezier(.36,.07,.19,.97)" :
                bossAnim === "defeated"? "boss-defeated 1.3s ease-in forwards" :
                defeated               ? undefined :
                                         "boss-glow 2.8s ease-in-out infinite",
            }}
          >
            {bossIcon}

            {showFloatingDmg && (
              <span
                className="pointer-events-none absolute -top-1 left-1/2 -translate-x-1/2 whitespace-nowrap font-black text-sm"
                style={{ color, textShadow: `0 0 10px ${color}`, animation: "float-dmg 0.95s ease-out forwards" }}
              >
                −1 HP!
              </span>
            )}
          </div>

          {combo >= 2 && phase !== "question" && !defeated && (
            <p
              className="mt-2 text-xs font-black uppercase tracking-widest"
              style={{ color, textShadow: `0 0 12px ${color}80`, animation: "combo-in 0.4s cubic-bezier(.175,.885,.32,1.275)" }}
            >
              {combo}× COMBO!
            </p>
          )}
        </div>

        {/* ── HP Bar ── */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span style={{ color }}>Boss HP</span>
            <span className="font-mono tabular-nums text-muted-fg">
              {hp.toLocaleString("de-DE")} / {maxHp.toLocaleString("de-DE")}
            </span>
          </div>
          <div className="relative h-4 w-full overflow-hidden rounded-full border border-border bg-surface-2">
            <div
              className="h-full rounded-full"
              style={{
                width: `${hpPct}%`,
                backgroundColor: hpBarColor,
                boxShadow: `0 0 10px ${hpBarColor}80, inset 0 1px 0 rgba(255,255,255,0.25)`,
                transition: "width 0.55s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
              }}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-muted-fg">
            <span>{hpPct}% verbleibend</span>
            <span className="font-semibold" style={{ color }}>
              {hits} Treffer 💥
            </span>
          </div>
        </div>

        {/* ── IDLE: Attack button ── */}
        {phase === "idle" && !defeated && (
          <button
            onClick={handleAttack}
            className="group relative w-full overflow-hidden rounded-2xl py-4 text-base font-black uppercase tracking-widest text-white transition-all duration-150 active:scale-95 hover:scale-[1.02]"
            style={{
              background: `linear-gradient(135deg, ${color} 0%, ${color}bb 100%)`,
              boxShadow: `0 0 24px ${color}55, 0 4px 16px rgba(0,0,0,0.35)`,
            }}
          >
            <span className="relative z-10 flex items-center justify-center gap-2.5">
              <Swords className="size-5" />
              Angreifen!
            </span>
            <div
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
              style={{ background: `linear-gradient(135deg, ${color}ee 0%, ${color}cc 100%)` }}
            />
          </button>
        )}

        {/* ── LOADING ── */}
        {phase === "loading" && (
          <div className="flex flex-col items-center gap-3 py-6">
            <div className="size-10 animate-spin rounded-full border-4 border-border" style={{ borderTopColor: color }} />
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-fg">Frage wird geladen…</p>
          </div>
        )}

        {/* ── QUESTION ── */}
        {phase === "question" && question && (
          <div
            className="rounded-2xl border-2 p-5 space-y-4"
            style={{ borderColor: `${color}45`, backgroundColor: `${color}07` }}
          >
            {/* Timer bar + meta */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-fg">
                  {question.subject} · Klasse {question.grade}
                </span>
                <span
                  className="flex items-center gap-1 text-xs font-black tabular-nums"
                  style={{
                    color: timerColor,
                    animation: timeLeft <= 5 ? "timer-urgent 0.5s ease-in-out infinite" : undefined,
                  }}
                >
                  <TimerIcon className="size-3" />
                  {timeLeft}s
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${(timeLeft / QUESTION_TIME) * 100}%`,
                    backgroundColor: timerColor,
                    boxShadow: `0 0 6px ${timerColor}80`,
                    transition: "width 1s linear, background-color 0.3s",
                  }}
                />
              </div>
            </div>

            {/* Question */}
            <p className="text-sm font-semibold leading-relaxed">{question.question}</p>

            {/* Options A/B/C/D */}
            <div className="grid gap-2">
              {question.options.map((opt, i) => {
                const isSelected = selected === opt.id;
                const showCorrect = isSelected && !!result?.correct;
                const showWrong   = isSelected && result != null && !result.correct;

                return (
                  <button
                    key={opt.id}
                    type="button"
                    disabled={selected !== null || isPending}
                    onClick={() => handleSelect(opt.id)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl border-2 px-4 py-3 text-left text-sm font-medium transition-all duration-150",
                      selected === null && "border-border bg-bg hover:scale-[1.01]",
                      showCorrect && "border-green-500 bg-green-500/10",
                      showWrong   && "border-red-500 bg-red-500/10",
                      selected !== null && !isSelected && "opacity-40 border-border bg-bg",
                    )}
                    style={{
                      animation:
                        showWrong ? "wrong-shake 0.45s ease" :
                        i < 4 ? `opt-in 0.22s ease ${i * 0.07}s both` :
                        undefined,
                      boxShadow: showCorrect
                        ? "0 0 0 2px rgba(34,197,94,0.35)"
                        : showWrong
                        ? "0 0 0 2px rgba(239,68,68,0.35)"
                        : undefined,
                    }}
                  >
                    <span
                      className={cn(
                        "flex size-7 shrink-0 items-center justify-center rounded-lg text-xs font-black transition-colors duration-150",
                        selected === null      && "bg-surface-2 text-muted-fg",
                        showCorrect            && "bg-green-500 text-white",
                        showWrong              && "bg-red-500 text-white",
                        selected !== null && !isSelected && "bg-surface-2 text-muted-fg/40",
                      )}
                    >
                      {LETTERS[i]}
                    </span>
                    <span className="leading-snug">{opt.text}</span>
                  </button>
                );
              })}
            </div>

            {isPending && (
              <p className="text-center text-[11px] text-muted-fg animate-pulse">Wird ausgewertet…</p>
            )}
          </div>
        )}

        {/* ── RESULT ── */}
        {phase === "result" && result && (
          <div
            className={cn(
              "rounded-2xl border-2 p-5 space-y-3",
              result.correct ? "border-green-500/30 bg-green-500/5" : "border-red-500/30 bg-red-500/5",
            )}
            style={{ animation: "result-in 0.3s ease both" }}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl leading-none">{result.correct ? "⚡" : "🛡️"}</span>
              <div>
                <p className={cn("text-lg font-black", result.correct ? "text-green-500" : "text-red-500")}>
                  {result.correct
                    ? combo >= 3 ? `${combo}× COMBO TREFFER!` : combo >= 2 ? "DOPPEL TREFFER!" : "Treffer!"
                    : "Verfehlt!"}
                </p>
                <p className="text-xs text-muted-fg">
                  {result.correct
                    ? `Boss HP: ${result.newHp} verbleibend`
                    : "Kein Schaden — versuche es erneut"}
                </p>
              </div>
            </div>

            {result.correct && (
              <div className="flex flex-wrap gap-1.5">
                {result.firstBlood && (
                  <span className="flex items-center gap-1 rounded-full border border-red-400/40 bg-red-500/10 px-2.5 py-1 text-xs font-bold text-red-400">
                    <Droplets className="size-3" /> First Blood +10
                  </span>
                )}
                {result.lastHit && result.defeated && (
                  <span className="flex items-center gap-1 rounded-full border border-yellow-400/40 bg-yellow-500/10 px-2.5 py-1 text-xs font-bold text-yellow-500">
                    <Skull className="size-3" /> Last Hit +15
                  </span>
                )}
                {result.coinsEarned > 0 && (
                  <span className="flex items-center gap-1 rounded-full border border-amber-400/40 bg-amber-500/10 px-2.5 py-1 text-xs font-bold text-amber-500">
                    <Coins className="size-3" /> +{result.coinsEarned} Münzen
                  </span>
                )}
                {result.isMvp && (
                  <span
                    className="flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-bold"
                    style={{ borderColor: `${color}60`, color, backgroundColor: `${color}15` }}
                  >
                    <Crown className="size-3" /> MVP!
                  </span>
                )}
              </div>
            )}

            {result.defeated ? (
              <div
                className="rounded-xl border px-4 py-3 text-center"
                style={{ borderColor: `${color}40`, backgroundColor: `${color}10` }}
              >
                <p className="text-xl font-black" style={{ color }}>💀 Boss besiegt!</p>
                <p className="mt-0.5 text-xs text-muted-fg">Belohnungen werden gutgeschrieben…</p>
              </div>
            ) : (
              <button
                onClick={handleNext}
                className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold text-white transition-all active:scale-95"
                style={{
                  background: `linear-gradient(135deg, ${color} 0%, ${color}cc 100%)`,
                  boxShadow: `0 0 14px ${color}40`,
                }}
              >
                <Zap className="size-4" />
                Nochmal angreifen
              </button>
            )}
          </div>
        )}

        {/* ── Already defeated ── */}
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
