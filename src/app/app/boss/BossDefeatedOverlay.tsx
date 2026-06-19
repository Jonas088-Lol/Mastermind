"use client";

import { useEffect, useState, useRef } from "react";
import { BOSS_TIERS, type BossTier } from "@/lib/game";

interface KillData {
  mvpName: string;
  mvpAnswers: number;
  totalParticipants: number;
  bossTier: string;
  bossName: string;
  bossIcon: string;
}

interface BossDefeatedOverlayProps {
  data: KillData;
  onClose: () => void;
}

const PARTICLES = Array.from({ length: 16 }, (_, i) => ({
  angle: (i / 16) * 360,
  dist: 90 + (i % 3) * 35,
  delay: (i * 0.04),
  emoji: ["✦", "★", "✸", "✷"][i % 4],
}));

export function BossDefeatedOverlay({ data, onClose }: BossDefeatedOverlayProps) {
  const [opacity, setOpacity] = useState(0);
  const [step, setStep]       = useState(0);
  const [mvpCount, setMvpCount] = useState(0);
  const closedRef = useRef(false);

  const safeTier = (data.bossTier as BossTier) in BOSS_TIERS ? (data.bossTier as BossTier) : "common";
  const tierData = BOSS_TIERS[safeTier];
  const color    = tierData.color;

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    const push = (fn: () => void, ms: number) => timers.push(setTimeout(fn, ms));

    push(() => setOpacity(1), 40);
    push(() => setStep(1), 180);
    push(() => setStep(2), 650);
    push(() => setStep(3), 1050);
    // Count up MVP answers
    push(() => {
      let c = 0;
      const iv = setInterval(() => {
        c++;
        setMvpCount(c);
        if (c >= data.mvpAnswers) clearInterval(iv);
      }, 70);
    }, 1300);
    // Auto-dismiss after 9s
    push(() => {
      if (!closedRef.current) { setOpacity(0); setTimeout(onClose, 450); }
    }, 9000);

    return () => timers.forEach(clearTimeout);
  }, [data.mvpAnswers, onClose]);

  function handleClose() {
    if (closedRef.current) return;
    closedRef.current = true;
    setOpacity(0);
    setTimeout(onClose, 350);
  }

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center cursor-pointer select-none overflow-hidden"
      style={{
        background: `radial-gradient(ellipse at center, ${color}22 0%, rgba(0,0,0,0.96) 68%)`,
        opacity,
        transition: "opacity 0.45s ease",
      }}
      onClick={handleClose}
    >
      <style>{`
        @keyframes victory-icon {
          0%   { transform: scale(0) rotate(-25deg); opacity: 0; }
          45%  { transform: scale(1.35) rotate(6deg); opacity: 1; }
          62%  { transform: scale(0.88) rotate(-3deg); }
          78%  { transform: scale(1.1) rotate(2deg); }
          100% { transform: scale(1) rotate(0deg); }
        }
        @keyframes victory-text {
          0%   { transform: translateY(18px) scale(0.82); opacity: 0; }
          55%  { transform: translateY(-5px) scale(1.06); opacity: 1; }
          100% { transform: translateY(0) scale(1); opacity: 1; }
        }
        @keyframes mvp-card-in {
          0%   { transform: translateY(28px) scale(0.9); opacity: 0; }
          60%  { transform: translateY(-4px) scale(1.02); opacity: 1; }
          100% { transform: translateY(0) scale(1); opacity: 1; }
        }
        @keyframes ring1 {
          0%   { transform: scale(0.6); opacity: 0.9; }
          100% { transform: scale(2.8); opacity: 0; }
        }
        @keyframes ring2 {
          0%   { transform: scale(0.6); opacity: 0.6; }
          100% { transform: scale(2.2); opacity: 0; }
        }
        @keyframes particle-burst {
          0%   { transform: translate(0,0) rotate(0deg) scale(0.4); opacity: 1; }
          60%  { opacity: 1; }
          100% { transform: translate(var(--pdx),var(--pdy)) rotate(var(--pdr)) scale(1.4); opacity: 0; }
        }
        @keyframes glow-pulse {
          0%,100% { text-shadow: 0 0 40px ${color}90, 0 0 80px ${color}50; }
          50%     { text-shadow: 0 0 80px ${color}cc, 0 0 160px ${color}70; }
        }
        @keyframes count-pop {
          0%   { transform: scale(0.5); opacity: 0; }
          50%  { transform: scale(1.3); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>

      {/* Expanding rings */}
      {step >= 1 && (
        <>
          <div className="pointer-events-none absolute rounded-full"
            style={{ width: 100, height: 100, border: `2px solid ${color}80`, animation: "ring1 1.6s ease-out 0s infinite" }} />
          <div className="pointer-events-none absolute rounded-full"
            style={{ width: 100, height: 100, border: `1px solid ${color}50`, animation: "ring1 1.6s ease-out 0.5s infinite" }} />
          <div className="pointer-events-none absolute rounded-full"
            style={{ width: 100, height: 100, border: `1px solid ${color}30`, animation: "ring2 2s ease-out 0.3s infinite" }} />
        </>
      )}

      {/* Particle burst */}
      {step >= 2 && PARTICLES.map((p, i) => {
        const rad = (p.angle * Math.PI) / 180;
        return (
          <div
            key={i}
            className="pointer-events-none absolute text-sm font-black"
            style={{
              color,
              opacity: 0,
              "--pdx": `${Math.cos(rad) * p.dist}px`,
              "--pdy": `${Math.sin(rad) * p.dist}px`,
              "--pdr": `${p.angle + 90}deg`,
              animation: `particle-burst 1.1s ease-out ${p.delay}s both`,
              textShadow: `0 0 8px ${color}`,
            } as React.CSSProperties}
          >
            {p.emoji}
          </div>
        );
      })}

      <div className="flex flex-col items-center gap-5 px-6 text-center">
        {/* Boss icon */}
        <div
          className="leading-none"
          style={{
            fontSize: "clamp(5rem, 18vw, 9rem)",
            opacity: step >= 1 ? 1 : 0,
            animation: step >= 1 ? "victory-icon 0.9s cubic-bezier(.175,.885,.32,1.275) both" : undefined,
            filter: `drop-shadow(0 0 50px ${color}cc) drop-shadow(0 0 20px ${color}80)`,
          }}
        >
          {data.bossIcon}
        </div>

        {/* BESIEGT! */}
        <div
          style={{
            opacity: step >= 2 ? 1 : 0,
            animation: step >= 2 ? "victory-text 0.5s ease both" : undefined,
          }}
          className="space-y-1"
        >
          <p
            className="text-6xl sm:text-7xl font-black tracking-tighter uppercase leading-none"
            style={{
              color,
              animation: step >= 2 ? "glow-pulse 2.5s ease-in-out infinite" : undefined,
            }}
          >
            BESIEGT!
          </p>
          <p className="text-2xl font-bold text-white/90 tracking-tight">{data.bossName}</p>
          <div
            className="inline-block rounded-full border-2 px-4 py-1 text-[11px] font-black uppercase tracking-widest mt-1"
            style={{ borderColor: color, color, backgroundColor: `${color}15` }}
          >
            {tierData.label} Boss
          </div>
        </div>

        {/* MVP card */}
        <div
          className="rounded-2xl border px-8 py-5 backdrop-blur-sm"
          style={{
            borderColor: `${color}50`,
            backgroundColor: `${color}12`,
            opacity: step >= 3 ? 1 : 0,
            animation: step >= 3 ? "mvp-card-in 0.55s cubic-bezier(.175,.885,.32,1.275) both" : undefined,
          }}
        >
          <p className="text-[10px] font-black uppercase tracking-[0.35em] text-white/40">MVP</p>
          <p
            className="mt-1 text-3xl sm:text-4xl font-black text-white"
            style={{ textShadow: `0 0 24px ${color}60` }}
          >
            👑 {data.mvpName}
          </p>
          <p className="mt-2 text-sm text-white/55">
            <span
              className="font-black text-2xl"
              style={{
                color,
                animation: mvpCount > 0 && mvpCount <= data.mvpAnswers ? "count-pop 0.2s ease" : undefined,
              }}
            >
              {mvpCount}
            </span>
            {" "}richtige Antworten
            {data.totalParticipants > 1 && (
              <> · <span className="text-white/40">von {data.totalParticipants} Kämpfern</span></>
            )}
          </p>
        </div>

        <p className="text-[11px] text-white/18 mt-1">Tippen zum Schließen</p>
      </div>
    </div>
  );
}
