"use client";

import { useState, useTransition } from "react";
import { Swords, Coins, Zap, CheckCircle2, XCircle, Crown, Droplets, Skull } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BOSS_TIERS, type BossTier } from "@/lib/game";
import { attackBoss, type AttackResult } from "./actions";
import { BossDefeatedOverlay } from "./BossDefeatedOverlay";
import { cn } from "@/lib/utils";

interface Question {
  id: string;
  prompt: string;
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

export function BossClient({ battleId, tier, bossName, bossIcon, initialHp, maxHp, myCorrectAnswers }: BossClientProps) {
  const [hp, setHp] = useState(initialHp);
  const [phase, setPhase] = useState<Phase>("idle");
  const [question, setQuestion] = useState<Question | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [result, setResult] = useState<AttackResult | null>(null);
  const [hits, setHits] = useState(myCorrectAnswers);
  const [isPending, startTransition] = useTransition();
  const [killData, setKillData] = useState<AttackResult["killData"] | null>(null);

  const tierData = BOSS_TIERS[(tier as BossTier) in BOSS_TIERS ? tier as BossTier : "common"];
  const hpPct = Math.round((hp / maxHp) * 100);
  const defeated = hp === 0;

  async function handleAttack() {
    if (defeated || phase !== "idle") return;
    setPhase("loading");
    try {
      const res = await fetch(`/api/boss/${battleId}/question`);
      const q = await res.json() as Question;
      setQuestion(q);
      setSelected(null);
      setPhase("question");
    } catch {
      setPhase("idle");
    }
  }

  function handleSelect(idx: number) {
    if (selected !== null) return;
    setSelected(idx);
    startTransition(async () => {
      const res = await attackBoss(battleId, question!.id, idx);
      if ("error" in res) { setPhase("idle"); return; }
      setResult(res);
      if (res.correct) {
        setHp(res.newHp);
        setHits((h) => h + 1);
      }
      if (res.defeated && res.killData) {
        setKillData(res.killData);
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

  const hpColor = hpPct > 50 ? "bg-green-500" : hpPct > 25 ? "bg-yellow-500" : "bg-red-500";

  return (
    <div className="flex flex-col gap-4">
      {killData && (
        <BossDefeatedOverlay data={killData} onClose={() => setKillData(null)} />
      )}
      {/* HP Bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold">HP</span>
          <span className="font-mono font-bold tabular-nums">
            {hp.toLocaleString("de-DE")} / {maxHp.toLocaleString("de-DE")}
          </span>
        </div>
        <div className="h-5 w-full overflow-hidden rounded-full bg-surface-2 border border-border">
          <div
            className={cn("h-full rounded-full transition-all duration-500", hpColor)}
            style={{ width: `${hpPct}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-xs text-muted-fg">
          <span>{hpPct}% verbleibend · {hits} Treffer von dir</span>
          <span>{maxHp - hp} Schaden gesamt</span>
        </div>
      </div>

      {/* Idle / Attack button */}
      {phase === "idle" && !defeated && (
        <Button
          size="lg"
          onClick={handleAttack}
          className="gap-2 font-bold"
          style={{ backgroundColor: tierData.color, color: "#fff" }}
        >
          <Swords className="size-5" />
          Angreifen!
        </Button>
      )}

      {phase === "loading" && (
        <div className="flex items-center justify-center py-6">
          <div className="size-8 animate-spin rounded-full border-4 border-border border-t-brand" />
        </div>
      )}

      {/* Question */}
      {phase === "question" && question && (
        <div className="rounded-2xl border border-border bg-surface p-4 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-fg">
            {question.subject} · Klasse {question.grade}
          </p>
          <p className="text-sm font-semibold leading-relaxed">{question.prompt}</p>
          <div className="grid gap-2">
            {question.options.map((opt) => (
              <button
                key={opt.id}
                type="button"
                disabled={selected !== null || isPending}
                onClick={() => handleSelect(opt.id)}
                className={cn(
                  "w-full rounded-xl border px-4 py-3 text-left text-sm font-medium transition-all",
                  selected === null
                    ? "border-border bg-bg hover:border-brand/50 hover:bg-brand/5"
                    : selected === opt.id
                    ? "border-brand bg-brand/10"
                    : "border-border bg-bg opacity-50",
                )}
              >
                {opt.text}
              </button>
            ))}
          </div>
          {isPending && (
            <p className="text-center text-xs text-muted-fg animate-pulse">Wird ausgewertet...</p>
          )}
        </div>
      )}

      {/* Result */}
      {phase === "result" && result && (
        <div className={cn(
          "rounded-2xl border p-5 space-y-3",
          result.correct ? "border-green-500/30 bg-green-500/5" : "border-red-500/30 bg-red-500/5",
        )}>
          <div className="flex items-center gap-3">
            {result.correct
              ? <CheckCircle2 className="size-6 text-green-500" />
              : <XCircle className="size-6 text-red-500" />}
            <div>
              <p className="font-bold">{result.correct ? "Richtig!" : "Falsch!"}</p>
              <p className="text-xs text-muted-fg">
                {result.correct ? `Boss HP: ${result.newHp}` : "Kein Schaden — versuche es erneut"}
              </p>
            </div>
          </div>

          {result.correct && (
            <div className="flex flex-wrap gap-2">
              {result.firstBlood && (
                <span className="flex items-center gap-1 rounded-full border border-red-400/40 bg-red-500/10 px-2.5 py-1 text-xs font-bold text-red-400">
                  <Droplets className="size-3" /> First Blood +10
                </span>
              )}
              {result.lastHit && result.defeated && (
                <span className="flex items-center gap-1 rounded-full border border-yellow-400/40 bg-yellow-500/10 px-2.5 py-1 text-xs font-bold text-yellow-400">
                  <Skull className="size-3" /> Last Hit +15
                </span>
              )}
              {result.coinsEarned > 0 && (
                <span className="flex items-center gap-1 rounded-full border border-amber-400/40 bg-amber-500/10 px-2.5 py-1 text-xs font-bold text-amber-500">
                  <Coins className="size-3" /> +{result.coinsEarned} Münzen
                </span>
              )}
              {result.isMvp && (
                <span className="flex items-center gap-1 rounded-full border border-brand/40 bg-brand/10 px-2.5 py-1 text-xs font-bold text-brand">
                  <Crown className="size-3" /> MVP!
                </span>
              )}
            </div>
          )}

          {result.defeated ? (
            <div className="rounded-xl border border-yellow-400/30 bg-yellow-500/10 p-3 text-center">
              <p className="text-lg font-black text-yellow-400">Boss besiegt!</p>
              <p className="mt-0.5 text-xs text-muted-fg">Belohnungen werden verteilt...</p>
            </div>
          ) : (
            <Button size="sm" variant="outline" onClick={handleNext}>
              <Zap className="size-4" />
              Nochmal angreifen
            </Button>
          )}
        </div>
      )}

      {defeated && phase === "idle" && (
        <div className="rounded-2xl border border-yellow-400/30 bg-yellow-500/5 p-5 text-center">
          <p className="text-2xl font-black">💀 Besiegt!</p>
          <p className="mt-1 text-sm text-muted-fg">Du hast {hits} Treffer gelandet.</p>
        </div>
      )}
    </div>
  );
}
