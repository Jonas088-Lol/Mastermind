"use client";

import { useState } from "react";
import { Zap, Coins, Trophy, ShoppingBag, Star, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { spinWheel } from "./actions";

export const WHEEL_SEGMENTS = [
  { label: "50 XP",        color: "#3b82f6", icon: "⚡", type: "xp",    value: 50  },
  { label: "25 Münzen",    color: "#f59e0b", icon: "🪙", type: "coins",  value: 25  },
  { label: "100 XP",       color: "#8b5cf6", icon: "⚡", type: "xp",    value: 100 },
  { label: "10 Münzen",    color: "#f59e0b", icon: "🪙", type: "coins",  value: 10  },
  { label: "2× XP Boost", color: "#ec4899", icon: "🔥", type: "booster",value: 1   },
  { label: "75 Münzen",    color: "#10b981", icon: "🪙", type: "coins",  value: 75  },
  { label: "200 XP",       color: "#f97316", icon: "⚡", type: "xp",    value: 200 },
  { label: "5 Münzen",     color: "#6b7280", icon: "🪙", type: "coins",  value: 5   },
] as const;

const SEG_COUNT = WHEEL_SEGMENTS.length;
const SEG_DEG   = 360 / SEG_COUNT;

interface Props {
  alreadySpun: boolean;
  userId: string;
}

export function LuckyWheelClient({ alreadySpun }: Props) {
  const [spinning,  setSpinning]  = useState(false);
  const [rotation,  setRotation]  = useState(0);
  const [landed,    setLanded]    = useState<number | null>(null);
  const [result,    setResult]    = useState<{ label: string; type: string; value: number } | null>(null);
  const [done,      setDone]      = useState(alreadySpun);

  async function handleSpin() {
    if (spinning || done) return;
    setSpinning(true);
    setLanded(null);
    setResult(null);

    const res = await spinWheel();
    if ("error" in res) { setSpinning(false); return; }

    const segIndex = res.segmentIndex;
    // Spin 5–8 full rotations + land on segment
    const extra = (Math.random() * 3 + 5) * 360;
    const landAngle = 360 - (segIndex * SEG_DEG + SEG_DEG / 2);
    const target = extra + landAngle;
    setRotation((prev) => prev + target);

    setTimeout(() => {
      setSpinning(false);
      setDone(true);
      setLanded(segIndex);
      setResult({ label: res.label, type: res.type, value: res.value });
    }, 3500);
  }

  return (
    <div className="flex flex-col items-center gap-8 w-full">
      {/* Wheel */}
      <div className="relative">
        {/* Pointer */}
        <div className="absolute -top-4 left-1/2 z-10 -translate-x-1/2">
          <div className="h-0 w-0 border-l-[10px] border-r-[10px] border-t-[20px] border-l-transparent border-r-transparent border-t-fg drop-shadow-md" />
        </div>

        <div
          className="relative size-72 sm:size-80 rounded-full border-4 border-border shadow-2xl transition-transform"
          style={{
            transform: `rotate(${rotation}deg)`,
            transitionDuration: spinning ? "3.5s" : "0s",
            transitionTimingFunction: "cubic-bezier(0.17, 0.67, 0.12, 0.99)",
          }}
        >
          <svg viewBox="0 0 200 200" className="size-full">
            {WHEEL_SEGMENTS.map((seg, i) => {
              const startAngle = i * SEG_DEG - 90;
              const endAngle   = startAngle + SEG_DEG;
              const x1 = 100 + 100 * Math.cos((startAngle * Math.PI) / 180);
              const y1 = 100 + 100 * Math.sin((startAngle * Math.PI) / 180);
              const x2 = 100 + 100 * Math.cos((endAngle   * Math.PI) / 180);
              const y2 = 100 + 100 * Math.sin((endAngle   * Math.PI) / 180);
              const tx  = 100 + 68  * Math.cos(((startAngle + SEG_DEG / 2) * Math.PI) / 180);
              const ty  = 100 + 68  * Math.sin(((startAngle + SEG_DEG / 2) * Math.PI) / 180);
              return (
                <g key={i}>
                  <path
                    d={`M100,100 L${x1},${y1} A100,100 0 0,1 ${x2},${y2} Z`}
                    fill={seg.color}
                    stroke="#fff"
                    strokeWidth="1.5"
                    opacity={landed !== null && landed !== i ? 0.4 : 1}
                  />
                  <text
                    x={tx} y={ty}
                    textAnchor="middle" dominantBaseline="middle"
                    fontSize="7" fontWeight="bold" fill="#fff"
                    transform={`rotate(${startAngle + SEG_DEG / 2 + 90}, ${tx}, ${ty})`}
                  >
                    {seg.label}
                  </text>
                </g>
              );
            })}
            <circle cx="100" cy="100" r="12" fill="#fff" stroke="#e5e7eb" strokeWidth="1.5" />
          </svg>
        </div>
      </div>

      {/* Result */}
      {result && (
        <div className={cn(
          "w-full rounded-2xl border p-5 text-center",
          result.type === "booster" ? "border-pink-500/30 bg-pink-500/5"
            : result.type === "xp"  ? "border-brand/30 bg-brand/5"
            : "border-amber-400/30 bg-amber-500/5",
        )}>
          <p className="text-3xl">{WHEEL_SEGMENTS[landed!]?.icon}</p>
          <p className="mt-2 text-xl font-black">{result.label}</p>
          <p className="mt-1 text-sm text-muted-fg">wurde deinem Konto gutgeschrieben!</p>
        </div>
      )}

      {/* Spin button */}
      <Button
        size="lg"
        onClick={handleSpin}
        disabled={spinning || done}
        className="w-full max-w-xs gap-2 font-bold"
      >
        {spinning ? "Dreht..." : done && !spinning ? "Morgen wieder drehen" : "Jetzt drehen!"}
      </Button>

      {done && !spinning && (
        <p className="text-xs text-muted-fg text-center">
          Das Glücksrad steht dir wieder um Mitternacht zur Verfügung.
        </p>
      )}

      {/* Prizes list */}
      <div className="w-full rounded-2xl border border-border bg-surface p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-fg">Mögliche Gewinne</p>
        <div className="grid grid-cols-2 gap-2">
          {WHEEL_SEGMENTS.map((seg, i) => (
            <div key={i} className="flex items-center gap-2 rounded-xl border border-border px-3 py-2">
              <div className="size-3 rounded-full shrink-0" style={{ backgroundColor: seg.color }} />
              <span className="text-xs font-medium">{seg.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
