"use client";

import { useEffect, useState } from "react";
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

export function BossDefeatedOverlay({ data, onClose }: BossDefeatedOverlayProps) {
  const [visible, setVisible] = useState(true);
  const [scale, setScale] = useState(0.6);
  const [opacity, setOpacity] = useState(0);

  const tier = (data.bossTier as BossTier) in BOSS_TIERS ? data.bossTier as BossTier : "common";
  const tierData = BOSS_TIERS[tier];

  useEffect(() => {
    // Entrance animation
    const t1 = setTimeout(() => { setScale(1); setOpacity(1); }, 30);
    // Auto-dismiss after 7s
    const t2 = setTimeout(() => {
      setOpacity(0);
      setScale(0.9);
      setTimeout(onClose, 400);
    }, 7000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onClose]);

  function handleClose() {
    setOpacity(0);
    setScale(0.9);
    setTimeout(onClose, 300);
  }

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center cursor-pointer select-none"
      style={{
        background: `radial-gradient(ellipse at center, ${tierData.color}30 0%, #000000f0 65%)`,
        opacity,
        transition: "opacity 0.4s ease",
      }}
      onClick={handleClose}
    >
      <div
        className="flex flex-col items-center gap-5 px-6 text-center"
        style={{
          transform: `scale(${scale})`,
          transition: "transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
        }}
      >
        {/* Boss icon */}
        <div
          className="text-[7rem] sm:text-[9rem] leading-none"
          style={{ filter: `drop-shadow(0 0 40px ${tierData.color}cc)` }}
        >
          {data.bossIcon}
        </div>

        {/* BESIEGT! */}
        <div className="space-y-1">
          <p
            className="text-6xl sm:text-7xl font-black tracking-tighter uppercase leading-none"
            style={{
              color: tierData.color,
              textShadow: `0 0 60px ${tierData.color}80, 0 0 120px ${tierData.color}40`,
            }}
          >
            BESIEGT!
          </p>
          <p className="text-2xl sm:text-3xl font-bold text-white/90 tracking-tight">
            {data.bossName}
          </p>
        </div>

        {/* Tier badge */}
        <div
          className="rounded-full border-2 px-5 py-1.5 text-xs font-black uppercase tracking-widest"
          style={{ borderColor: tierData.color, color: tierData.color, backgroundColor: `${tierData.color}15` }}
        >
          {tierData.label} Boss
        </div>

        {/* MVP Card */}
        <div
          className="rounded-2xl border px-8 py-5 backdrop-blur-sm"
          style={{ borderColor: `${tierData.color}50`, backgroundColor: `${tierData.color}10` }}
        >
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/50">MVP</p>
          <p
            className="mt-1 text-3xl sm:text-4xl font-black text-white"
            style={{ textShadow: `0 0 20px ${tierData.color}60` }}
          >
            👑 {data.mvpName}
          </p>
          <p className="mt-2 text-sm text-white/60">
            {data.mvpAnswers} richtige Antworten
            {data.totalParticipants > 1 && ` · von ${data.totalParticipants} Kämpfern`}
          </p>
        </div>

        <p className="text-[11px] text-white/25 mt-1">Tippen zum Schließen</p>
      </div>
    </div>
  );
}
