"use client";

import { useEffect, useRef } from "react";

interface Props {
  bossIcon: string;
  tierColor: string;
  onComplete: () => void;
}

export function BossDeathAnimation({ bossIcon, tierColor, onComplete }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  // onComplete in einem Ref halten und den Timer NUR EINMAL beim Mount starten.
  // Mit [onComplete] als Dependency würde jeder Parent-Re-Render (z. B. der
  // sekündliche Battle-Countdown) den Timer zurücksetzen — er feuert dann nie
  // und die Animation bleibt für immer stehen.
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const firedRef = useRef(false);
  const finish = () => {
    if (firedRef.current) return;
    firedRef.current = true;
    onCompleteRef.current();
  };

  useEffect(() => {
    const timer = setTimeout(finish, 3400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Generate beam angles (8 beams like Ender Dragon's energy pillars)
  const beams = Array.from({ length: 8 }, (_, i) => i * 45);

  return (
    <div
      ref={ref}
      onClick={finish}
      className="fixed inset-0 z-[9999] flex cursor-pointer items-center justify-center overflow-hidden"
      style={{ background: "rgba(0,0,0,0.85)" }}
      title="Klicken zum Überspringen"
    >
      <style>{`
        @keyframes boss-core-pulse {
          0%   { transform: scale(0.2); opacity: 0; filter: brightness(1); }
          15%  { transform: scale(1.1); opacity: 1; filter: brightness(2); }
          30%  { transform: scale(0.95); filter: brightness(1.5); }
          50%  { transform: scale(1.3); filter: brightness(3); }
          70%  { transform: scale(1.1); filter: brightness(2); }
          85%  { transform: scale(1.6); opacity: 1; filter: brightness(4); }
          95%  { transform: scale(2.5); opacity: 0.3; filter: brightness(6); }
          100% { transform: scale(4); opacity: 0; filter: brightness(8); }
        }
        @keyframes boss-beam {
          0%   { scaleY: 0; opacity: 0; }
          20%  { scaleY: 1; opacity: 0.8; }
          60%  { scaleY: 1.2; opacity: 1; }
          80%  { scaleY: 2; opacity: 0.6; }
          100% { scaleY: 3; opacity: 0; }
        }
        @keyframes boss-particle {
          0%   { transform: translate(0, 0) scale(1); opacity: 1; }
          100% { transform: translate(var(--tx), var(--ty)) scale(0); opacity: 0; }
        }
        @keyframes boss-icon-dissolve {
          0%   { transform: scale(1); opacity: 1; filter: brightness(1); }
          40%  { transform: scale(1.3); opacity: 1; filter: brightness(3); }
          70%  { transform: scale(1.6) rotate(15deg); opacity: 0.5; filter: brightness(5) blur(2px); }
          100% { transform: scale(2.5) rotate(-20deg); opacity: 0; filter: brightness(8) blur(8px); }
        }
        @keyframes boss-ripple {
          0%   { transform: scale(0); opacity: 0.8; }
          100% { transform: scale(8); opacity: 0; }
        }
        @keyframes boss-glow-expand {
          0%   { opacity: 0; transform: scale(0.5); }
          30%  { opacity: 1; }
          100% { opacity: 0; transform: scale(6); }
        }
      `}</style>

      {/* Background glow */}
      <div
        className="absolute rounded-full"
        style={{
          width: 200,
          height: 200,
          background: `radial-gradient(circle, ${tierColor}80 0%, transparent 70%)`,
          animation: "boss-glow-expand 3.4s ease-out forwards",
        }}
      />

      {/* Ripple rings */}
      {[0, 0.3, 0.6].map((delay, i) => (
        <div
          key={i}
          className="absolute rounded-full border-2"
          style={{
            width: 60,
            height: 60,
            borderColor: `${tierColor}cc`,
            animation: `boss-ripple 2s ease-out ${delay}s forwards`,
          }}
        />
      ))}

      {/* Energy beams */}
      {beams.map((angle) => (
        <div
          key={angle}
          className="absolute origin-center"
          style={{ transform: `rotate(${angle}deg)` }}
        >
          <div
            style={{
              width: 3,
              height: 280,
              marginLeft: -1.5,
              marginTop: -280,
              background: `linear-gradient(to top, ${tierColor}ff, ${tierColor}40, transparent)`,
              transformOrigin: "bottom center",
              animation: "boss-beam 2.8s ease-out 0.2s forwards",
              borderRadius: 2,
            }}
          />
        </div>
      ))}

      {/* Particles */}
      {Array.from({ length: 24 }, (_, i) => {
        const angle = (i / 24) * 360;
        const dist = 80 + Math.random() * 120;
        const tx = Math.cos((angle * Math.PI) / 180) * dist;
        const ty = Math.sin((angle * Math.PI) / 180) * dist;
        return (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              width: 4 + Math.random() * 6,
              height: 4 + Math.random() * 6,
              background: tierColor,
              boxShadow: `0 0 6px ${tierColor}`,
              // @ts-ignore
              "--tx": `${tx}px`,
              "--ty": `${ty}px`,
              animation: `boss-particle ${1.5 + Math.random()}s ease-out ${0.4 + Math.random() * 0.6}s forwards`,
            }}
          />
        );
      })}

      {/* Boss icon */}
      <div
        className="relative z-10 select-none"
        style={{
          fontSize: 96,
          lineHeight: 1,
          animation: "boss-icon-dissolve 3s ease-in 0.3s forwards",
          filter: `drop-shadow(0 0 24px ${tierColor})`,
        }}
      >
        {bossIcon}
      </div>

      {/* Energy core */}
      <div
        className="absolute rounded-full"
        style={{
          width: 40,
          height: 40,
          background: `radial-gradient(circle, #ffffff 0%, ${tierColor} 40%, transparent 70%)`,
          boxShadow: `0 0 40px 20px ${tierColor}80, 0 0 80px 40px ${tierColor}40`,
          animation: "boss-core-pulse 3.4s ease-out forwards",
        }}
      />

      {/* "DEFEATED" text */}
      <div
        className="absolute bottom-1/3 font-black tracking-[0.3em] uppercase text-white/90 text-2xl"
        style={{
          textShadow: `0 0 20px ${tierColor}, 0 0 40px ${tierColor}`,
          animation: "boss-icon-dissolve 3.4s ease-in 0.5s forwards",
        }}
      >
        BESIEGT
      </div>
    </div>
  );
}
